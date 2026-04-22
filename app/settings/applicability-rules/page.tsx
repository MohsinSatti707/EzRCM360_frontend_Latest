"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Trash2, ChevronDown, Pencil } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
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
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Loader } from "@/components/ui/Loader";
import { Checkbox } from "@/components/ui/Checkbox";

const PAYER_ENTITY_TYPES = [
  { value: "Insurance", name: "Insurance" },
  { value: "Attorney", name: "Attorney" },
  { value: "Employer", name: "Employer" },
  { value: "Other", name: "Other" },
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
const ACTIVE_OPTIONS = [
  { value: 1, name: "Active" },
  { value: 0, name: "Inactive" },
];
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

const US_STATES = [
  { value: "AL", name: "AL - Alabama" },
  { value: "AK", name: "AK - Alaska" },
  { value: "AZ", name: "AZ - Arizona" },
  { value: "AR", name: "AR - Arkansas" },
  { value: "CA", name: "CA - California" },
  { value: "CO", name: "CO - Colorado" },
  { value: "CT", name: "CT - Connecticut" },
  { value: "DE", name: "DE - Delaware" },
  { value: "FL", name: "FL - Florida" },
  { value: "GA", name: "GA - Georgia" },
  { value: "HI", name: "HI - Hawaii" },
  { value: "ID", name: "ID - Idaho" },
  { value: "IL", name: "IL - Illinois" },
  { value: "IN", name: "IN - Indiana" },
  { value: "IA", name: "IA - Iowa" },
  { value: "KS", name: "KS - Kansas" },
  { value: "KY", name: "KY - Kentucky" },
  { value: "LA", name: "LA - Louisiana" },
  { value: "ME", name: "ME - Maine" },
  { value: "MD", name: "MD - Maryland" },
  { value: "MA", name: "MA - Massachusetts" },
  { value: "MI", name: "MI - Michigan" },
  { value: "MN", name: "MN - Minnesota" },
  { value: "MS", name: "MS - Mississippi" },
  { value: "MO", name: "MO - Missouri" },
  { value: "MT", name: "MT - Montana" },
  { value: "NE", name: "NE - Nebraska" },
  { value: "NV", name: "NV - Nevada" },
  { value: "NH", name: "NH - New Hampshire" },
  { value: "NJ", name: "NJ - New Jersey" },
  { value: "NM", name: "NM - New Mexico" },
  { value: "NY", name: "NY - New York" },
  { value: "NC", name: "NC - North Carolina" },
  { value: "ND", name: "ND - North Dakota" },
  { value: "OH", name: "OH - Ohio" },
  { value: "OK", name: "OK - Oklahoma" },
  { value: "OR", name: "OR - Oregon" },
  { value: "PA", name: "PA - Pennsylvania" },
  { value: "RI", name: "RI - Rhode Island" },
  { value: "SC", name: "SC - South Carolina" },
  { value: "SD", name: "SD - South Dakota" },
  { value: "TN", name: "TN - Tennessee" },
  { value: "TX", name: "TX - Texas" },
  { value: "UT", name: "UT - Utah" },
  { value: "VT", name: "VT - Vermont" },
  { value: "VA", name: "VA - Virginia" },
  { value: "WA", name: "WA - Washington" },
  { value: "WV", name: "WV - West Virginia" },
  { value: "WI", name: "WI - Wisconsin" },
  { value: "WY", name: "WY - Wyoming" },
  { value: "DC", name: "DC - District of Columbia" },
  { value: "AS", name: "AS - American Samoa" },
  { value: "GU", name: "GU - Guam" },
  { value: "MP", name: "MP - Northern Mariana Islands" },
  { value: "PR", name: "PR - Puerto Rico" },
  { value: "VI", name: "VI - Virgin Islands" },
];
const UCR_PERCENTILE_OPTIONS = [
  { value: "50", name: "50th" },
  { value: "60", name: "60th" },
  { value: "70", name: "70th" },
  { value: "75", name: "75th" },
  { value: "80", name: "80th" },
  { value: "85", name: "85th" },
  { value: "90", name: "90th" },
  { value: "95", name: "95th" },
];
const FALLBACK_CATEGORY_OPTIONS = [
  { value: "None", name: "None (Flag Only)" },
  { value: "Medicare", name: "Medicare" },
  { value: "UCR", name: "UCR" },
  { value: "MVA", name: "MVA" },
  { value: "WC", name: "WC" },
];
const BILLING_TYPE_OPTIONS = [
  { value: "AnyType", name: "Any Type" },
  { value: "Facility", name: "Facility" },
  { value: "Professional", name: "Professional" },
];

const GOV_PLAN_CATEGORIES = ["Medicare", "Medicaid", "Tricare", "RailroadMedicare"];
const MVA_WC_PLAN_CATEGORIES = ["MVA", "WC"];
const COMMERCIAL_PLAN_CATEGORIES = ["Commercial"];

const SELECTION_FLOW_STEPS = [
  { num: 1, title: "Responsible Payer Entity", sub: "Read and resolve" },
  { num: 2, title: "Responsible Plan Category", sub: "Read and resolve" },
  { num: 3, title: "Applicability Rule", sub: "Apply" },
  { num: 4, title: "Service State", sub: "Resolve" },
  { num: 5, title: "Billing Type", sub: "Resolve" },
  { num: 6, title: "Service ZIP → GeographyCode", sub: "Resolve" },
  { num: 7, title: "Fee Schedule ID", sub: "Select matching" },
  { num: 8, title: "CPT Fee Amount", sub: "Retrieve" },
  { num: 9, title: "Fallback Rule", sub: "Apply if CPT or Fee is not found" },
];

const defaultForm: CreateApplicabilityRuleCommand = {
  sortOrder: 0,
  ruleSetName: "",
  displayName: "",
  payerEntityType: "",
  planCategory: "",
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

const planCategoryLabel = (v: string) =>
  PLAN_CATEGORIES.find((c) => c.value === v)?.name ?? v;
const payerCategoryLabel = (v: string) =>
  PAYER_CATEGORY.find((c) => c.value === v)?.name ?? v;
const feeScheduleLabel = (v: string) =>
  FEE_SCHEDULE_APPLIED.find((c) => c.value === v)?.name ?? v;

// ─── Section table shared column styles ─────────────────────────────────────
const TH = "font-['Aileron'] text-[12px] font-semibold text-[#64748B] uppercase tracking-wide";

function MultiplierSpinner({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-[34px] w-[100px] items-center overflow-hidden rounded border border-[#E2E8F0]">
      <input
        type="number"
        min={0}
        max={9999}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-full w-full bg-transparent px-3 font-['Aileron'] text-[14px] text-center focus:outline-none disabled:opacity-50"
      />
      <div className="flex h-full flex-col border-l border-[#E2E8F0]">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="flex flex-1 items-center justify-center px-1.5 hover:bg-[#F1F5F9] disabled:opacity-50"
        >
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M4 0L8 5H0L4 0Z" fill="#64748B" /></svg>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex flex-1 items-center justify-center border-t border-[#E2E8F0] px-1.5 hover:bg-[#F1F5F9] disabled:opacity-50"
        >
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M4 5L0 0H8L4 5Z" fill="#64748B" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function ApplicabilityRulesPage() {
  const [allItems, setAllItems] = useState<ApplicabilityRuleDto[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localMultipliers, setLocalMultipliers] = useState<Record<string, number | null>>({});

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

  const [ucrPercentile, setUcrPercentile] = useState<string>("");

  const [feeScheduleOptions, setFeeScheduleOptions] = useState<FeeScheduleDto[]>([]);
  const [fsCategoryLookup, setFsCategoryLookup] = useState<Record<number, string>>({});

  const api = applicabilityRulesApi();
  const fsApi = feeSchedulesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission("Applicability Rules");

  useEffect(() => {
    fsApi.getList({ pageSize: 500, status: 0 }).then((res) => setFeeScheduleOptions(res.items)).catch(() => { });
    fsApi.getLookups().then((lk) => {
      const map: Record<number, string> = {};
      lk.categories.forEach((c) => { map[c.value] = c.name; });
      setFsCategoryLookup(map);
    }).catch(() => { });
  }, []);

  const loadList = useCallback(() => {
    setError(null);
    setPageLoading(true);
    api
      .getList({ pageSize: 500 })
      .then((res) => setAllItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // Grouped sections
  const nonInsuranceItems = useMemo(
    () => allItems.filter((r) => r.payerEntityType !== "Insurance"),
    [allItems],
  );
  const govItems = useMemo(
    () => allItems.filter((r) => r.payerEntityType === "Insurance" && GOV_PLAN_CATEGORIES.includes(r.planCategory)),
    [allItems],
  );
  const mvaWcItems = useMemo(
    () => allItems.filter((r) => r.payerEntityType === "Insurance" && MVA_WC_PLAN_CATEGORIES.includes(r.planCategory)),
    [allItems],
  );
  const commercialItems = useMemo(
    () => allItems.filter((r) => r.payerEntityType === "Insurance" && COMMERCIAL_PLAN_CATEGORIES.includes(r.planCategory)),
    [allItems],
  );

  const getDisplayMultiplier = (row: ApplicabilityRuleDto): number =>
    Math.round((row.id in localMultipliers ? (localMultipliers[row.id] ?? 1) : (row.multiplierPct ?? 1)) * 100);

  const updateLocalMultiplier = (id: string, displayPct: number) =>
    setLocalMultipliers((prev) => ({ ...prev, [id]: displayPct / 100 }));

  const hasChanges = Object.keys(localMultipliers).length > 0;

  const openCreateForSection = (preset: Partial<CreateApplicabilityRuleCommand>) => {
    setEditId(null);
    setForm({ ...defaultForm, ...preset });
    setUcrPercentile("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: ApplicabilityRuleDto) => {
    setUcrPercentile("");
    setEditId(row.id);
    setForm({
      sortOrder: row.sortOrder,
      ruleSetName: row.ruleSetName,
      displayName: row.displayName,
      payerEntityType: row.payerEntityType,
      planCategory: row.planCategory,
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
    if (!form.payerEntityType.trim()) {
      setFormError("Payer entity type is required.");
      return;
    }
    const autoName = `${form.payerEntityType}_${form.feeScheduleApplied || "UCR"}`;
    const submitData: typeof form = {
      ...form,
      ruleSetName: form.ruleSetName.trim() || autoName,
      displayName: form.displayName.trim() || autoName,
    };
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, submitData);
      } else {
        await api.create(submitData);
      }
      setModalOpen(false);
      loadList();
      toast.success(
        editId ? "Applicability Rule Updated" : "Applicability Rule Added",
        <>{editId ? "The" : "A new"} applicability rule, <strong>{submitData.displayName}</strong>, has been {editId ? "updated" : "added"} successfully.</>,
      );
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
    const deletedName = allItems.find((r) => r.id === deleteId)?.displayName;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      await api.delete(deleteId);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      loadList();
      toast.success("Applicability Rule Deleted", <>The applicability rule, <strong>{deletedName}</strong>, has been deleted successfully.</>);
    } catch (err) {
      toast.error("Delete Failed", err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
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
      toast.success("Applicability Rules Deleted", <>{selectedIds.size} applicability rule(s) have been deleted successfully.</>);
    } catch (err) {
      toast.error("Bulk Delete Failed", err instanceof Error ? err.message : "Bulk delete failed.");
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
      loadList();
      toast.success("Status Updated", <>The status of applicability rule, <strong>{row.displayName}</strong>, has been updated successfully.</>);
    } catch (err) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleSaveAllChanges = async () => {
    if (!hasChanges || !canUpdate) return;
    setOverlayLoading(true);
    try {
      for (const [id, pct] of Object.entries(localMultipliers)) {
        const row = allItems.find((r) => r.id === id);
        if (!row) continue;
        await api.update(id, {
          sortOrder: row.sortOrder,
          ruleSetName: row.ruleSetName,
          displayName: row.displayName,
          payerEntityType: row.payerEntityType,
          planCategory: row.planCategory,
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
          multiplierPct: pct,
        });
      }
      setLocalMultipliers({});
      loadList();
      toast.success("Changes Saved", "All multiplier changes have been saved successfully.");
    } catch (err) {
      toast.error("Save Failed", err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setOverlayLoading(false);
    }
  };

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Loader variant="inline" label="Loading" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div>
        <Card>
          <AccessRestrictedContent sectionName="Applicability Rules" />
        </Card>
      </div>
    );
  }

  const deleteName = allItems.find((r) => r.id === deleteId)?.displayName ?? "";

  return (
    <PageShell
      breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Applicability Rules" }]}
      title="Applicability Rules"
      titleWrapperClassName="mb-4 px-6"
    >
      {/* Toolbar */}
      <div className="mx-6 mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {canDelete && selectedIds.size > 0 && (
            <Button
              onClick={() => setBulkDeleteConfirm(true)}
              className="h-9 rounded-[5px] px-4 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})
            </Button>
          )}
        </div>
        {/* <div className="flex items-center gap-2">
          {canCreate && (
            <BulkImportActions
              apiBase="/api/ApplicabilityRules"
              templateFileName="ApplicabilityRules_Import_Template.xlsx"
              onImportSuccess={loadList}
              onLoadingChange={setOverlayLoading}
            />
          )}
        </div> */}
      </div>

      {error && (
        <div className="mx-6 mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* ── Applicability Rule Scope ──────────────────────────────────── */}
      <div className="mx-6 mb-5 rounded-[4px] border-l-4 border-[#F59E0B] bg-[#FFFBEB] px-5 py-4">
        <p className="font-['Aileron'] text-[15px] font-bold text-[#2A2C33]">Applicability Rule Scope</p>
        <p className="mt-1 font-['Aileron'] text-[15px] text-[#2A2C33]">
          Applicability rules operate at the claim level, using the Responsible Payer determined during claim categorization.
        </p>
      </div>

      {/* ── Rule Inputs & Outputs ─────────────────────────────────────── */}
      <Card className="mx-6 mb-5 overflow-hidden border border-[#E2E8F0] shadow-none">
        <div className="flex items-start gap-3 border-b border-[#E2E8F0] px-6 py-5">
          <Image src="/icons/svg/settings-rules.svg" alt="settings-rules" width={20} height={20} className="mt-0.5 shrink-0" />
          <div>
            <h3 className="font-['Aileron'] text-[16px] font-semibold text-[#2A2C33]">Rule Inputs &amp; Outputs Reference</h3>
            <p className="font-['Aileron'] text-[14px] text-[#64748B]">Parameters evaluated and resolved by each rule</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-[#E2E8F0]">
          <div className="px-6 py-5">
            <p className="font-['Aileron'] text-[15px] font-bold text-[#2A2C33]">Applicability Rule Inputs</p>
            <p className="mb-3 font-['Aileron'] text-[14px] text-[#64748B]">Each rule evaluates the following inputs:</p>
            {[
              ["Responsible Payer Entity Type", "Insurance, Attorney, Employer, Other"],
              ["Responsible Plan Category", "Medicare, Medicaid, Tricare, Railroad Medicare, Commercial (IN/OON), MVA, WC"],
              ["Service State", ""],
              ["Billing Type (Professional / Facility)", ""],
            ].map(([title, sub]) => (
              <div key={title} className="mb-2 flex items-start gap-2">
                <span className="mt-0.5 font-['Aileron'] text-[14px] font-semibold text-[#0066CC]">→</span>
                <div>
                  <span className="font-['Aileron'] text-[15px] font-medium text-[#2A2C33]">{title}</span>
                  {sub && <p className="font-['Aileron'] text-[13px] text-[#64748B]">{sub}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-5">
            <p className="font-['Aileron'] text-[15px] font-bold text-[#2A2C33]">Applicability Rule Outputs</p>
            <p className="mb-3 font-['Aileron'] text-[14px] text-[#64748B]">Each rule resolves:</p>
            {[
              ["Fee Schedule Category", "Medicare, UCR, MVA, WC"],
              ["FeeScheduleID Selection Criteria", "State, GeographyCode (via ZIP), BillingType, Year/Quarter"],
              ["Fallback Fee Schedule Category", ""],
            ].map(([title, sub]) => (
              <div key={title} className="mb-2 flex items-start gap-2">
                <span className="mt-0.5 font-['Aileron'] text-[14px] font-semibold text-[#0066CC]">→</span>
                <div>
                  <span className="font-['Aileron'] text-[15px] font-medium text-[#2A2C33]">{title}</span>
                  {sub && <p className="font-['Aileron'] text-[13px] text-[#64748B]">{sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Fee Schedule Percentile / Multiplier Rule ─────────────────── */}
      <Card className="mx-6 mb-5 border border-[#FED7AA] bg-[#FFF7ED] shadow-none">
        <div className="px-6 py-5">
          <h3 className="font-['Aileron'] text-[18px] font-semibold text-[#823000]">Fee Schedule Percentile / Multiplier Rule</h3>
          <p className="mt-1 font-['Aileron'] text-[14px] text-[#823000]">
            For each applicable Fee Schedule Category, a configurable percentage multiplier may be defined. This multiplier is applied after the base CPT FeeAmount is retrieved.
          </p>
          <div className="bg-white px-6 pb-5 pt-2 mt-3 rounded-[5px]">
            <div className="mt-4 rounded-[4px] border border-[#FED7AA] bg-[#FFFBEB] px-5 py-3">
              <p className="font-['Aileron'] text-[15px] font-medium text-[#823000]">
                Adjusted FeeAmount = Base FeeAmount × Multiplier
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-6">
              <span className="font-['Aileron'] text-[15px] text-[#823000]">• Medicare → 100%</span>
              <span className="font-['Aileron'] text-[15px] text-[#823000]">• Commercial IN → Medicare × 150%</span>
              <span className="font-['Aileron'] text-[15px] text-[#823000]">• Employer → UCR × 125%</span>
            </div>
          </div>
          <p className="mt-4 font-['Aileron'] text-[14px] italic text-[#823000]">
            Default = 100% (no adjustment) if not configured.
          </p>
        </div>
      </Card>

      {/* ── Fee Schedule Selection Flow ───────────────────────────────── */}
      <Card className="mx-6 mb-5 border border-[#E2E8F0] shadow-none">
        <div className=" py-5">
          <div className="mb-1 flex items-start gap-2 border-b px-6">
            <Image src="/icons/svg/fee-schedule.svg" alt="settings-rules" width={20} height={20} className="mt-1.5 shrink-0" />
            <div>
              <h3 className="font-['Aileron'] text-[16px] font-semibold text-[#2A2C33]">Fee Schedule Selection Flow (Unified)</h3>
              <p className="mb-4 font-['Aileron'] text-[14px] text-[#64748B]">9-step resolution process for each claim</p>
            </div>
          </div>


          <div className="grid grid-cols-3 gap-3 px-6 mt-4">
            {SELECTION_FLOW_STEPS.map((step) => (
              <div key={step.num} className="rounded-[6px] border border-[#E2E8F0] px-4 py-3">
                <div className="mb-1 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F8F9] font-['Aileron'] text-[14px] font-bold text-[#2A2C33]">{step.num}</span>
                  <div>
                    <span className="font-['Aileron'] text-[15px] font-semibold text-[#2A2C33]">{step.title}</span>
                    <p className="font-['Aileron'] text-[13px] text-[#64748B]">{step.sub}</p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Calculation Responsibility Split ──────────────────────────── */}
      <Card className="mx-6 mb-5 border border-[#E2E8F0] shadow-none">
        <div className="py-5">
          <div className="mb-1 flex items-start gap-3 border-b px-6">
            <Image src="/icons/svg/calculator.svg" alt="settings-rules" width={20} height={20} className="mt-1.5 shrink-0" />
            <div>
              <h3 className="font-['Aileron'] text-[16px] font-semibold text-[#2A2C33]">Calculation Responsibility Split</h3>
              <p className="mb-4 font-['Aileron'] text-[13px] text-[#64748B]">R&amp;D notes and calculation logic details</p>
            </div>
          </div>

          <div className="mb-4 mt-4 rounded-[6px] border border-[#DDD6FE] bg-[#F5F3FF] px-5 py-4 mx-6">
            <p className="mb-1 font-['Aileron'] text-[15px] font-bold text-[#7C3AED]">R&amp;D Note</p>
            <p className="font-['Aileron'] text-[14px] text-[#6D28D9]">
              The RV-based calculation functionality is currently under R&amp;D to determine whether it will be implemented natively for additional fee schedule categories or remain isolated to NY WC. Until finalized, such calculations may be processed externally and imported as Direct Fee schedules.
            </p>
          </div>
          <p className="mb-3 font-['Aileron'] text-[13px] font-bold uppercase tracking-widest text-[#64748B] px-6">Example — NY WC</p>
          {[
            "Locate CPT and retrieve Section, Relative Value, and PC/TC (if applicable)",
            "Resolve ZIP → Region to identify Conversion Factor (Regions I–IV)",
            "Multiply Relative Value × Conversion Factor",
            "Derive CPT_MER_FS",
          ].map((item) => (
            <div key={item} className="mb-2 flex items-start gap-2 px-6">
              <span className="mt-0.5 font-['Aileron'] text-[14px] font-semibold text-[#0066CC]">→</span>
              <span className="font-['Aileron'] text-[15px] text-[#2A2C33]">{item}</span>
            </div>
          ))}
          <div className="mt-4 rounded-[5px] bg-[#F7F8F9] px-5 py-4 mx-6">
            <p className="mb-1 font-['Aileron'] text-[13px] font-semibold text-[#2A2C33]">Important</p>
            <p className="font-['Aileron'] text-[13px] text-[#374151]">
              Whether using a Direct Fee model or RV-based calculation: PC/TC splits and add-on code handling are applied in the MER_Mod calculation layer. This logic is deferred to a separate documentation section.
            </p>
          </div>
        </div>
      </Card>

      {pageLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader variant="inline" label="Loading" />
        </div>
      ) : (
        <>
          {/* ── Non-Insurance Responsible Payers ───────────────────────── */}
          <SectionCard
            title="Non-Insurance Responsible Payers"
            description="Rules for claims where the responsible party is not an insurance carrier (Attorney, Employer, Other)."
            icon={
              <Image src="/icons/svg/non-insurance.svg" alt="settings-rules" width={20} height={20} className="mt-1.5 shrink-0" />
            }
            onAddRule={canCreate ? () => openCreateForSection({ payerEntityType: "Attorney" }) : undefined}
            canUpdate={canUpdate}
            canDelete={canDelete}
            selectedIds={selectedIds}
            onToggleSelect={(id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          >
            {nonInsuranceItems.length === 0 ? (
              <EmptySection />
            ) : (
              <Table className="min-w-[1200px] table-fixed">
                <TableHead className="sticky top-0 z-20">
                  <TableRow>
                    {canDelete && <TableHeaderCell className="w-[44px]" />}
                    <TableHeaderCell className={TH}>Payer Entity Type</TableHeaderCell>
                    <TableHeaderCell className={TH}>Apply Fee Schedule</TableHeaderCell>
                    <TableHeaderCell className={TH}>Multiplier (%)</TableHeaderCell>
                    <TableHeaderCell className={TH}>Fallback</TableHeaderCell>
                    <TableHeaderCell className={TH}>UCR Percentile</TableHeaderCell>
                    <TableHeaderCell className={TH}>State</TableHeaderCell>
                    <TableHeaderCell className={TH}>Billing</TableHeaderCell>
                    <TableHeaderCell className={TH}>Status</TableHeaderCell>
                    {(canUpdate || canDelete) && <TableHeaderCell className={`${TH} w-[100px]`}>Actions</TableHeaderCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nonInsuranceItems.map((row) => (
                    <TableRow key={row.id}>
                      {canDelete && (
                        <TableCell>
                          <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => setSelectedIds((prev) => { const n = new Set(prev); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; })} />
                        </TableCell>
                      )}
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.payerEntityType}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{feeScheduleLabel(row.feeScheduleApplied)}</TableCell>
                      <TableCell>
                        <MultiplierSpinner
                          value={getDisplayMultiplier(row)}
                          onChange={(v) => updateLocalMultiplier(row.id, v)}
                          disabled={!canUpdate}
                        />
                      </TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#64748B]">-</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#64748B]">-</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.state ?? "Any"}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.placeOfService ?? "Any"}</TableCell>
                      <TableCell>
                        <select
                          value={row.isActive ? 1 : 0}
                          onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                          disabled={!canUpdate || statusUpdatingId === row.id}
                          className="input-enterprise w-[120px] px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0"
                        >
                          {ACTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
                        </select>
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell>
                          <TableActionsCell canEdit={canUpdate} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setDeleteId(row.id)} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          {/* ── Insurance — Government Programs ────────────────────────── */}
          <SectionCard
            title="Insurance — Government Programs"
            description="Standard rules for federal and state government plans (Medicare, Medicaid, Tricare, Railroad Medicare)."
            icon={
              <Image src="/icons/svg/calculator.svg" alt="calculator" width={20} height={20} className="mt-0.5 shrink-0" />
            }
            onAddRule={canCreate ? () => openCreateForSection({ payerEntityType: "Insurance" }) : undefined}
            canUpdate={canUpdate}
            canDelete={canDelete}
            selectedIds={selectedIds}
            onToggleSelect={(id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          >
            {govItems.length === 0 ? (
              <EmptySection />
            ) : (
              <Table className="min-w-[1200px] table-fixed">
                <TableHead className="sticky top-0 z-20">
                  <TableRow>
                    {canDelete && <TableHeaderCell className="w-[44px]" />}
                    <TableHeaderCell className={TH}>Plan Category</TableHeaderCell>
                    <TableHeaderCell className={TH}>Apply Fee Schedule</TableHeaderCell>
                    <TableHeaderCell className={TH}>Multiplier (%)</TableHeaderCell>
                    <TableHeaderCell className={TH}>Fallback</TableHeaderCell>
                    <TableHeaderCell className={TH}>State</TableHeaderCell>
                    <TableHeaderCell className={TH}>Billing</TableHeaderCell>
                    <TableHeaderCell className={TH}>Status</TableHeaderCell>
                    {(canUpdate || canDelete) && <TableHeaderCell className={`${TH} w-[100px]`}>Actions</TableHeaderCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {govItems.map((row) => (
                    <TableRow key={row.id}>
                      {canDelete && (
                        <TableCell>
                          <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => setSelectedIds((prev) => { const n = new Set(prev); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; })} />
                        </TableCell>
                      )}
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{planCategoryLabel(row.planCategory)}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{feeScheduleLabel(row.feeScheduleApplied)}</TableCell>
                      <TableCell>
                        <MultiplierSpinner value={getDisplayMultiplier(row)} onChange={(v) => updateLocalMultiplier(row.id, v)} disabled={!canUpdate} />
                      </TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#64748B]">-</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.state ?? "Any"}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.placeOfService ?? "Any"}</TableCell>
                      <TableCell>
                        <select
                          value={row.isActive ? 1 : 0}
                          onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                          disabled={!canUpdate || statusUpdatingId === row.id}
                          className="input-enterprise w-[120px] px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0"
                        >
                          {ACTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
                        </select>
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell>
                          <TableActionsCell canEdit={canUpdate} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setDeleteId(row.id)} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          {/* ── Insurance — MVA & WC ────────────────────────────────────── */}
          <SectionCard
            title="Insurance — MVA & WC"
            description="Specific rules for motor vehicle accident and workers' compensation claims with fallback support."
            icon={
             <Image src="/icons/svg/insurance-mva.svg" alt="insurance-mva" width={20} height={20} className="mt-1.5 shrink-0" />
            }
            onAddRule={canCreate ? () => openCreateForSection({ payerEntityType: "Insurance", planCategory: "MVA" }) : undefined}
            canUpdate={canUpdate}
            canDelete={canDelete}
            selectedIds={selectedIds}
            onToggleSelect={(id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          >
            {mvaWcItems.length === 0 ? (
              <EmptySection />
            ) : (
              <Table className="min-w-[1200px] table-fixed">
                <TableHead className="sticky top-0 z-20">
                  <TableRow>
                    {canDelete && <TableHeaderCell className="w-[44px]" />}
                    <TableHeaderCell className={TH}>Plan Category</TableHeaderCell>
                    <TableHeaderCell className={TH}>Apply Fee Schedule</TableHeaderCell>
                    <TableHeaderCell className={TH}>Multiplier (%)</TableHeaderCell>
                    <TableHeaderCell className={TH}>Fallback</TableHeaderCell>
                    <TableHeaderCell className={TH}>State</TableHeaderCell>
                    <TableHeaderCell className={TH}>Billing</TableHeaderCell>
                    <TableHeaderCell className={TH}>Status</TableHeaderCell>
                    {(canUpdate || canDelete) && <TableHeaderCell className={`${TH} w-[100px]`}>Actions</TableHeaderCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mvaWcItems.map((row) => (
                    <TableRow key={row.id}>
                      {canDelete && (
                        <TableCell>
                          <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => setSelectedIds((prev) => { const n = new Set(prev); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; })} />
                        </TableCell>
                      )}
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{planCategoryLabel(row.planCategory)}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{feeScheduleLabel(row.feeScheduleApplied)}</TableCell>
                      <TableCell>
                        <MultiplierSpinner value={getDisplayMultiplier(row)} onChange={(v) => updateLocalMultiplier(row.id, v)} disabled={!canUpdate} />
                      </TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#64748B]">-</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.state ?? "Any"}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.placeOfService ?? "Any"}</TableCell>
                      <TableCell>
                        <select
                          value={row.isActive ? 1 : 0}
                          onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                          disabled={!canUpdate || statusUpdatingId === row.id}
                          className="input-enterprise w-[120px] px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0"
                        >
                          {ACTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
                        </select>
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell>
                          <TableActionsCell canEdit={canUpdate} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setDeleteId(row.id)} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          {/* ── Insurance — Commercial ──────────────────────────────────── */}
          <SectionCard
            title="Insurance — Commercial"
            description="Rules for commercial payers based on network participation status (In-Network vs Out-of-Network)."
            icon={
             <Image src="/icons/svg/insurance-commercial.svg" alt="insurance-commercial" width={20} height={20} className="mt-0.5 shrink-0" />
            }
            onAddRule={canCreate ? () => openCreateForSection({ payerEntityType: "Insurance", planCategory: "Commercial" }) : undefined}
            canUpdate={canUpdate}
            canDelete={canDelete}
            selectedIds={selectedIds}
            onToggleSelect={(id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          >
            {commercialItems.length === 0 ? (
              <EmptySection />
            ) : (
              <Table className="min-w-[1200px] table-fixed">
                <TableHead className="sticky top-0 z-20">
                  <TableRow>
                    {canDelete && <TableHeaderCell className="w-[44px]" />}
                    <TableHeaderCell className={TH}>Plan Category</TableHeaderCell>
                    <TableHeaderCell className={TH}>Apply Fee Schedule</TableHeaderCell>
                    <TableHeaderCell className={TH}>Multiplier (%)</TableHeaderCell>
                    <TableHeaderCell className={TH}>Fallback</TableHeaderCell>
                    <TableHeaderCell className={TH}>State</TableHeaderCell>
                    <TableHeaderCell className={TH}>Billing</TableHeaderCell>
                    <TableHeaderCell className={TH}>Status</TableHeaderCell>
                    {(canUpdate || canDelete) && <TableHeaderCell className={`${TH} w-[100px]`}>Actions</TableHeaderCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {commercialItems.map((row) => (
                    <TableRow key={row.id}>
                      {canDelete && (
                        <TableCell>
                          <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => setSelectedIds((prev) => { const n = new Set(prev); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; })} />
                        </TableCell>
                      )}
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{payerCategoryLabel(row.payerCategory)}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{feeScheduleLabel(row.feeScheduleApplied)}</TableCell>
                      <TableCell>
                        <MultiplierSpinner value={getDisplayMultiplier(row)} onChange={(v) => updateLocalMultiplier(row.id, v)} disabled={!canUpdate} />
                      </TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#64748B]">-</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.state ?? "Any"}</TableCell>
                      <TableCell className="font-['Aileron'] text-[14px] text-[#2A2C33]">{row.placeOfService ?? "Any"}</TableCell>
                      <TableCell>
                        <select
                          value={row.isActive ? 1 : 0}
                          onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                          disabled={!canUpdate || statusUpdatingId === row.id}
                          className="input-enterprise w-[120px] px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0"
                        >
                          {ACTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
                        </select>
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell>
                          <TableActionsCell canEdit={canUpdate} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setDeleteId(row.id)} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          {/* ── Save All Changes ────────────────────────────────────────── */}
          {canUpdate && (
            <div className="mx-6 pb-8 pt-4">
              <Button
                onClick={handleSaveAllChanges}
                disabled={!hasChanges}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0066CC] px-6 py-2.5 font-['Aileron'] text-[14px] font-medium text-white hover:bg-[#0052A3] disabled:opacity-40"
              >
                Save All Changes <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Applicability Rule" : "Add Applicability Rule"}
        size="lg"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={<>{editId ? "Update Rule" : "Add Rule"}<ArrowRight className="ml-1 h-4 w-4" aria-hidden /></>}
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block font-['Aileron'] text-[13px] font-medium text-[#2A2C33]">Payer Entity Type</label>
              <select value={form.payerEntityType} onChange={(e) => setForm((f) => ({ ...f, payerEntityType: e.target.value }))} className="input-enterprise w-full">
                <option value="">Select</option>
                {PAYER_ENTITY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-['Aileron'] text-[13px] font-medium text-[#2A2C33]">Apply Fee Schedule Category</label>
              <select value={form.feeScheduleApplied} onChange={(e) => setForm((f) => ({ ...f, feeScheduleApplied: e.target.value }))} className="input-enterprise w-full">
                <option value="">Select</option>
                {FEE_SCHEDULE_APPLIED.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block font-['Aileron'] text-[13px] font-medium text-[#2A2C33]">Multiplier (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.multiplierPct ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, multiplierPct: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="0"
                  className="input-enterprise w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-['Aileron'] text-[13px] font-medium text-[#2A2C33]">UCR Percentile</label>
                <select value={ucrPercentile} onChange={(e) => setUcrPercentile(e.target.value)} className="input-enterprise w-full">
                  <option value="">Select</option>
                  {UCR_PERCENTILE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block font-['Aileron'] text-[13px] font-medium text-[#2A2C33]">Fallback Category</label>
              <select value={form.merCalculationScope} onChange={(e) => setForm((f) => ({ ...f, merCalculationScope: e.target.value }))} className="input-enterprise w-full">
                <option value="">Select</option>
                {FALLBACK_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-['Aileron'] text-[13px] font-medium text-[#2A2C33]">
                Service State <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </label>
              <select value={form.state ?? ""} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value || null }))} className="input-enterprise w-full">
                <option value="">Select</option>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-['Aileron'] text-[13px] font-medium text-[#2A2C33]">
                Billing Type <span className="font-normal text-[#94A3B8]">(Optional)</span>
              </label>
              <select value={form.placeOfService ?? ""} onChange={(e) => setForm((f) => ({ ...f, placeOfService: e.target.value || null }))} className="input-enterprise w-full">
                <option value="">Select</option>
                {BILLING_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete applicability rule"
        message={<>Are you sure you want to delete the rule <strong>{deleteName}</strong>? This cannot be undone.</>}
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
    </PageShell>
  );
}

function SectionCard({
  title,
  description,
  icon,
  onAddRule,
  canUpdate,
  canDelete,
  selectedIds,
  onToggleSelect,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onAddRule?: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="mx-6 mb-5 overflow-hidden border border-[#E2E8F0] shadow-none">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex items-start gap-3">
          {icon}
          <div>
            <h3 className="font-['Aileron'] text-[16px] font-semibold text-[#2A2C33]">{title}</h3>
            <p className="font-['Aileron'] text-[14px] font-normal text-[#64748B]">{description}</p>
          </div>
        </div>
        {onAddRule && (
          <Button
            onClick={onAddRule}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0066CC] px-4 py-2 font-['Aileron'] text-[13px] font-medium text-white hover:bg-[#0052A3]"
          >
            Add Rule <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="max-h-[calc(100vh-316px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
        {children}
      </div>
    </Card>
  );
}

function EmptySection() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <p className="font-['Aileron'] text-[14px] text-[#64748B]">No rules configured for this section.</p>
    </div>
  );
}
