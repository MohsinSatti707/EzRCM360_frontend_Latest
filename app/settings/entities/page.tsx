"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ArrowRight, Trash2, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Loader } from "@/components/ui/Loader";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { EntityFormModal } from "./EntityFormModal";
import { entitiesApi } from "@/lib/services/entities";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { usePaginatedList, useDebounce } from "@/lib/hooks";
import { resolveEnum, ENUMS } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { EntityListItemDto, CreateEntityRequest, UpdateEntityRequest } from "@/lib/services/entities";
import { CellTooltip } from "@/components/ui/CellTooltip";

const MODULE_NAME = "Entities";

const STATUS_OPTIONS: { value: number; name: string }[] = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

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
      <button type="button" onClick={(e) => { e.stopPropagation(); onSort(columnKey, isAsc ? null : "asc"); }} className="p-0 border-0 bg-transparent cursor-pointer rounded leading-none hover:opacity-80 focus:outline-none" aria-label="Sort ascending">
        <Play className={`h-2 w-2 shrink-0 -rotate-90 ${isAsc ? "fill-[#0066CC] text-[#0066CC]" : "fill-[#E2E8F0] text-[#E2E8F0]"}`} />
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onSort(columnKey, isDesc ? null : "desc"); }} className="p-0 border-0 bg-transparent cursor-pointer rounded leading-none hover:opacity-80 focus:outline-none" aria-label="Sort descending">
        <Play className={`h-2 w-2 shrink-0 rotate-90 ${isDesc ? "fill-[#0066CC] text-[#0066CC]" : "fill-[#E2E8F0] text-[#E2E8F0]"}`} />
      </button>
    </span>
  );
}

const defaultForm: CreateEntityRequest = {
  legalName: "",
  displayName: "",
  groupNpi: "",
  taxId: "",
  status: 1,
};

