"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ArrowRight, Trash2, ChevronDown } from "lucide-react";
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
import { applicabilityRulesApi } from "@/lib/services/applicabilityRules";
import { feeSchedulesApi, type FeeScheduleDto } from "@/lib/services/feeSchedules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type {
  ApplicabilityRuleDto,
  CreateApplicabilityRuleCommand,
} from "@/lib/services/applicabilityRules";
import type { PaginatedList } from "@/lib/types";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Checkbox } from "@/components/ui/Checkbox";

const PAYER_ENTITY_TYPES = [
  { value: "Insurance", name: "Insurance" },
  { value: "Attorney", name: "Attorney" },
  { value: "Employer", name: "Employer" },
  { value: "Other", name: "Other" },
];
const CLAIM_CATEGORIES = [
  { value: "Medicare", name: "Medicare" },
  { value: "Medicaid", name: "Medicaid" },
  { value: "Tricare", name: "Tricare" },
  { value: "Railroad Medicare", name: "Railroad Medicare" },
  { value: "Commercial", name: "Commercial" },
  { value: "MVA", name: "MVA" },
  { value: "WC", name: "Workers' Compensation" },
];
const PROVIDER_PARTICIPATION = [
  { value: "InNetwork", name: "In Network" },
  { value: "OutOfNetwork", name: "Out of Network" },
  { value: "NA", name: "N/A" },
];
const PAYER_CATEGORY = [
  { value: "AttorneyOrEmployerOrOther", name: "Attorney/Employer/Other" },
  { value: "Medicare", name: "Medicare" },
  { value: "RailroadMedicare", name: "Railroad Medicare" },
  { value: "Tricare", name: "Tricare" },
  { value: "Medicaid", name: "Medicaid" },
  { value: "CommercialIN", name: "Commercial IN" },
  { value: "CommercialOON", name: "Commercial OON" },
  { value: "MVA", name: "MVA" },
  { value: "WorkersCompensation", name: "Workers Compensation" },
];
const FEE_SCHEDULE_APPLIED = [
  { value: "UCR", name: "UCR" },
  { value: "Medicare", name: "Medicare" },
  { value: "MedicareMultiplier", name: "Medicare Multiplier" },
  { value: "MVA", name: "MVA" },
  { value: "WC", name: "WC" },
];
const MER_CALCULATION_SCOPE = [
  { value: "None", name: "None" },
  { value: "NoPayDenialOnly", name: "No Pay Denial Only" },
  { value: "FullMer", name: "Full MER" },
];
const ACTIVE_OPTIONS = [{ value: 1, name: "Active" }, { value: 0, name: "Inactive" }];
const PLAN_CATEGORIES = [
  { value: "Commercial", name: "Commercial" },
  { value: "Medicaid", name: "Medicaid" },
  { value: "Medicare", name: "Medicare" },
  { value: "MVA", name: "MVA" },
  { value: "Tricare", name: "Tricare" },
  { value: "WC", name: "Workers' Compensation" },
  { value: "HmoManaged", name: "HMO / Managed Care" },
  { value: "RailroadMedicare", name: "Railroad Medicare" },
];

const defaultForm: CreateApplicabilityRuleCommand = {
  sortOrder: 0,
  ruleSetName: "",
  displayName: "",
  payerEntityType: "",
  planCategory: "",
  claimCategory: "",
  providerParticipation: "InNetwork",
  payerCategory: "AttorneyOrEmployerOrOther",
  feeScheduleApplied: "UCR",
  merCalculationScope: "None",
  isActive: true,
  state: null,
  placeOfService: null,
  primaryFeeScheduleId: null,
  modifier: null,
  effectiveStartDate: null,
  effectiveEndDate: null,
  multiplierPct: null,
};

function PlanCategoryMultiSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (csv: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : []),
    [value],
  );

  const toggle = (cat: string) => {
    const next = selected.includes(cat)
      ? selected.filter((s) => s !== cat)
      : [...selected, cat];
    onChange(next.join(","));
  };

  const allSelected =
    PLAN_CATEGORIES.length > 0 && selected.length === PLAN_CATEGORIES.length;
  const toggleAll = () => {
    if (allSelected) onChange("");
    else onChange(PLAN_CATEGORIES.map((c) => c.value).join(","));
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const displayLabel =
    selected.length === 0
      ? "Select Plan Category"
      : selected.length === 1
        ? PLAN_CATEGORIES.find((c) => c.value === selected[0])?.name ?? selected[0]
        : `${selected.length} categories selected`;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
          {displayLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[280px] overflow-hidden rounded-lg border border-input bg-white shadow-lg">
          <div className="max-h-[260px] overflow-y-auto p-1">
            <label className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-muted">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="All Categories" />
              <span className="text-sm">All Categories</span>
            </label>
            {PLAN_CATEGORIES.map((cat) => (
              <label key={cat.value} className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-muted">
                <Checkbox
                  checked={selected.includes(cat.value)}
                  onCheckedChange={() => toggle(cat.value)}
                  aria-label={cat.name}
                />
                <span className="text-sm">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function ApplicabilityRulesPage() {
  const [data, setData] = useState<PaginatedList<ApplicabilityRuleDto> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateApplicabilityRuleCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [feeScheduleOptions, setFeeScheduleOptions] = useState<FeeScheduleDto[]>([]);
  const [fsCategoryLookup, setFsCategoryLookup] = useState<Record<number, string>>({});

  const api = applicabilityRulesApi();
  const fsApi = feeSchedulesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Applicability Rules");

  useEffect(() => {
    fsApi.getList({ pageSize: 500, status: 0 }).then((res) => setFeeScheduleOptions(res.items)).catch(() => {});
    fsApi.getLookups().then((lk) => {
      const map: Record<number, string> = {};
      lk.categories.forEach((c) => { map[c.value] = c.name; });
      setFsCategoryLookup(map);
    }).catch(() => {});
  }, []);

  const loadList = useCallback(() => {
    setError(null);
    api
      .getList({
        pageNumber: page,
        pageSize,
        isActive: statusFilter === "all" ? undefined : statusFilter === "true",
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: ApplicabilityRuleDto) => {
    setEditId(row.id);
    setForm({
      sortOrder: row.sortOrder,
      ruleSetName: row.ruleSetName,
      displayName: row.displayName,
      payerEntityType: row.payerEntityType,
      planCategory: row.planCategory,
      claimCategory: row.claimCategory,
      providerParticipation: row.providerParticipation,
      payerCategory: row.payerCategory,
      feeScheduleApplied: row.feeScheduleApplied,
      merCalculationScope: row.merCalculationScope,
      isActive: row.isActive,
      state: row.state ?? null,
      placeOfService: row.placeOfService ?? null,
      primaryFeeScheduleId: row.primaryFeeScheduleId ?? null,
      modifier: row.modifier ?? null,
      effectiveStartDate: row.effectiveStartDate ?? null,
      effectiveEndDate: row.effectiveEndDate ?? null,
      multiplierPct: row.multiplierPct ?? null,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (
      !form.ruleSetName.trim() ||
      !form.displayName.trim() ||
      !form.payerEntityType.trim() ||
      !form.planCategory.trim() ||
      !form.claimCategory.trim()
    ) {
      setFormError(
        "Rule set name, display name, payer entity type, plan category, and claim category are required."
      );
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
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      loadList();
      toast.success("Deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
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
      loadList();
      toast.success(`${selectedIds.size} record(s) deleted successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (row: ApplicabilityRuleDto, activeValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      await api.update(row.id, {
        sortOrder: row.sortOrder,
        ruleSetName: row.ruleSetName,
        displayName: row.displayName,
        payerEntityType: row.payerEntityType,
        planCategory: row.planCategory,
        claimCategory: row.claimCategory,
        providerParticipation: row.providerParticipation,
        payerCategory: row.payerCategory,
        feeScheduleApplied: row.feeScheduleApplied,
        merCalculationScope: row.merCalculationScope,
        isActive: activeValue === 1,
        state: row.state ?? null,
        placeOfService: row.placeOfService ?? null,
        primaryFeeScheduleId: row.primaryFeeScheduleId ?? null,
        modifier: row.modifier ?? null,
        effectiveStartDate: row.effectiveStartDate ?? null,
        effectiveEndDate: row.effectiveEndDate ?? null,
        multiplierPct: row.multiplierPct ?? null,
      });
      await loadList();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const payerCategoryLabel = (n: string) =>
    PAYER_CATEGORY.find((c) => c.value === n)?.name ?? String(n);

  const filteredItems = data?.items.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return row.ruleSetName.toLowerCase().includes(q) ||
      row.displayName.toLowerCase().includes(q) ||
      row.payerEntityType.toLowerCase().includes(q) ||
      row.planCategory.toLowerCase().includes(q) ||
      payerCategoryLabel(row.payerCategory).toLowerCase().includes(q);
  }) ?? [];

  if (!canView) {
    return (
      <div>
        <PageHeader title="Applicability Rules" description="Fee schedule applicability rules." />
        <Card >
          <AccessRestrictedContent sectionName="Applicability Rules" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader
        title="Applicability Rules"
        description="Fee schedule applicability rules."
        
      />
      {/* Toolbar: search + add button */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-l-[5px] font-aileron text-[14px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
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
        <div className="flex items-center gap-2">
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
              apiBase="/api/ApplicabilityRules"
              templateFileName="ApplicabilityRules_Import_Template.xlsx"
              onImportSuccess={loadList}
              onLoadingChange={setOverlayLoading}
            />
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add Applicability Rule <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {data && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
            <Table className="min-w-[1000px] table-fixed">
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
                  <TableHeaderCell className="w-[80px] min-w-[80px]">Sort</TableHeaderCell>
                  <TableHeaderCell className="w-[240px] min-w-[240px]">Rule set / Display</TableHeaderCell>
                  <TableHeaderCell className="w-[180px] min-w-[180px]">Payer category</TableHeaderCell>
                  <TableHeaderCell className="w-[100px] min-w-[100px]">Multiplier</TableHeaderCell>
                  <TableHeaderCell className="w-[160px] min-w-[160px]">Status</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <TableHeaderCell className="!w-[120px] min-w-[120px]">Actions</TableHeaderCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((row) => (
                  <TableRow key={row.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="w-[80px] min-w-[80px]">
                      <div className="max-w-[60px] truncate">{row.sortOrder}</div>
                    </TableCell>
                    <TableCell className="w-[240px] min-w-[240px]">
                      <div className="max-w-[220px] truncate">{row.ruleSetName} / {row.displayName}</div>
                    </TableCell>
                    <TableCell className="w-[180px] min-w-[180px]">
                      <div className="max-w-[160px] truncate">{payerCategoryLabel(row.payerCategory)}</div>
                    </TableCell>
                    <TableCell className="w-[100px] min-w-[100px]">
                      <div className="max-w-[80px] truncate">{row.multiplierPct != null ? `${(row.multiplierPct * 100).toFixed(0)}%` : "—"}</div>
                    </TableCell>
                    <TableCell className="w-[160px] min-w-[160px]">
                      <select
                        value={row.isActive ? 1 : 0}
                        onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="input-enterprise w-[140px] rounded-l-[5px] rounded-r-0 px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        {ACTIVE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.name}
                          </option>
                        ))}
                      </select>
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
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit applicability rule" : "Add applicability rule"}
        size="lg"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                {editId ? "Update" : "Create"}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </>
            }
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Sort order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value) || 0,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Rule set name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.ruleSetName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ruleSetName: e.target.value }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Display name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Payer entity type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.payerEntityType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payerEntityType: e.target.value }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <option value="">— Select —</option>
                {PAYER_ENTITY_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Plan category <span className="text-red-500">*</span>
              </label>
              <PlanCategoryMultiSelect
                value={form.planCategory}
                onChange={(csv) =>
                  setForm((f) => ({ ...f, planCategory: csv }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Claim category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.claimCategory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, claimCategory: e.target.value }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <option value="">— Select —</option>
                {CLAIM_CATEGORIES.map((o) => (
                  <option key={o.value} value={o.value}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Provider participation
              </label>
              <select
                value={form.providerParticipation}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    providerParticipation: e.target.value,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {PROVIDER_PARTICIPATION.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Payer category
              </label>
              <select
                value={form.payerCategory}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    payerCategory: e.target.value,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {PAYER_CATEGORY.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Fee schedule applied
              </label>
              <select
                value={form.feeScheduleApplied}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    feeScheduleApplied: e.target.value,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {FEE_SCHEDULE_APPLIED.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                MER calculation scope
              </label>
              <select
                value={form.merCalculationScope}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    merCalculationScope: e.target.value,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {MER_CALCULATION_SCOPE.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                State
              </label>
              <input
                type="text"
                value={form.state ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    state: e.target.value.trim() || null,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Place of service
              </label>
              <input
                type="text"
                value={form.placeOfService ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    placeOfService: e.target.value.trim() || null,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Modifier
              </label>
              <input
                type="text"
                value={form.modifier ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    modifier: e.target.value.trim() || null,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Primary fee schedule (optional override)
              </label>
              <select
                value={form.primaryFeeScheduleId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primaryFeeScheduleId: e.target.value || null,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <option value="">Automatic selection</option>
                {feeScheduleOptions.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.scheduleCode ?? "—"} — {fsCategoryLookup[fs.category] ?? fs.category} {fs.state ? `(${fs.state})` : ""} {fs.years?.join(",")}{fs.quarters?.length ? `/Q${fs.quarters.join(",")}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Multiplier % (e.g. 1.00 = 100%, 1.50 = 150%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.multiplierPct ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    multiplierPct: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Leave empty for fee schedule default"
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective start date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveStartDate)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    effectiveStartDate: e.target.value || null,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective end date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveEndDate)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    effectiveEndDate: e.target.value || null,
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Effective dates are matched against the claim&apos;s Date of Service.
            </p>
            <div className="flex items-center">
              <label htmlFor="applicability-rule-active" className="inline-flex w-fit cursor-pointer items-center gap-2">
                <input
                  id="applicability-rule-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="h-5 w-5 rounded border-input"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete applicability rule"
        message="Are you sure you want to delete this rule? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected applicability rules"
        message={`Are you sure you want to delete ${selectedIds.size} applicability rule(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
