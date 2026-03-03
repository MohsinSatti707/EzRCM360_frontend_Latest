"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { financialModifiersApi } from "@/lib/services/financialModifiers";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { FinancialModifierDto, CreateFinancialModifierCommand } from "@/lib/services/financialModifiers";
import type { PaginatedList } from "@/lib/types";
import { toDateInput } from "@/lib/utils";

const defaultForm: CreateFinancialModifierCommand = {
  modifierCode: "",
  factor: 0,
  description: null,
  effectiveStartDate: null,
  effectiveEndDate: null,
  isActive: true,
};

export default function FinancialModifiersPage() {
  const [data, setData] = useState<PaginatedList<FinancialModifierDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFinancialModifierCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = financialModifiersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Financial Modifiers");

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

  const openEdit = async (row: FinancialModifierDto) => {
    setEditId(row.id);
    setForm({
      modifierCode: row.modifierCode,
      factor: row.factor,
      description: row.description ?? null,
      effectiveStartDate: row.effectiveStartDate ?? null,
      effectiveEndDate: row.effectiveEndDate ?? null,
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.modifierCode.trim()) {
      setFormError("Modifier code is required.");
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
        <PageHeader title="Financial Modifiers" description="Financial modifier factors (e.g. MER)." />
        <Card>
          <AccessRestrictedContent sectionName="Financial Modifiers" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Financial Modifiers" description="Financial modifier factors (e.g. MER)." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add financial modifier</Button>
          </div>
        )}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Modifier code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Factor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Effective from</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Effective to</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Active</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{row.modifierCode}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{row.factor}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.description ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{row.effectiveStartDate ? toDateInput(row.effectiveStartDate) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{row.effectiveEndDate ? toDateInput(row.effectiveEndDate) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{row.isActive ? "Yes" : "No"}</td>
                      {(canUpdate || canDelete) && (
                        <td className="min-w-[180px] whitespace-nowrap px-5 py-4 text-right">
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
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Page {data.pageNumber} of {data.totalPages} ({data.totalCount} total)</p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={!data.hasPreviousPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="secondary" disabled={!data.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
        {!data && !error && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit financial modifier" : "Add financial modifier"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Modifier code *</label>
              <input type="text" value={form.modifierCode} onChange={(e) => setForm((f) => ({ ...f, modifierCode: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Factor</label>
              <input type="number" step="any" value={form.factor} onChange={(e) => setForm((f) => ({ ...f, factor: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
              <input type="text" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
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

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete financial modifier" message="Are you sure you want to delete this financial modifier?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  );
}
