"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ArrowRight, Play, ChevronDown, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { TruncatedWithTooltip } from "@/components/ui/TruncatedWithTooltip";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { usersApi } from "@/lib/services/users";
import { lookupsApi } from "@/lib/services/lookups";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { PageShell } from "@/components/layout/PageShell";
import type { UserListItemDto, CreateUserRequest, UpdateUserRequest } from "@/lib/services/users";
import { USER_STATUS_NAMES } from "@/lib/services/users";
import type { LookupDto, ModuleLookupDto, ValueLabelDto } from "@/lib/services/lookups";
import type { PaginatedList } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: 0, name: "Pending" },
  { value: 1, name: "Active" },
  { value: 2, name: "Suspended" },
  { value: 3, name: "Terminated" },
];

/** Display a short User ID like RCM-12453 from Guid */
function toUserDisplayId(id: string): string {
  const hex = id.replace(/-/g, "").slice(0, 8);
  return "RCM-" + (hex.match(/.{1,4}/g)?.join("-") ?? hex);
}

function SortArrows({
  columnKey,
  sortBy,
  sortOrder,
  onSort,
}: {
  columnKey: string;
  sortBy: string | null;
  sortOrder: "asc" | "desc" | null;
  onSort: (key: string, order: "asc" | "desc" | null) => void;
}) {
  const isAsc = sortBy === columnKey && sortOrder === "asc";
  const isDesc = sortBy === columnKey && sortOrder === "desc";
  return (
    <span className="inline-flex flex-col gap-0" role="group" aria-label="Sort">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSort(columnKey, isAsc ? null : "asc");
        }}
        className="p-0 border-0 bg-transparent cursor-pointer rounded leading-none hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        aria-label="Sort ascending"
      >
        <Play className={`h-2 w-2 shrink-0 -rotate-90 ${isAsc ? "fill-[#0066CC] text-[#0066CC]" : "fill-[#E2E8F0] text-[#E2E8F0]"}`} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSort(columnKey, isDesc ? null : "desc");
        }}
        className="p-0 border-0 bg-transparent cursor-pointer rounded leading-none hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        aria-label="Sort descending"
      >
        <Play className={`h-2 w-2 shrink-0 rotate-90 ${isDesc ? "fill-[#0066CC] text-[#0066CC]" : "fill-[#E2E8F0] text-[#E2E8F0]"}`} />
      </button>
    </span>
  );
}

