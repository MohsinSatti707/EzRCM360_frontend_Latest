"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { feeSchedulesApi } from "@/lib/services/feeSchedules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { FeeScheduleDto, FeeScheduleDetailDto, CreateFeeScheduleCommand } from "@/lib/services/feeSchedules";
import type { PaginatedList } from "@/lib/types";

const STATUS_OPTIONS = [{ value: 0, name: "Active" }, { value: 1, name: "Inactive" }];

const defaultForm: CreateFeeScheduleCommand = {
  scheduleCode: "",
  category: 0,
  state: "",
  geoType: 0,
  geoCode: "",
  geoName: "",
  billingType: 0,
  year: new Date().getFullYear(),
  quarter: 1,
  calculationModel: 0,
  adoptFeeScheduleId: null,
  multiplierPct: 0,
  fallbackCategory: null,
  status: 0,
};

export default function FeeSchedulesPage() {
  const [data, setData] = useState<PaginatedList<FeeScheduleDto> | null>(null);
  const [lookups, setLookups] = useState<Awaited<ReturnType<ReturnType<typeof feeSchedulesApi>["getLookups"]>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFeeScheduleCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = feeSchedulesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Fee Schedules");

  const loadList = useCallback(() => {
    setError(null);
    api.getList({ pageNumber: page, pageSize: 10 }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page]);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    api.getLookups().then(setLookups).catch(() => setLookups(null));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...defaultForm,
      year: lookups?.years?.[0] ?? new Date().getFullYear(),
    });
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (row: FeeScheduleDto) => {
    setEditId(row.id);
    setFormError(null);
    setModalOpen(true);
    api.getById(row.id).then((detail: FeeScheduleDetailDto) => {
      setForm({
        scheduleCode: detail.scheduleCode ?? "",
        category: detail.category,
        state: detail.state ?? "",
        geoType: detail.geoType,
        geoCode: detail.geoCode ?? "",
        geoName: detail.geoName ?? "",
        billingType: detail.billingType,
        year: detail.year,
        quarter: detail.quarter,
        calculationModel: detail.calculationModel,
        adoptFeeScheduleId: detail.adoptFeeScheduleId ?? null,
        multiplierPct: detail.multiplierPct,
        fallbackCategory: detail.fallbackCategory ?? null,
        status: detail.status,
      });
    }).catch(() => setFormError("Failed to load."));
  };

  const handleSubmit = async () => {
    setFormError(null);
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

  const categoryLabel = (n: number) => lookups?.categories?.find((c) => c.value === n)?.name ?? String(n);
  const statusLabel = (n: number) => STATUS_OPTIONS.find((o) => o.value === n)?.name ?? String(n);

  if (!canView) {
    return (
      <div>
        <PageHeader title="Fee Schedules" description="Centralized valuation datasets." />
        <Card>
          <AccessRestrictedContent sectionName="Fee Schedules" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Fee Schedules" description="Centralized valuation datasets." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add fee schedule</Button>
          </div>
        )}
        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">State</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Year / Q</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                    {(canUpdate || canDelete) && (
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">{row.scheduleCode ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{categoryLabel(row.category)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{row.state ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{row.year} / {row.quarter}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{statusLabel(row.status)}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit fee schedule" : "Add fee schedule"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Schedule code</label>
              <input type="text" value={form.scheduleCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, scheduleCode: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {lookups?.categories?.map((c) => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">State</label>
              <select value={form.state ?? ""} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                <option value="">—</option>
                {lookups?.states?.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Geo type</label>
              <select value={form.geoType} onChange={(e) => setForm((f) => ({ ...f, geoType: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {lookups?.geoTypes?.map((g) => (
                  <option key={g.value} value={g.value}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Billing type</label>
              <select value={form.billingType} onChange={(e) => setForm((f) => ({ ...f, billingType: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {lookups?.billingTypes?.map((b) => (
                  <option key={b.value} value={b.value}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Year</label>
              <select value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {lookups?.years?.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Quarter</label>
              <input type="number" min={1} max={4} value={form.quarter} onChange={(e) => setForm((f) => ({ ...f, quarter: Number(e.target.value) || 1 }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Calculation model</label>
              <select value={form.calculationModel} onChange={(e) => setForm((f) => ({ ...f, calculationModel: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {lookups?.calculationModels?.map((c) => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Multiplier %</label>
              <input type="number" step={0.01} value={form.multiplierPct} onChange={(e) => setForm((f) => ({ ...f, multiplierPct: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          <ModalFooter onCancel={() => setModalOpen(false)} submitLabel={editId ? "Update" : "Create"} onSubmit={handleSubmit} loading={submitLoading} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete fee schedule" message="Are you sure you want to delete this fee schedule?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  );
}
