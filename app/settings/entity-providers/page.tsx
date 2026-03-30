"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { entityProvidersApi } from "@/lib/services/entityProviders";
import { lookupsApi } from "@/lib/services/lookups";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { useDebounce } from "@/lib/hooks";
import { resolveEnum, ENUMS } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import type { EntityProviderListItemDto, CreateEntityProviderRequest, UpdateEntityProviderRequest } from "@/lib/services/entityProviders";
import type { EntityLookupDto } from "@/lib/services/lookups";
import type { PaginatedList } from "@/lib/types";

const PROVIDER_TYPES = [{ value: 0, name: "Physician" }, { value: 1, name: "Non-Physician" }];

const defaultForm: CreateEntityProviderRequest = {
  entityId: "",
  providerName: "",
  npi: "",
  ssn: "",
  providerType: 0,
  primarySpecialty: "",
  secondarySpecialty: "",
  isActive: true,
};

export default function EntityProvidersPage() {
  const [data, setData] = useState<PaginatedList<EntityProviderListItemDto> | null>(null);
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEntityProviderRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const api = entityProvidersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Entity Providers");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const loadList = useCallback(() => {
    setError(null);
    api.getList({ pageNumber: page, pageSize, search: debouncedSearch || undefined, isActive: statusFilter === "all" ? undefined : statusFilter === "active" }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    lookupsApi().getEntities().then(setEntities).catch(() => setEntities([]));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, entityId: entities[0]?.id ?? "" });
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = async (row: EntityProviderListItemDto) => {
    setEditId(row.id);
    setFormError(null);
    try {
      const detail = await api.getById(row.id);
      setForm({
        entityId: detail.entityId,
        providerName: detail.providerName,
        npi: detail.npi,
        ssn: detail.ssn ?? "",
        providerType: resolveEnum(detail.providerType, ENUMS.ProviderType),
        primarySpecialty: detail.primarySpecialty ?? "",
        secondarySpecialty: detail.secondarySpecialty ?? "",
        isActive: detail.isActive,
      });
      setModalOpen(true);
    } catch {
      setFormError("Failed to load.");
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.entityId || !form.providerName.trim() || !form.npi.trim()) {
      setFormError("Entity, provider name, and NPI are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, {
          entityId: form.entityId,
          providerName: form.providerName,
          npi: form.npi,
          ssn: form.ssn || null,
          providerType: form.providerType,
          primarySpecialty: form.primarySpecialty || null,
          secondarySpecialty: form.secondarySpecialty || null,
          isActive: form.isActive ?? true,
        });
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      await loadList();
      toast.success("Saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      await api.delete(deleteId);
      setDeleteId(null);
      await loadList();
      toast.success("Deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
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
      await loadList();
      toast.success(`${selectedIds.size} record(s) deleted successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const providerTypeLabel = (n: number) => PROVIDER_TYPES.find((p) => p.value === n)?.name ?? String(n);

  const handleStatusChange = async (row: EntityProviderListItemDto, isActive: boolean) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      await api.update(row.id, {
        entityId: row.entityId,
        providerName: row.providerName,
        npi: row.npi,
        ssn: null,
        providerType: row.providerType,
        primarySpecialty: row.primarySpecialty ?? null,
        secondarySpecialty: row.secondarySpecialty ?? null,
        isActive,
      });
      await loadList();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (!canView) {
    return (
      <div>
        <PageHeader title="Entity Providers" description="Manage entity providers." />
        <Card>
          <AccessRestrictedContent sectionName="Entity Providers" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Entity Providers" description="Manage entity providers." />

      {/* Toolbar: search + add button */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-l-[5px] font-aileron text-[14px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-r-[5px] border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canDelete && selectedIds.size > 0 && (
            <Button
              onClick={() => setBulkDeleteConfirm(true)}
              className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})
            </Button>
          )}
          {canCreate && (
            <>
              <BulkImportActions
                apiBase="/api/EntityProviders"
                templateFileName="EntityProviders_Import_Template.xlsx"
                onImportSuccess={loadList}
                onLoadingChange={setOverlayLoading}
              />
              <Button
                onClick={openCreate}
                className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
              >
                Add New Provider <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {data && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[calc(100vh-316px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
            <Table className="min-w-[1800px] table-fixed">
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
                <TableHeaderCell className="w-[250px] min-w-[250px]">Entity</TableHeaderCell>
                <TableHeaderCell className="w-[200px] min-w-[200px]">Provider name</TableHeaderCell>
                <TableHeaderCell className="w-[170px] min-w-[170px]">NPI</TableHeaderCell>
                <TableHeaderCell className="w-[170px] min-w-[170px]">Type</TableHeaderCell>
                <TableHeaderCell className="w-[200px] min-w-[200px]">Primary specialty</TableHeaderCell>
                <TableHeaderCell className="w-[200px] min-w-[200px]">Secondary specialty</TableHeaderCell>
                <TableHeaderCell className="w-[170px] min-w-[170px]">Active</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                  <TableHeaderCell className="!w-[120px] min-w-[120px]">Actions</TableHeaderCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                  <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-xs truncate">
                        {row.entityDisplayName}
                      </div>
                    </TableCell>
                  <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-xs truncate">
                        {row.providerName}
                      </div>
                    </TableCell>
                  <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-[140px] truncate">
                        {row.npi}
                      </div>
                    </TableCell>
                  <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-[140px] truncate">
                        {providerTypeLabel(row.providerType)}
                      </div>
                    </TableCell>
                  <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-xs truncate">
                        {row.primarySpecialty ?? "—"}
                      </div>
                    </TableCell>
                  <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-xs truncate">
                        {row.secondarySpecialty ?? "—"}
                      </div>
                    </TableCell>
                  <TableCell className="w-[250px] min-w-[250px]">
                      <select
                        value={row.isActive ? "1" : "0"}
                        onChange={(e) => handleStatusChange(row, e.target.value === "1")}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="input-enterprise w-[140px] rounded-l-[5px] rounded-r-0 px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                      </select>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                    <TableCell className="!w-[120px] min-w-[120px]">
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
      {!data && !error && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Provider" : "Add Provider"}
        size="lg"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                {editId ? "Update" : "Add Provider"}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </>
            }
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-[5px] bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider Name</label>
              <input
                type="text"
                value={form.providerName}
                onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))}
                placeholder="e.g., Dr. John Smith"
                required
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider NPI</label>
              <input
                type="text"
                value={form.npi}
                onChange={(e) => setForm((f) => ({ ...f, npi: e.target.value }))}
                placeholder="e.g., 1234567890"
                required
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider SSN</label>
              <input
                type="text"
                value={form.ssn ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, ssn: e.target.value }))}
                placeholder="e.g., 222-00-4321"
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider Type</label>
              <select
                value={form.providerType}
                onChange={(e) => setForm((f) => ({ ...f, providerType: Number(e.target.value) }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <option value="">Select Provider Type</option>
                {PROVIDER_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Primary Specialty</label>
              <input
                type="text"
                value={form.primarySpecialty ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, primarySpecialty: e.target.value }))}
                placeholder="e.g., Internal Medicine"
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Secondary Specialty</label>
              <input
                type="text"
                value={form.secondarySpecialty ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, secondarySpecialty: e.target.value }))}
                placeholder="e.g., Cardiology"
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Linked Entity</label>
              <select
                value={form.entityId}
                onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                required
              >
                <option value="">Select Entity</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.displayName}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete provider" message="Are you sure you want to delete this provider?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected providers"
        message={`Are you sure you want to delete ${selectedIds.size} provider(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}