"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, ArrowRight, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { Checkbox } from "@/components/ui/Checkbox";
import { renderingParticipationsApi } from "@/lib/services/renderingParticipations";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { lookupsApi } from "@/lib/services/lookups";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/lib/contexts/ToastContext";
import { CellTooltip } from "@/components/ui/CellTooltip";
import type {
  RenderingProviderPlanParticipationListItemDto,
  CreateRenderingProviderPlanParticipationRequest,
  UpdateRenderingProviderPlanParticipationRequest,
} from "@/lib/services/renderingParticipations";
import type { EntityLookupDto, PayerLookupDto, EntityProviderLookupDto, PlanLookupDto } from "@/lib/services/lookups";
import type { ValueLabelDto } from "@/lib/services/lookups";
import type { PaginatedList } from "@/lib/types";
import { useDebounce } from "@/lib/hooks";
import { toDateInput, resolveEnum, ENUMS } from "@/lib/utils";

const ACTIVE_OPTIONS = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

const defaultForm: CreateRenderingProviderPlanParticipationRequest = {
  entityProviderId: "",
  payerId: "",
  planId: "",
  participationStatus: 0,
  effectiveFrom: null,
  effectiveTo: null,
  source: 0,
  isActive: true,
};

export default function RenderingParticipationPage() {
  const [data, setData] = useState<PaginatedList<RenderingProviderPlanParticipationListItemDto> | null>(null);
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [payers, setPayers] = useState<PayerLookupDto[]>([]);
  const [allEntityProviders, setAllEntityProviders] = useState<EntityProviderLookupDto[]>([]);
  const [allPlans, setAllPlans] = useState<PlanLookupDto[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedPayerId, setSelectedPayerId] = useState("");
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
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const api = renderingParticipationsApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission("Rendering Provider Plan Participations");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const loadList = useCallback(async () => {
    setError(null);
    await api.getList({
      pageNumber: page,
      pageSize,
      search: debouncedSearch || undefined,
      isActive: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    lookupsApi().getEntities().then(setEntities).catch(() => setEntities([]));
    lookupsApi().getPayers().then(setPayers).catch(() => setPayers([]));
    lookupsApi().getEntityProviders().then(setAllEntityProviders).catch(() => setAllEntityProviders([]));
    lookupsApi().getPlans().then(setAllPlans).catch(() => setAllPlans([]));
    lookupsApi().getParticipationStatuses().then(setParticipationStatuses).catch(() => setParticipationStatuses([]));
    lookupsApi().getParticipationSources().then(setParticipationSources).catch(() => setParticipationSources([]));
  }, []);

  const filteredProviders = useMemo(
    () => selectedEntityId ? allEntityProviders.filter((p) => p.entityId === selectedEntityId) : allEntityProviders,
    [allEntityProviders, selectedEntityId]
  );
  const selectedPayer = payers.find((p) => p.id === selectedPayerId);
  const isSelectedPayerCommercialInsurance = selectedPayer != null
    && resolveEnum(selectedPayer.entityType, ENUMS.PayerEntityType) === ENUMS.PayerEntityType.Insurance
    && selectedPayer.insuranceSubCategory != null
    && resolveEnum(selectedPayer.insuranceSubCategory, ENUMS.PlanCategory) === ENUMS.PlanCategory.Commercial;
  const filteredPlans = useMemo(
    () => selectedPayerId ? allPlans.filter((p) => p.payerId === selectedPayerId) : allPlans,
    [allPlans, selectedPayerId]
  );

  const openCreate = () => {
    setEditId(null);
    setSelectedEntityId("");
    setSelectedPayerId("");
    setForm({
      ...defaultForm,
      participationStatus: participationStatuses[0] ? Number(participationStatuses[0].value) : 0,
      source: participationSources[0] ? Number(participationSources[0].value) : 0,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (row: RenderingProviderPlanParticipationListItemDto) => {
    setEditId(row.id);
    setFormError(null);
    try {
      const detail = await api.getById(row.id);
      // Derive parent entity from provider
      const provider = allEntityProviders.find((p) => p.id === detail.entityProviderId);
      setSelectedEntityId(provider?.entityId ?? "");
      // Derive parent payer from detail or fallback to plan's payer
      const payerId = detail.payerId || allPlans.find((p) => p.id === detail.planId)?.payerId || "";
      setSelectedPayerId(payerId);
      setForm({
        entityProviderId: detail.entityProviderId,
        payerId: payerId,
        planId: detail.planId,
        participationStatus: resolveEnum(detail.participationStatus, ENUMS.ParticipationStatus),
        effectiveFrom: detail.effectiveFrom ?? null,
        effectiveTo: detail.effectiveTo ?? null,
        source: resolveEnum(detail.source, ENUMS.ParticipationSource),
        isActive: detail.isActive,
      });
      setModalOpen(true);
    } catch {
      setFormError("Failed to load participation.");
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    const planRequired = isSelectedPayerCommercialInsurance;
    if (!selectedEntityId || !form.entityProviderId || !selectedPayerId || (planRequired && !form.planId)) {
      setFormError(planRequired ? "Entity, provider, payer, and plan are all required." : "Entity, provider, and payer are all required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, form as UpdateRenderingProviderPlanParticipationRequest);
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      await loadList();
      toast.success(editId ? "Participation Updated" : "Participation Added", editId ? "The participation has been updated successfully." : "A new participation has been added successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
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
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      await loadList();
      toast.success("Participation Deleted", "The participation has been deleted successfully.");
    } catch (err) {
      toast.error("Delete Failed", err instanceof Error ? err.message : "Delete failed.");
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
      toast.success("Participations Deleted", `${selectedIds.size} participation(s) have been deleted successfully.`);
    } catch (err) {
      toast.error("Bulk Delete Failed", err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (row: RenderingProviderPlanParticipationListItemDto, isActiveValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      const detail = await api.getById(row.id);
      await api.update(row.id, {
        entityProviderId: detail.entityProviderId,
        payerId: detail.payerId,
        planId: detail.planId,
        participationStatus: detail.participationStatus,
        effectiveFrom: detail.effectiveFrom ?? null,
        effectiveTo: detail.effectiveTo ?? null,
        source: detail.source,
        isActive: isActiveValue === 1,
      });
      await loadList();
      toast.success("Status Updated", "The participation status has been updated successfully.");
    } catch (err) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const statusLabel = (n: number) => participationStatuses.find((o) => Number(o.value) === n)?.label ?? String(n);
  const entityNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entities) m.set(e.id, e.displayName);
    return m;
  }, [entities]);
  const payerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of payers) m.set(p.id, p.payerName);
    return m;
  }, [payers]);
  const providerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allEntityProviders) m.set(p.id, p.displayName);
    return m;
  }, [allEntityProviders]);
  const providerEntityIdById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allEntityProviders) m.set(p.id, p.entityId);
    return m;
  }, [allEntityProviders]);
  const planPayerIdById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPlans) m.set(p.id, p.payerId);
    return m;
  }, [allPlans]);
  const planNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPlans) m.set(p.id, p.displayName);
    return m;
  }, [allPlans]);

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Rendering Provider-Plan Participation" description="Network participation status." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

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
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Rendering Provider-Plan Participation" description="Network participation status." />
      {/* Toolbar: search + add button */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              <><Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})</>
            </Button>
          )}
          {canCreate && (
            <BulkImportActions
              apiBase="/api/RenderingProviderPlanParticipations"
              templateFileName="RenderingParticipation_Import_Template.xlsx"
              onImportSuccess={loadList}
              onLoadingChange={setOverlayLoading}
            />
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add Rendering Participation <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {data && data.items.length === 0 && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Image
            src="/icons/svg/no-data-found.svg"
            alt="No Data Found"
            width={180}
            height={180}
          />
          <h3 className="mt-4 text-2xl font-bold font-['Aileron'] text-gray-800">No Data Found</h3>
          <p className="mt-1 text-[15px] font-['Aileron'] text-[#151529]">No data available yet.</p>
        </div>
      )}
      {data && data.items.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[calc(100vh-316px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
            <Table className="min-w-[1600px] table-fixed">
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
                  <TableHeaderCell className="w-[200px] min-w-[200px]">Provider</TableHeaderCell>
                  <TableHeaderCell className="w-[200px] min-w-[200px]">Plan</TableHeaderCell>
                  <TableHeaderCell className="w-[160px] min-w-[160px]">Participation Status</TableHeaderCell>
                  <TableHeaderCell className="w-[140px] min-w-[140px]">Effective From</TableHeaderCell>
                  <TableHeaderCell className="w-[140px] min-w-[140px]">Effective To</TableHeaderCell>
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
                    <TableCell className="w-[200px] min-w-[200px]">
                      <div className="max-w-xs truncate">
                        <CellTooltip text={row.providerName ?? providerNameById.get(row.entityProviderId) ?? "—"} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[200px] min-w-[200px]">
                      <div className="max-w-xs truncate">
                        <CellTooltip text={row.planName ?? planNameById.get(row.planId) ?? "—"} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[160px] min-w-[160px]">
                      <div className="max-w-[140px] truncate">
                        <CellTooltip text={statusLabel(row.participationStatus)} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[140px] min-w-[140px]">
                      <div className="max-w-[120px] truncate">
                        <CellTooltip text={row.effectiveFrom ? toDateInput(row.effectiveFrom) : "—"} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[140px] min-w-[140px]">
                      <div className="max-w-[120px] truncate">
                        <CellTooltip text={row.effectiveTo ? toDateInput(row.effectiveTo) : "—"} />
                      </div>
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
      {!data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit participation" : "Add participation"}
        size="lg"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                {editId ? "Update" : "Add Rendering Participation"}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </>
            }
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="flex flex-col gap-4">
            {/* Entity — hidden per Figma, auto-selected from provider */}
            <input type="hidden" value={selectedEntityId} />
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider</label>
              <select value={form.entityProviderId} onChange={(e) => { const prov = allEntityProviders.find((p) => p.id === e.target.value); if (prov) setSelectedEntityId(prov.entityId); setForm((f) => ({ ...f, entityProviderId: e.target.value })); }} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" required>
                <option value="">Select provider</option>
                {allEntityProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>
            <div className="overflow-hidden">
              <label className="mb-1 block text-sm font-medium text-foreground">Plan</label>
              <select value={form.planId ?? ""} onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                <option value="">Select plan</option>
                {allPlans.map((p) => (
                  <option key={p.id} value={p.id} title={p.displayName}>{p.displayName.length > 60 ? p.displayName.substring(0, 60) + "..." : p.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Participation Status</label>
              <select value={form.participationStatus} onChange={(e) => setForm((f) => ({ ...f, participationStatus: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                {participationStatuses.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Effective From Date</label>
              <input type="date" value={toDateInput(form.effectiveFrom ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value || null }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Effective To Date</label>
              <input type="date" value={toDateInput(form.effectiveTo ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value || null }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Source</label>
              <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                {participationSources.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete participation" message="Are you sure you want to delete this participation?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected participations"
        message={`Are you sure you want to delete ${selectedIds.size} participation(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
