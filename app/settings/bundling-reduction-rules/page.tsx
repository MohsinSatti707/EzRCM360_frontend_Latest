"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { bundlingReductionRulesApi } from "@/lib/services/bundlingReductionRules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { BundlingReductionRuleDto, CreateBundlingReductionRuleCommand } from "@/lib/services/bundlingReductionRules";
import type { PaginatedList } from "@/lib/types";
import { toDateInput } from "@/lib/utils";

const RULE_TYPE_OPTIONS = [
  { value: 0, label: "Bundling" },
  { value: 1, label: "Reduction" },
];

const defaultForm: CreateBundlingReductionRuleCommand = {
  primaryCptCode: "",
  secondaryCptCode: "",
  reductionFactor: 0,
  modifier59Override: false,
  ruleType: 0,
  ruleName: null,
  effectiveStartDate: null,
  effectiveEndDate: null,
  isActive: true,
};

export default function BundlingReductionRulesPage() {
  const [data, setData] = useState<PaginatedList<BundlingReductionRuleDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateBundlingReductionRuleCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = bundlingReductionRulesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Bundling/Reduction Rules");

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

  const openEdit = async (row: BundlingReductionRuleDto) => {
    setEditId(row.id);
    setForm({
      primaryCptCode: row.primaryCptCode,
      secondaryCptCode: row.secondaryCptCode,
      reductionFactor: row.reductionFactor,
      modifier59Override: row.modifier59Override,
      ruleType: row.ruleType,
      ruleName: row.ruleName ?? null,
      effectiveStartDate: row.effectiveStartDate ?? null,
      effectiveEndDate: row.effectiveEndDate ?? null,
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.primaryCptCode.trim() || !form.secondaryCptCode.trim()) {
      setFormError("Primary and secondary CPT codes are required.");
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

  const ruleTypeLabel = (n: number) => RULE_TYPE_OPTIONS.find((o) => o.value === n)?.label ?? String(n);

  if (!canView) {
    return (
      <div>
        <PageHeader title="Bundling / Reduction Rules" description="Bundling and multiple procedure reduction rules." />
        <Card>
          <AccessRestrictedContent sectionName="Bundling & Reduction Rules" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Bundling / Reduction Rules" description="Bundling and multiple procedure reduction rules." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add rule</Button>
          </div>
        )}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Primary CPT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Secondary CPT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Reduction factor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Rule type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Active</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{row.primaryCptCode}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.secondaryCptCode}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.reductionFactor}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{ruleTypeLabel(row.ruleType)}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit rule" : "Add rule"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Primary CPT code *</label>
              <input type="text" value={form.primaryCptCode} onChange={(e) => setForm((f) => ({ ...f, primaryCptCode: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Secondary CPT code *</label>
              <input type="text" value={form.secondaryCptCode} onChange={(e) => setForm((f) => ({ ...f, secondaryCptCode: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reduction factor</label>
              <input type="number" step="any" value={form.reductionFactor} onChange={(e) => setForm((f) => ({ ...f, reductionFactor: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rule type</label>
              <select value={form.ruleType} onChange={(e) => setForm((f) => ({ ...f, ruleType: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {RULE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Rule name</label>
              <input type="text" value={form.ruleName ?? ""} onChange={(e) => setForm((f) => ({ ...f, ruleName: e.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.modifier59Override} onChange={(e) => setForm((f) => ({ ...f, modifier59Override: e.target.checked }))} className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">Modifier 59 override</span>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Effective start date</label>
              <input type="date" value={toDateInput(form.effectiveStartDate ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveStartDate: e.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Effective end date</label>
              <input type="date" value={toDateInput(form.effectiveEndDate ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveEndDate: e.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </div>
          </div>
          <ModalFooter onCancel={() => setModalOpen(false)} submitLabel={editId ? "Update" : "Create"} onSubmit={handleSubmit} loading={submitLoading} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete rule" message="Are you sure you want to delete this rule?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  );
}
