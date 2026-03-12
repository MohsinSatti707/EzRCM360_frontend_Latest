"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
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

  const api = entityProvidersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Entity Providers");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const loadList = useCallback(() => {
    setError(null);
    api.getList({ pageNumber: page, pageSize, search: debouncedSearch || undefined }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, pageSize, debouncedSearch]);

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
  const openEdit = (row: EntityProviderListItemDto) => {
    setEditId(row.id);
    api.getById(row.id).then((detail) => {
      setForm({
        entityId: detail.entityId,
        providerName: detail.providerName,
        npi: detail.npi,
        ssn: detail.ssn ?? "",
        providerType: detail.providerType,
        primarySpecialty: detail.primarySpecialty ?? "",
        secondarySpecialty: detail.secondarySpecialty ?? "",
        isActive: detail.isActive,
      });
    }).catch(() => setFormError("Failed to load."));
    setFormError(null);
    setModalOpen(true);
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

  const providerTypeLabel = (n: number) => PROVIDER_TYPES.find((p) => p.value === n)?.name ?? String(n);

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
    <div>
      <PageHeader title="Entity Providers" description="Manage entity providers." />

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-[300px] rounded-[5px] border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        {canCreate && (
          <div className="flex items-center gap-3">
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
              <>Add Entity Provider <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          </div>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {data && (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Entity</TableHeaderCell>
                <TableHeaderCell>Provider name</TableHeaderCell>
                <TableHeaderCell>NPI</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Primary specialty</TableHeaderCell>
                <TableHeaderCell>Secondary specialty</TableHeaderCell>
                <TableHeaderCell>Active</TableHeaderCell>
                {(canUpdate || canDelete) && <TableHeaderCell>Actions</TableHeaderCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.entityDisplayName}</TableCell>
                  <TableCell>{row.providerName}</TableCell>
                  <TableCell>{row.npi}</TableCell>
                  <TableCell>{providerTypeLabel(row.providerType)}</TableCell>
                  <TableCell>{row.primarySpecialty ?? "—"}</TableCell>
                  <TableCell>{row.secondarySpecialty ?? "—"}</TableCell>
                  <TableCell>{row.isActive ? "Yes" : "No"}</TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell>
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
      {!data && !error && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit provider" : "Add provider"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Entity *</label>
              <select value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" required>
                <option value="">Select</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider name *</label>
              <input type="text" value={form.providerName} onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">NPI *</label>
              <input type="text" value={form.npi} onChange={(e) => setForm((f) => ({ ...f, npi: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider type</label>
              <select value={form.providerType} onChange={(e) => setForm((f) => ({ ...f, providerType: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {PROVIDER_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">SSN</label>
              <input type="text" value={form.ssn ?? ""} onChange={(e) => setForm((f) => ({ ...f, ssn: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Primary specialty</label>
              <input type="text" value={form.primarySpecialty ?? ""} onChange={(e) => setForm((f) => ({ ...f, primarySpecialty: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Secondary specialty</label>
              <input type="text" value={form.secondarySpecialty ?? ""} onChange={(e) => setForm((f) => ({ ...f, secondarySpecialty: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
          </div>
          <ModalFooter onCancel={() => setModalOpen(false)} submitLabel={editId ? "Update" : "Create"} onSubmit={handleSubmit} loading={submitLoading} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete provider" message="Are you sure you want to delete this provider?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