/** Multi-select for Module Access: trigger "Select Module(s)" + dropdown with search and checkboxes */
function ModuleAccessMultiSelect({
  modules,
  value,
  onChange,
}: {
  modules: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      modules.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [modules, searchQuery],
  );

  const allSelected = modules.length > 0 && value.length === modules.length;
  const toggleAll = () => {
    if (allSelected) onChange([]);
    else onChange(modules.map((m) => m.id));
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const displayLabel =
    value.length === 0
      ? "Select Module(s)"
      : value.length === 1
        ? modules.find((m) => m.id === value[0])?.name ?? "1 selected"
        : `${value.length} modules selected`;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-[5px] border border-[#E2E8F0] bg-background px-3 py-2 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className={value.length === 0 ? "text-[#94A3B8]" : ""}>
          {displayLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[280px] overflow-hidden rounded-[5px] border border-[#E2E8F0] bg-white shadow-lg">
          <div className="border-b border-[#E2E8F0] p-2">
            <div className="flex items-center gap-2 rounded border border-[#E2E8F0] bg-background px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search Module"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1">
            {modules.length > 0 && (
              <label className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-[#F7F8F9]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="All Modules"
                />
                <span className="font-aileron text-[14px] text-[#202830]">
                  All Modules
                </span>
              </label>
            )}
            {filtered.map((m) => {
              const checked = value.includes(m.id);
              return (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-[#F7F8F9]"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      if (c === true) {
                        onChange([...value, m.id]);
                      } else {
                        onChange(value.filter((id) => id !== m.id));
                      }
                    }}
                    aria-label={m.name}
                  />
                  <span className="font-aileron text-[14px] text-[#202830]">
                    {m.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [data, setData] = useState<PaginatedList<UserListItemDto> | null>(null);
  const [roles, setRoles] = useState<LookupDto[]>([]);
  const [organizations, setOrganizations] = useState<LookupDto[]>([]);
  const [modules, setModules] = useState<ModuleLookupDto[]>([]);
  const [statusOptions, setStatusOptions] = useState<ValueLabelDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateUserRequest & { password?: string; newPassword?: string; sendInviteEmail?: boolean }>({
    userName: "",
    email: "",
    password: "",
    organizationId: "",
    roleId: "",
    moduleIds: [],
    status: 1,
    sendInviteEmail: true,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const api = usersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading } = useModulePermission("Users");
  const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m.name]));

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadList = useCallback(() => {
    setError(null);
    const statusParam = statusFilter === "" ? undefined : Number(statusFilter);
    api
      .getList({
        pageNumber: page,
        pageSize,
        status: statusParam,
        search: searchDebounced || undefined,
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, pageSize, statusFilter, searchDebounced]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    lookupsApi().getRoles().then(setRoles).catch(() => setRoles([]));
    lookupsApi().getOrganizations().then(setOrganizations).catch(() => setOrganizations([]));
    lookupsApi().getModules().then(setModules).catch(() => setModules([]));
    lookupsApi().getUserStatuses().then(setStatusOptions).catch(() => setStatusOptions([]));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({
      userName: "",
      email: "",
      password: "",
      organizationId: "",
      roleId: "",
      moduleIds: [],
      status: 1,
      sendInviteEmail: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (row: UserListItemDto) => {
    setEditId(row.id);
    setFormError(null);
    setModalOpen(true);
    try {
      const detail = await api.getById(row.id);
      const statusNum =
        typeof detail.status === "number"
          ? detail.status
          : Math.max(0, USER_STATUS_NAMES.indexOf(detail.status as (typeof USER_STATUS_NAMES)[number]));
      setForm({
        userName: detail.userName,
        email: detail.email,
        organizationId: detail.organizationId ?? "",
        roleId: detail.roleId ?? "",
        moduleIds: detail.moduleIds ?? [],
        status: statusNum,
      });
    } catch {
      setFormError("Failed to load user.");
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.userName.trim() || !form.email.trim()) {
      setFormError("User name and email are required.");
      return;
    }
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, {
          userName: form.userName,
          email: form.email,
          organizationId: form.organizationId || undefined,
          roleId: form.roleId || undefined,
          moduleIds: form.moduleIds?.length ? form.moduleIds : undefined,
          status: (typeof form.status === "number" ? USER_STATUS_NAMES[form.status] : form.status) ?? "Active",
          newPassword: (form as { newPassword?: string }).newPassword || undefined,
        });
      } else {
        const statusVal =
          form.status != null ? (typeof form.status === "number" ? USER_STATUS_NAMES[form.status] : form.status) ?? "Active" : undefined;
        const isInvite = form.sendInviteEmail === true;
        const passwordToSend = isInvite ? undefined : (form.password?.trim() || undefined);
        await api.create({
          userName: form.userName,
          email: form.email,
          password: passwordToSend,
          organizationId: form.organizationId || undefined,
          roleId: form.roleId || undefined,
          moduleIds: form.moduleIds?.length ? form.moduleIds : undefined,
          ...(statusVal !== undefined && { status: statusVal }),
        } as CreateUserRequest);
      }
      setModalOpen(false);
      loadList();
      toast.success("Saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(deleteId);
      setDeleteId(null);
      loadList();
      toast.success("Deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const allOnPage = data.items.map((r) => r.id);
    const allSelected = allOnPage.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allOnPage.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allOnPage.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      await api.bulkDelete(Array.from(selectedIds));
      setBulkDeleteConfirm(false);
      setSelectedIds(new Set());
      loadList();
      toast.success(`${selectedIds.size} record(s) deleted successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (row: UserListItemDto, newStatus: number) => {
    setStatusUpdatingId(row.id);
    try {
      // API uses JsonStringEnumConverter and expects status as enum name, not number
      await api.update(row.id, {
        userName: row.userName,
        email: row.email,
        organizationId: row.organizationId ?? undefined,
        roleId: row.roleId ?? undefined,
        moduleIds: row.moduleIds ?? [],
        status: USER_STATUS_NAMES[newStatus] ?? "Pending",
      });
      loadList();
      toast.success("Status updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /** API may return status as number or enum string; normalize to number for dropdown. */
  const toStatusNumber = (s: number | string): number => {
    if (typeof s === "number") return s;
    const i = USER_STATUS_NAMES.indexOf(s as (typeof USER_STATUS_NAMES)[number]);
    return i >= 0 ? i : 0;
  };
  const statusLabel = (n: number) => STATUS_OPTIONS.find((o) => o.value === n)?.name ?? String(n);
  const moduleNames = (ids: string[]) =>
    ids.map((id) => moduleMap[id] ?? id).filter(Boolean).join(", ") || "—";

  const getSortValue = useCallback(
    (row: UserListItemDto, key: string): string => {
      switch (key) {
        case "id":
          return toUserDisplayId(row.id);
        case "userName":
          return row.userName ?? "";
        case "email":
          return row.email ?? "";
        case "organizationName":
          return row.organizationName ?? "";
        case "roleName":
          return row.roleName ?? "";
        case "moduleAccess":
          return moduleNames(row.moduleIds ?? []);
        default:
          return "";
      }
    },
    [moduleMap],
  );

  const displayItems = useMemo(() => {
    if (!data?.items) return [];
    if (!sortBy || !sortOrder) return data.items;
    return [...data.items].sort((a, b) => {
      const va = getSortValue(a, sortBy);
      const vb = getSortValue(b, sortBy);
      const cmp = va.localeCompare(vb, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [data?.items, sortBy, sortOrder, getSortValue]);

  const handleSort = useCallback((key: string, order: "asc" | "desc" | null) => {
    setSortBy(order === null ? null : key);
    setSortOrder(order);
  }, []);

  if (loading) {
    return (
      <PageShell title="Users Access">
        <div className="space-y-4">
          <div className="h-12 w-full animate-shimmer-bg rounded-lg" />
          <div className="h-72 animate-shimmer-bg rounded-xl" />
        </div>
      </PageShell>
    );
  }
  if (!canView) {
    return <AccessDenied moduleName="Users Access" />;
  }

  return (
    <PageShell
      breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Users Access" }]}
      title="Users Access"
      description="Manage user accounts, roles, and module access."
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      {/* Toolbar: search + add button */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 min-w-0 items-center gap-0">
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 min-w-[130px] rounded-l-[5px] border border-[#E2E8F0] bg-background pl-3 pr-8 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:outline-none"
          >
            {[
              { value: "", name: "All Status" },
              ...STATUS_OPTIONS,
            ].map((o) => (
              <option key={o.value === "" ? "_all" : o.value} value={o.value === "" ? "" : String(o.value)}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full min-w-0 rounded-r-[5px] border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
          {/* <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-enterprise w-auto min-w-[10rem] rounded-l-[5px] rounded-r-0"
          >
            <option value="">All Status</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select> */}
        </div>
        <div className="flex items-center gap-2">
          {canDelete && selectedIds.size > 0 && (
            <Button
              onClick={() => setBulkDeleteConfirm(true)}
              className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
            >
              <><Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})</>
            </Button>
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add User <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="flex flex-1 flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto rounded-[5px]">
          <Table className="min-w-[1500px]">
              <TableHead>
                <TableRow>
                  {canDelete && (
                    <TableHeaderCell className="!min-w-[50px] w-[50px]">
                      <Checkbox
                        checked={!!data?.items.length && data.items.every((r) => selectedIds.has(r.id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHeaderCell>
                  )}
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      User ID
                      <SortArrows columnKey="id" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      User Name
                      <SortArrows columnKey="userName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Email
                      <SortArrows columnKey="email" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Organization
                      <SortArrows columnKey="organizationName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Role Assignment
                      <SortArrows columnKey="roleName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Module Access
                      <SortArrows columnKey="moduleAccess" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>User Status</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <TableHeaderCell className="!w-[100px]">
                      Actions
                    </TableHeaderCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayItems.map((row) => (
                  <TableRow key={row.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <TruncatedWithTooltip className="max-w-[300px]">
                        {toUserDisplayId(row.id)}
                      </TruncatedWithTooltip>
                    </TableCell>
                    <TableCell>
                      <TruncatedWithTooltip className="max-w-[300px]">
                        {row.userName}
                      </TruncatedWithTooltip>
                    </TableCell>
                    <TableCell>
                      <TruncatedWithTooltip className="max-w-[300px]">
                        {row.email}
                      </TruncatedWithTooltip>
                    </TableCell>
                    <TableCell>
                      <TruncatedWithTooltip className="max-w-[300px]">
                        {row.organizationName ?? "—"}
                      </TruncatedWithTooltip>
                    </TableCell>
                    <TableCell>
                      <TruncatedWithTooltip className="max-w-[300px]">
                        {row.roleName ?? "—"}
                      </TruncatedWithTooltip>
                    </TableCell>
                    <TableCell>
                      <TruncatedWithTooltip className="max-w-[100px]">
                        {moduleNames(row.moduleIds ?? [])}
                      </TruncatedWithTooltip>
                    </TableCell>
                    <TableCell>
                      <select
                        value={toStatusNumber(row.status)}
                        onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="input-enterprise w-auto min-w-[7rem] rounded-l-[5px] rounded-r-0 px-2 py-1.5 text-sm disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="!w-[100px] ">
                        <TableActionsCell
                          canEdit={canUpdate}
                          canDelete={canDelete}
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteId(row.id)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="shrink-0 pt-4">
            <Pagination
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              totalCount={data.totalCount}
              hasPreviousPage={data.hasPreviousPage}
              hasNextPage={data.hasNextPage}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        </div>
      )}
      {!data && !error && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      )}

      {/* Add User / Edit User modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit User" : "Add User"}
        size="md"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              editId ? (
                "Update"
              ) : (
                <>
                  Add User
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )
            }
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">User Name</label>
              <input
                type="text"
                value={form.userName}
                onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
                placeholder="e.g., Emily Carter"
                className="input-enterprise"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="e.g., emily.carter@example.com"
                className="input-enterprise"
              />
            </div>
            {!editId && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendInviteEmail"
                    checked={form.sendInviteEmail ?? true}
                    onChange={(e) => setForm((f) => ({ ...f, sendInviteEmail: e.target.checked, ...(e.target.checked ? { password: "" } : {}) }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="sendInviteEmail" className="text-sm font-medium text-foreground">
                    Send invite email (user will set password via link)
                  </label>
                </div>
                {!(form.sendInviteEmail ?? true) && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
                    <input
                      type="password"
                      value={form.password ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="input-enterprise"
                    />
                  </div>
                )}
              </>
            )}
            {editId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">New password (optional)</label>
                <input
                  type="password"
                  value={(form as { newPassword?: string }).newPassword ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                  className="input-enterprise"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Organization</label>
              <select
                value={form.organizationId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                className="input-enterprise"
              >
                <option value="">Select Organization</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Role Assignment</label>
              <select
                value={form.roleId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                className="input-enterprise"
              >
                <option value="">Select Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Module Access</label>
              <ModuleAccessMultiSelect
                modules={modules}
                value={form.moduleIds ?? []}
                onChange={(ids) => setForm((f) => ({ ...f, moduleIds: ids }))}
              />
            </div>
            {editId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">User Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
                  className="input-enterprise rounded-l-[5px] rounded-r-0"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete user"
        message="Are you sure you want to delete this user?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected users"
        message={`Are you sure you want to delete ${selectedIds.size} user(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
      </TooltipProvider>
    </PageShell>
  );
}