export default function EntitiesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchField, setSearchField] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEntityRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const api = entitiesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission(MODULE_NAME);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize,
    extraParams: {
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
    },
    fetch: api.getList,
  });

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: EntityListItemDto) => {
    setEditId(row.id);
    setForm({
      legalName: row.legalName,
      displayName: row.displayName,
      groupNpi: row.groupNpi,
      taxId: row.taxId,
      status: resolveEnum(row.status, ENUMS.EntityStatus),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!form.legalName.trim() || !form.displayName.trim() || !form.groupNpi.trim() || !form.taxId.trim()) {
      setFormError("Legal name, display name, group NPI, and tax ID are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, form as UpdateEntityRequest);
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      await reload();
      toast.success(editId ? "Entity Updated" : "Entity Added", <>{editId ? "The" : "A new"} entity, <strong>{form.legalName}</strong>, has been {editId ? "updated" : "added"} successfully.</>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  }, [editId, form, api]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      const deletedName = data?.items.find((r) => r.id === deleteId)?.legalName ?? "";
      await api.delete(deleteId);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      await reload();
      toast.success("Entity Deleted", <>The entity, <strong>{deletedName}</strong>, has been deleted successfully.</>);
    } catch (err) {
      toast.error("Delete Failed", err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (row: EntityListItemDto, statusValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      await api.update(row.id, {
        legalName: row.legalName,
        displayName: row.displayName,
        groupNpi: row.groupNpi,
        taxId: row.taxId,
        status: statusValue,
      });
      await reload();
      toast.success("Status Updated", <>The status for <strong>{row.legalName}</strong> has been updated successfully.</>);
    } catch (err) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
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
      await reload();
      toast.success("Entities Deleted", <>{selectedIds.size} entity(s) have been deleted successfully.</>);
    } catch (err) {
      toast.error("Bulk Delete Failed", err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const statusLabel = (n: number) => STATUS_OPTIONS.find((o) => o.value === n)?.name ?? String(n);

  const handleSort = useCallback((key: string, order: "asc" | "desc" | null) => {
    setSortBy(order === null ? null : key);
    setSortOrder(order);
  }, []);

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;
    if (searchTerm.trim() && searchField !== "all") {
      const q = searchTerm.trim().toLowerCase();
      items = items.filter((r) => {
        switch (searchField) {
          case "legalName": return (r.legalName ?? "").toLowerCase().includes(q);
          case "displayName": return (r.displayName ?? "").toLowerCase().includes(q);
          case "groupNpi": return (r.groupNpi ?? "").toLowerCase().includes(q);
          case "taxId": return (r.taxId ?? "").toLowerCase().includes(q);
          default: return true;
        }
      });
    }
    if (!sortBy || !sortOrder) return items;
    return [...items].sort((a, b) => {
      let va = "", vb = "";
      switch (sortBy) {
        case "legalName": va = a.legalName ?? ""; vb = b.legalName ?? ""; break;
        case "displayName": va = a.displayName ?? ""; vb = b.displayName ?? ""; break;
        case "groupNpi": va = a.groupNpi ?? ""; vb = b.groupNpi ?? ""; break;
        case "taxId": va = a.taxId ?? ""; vb = b.taxId ?? ""; break;
      }
      const cmp = va.localeCompare(vb, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [data?.items, sortBy, sortOrder, searchField, searchTerm]);

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Entity Information" description="Define entity identity and structure." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div>
        <PageHeader title="Entity Information" description="Define entity identity and structure." />
        <Card>
          <AccessRestrictedContent sectionName="Entity Information" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader
        title="Entity Information"
        description="Define entity identity and structure."
        actions={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px] whitespace-nowrap"
            >
              Add New Entity <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex flex-1 items-center">
          <Select value={searchField} onValueChange={setSearchField}>
            <SelectTrigger className="h-10 w-[110px] rounded-l-[5px] rounded-r-none border border-r-0 border-[#E2E8F0] bg-background font-aileron text-[14px] text-[#202830] focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="legalName">Entity Legal Name</SelectItem>
              <SelectItem value="displayName">Entity Display Name</SelectItem>
              <SelectItem value="groupNpi">Entity Group NPI</SelectItem>
              <SelectItem value="taxId">Entity Tax ID</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-r-[5px] rounded-l-none border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 min-w-[160px] rounded-[5px] border border-[#E2E8F0] bg-background pl-3 pr-6 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:outline-none"
        >
          <option value="all">Filter by Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          onClick={() => { setStatusFilter("all"); setSearchTerm(""); setSearchField("all"); setPage(1); }}
          className="h-10 rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] text-[#202830] hover:bg-[#F7F8F9] transition-colors focus:outline-none"
        >
          Clear
        </button>

        {canDelete && selectedIds.size > 0 && (
          <Button
            onClick={() => setBulkDeleteConfirm(true)}
            className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Image
            src="/icons/svg/no-data-found.svg"
            alt="No Data Found"
            width={180}
            height={180}
          />
          <h3 className="mt-4 text-2xl font-bold font-['Aileron'] text-gray-800">No Data Found</h3>
          <p className="mt-1 text-[15px] font-['Aileron'] text-[#151529]">No data available yet.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[calc(100vh-316px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
            <Table className="min-w-[1100px] table-fixed">
              <TableHead className="sticky top-0 z-20">
                <TableRow>
                  {canDelete && (
                    <TableHeaderCell className="!min-w-[50px] w-[50px]">
                      <Checkbox
                        checked={!!data?.items.length && data.items.every((r) => selectedIds.has(r.id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHeaderCell>
                  )}
                  <TableHeaderCell className="w-[240px] min-w-[240px]">
                    <div className="flex items-center gap-2">
                      Entity Legal Name
                      <SortArrows columnKey="legalName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell className="w-[200px] min-w-[200px]">Entity Display Name</TableHeaderCell>
                  <TableHeaderCell className="w-[200px] min-w-[200px]">Entity Group NPI</TableHeaderCell>
                  <TableHeaderCell className="w-[180px] min-w-[180px]">Entity Tax ID</TableHeaderCell>
                  <TableHeaderCell className="w-[180px] min-w-[180px]">Entity Status</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <TableHeaderCell className="!w-[100px] min-w-[100px]">Actions</TableHeaderCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedItems.map((row) => {
                  const statusNum = resolveEnum(row.status, ENUMS.EntityStatus);
                  const isInactive = statusNum === 0;
                  const cellColor = isInactive ? "text-[#93C5FD]" : "text-[#202830]";
                  return (
                  <TableRow key={row.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cellColor}>
                      <div className="max-w-xs truncate">
                        <CellTooltip text={row.legalName} />
                      </div>
                    </TableCell>
                    <TableCell className={cellColor}>
                      <div className="max-w-xs truncate">
                        <CellTooltip text={row.displayName} />
                      </div>
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={row.groupNpi} />
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={row.taxId} />
                    </TableCell>
                    <TableCell>
                      <select
                        value={statusNum}
                        onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="h-9 w-[130px] rounded-[5px] border border-[#E2E8F0] bg-background pl-3 pr-8 font-aileron text-[14px] text-[#202830] disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="!w-[100px]">
                        <TableActionsCell
                          canEdit={canUpdate}
                          canDelete={canDelete}
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteId(row.id)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
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

      {loading && !data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

      <EntityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={editId}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        loading={submitLoading}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Entity"
        message={<>Are you sure you want to delete the entity <strong>{data?.items.find((r) => r.id === deleteId)?.legalName ?? ""}</strong>?</>}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected entities"
        message={`Are you sure you want to delete ${selectedIds.size} entity(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
