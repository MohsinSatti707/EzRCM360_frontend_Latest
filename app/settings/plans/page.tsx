"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, ArrowRight, Trash2, ChevronUp, Pencil, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Loader } from "@/components/ui/Loader";
import { plansApi } from "@/lib/services/plans";
import { payersApi } from "@/lib/services/payers";
import type { CreatePayerRequest } from "@/lib/services/payers";
import { lookupsApi } from "@/lib/services/lookups";
import type { PlanLookupDto } from "@/lib/services/lookups";
import { PayerFormModal } from "../payers/PayerFormModal";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { PlanFormModal } from "./PlanFormModal";
import { usePaginatedList, useDebounce } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { resolveEnum, resolveEnumNullable, ENUMS } from "@/lib/utils";
import type { PlanListItemDto, CreatePlanRequest, UpdatePlanRequest } from "@/lib/services/plans";
import type { PayerLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Plans";
const STATUS_OPTIONS = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

export default function PlansPage() {
  const [payers, setPayers] = useState<PayerLookupDto[]>([]);
  const [planCategories, setPlanCategories] = useState<{ value: string; label: string }[]>([]);
  const [planTypes, setPlanTypes] = useState<{ value: string; label: string }[]>([]);
  const [marketTypes, setMarketTypes] = useState<{ value: string; label: string }[]>([]);
  const [nsaCategories, setNsaCategories] = useState<{ value: string; label: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [expandedPayers, setExpandedPayers] = useState<Set<string>>(new Set());
  const [createPayerOpen, setCreatePayerOpen] = useState(false);
  const [createPayerForm, setCreatePayerForm] = useState<CreatePayerRequest>({
    payerName: "",
    aliases: "",
    entityType: 0,
    status: 1,
    planIds: [],
    addresses: [],
    phoneNumbers: [],
    emails: [],
  });
  const [createPayerLoading, setCreatePayerLoading] = useState(false);
  const [createPayerError, setCreatePayerError] = useState<string | null>(null);
  const [entityTypes, setEntityTypes] = useState<{ value: string; label: string }[]>([]);
  const [planLookups, setPlanLookups] = useState<PlanLookupDto[]>([]);

  const api = plansApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission(MODULE_NAME);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize,
    extraParams: {
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
    },
    fetch: api.getList,
  });

  const reloadLookups = useCallback(() => {
    lookupsApi().getPayers().then(setPayers).catch(() => setPayers([]));
  }, []);

  useEffect(() => {
    reloadLookups();
    lookupsApi().getPlanCategories().then(setPlanCategories).catch(() => setPlanCategories([]));
    lookupsApi().getPlanTypes().then(setPlanTypes).catch(() => setPlanTypes([]));
    lookupsApi().getMarketTypes().then(setMarketTypes).catch(() => setMarketTypes([]));
    lookupsApi().getNsaCategories().then(setNsaCategories).catch(() => setNsaCategories([]));
    lookupsApi().getPayerEntityTypes().then(setEntityTypes).catch(() => setEntityTypes([]));
    lookupsApi().getPlans().then(setPlanLookups).catch(() => setPlanLookups([]));
  }, []);

  // Group plans by payer for accordion display
  const groupedByPayer = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, { payerId: string; payerName: string; plans: PlanListItemDto[] }>();
    for (const plan of data.items) {
      const payerId = plan.payerId ?? "unlinked";
      const payerName = plan.linkedPayerName ?? "Unlinked";
      if (!groups.has(payerId)) {
        groups.set(payerId, { payerId, payerName, plans: [] });
      }
      groups.get(payerId)!.plans.push(plan);
    }
    return Array.from(groups.values());
  }, [data]);

  // Auto-expand only the first payer group on load
  useEffect(() => {
    if (groupedByPayer.length > 0 && expandedPayers.size === 0) {
      setExpandedPayers(new Set([groupedByPayer[0].payerId]));
    }
  }, [groupedByPayer]);

  const togglePayer = (payerId: string) => {
    setExpandedPayers((prev) => {
      const next = new Set(prev);
      if (next.has(payerId)) next.delete(payerId);
      else next.add(payerId);
      return next;
    });
  };

  const openCreate = (payerId?: string) => {
    setEditId(null);
    setForm({
      payerId: payerId ?? payers[0]?.id ?? "",
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
    setFormError(null);
    try {
      const detail = await api.getById(row.id);
      setForm({
        payerId: detail.payerId,
        planName: detail.planName,
        aliases: detail.aliases ?? "",
        planIdPrefix: detail.planIdPrefix ?? "",
        planCategory: resolveEnum(detail.planCategory, ENUMS.PlanCategory),
        planType: resolveEnum(detail.planType, ENUMS.PlanType),
        marketType: resolveEnumNullable(detail.marketType, ENUMS.MarketType),
        oonBenefits: detail.oonBenefits,
        planResponsibilityPct: detail.planResponsibilityPct ?? null,
        patientResponsibilityPct: detail.patientResponsibilityPct ?? null,
        typicalDeductible: detail.typicalDeductible ?? null,
        oopMax: detail.oopMax ?? null,
        nsaEligible: detail.nsaEligible,
        nsaCategory: resolveEnumNullable(detail.nsaCategory, ENUMS.NsaCategory),
        providerParticipationApplicable: detail.providerParticipationApplicable,
        timelyFilingInitialDays: detail.timelyFilingInitialDays,
        timelyFilingResubmissionDays: detail.timelyFilingResubmissionDays ?? null,
        timelyFilingAppealDays: detail.timelyFilingAppealDays,
        status: resolveEnum(detail.status, ENUMS.PayerStatus),
      });
      setModalOpen(true);
    } catch {
      setFormError("Failed to load plan.");
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.planName.trim() || !form.payerId) {
      setFormError("Payer and plan name are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, form as UpdatePlanRequest);
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      await reload();
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
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      await reload();
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
      await reload();
      toast.success(`${selectedIds.size} record(s) deleted successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (row: PlanListItemDto, statusValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      const detail = await api.getById(row.id);
      await api.update(row.id, {
        payerId: detail.payerId,
        planName: detail.planName,
        aliases: detail.aliases ?? "",
        planIdPrefix: detail.planIdPrefix ?? "",
        planCategory: resolveEnum(detail.planCategory, ENUMS.PlanCategory),
        planType: resolveEnum(detail.planType, ENUMS.PlanType),
        marketType: resolveEnumNullable(detail.marketType, ENUMS.MarketType),
        oonBenefits: detail.oonBenefits,
        planResponsibilityPct: detail.planResponsibilityPct ?? null,
        patientResponsibilityPct: detail.patientResponsibilityPct ?? null,
        typicalDeductible: detail.typicalDeductible ?? null,
        oopMax: detail.oopMax ?? null,
        nsaEligible: detail.nsaEligible,
        nsaCategory: resolveEnumNullable(detail.nsaCategory, ENUMS.NsaCategory),
        providerParticipationApplicable: detail.providerParticipationApplicable,
        timelyFilingInitialDays: detail.timelyFilingInitialDays,
        timelyFilingResubmissionDays: detail.timelyFilingResubmissionDays ?? null,
        timelyFilingAppealDays: detail.timelyFilingAppealDays,
        status: statusValue,
      } as UpdatePlanRequest);
      await reload();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openCreatePayer = () => {
    setCreatePayerForm({
      payerName: "",
      aliases: "",
      entityType: 0,
      status: 1,
      planIds: [],
      addresses: [],
      phoneNumbers: [],
      emails: [],
    });
    setCreatePayerError(null);
    setCreatePayerOpen(true);
  };

  const handleCreatePayer = async () => {
    if (!createPayerForm.payerName.trim()) {
      setCreatePayerError("Payer name is required.");
      return;
    }
    setCreatePayerError(null);
    setCreatePayerLoading(true);
    try {
      await payersApi().create(createPayerForm);
      setCreatePayerOpen(false);
      reloadLookups();
      toast.success("Payer created.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create payer.";
      setCreatePayerError(msg);
      toast.error(msg);
    } finally {
      setCreatePayerLoading(false);
    }
  };

  const planCategoryLabel = (n: number) => planCategories.find((c) => Number(c.value) === n)?.label ?? String(n);
  const planTypeLabel = (n: number) => planTypes.find((t) => Number(t.value) === n)?.label ?? String(n);

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Plan Configurations" description="Centralized plan registry." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div>
        <PageHeader title="Plan Configurations" description="Centralized plan registry." />
        <Card>
          <AccessRestrictedContent sectionName="Plan Configurations" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Plan Configurations" description="Centralized plan registry." />

      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
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
              placeholder="Search"
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
            <>
              <BulkImportActions
                apiBase="/api/Plans"
                templateFileName="Plans_Import_Template.xlsx"
                onImportSuccess={reload}
                onLoadingChange={setOverlayLoading}
              />
              <Button
                onClick={() => openCreate()}
                className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
              >
                <>Add Plan <ArrowRight className="ml-1 h-4 w-4" /></>
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* No Data Found empty state */}
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

      {/* Grouped-by-payer accordion list */}
      {data && data.items.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[calc(100vh-316px)] min-h-0 flex-1 overflow-y-auto space-y-0 rounded-[5px] border border-[#E2E8F0]">
            {groupedByPayer.map((group) => {
              const isExpanded = expandedPayers.has(group.payerId);
              return (
                <div key={group.payerId} className="border-b border-[#E2E8F0] last:border-b-0">
                  {/* Payer header row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F8FAFC]">
                    <button
                      type="button"
                      onClick={() => togglePayer(group.payerId)}
                      className="flex items-center gap-2 font-aileron text-sm font-semibold text-[#0066CC]"
                    >
                      {group.payerName}
                      <ChevronUp
                        className={`h-4 w-4 transition-transform ${isExpanded ? "" : "rotate-180"}`}
                      />
                    </button>
                    <div className="flex items-center gap-3">
                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => openCreate(group.payerId)}
                          className="text-sm font-medium text-[#0066CC] hover:underline"
                        >
                          Add Plan
                        </button>
                      )}
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => {
                            /* Navigate to payer edit — for now open the first plan's edit */
                          }}
                          className="p-1 text-[#64748B] hover:text-[#2A2C33]"
                          title="Edit payer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            /* Payer delete would go here */
                          }}
                          className="p-1 text-[#64748B] hover:text-red-600"
                          title="Delete payer"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Plans under this payer */}
                  {isExpanded && group.plans.length > 0 && (
                    <div className="border-t border-[#E2E8F0] bg-[#FAFBFC]">
                      {group.plans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between border-b border-[#F1F5F9] last:border-b-0 px-6 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-aileron text-sm font-semibold text-[#2A2C33]">
                              {plan.planName}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[#64748B]">
                              {plan.planIdPrefix && (
                                <>
                                  <span>Plan ID: <span className="font-medium text-[#2A2C33]">{plan.planIdPrefix}</span></span>
                                  <span className="text-[#CBD5E1]">&bull;</span>
                                </>
                              )}
                              <span>Plan Category: <span className="font-medium text-[#2A2C33]">{planCategoryLabel(plan.planCategory)}</span></span>
                              <span className="text-[#CBD5E1]">&bull;</span>
                              <span>Plan Type: <span className="font-medium text-[#2A2C33]">{planTypeLabel(plan.planType)}</span></span>
                              <span className="text-[#CBD5E1]">&bull;</span>
                              <span>Out-of-Network Benefits: <span className="font-medium text-[#2A2C33]">{plan.oonBenefits ? "Yes" : "No"}</span></span>
                              <span className="text-[#CBD5E1]">&bull;</span>
                              <span>NSA Eligible: <span className="font-medium text-[#2A2C33]">{plan.nsaEligible ? "Yes" : "No"}</span></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <select
                              value={resolveEnum(plan.status, ENUMS.PayerStatus)}
                              onChange={(e) => handleStatusChange(plan, Number(e.target.value))}
                              disabled={!canUpdate || statusUpdatingId === plan.id}
                              className="input-enterprise w-[100px] rounded-[5px] px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0"
                            >
                              {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.name}</option>
                              ))}
                            </select>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => openEdit(plan)}
                                className="p-1 text-[#64748B] hover:text-[#2A2C33]"
                                title="Edit plan"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteId(plan.id)}
                                className="p-1 text-[#64748B] hover:text-red-600"
                                title="Delete plan"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
      {loading && !data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

      <PlanFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={editId}
        form={form}
        onFormChange={setForm}
        payers={payers}
        planCategories={planCategories}
        planTypes={planTypes}
        marketTypes={marketTypes}
        nsaCategories={nsaCategories}
        onSubmit={handleSubmit}
        loading={submitLoading}
        error={formError}
        onCreatePayer={openCreatePayer}
      />

      {/* Create Payer modal (full form) */}
      <PayerFormModal
        open={createPayerOpen}
        onClose={() => setCreatePayerOpen(false)}
        editId={null}
        form={createPayerForm}
        onFormChange={setCreatePayerForm}
        entityTypeOptions={entityTypes}
        planOptions={planLookups}
        onSubmit={handleCreatePayer}
        loading={createPayerLoading}
        error={createPayerError}
      />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete plan" message="Are you sure you want to delete this plan?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected plans"
        message={`Are you sure you want to delete ${selectedIds.size} plan(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
