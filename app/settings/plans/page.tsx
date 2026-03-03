"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { plansApi } from "@/lib/services/plans";
import { lookupsApi } from "@/lib/services/lookups";
import { usePaginatedList } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { PlanListItemDto, CreatePlanRequest, UpdatePlanRequest } from "@/lib/services/plans";
import type { PayerLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Plans";
const STATUS_OPTIONS = [{ value: 0, name: "Inactive" }, { value: 1, name: "Active" }];

export default function PlansPage() {
  const [payers, setPayers] = useState<PayerLookupDto[]>([]);
  const [planCategories, setPlanCategories] = useState<{ value: string; label: string }[]>([]);
  const [planTypes, setPlanTypes] = useState<{ value: string; label: string }[]>([]);
  const [marketTypes, setMarketTypes] = useState<{ value: string; label: string }[]>([]);
  const [nsaCategories, setNsaCategories] = useState<{ value: string; label: string }[]>([]);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePlanRequest>({
    payerId: "",
    planName: "",
    aliases: "",
    planIdPrefix: "",
    planCategory: 0,
    planType: 0,
    marketType: null,
    oonBenefits: false,
    planResponsibilityPct: null,
    patientResponsibilityPct: null,
    typicalDeductible: null,
    oopMax: null,
    nsaEligible: false,
    nsaCategory: null,
    providerParticipationApplicable: false,
    timelyFilingInitialDays: 0,
    timelyFilingResubmissionDays: null,
    timelyFilingAppealDays: 0,
    status: 1,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = plansApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission(MODULE_NAME);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize: 10,
    fetch: api.getList,
  });

  useEffect(() => {
    lookupsApi().getPayers().then(setPayers).catch(() => setPayers([]));
    lookupsApi().getPlanCategories().then(setPlanCategories).catch(() => setPlanCategories([]));
    lookupsApi().getPlanTypes().then(setPlanTypes).catch(() => setPlanTypes([]));
    lookupsApi().getMarketTypes().then(setMarketTypes).catch(() => setMarketTypes([]));
    lookupsApi().getNsaCategories().then(setNsaCategories).catch(() => setNsaCategories([]));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({
      payerId: payers[0]?.id ?? "",
      planName: "",
      aliases: "",
      planIdPrefix: "",
      planCategory: 0,
      planType: 0,
      marketType: null,
      oonBenefits: false,
      planResponsibilityPct: null,
      patientResponsibilityPct: null,
      typicalDeductible: null,
      oopMax: null,
      nsaEligible: false,
      nsaCategory: null,
      providerParticipationApplicable: false,
      timelyFilingInitialDays: 0,
      timelyFilingResubmissionDays: null,
      timelyFilingAppealDays: 0,
      status: 1,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (row: PlanListItemDto) => {
    setEditId(row.id);
    try {
      const detail = await api.getById(row.id);
      setForm({
        payerId: detail.payerId,
        planName: detail.planName,
        aliases: detail.aliases ?? "",
        planIdPrefix: detail.planIdPrefix ?? "",
        planCategory: detail.planCategory,
        planType: detail.planType,
        marketType: detail.marketType ?? null,
        oonBenefits: detail.oonBenefits,
        planResponsibilityPct: detail.planResponsibilityPct ?? null,
        patientResponsibilityPct: detail.patientResponsibilityPct ?? null,
        typicalDeductible: detail.typicalDeductible ?? null,
        oopMax: detail.oopMax ?? null,
        nsaEligible: detail.nsaEligible,
        nsaCategory: detail.nsaCategory ?? null,
        providerParticipationApplicable: detail.providerParticipationApplicable,
        timelyFilingInitialDays: detail.timelyFilingInitialDays,
        timelyFilingResubmissionDays: detail.timelyFilingResubmissionDays ?? null,
        timelyFilingAppealDays: detail.timelyFilingAppealDays,
        status: detail.status,
      });
    } catch {
      setFormError("Failed to load plan.");
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.planName.trim() || !form.payerId) {
      setFormError("Payer and plan name are required.");
      return;
    }
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, form as UpdatePlanRequest);
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      reload();
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
      reload();
      toast.success("Deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const planCategoryLabel = (n: number) => planCategories.find((c) => Number(c.value) === n)?.label ?? String(n);
  const planTypeLabel = (n: number) => planTypes.find((t) => Number(t.value) === n)?.label ?? String(n);
  const statusLabel = (n: number) => STATUS_OPTIONS.find((o) => o.value === n)?.name ?? String(n);

  if (!canView) {
    return (
      <div>
        <PageHeader title="Plan Configuration" description="Centralized plan registry." />
        <Card>
          <AccessRestrictedContent sectionName="Plan Configuration" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Plan Configuration" description="Centralized plan registry." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add plan</Button>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        {data && (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Plan name</TableHeaderCell>
                  <TableHeaderCell>Payer</TableHeaderCell>
                  <TableHeaderCell>Category / Type</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  {(canUpdate || canDelete) && <TableHeaderCell align="right">Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-foreground">{row.planName}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.linkedPayerName}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {planCategoryLabel(row.planCategory)} / {planTypeLabel(row.planType)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{statusLabel(row.status)}</TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell align="right" className="min-w-[180px]">
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
            />
          </>
        )}
        {loading && !data && !error && (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit plan" : "Add plan"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && (
          <div className="mb-4">
            <Alert variant="error">{formError}</Alert>
          </div>
        )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Payer *</label>
              <select value={form.payerId} onChange={(e) => setForm((f) => ({ ...f, payerId: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" required>
                <option value="">Select payer</option>
                {payers.map((p) => (
                  <option key={p.id} value={p.id}>{p.payerName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Plan name *</label>
              <input type="text" value={form.planName} onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Aliases</label>
              <input type="text" value={form.aliases ?? ""} onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="Optional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Plan ID prefix</label>
              <input type="text" value={form.planIdPrefix ?? ""} onChange={(e) => setForm((f) => ({ ...f, planIdPrefix: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Plan category</label>
              <select value={form.planCategory} onChange={(e) => setForm((f) => ({ ...f, planCategory: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {planCategories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Plan type</label>
              <select value={form.planType} onChange={(e) => setForm((f) => ({ ...f, planType: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {planTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Market type</label>
              <select value={form.marketType ?? ""} onChange={(e) => setForm((f) => ({ ...f, marketType: e.target.value ? Number(e.target.value) : null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                <option value="">—</option>
                {marketTypes.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">NSA category</label>
              <select value={form.nsaCategory ?? ""} onChange={(e) => setForm((f) => ({ ...f, nsaCategory: e.target.value ? Number(e.target.value) : null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                <option value="">—</option>
                {nsaCategories.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.oonBenefits} onChange={(e) => setForm((f) => ({ ...f, oonBenefits: e.target.checked }))} className="rounded border-input" />
                <span className="text-sm text-foreground">OON benefits</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.nsaEligible} onChange={(e) => setForm((f) => ({ ...f, nsaEligible: e.target.checked }))} className="rounded border-input" />
                <span className="text-sm text-foreground">NSA eligible</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.providerParticipationApplicable} onChange={(e) => setForm((f) => ({ ...f, providerParticipationApplicable: e.target.checked }))} className="rounded border-input" />
                <span className="text-sm text-foreground">Provider participation applicable</span>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Plan responsibility %</label>
              <input type="number" step="any" value={form.planResponsibilityPct ?? ""} onChange={(e) => setForm((f) => ({ ...f, planResponsibilityPct: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="—" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Patient responsibility %</label>
              <input type="number" step="any" value={form.patientResponsibilityPct ?? ""} onChange={(e) => setForm((f) => ({ ...f, patientResponsibilityPct: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="—" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Typical deductible</label>
              <input type="number" step="any" value={form.typicalDeductible ?? ""} onChange={(e) => setForm((f) => ({ ...f, typicalDeductible: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="—" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">OOP max</label>
              <input type="number" step="any" value={form.oopMax ?? ""} onChange={(e) => setForm((f) => ({ ...f, oopMax: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="—" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Timely filing initial (days)</label>
              <input type="number" value={form.timelyFilingInitialDays} onChange={(e) => setForm((f) => ({ ...f, timelyFilingInitialDays: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Timely filing resubmission (days)</label>
              <input type="number" value={form.timelyFilingResubmissionDays ?? ""} onChange={(e) => setForm((f) => ({ ...f, timelyFilingResubmissionDays: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="—" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Timely filing appeal (days)</label>
              <input type="number" value={form.timelyFilingAppealDays} onChange={(e) => setForm((f) => ({ ...f, timelyFilingAppealDays: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
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

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete plan" message="Are you sure you want to delete this plan?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  );
}
