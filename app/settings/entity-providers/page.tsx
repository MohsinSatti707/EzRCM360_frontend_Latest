"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { entityProvidersApi } from "@/lib/services/entityProviders";
import { lookupsApi } from "@/lib/services/lookups";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEntityProviderRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = entityProvidersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Entity Providers");

  const loadList = useCallback(() => {
    setError(null);
    api.getList({ pageNumber: page, pageSize: 10 }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page]);

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
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add provider</Button>
          </div>
        )}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Provider name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">NPI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Primary specialty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Secondary specialty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Active</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.entityDisplayName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{row.providerName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.npi}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{providerTypeLabel(row.providerType)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.primarySpecialty ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.secondarySpecialty ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{row.isActive ? "Yes" : "No"}</td>
                      {(canUpdate || canDelete) && (
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          {canUpdate && <Button variant="ghost" className="mr-1" onClick={() => openEdit(row)}>Edit</Button>}
                          {canDelete && <Button variant="danger" onClick={() => setDeleteId(row.id)}>Delete</Button>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Page {data.pageNumber} of {data.totalPages} ({data.totalCount} total)</p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={!data.hasPreviousPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="secondary" disabled={!data.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
        {!data && !error && <div className="py-8 text-center text-sm text-slate-500">Loading…</div>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit provider" : "Add provider"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Entity *</label>
              <select value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                <option value="">Select</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Provider name *</label>
              <input type="text" value={form.providerName} onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">NPI *</label>
              <input type="text" value={form.npi} onChange={(e) => setForm((f) => ({ ...f, npi: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Provider type</label>
              <select value={form.providerType} onChange={(e) => setForm((f) => ({ ...f, providerType: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {PROVIDER_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">SSN</label>
              <input type="text" value={form.ssn ?? ""} onChange={(e) => setForm((f) => ({ ...f, ssn: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Primary specialty</label>
              <input type="text" value={form.primarySpecialty ?? ""} onChange={(e) => setForm((f) => ({ ...f, primarySpecialty: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Secondary specialty</label>
              <input type="text" value={form.secondarySpecialty ?? ""} onChange={(e) => setForm((f) => ({ ...f, secondarySpecialty: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </div>
          </div>
          <ModalFooter onCancel={() => setModalOpen(false)} submitLabel={editId ? "Update" : "Create"} onSubmit={handleSubmit} loading={submitLoading} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete provider" message="Are you sure you want to delete this provider?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  );
}
