"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

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
    >
      {/* Toolbar: search + add button */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value="" onValueChange={() => {}}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-[5px] font-aileron text-[14px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-[300px] rounded-[5px] border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-enterprise w-auto min-w-[10rem]"
          >
            <option value="">All Status</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {canCreate && (
          <Button
            onClick={openCreate}
            className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
          >
            <>Add User <ArrowRight className="ml-1 h-4 w-4" /></>
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    User ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    User Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Organization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Role Assignment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Module Access
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    User Status
                  </th>
                  {(canUpdate || canDelete) && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-sm">
                      {toUserDisplayId(row.id)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.userName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.email}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.organizationName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.roleName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {moduleNames(row.moduleIds ?? [])}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <select
                        value={toStatusNumber(row.status)}
                        onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="input-enterprise w-auto min-w-[8rem] px-2 py-1.5 text-sm disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Edit"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        </>
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
              <select
                multiple
                value={form.moduleIds ?? []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                  setForm((f) => ({ ...f, moduleIds: selected }));
                }}
                className="input-enterprise"
                size={5}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
            </div>
            {editId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">User Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
                  className="input-enterprise"
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
    </PageShell>
  );
}
