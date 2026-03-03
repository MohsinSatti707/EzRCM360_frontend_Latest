"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ndcCodesApi } from "@/lib/services/ndcCodes";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { NdcCodeDto, CreateNdcCodeCommand } from "@/lib/services/ndcCodes";
import type { PaginatedList } from "@/lib/types";
import { toDateInput } from "@/lib/utils";

const defaultForm: CreateNdcCodeCommand = {
  ndcCodeValue: "",
  description: "",
  packageSize: null,
  unitOfMeasure: null,
  effectiveStartDate: null,
  effectiveEndDate: null,
  isActive: true,
};

export default function NdcCodesPage() {
  const [data, setData] = useState<PaginatedList<NdcCodeDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateNdcCodeCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = ndcCodesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("NDC Codes");

  const loadList = useCallback(() => {
    setError(null);
    api.getList({ pageNumber: page, pageSize: 10 }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (row: NdcCodeDto) => {
    setEditId(row.id);
    setForm({
      ndcCodeValue: row.ndcCodeValue,
      description: row.description,
      packageSize: row.packageSize ?? null,
      unitOfMeasure: row.unitOfMeasure ?? null,
      effectiveStartDate: row.effectiveStartDate ?? null,
      effectiveEndDate: row.effectiveEndDate ?? null,
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.ndcCodeValue.trim() || !form.description.trim()) {
      setFormError("NDC code value and description are required.");
      return;
    }
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, form);
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

  if (!canView) {
    return (
      <div>
        <PageHeader title="NDC Codes" description="National Drug Code master." />
        <Card>
          <AccessRestrictedContent sectionName="NDC Codes" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="NDC Codes" description="National Drug Code master." />
      <Card className="p-6">
        {canCreate && (
          <div className="mb-6 flex justify-end">
            <Button onClick={openCreate}>Add NDC code</Button>
          </div>
        )}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">NDC code</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Package size</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Unit of measure</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Effective from</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Effective to</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</th>
                    {(canUpdate || canDelete) && (
                      <th className="min-w-[180px] px-5 py-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-muted/50">
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-foreground">{row.ndcCodeValue}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{row.description}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">{row.packageSize ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">{row.unitOfMeasure ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">{row.effectiveStartDate ? toDateInput(row.effectiveStartDate) : "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">{row.effectiveEndDate ? toDateInput(row.effectiveEndDate) : "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">{row.isActive ? "Yes" : "No"}</td>
                      {(canUpdate || canDelete) && (
                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <TableActionsCell
                            canEdit={canUpdate}
                            canDelete={canDelete}
                            onEdit={() => openEdit(row)}
                            onDelete={() => setDeleteId(row.id)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">Page {data.pageNumber} of {data.totalPages} ({data.totalCount} total)</p>
              <div className="flex gap-3">
                <Button variant="secondary" disabled={!data.hasPreviousPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="secondary" disabled={!data.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
        {!data && !error && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit NDC code" : "Add NDC code"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">NDC code value *</label>
              <input type="text" value={form.ndcCodeValue} onChange={(e) => setForm((f) => ({ ...f, ndcCodeValue: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Package size</label>
              <input type="text" value={form.packageSize ?? ""} onChange={(e) => setForm((f) => ({ ...f, packageSize: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Description *</label>
              <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Unit of measure</label>
              <input type="text" value={form.unitOfMeasure ?? ""} onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Effective start date</label>
              <input type="date" value={toDateInput(form.effectiveStartDate ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveStartDate: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Effective end date</label>
              <input type="date" value={toDateInput(form.effectiveEndDate ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveEndDate: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded border-input" />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
          </div>
          <ModalFooter onCancel={() => setModalOpen(false)} submitLabel={editId ? "Update" : "Create"} onSubmit={handleSubmit} loading={submitLoading} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete NDC code" message="Are you sure you want to delete this NDC code?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  );
}
