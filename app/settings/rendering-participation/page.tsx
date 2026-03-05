"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { renderingParticipationsApi } from "@/lib/services/renderingParticipations";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { lookupsApi } from "@/lib/services/lookups";
import { useToast } from "@/lib/contexts/ToastContext";
import type {
  RenderingProviderPlanParticipationListItemDto,
  CreateRenderingProviderPlanParticipationRequest,
  UpdateRenderingProviderPlanParticipationRequest,
} from "@/lib/services/renderingParticipations";
import type { EntityProviderLookupDto, PlanLookupDto } from "@/lib/services/lookups";
import type { ValueLabelDto } from "@/lib/services/lookups";
import type { PaginatedList } from "@/lib/types";
import { toDateInput } from "@/lib/utils";

const defaultForm: CreateRenderingProviderPlanParticipationRequest = {
  entityProviderId: "",
  planId: "",
  participationStatus: 0,
  effectiveFrom: null,
  effectiveTo: null,
  source: 0,
  isActive: true,
};

export default function RenderingParticipationPage() {
  const [data, setData] = useState<PaginatedList<RenderingProviderPlanParticipationListItemDto> | null>(null);
  const [entityProviders, setEntityProviders] = useState<EntityProviderLookupDto[]>([]);
  const [plans, setPlans] = useState<PlanLookupDto[]>([]);
  const [participationStatuses, setParticipationStatuses] = useState<ValueLabelDto[]>([]);
  const [participationSources, setParticipationSources] = useState<ValueLabelDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateRenderingProviderPlanParticipationRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = renderingParticipationsApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Rendering Provider Plan Participations");

  const loadList = useCallback(() => {
    setError(null);
    api.getList({ pageNumber: page, pageSize }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    lookupsApi().getEntityProviders().then(setEntityProviders).catch(() => setEntityProviders([]));
    lookupsApi().getPlans().then(setPlans).catch(() => setPlans([]));
    lookupsApi().getParticipationStatuses().then(setParticipationStatuses).catch(() => setParticipationStatuses([]));
    lookupsApi().getParticipationSources().then(setParticipationSources).catch(() => setParticipationSources([]));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...defaultForm,
      entityProviderId: entityProviders[0]?.id ?? "",
      planId: plans[0]?.id ?? "",
      participationStatus: participationStatuses[0] ? Number(participationStatuses[0].value) : 0,
      source: participationSources[0] ? Number(participationSources[0].value) : 0,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (row: RenderingProviderPlanParticipationListItemDto) => {
    setEditId(row.id);
    try {
      const detail = await api.getById(row.id);
      setForm({
        entityProviderId: detail.entityProviderId,
        planId: detail.planId,
        participationStatus: detail.participationStatus,
        effectiveFrom: detail.effectiveFrom ?? null,
        effectiveTo: detail.effectiveTo ?? null,
        source: detail.source,
        isActive: detail.isActive,
      });
    } catch {
      setFormError("Failed to load participation.");
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.entityProviderId || !form.planId) {
      setFormError("Provider and plan are required.");
      return;
    }
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, form as UpdateRenderingProviderPlanParticipationRequest);
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

  const statusLabel = (n: number) => participationStatuses.find((o) => Number(o.value) === n)?.label ?? String(n);

  if (!canView) {
    return (
      <div>
        <PageHeader title="Rendering Provider-Plan Participation" description="Network participation status." />
        <Card>
          <AccessRestrictedContent sectionName="Rendering Participation" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Rendering Provider-Plan Participation" description="Network participation status." />
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
          <Button
            onClick={openCreate}
            className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
          >
            <>Add Rendering Participation <ArrowRight className="ml-1 h-4 w-4" /></>
          </Button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Effective from</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Effective to</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Active</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-sm">{row.providerName ?? row.entityProviderId}</td>
                    <td className="px-4 py-3 text-sm">{row.planName ?? row.planId}</td>
                    <td className="px-4 py-3 text-sm">{statusLabel(row.participationStatus)}</td>
                    <td className="px-4 py-3 text-sm">{row.effectiveFrom ? toDateInput(row.effectiveFrom) : "—"}</td>
                    <td className="px-4 py-3 text-sm">{row.effectiveTo ? toDateInput(row.effectiveTo) : "—"}</td>
                    <td className="px-4 py-3 text-sm">{row.isActive ? "Yes" : "No"}</td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3 text-sm">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit participation" : "Add participation"} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider *</label>
              <select value={form.entityProviderId} onChange={(e) => setForm((f) => ({ ...f, entityProviderId: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" required>
                <option value="">Select provider</option>
                {entityProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Plan *</label>
              <select value={form.planId} onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" required>
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Participation status</label>
              <select value={form.participationStatus} onChange={(e) => setForm((f) => ({ ...f, participationStatus: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {participationStatuses.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Source</label>
              <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                {participationSources.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Effective from</label>
              <input type="date" value={toDateInput(form.effectiveFrom ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Effective to</label>
              <input type="date" value={toDateInput(form.effectiveTo ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
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

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete participation" message="Are you sure you want to delete this participation?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  );
}
