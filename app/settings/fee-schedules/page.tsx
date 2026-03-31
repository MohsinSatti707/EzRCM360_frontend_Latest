"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ArrowRight, ArrowLeft, Upload, Download, FileSpreadsheet, Trash2, Pencil, Plus } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { Checkbox } from "@/components/ui/Checkbox";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { feeSchedulesApi } from "@/lib/services/feeSchedules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { FeeScheduleDto, FeeScheduleDetailDto, FeeScheduleLineDto, CreateFeeScheduleCommand, CreateFeeScheduleLineRequest } from "@/lib/services/feeSchedules";
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
  years: [new Date().getFullYear()],
  quarters: [],
  calculationModel: 0,
  adoptFeeScheduleId: null,
  multiplierPct: 1.0,
  fallbackCategory: null,
  status: 0,
  source: "",
  notes: "",
};

function resolveFromLookup(val: unknown, items?: { value: number; name: string }[]): number {
  if (typeof val === "number") return val;
  if (!items) return 0;
  const str = String(val);
  const found = items.find((i) => i.name === str);
  if (found) return found.value;
  const n = Number(str);
  return isNaN(n) ? 0 : n;
}

function resolveFromLookupNullable(val: unknown, items?: { value: number; name: string }[]): number | null {
  if (val == null || val === "") return null;
  return resolveFromLookup(val, items);
}

function resolveCategoryStr(category: number | string): string {
  const catStr = String(category);
  const catMap: Record<string, string> = {
    "0": "Medicare", "Medicare": "Medicare",
    "1": "UCR", "UCR": "UCR",
    "2": "MVA", "MVA": "MVA",
    "3": "WC", "WC": "WC",
  };
  return catMap[catStr] ?? "Medicare";
}

export default function FeeSchedulesPage() {
  const [data, setData] = useState<PaginatedList<FeeScheduleDto> | null>(null);
  const [lookups, setLookups] = useState<Awaited<ReturnType<ReturnType<typeof feeSchedulesApi>["getLookups"]>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFeeScheduleCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [createdScheduleId, setCreatedScheduleId] = useState<string | null>(null);
  const [createdScheduleIds, setCreatedScheduleIds] = useState<string[]>([]);
  // Years/quarters are now part of form state (form.years, form.quarters)

  // Fee schedule options for adoptFeeScheduleId dropdown
  const [fsOptions, setFsOptions] = useState<FeeScheduleDto[]>([]);

  // Lines modal state
  const [linesSchedule, setLinesSchedule] = useState<FeeScheduleDto | null>(null);
  const [linesData, setLinesData] = useState<PaginatedList<FeeScheduleLineDto> | null>(null);
  const [linesPage, setLinesPage] = useState(1);
  const [linesSearch, setLinesSearch] = useState("");
  const debouncedLinesSearch = useDebounce(linesSearch, 300);
  const [linesLoading, setLinesLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wizardFileRef = useRef<HTMLInputElement>(null);
  const [wizardLinesData, setWizardLinesData] = useState<PaginatedList<FeeScheduleLineDto> | null>(null);
  const [wizardLinesLoading, setWizardLinesLoading] = useState(false);
  const [wizardImportLoading, setWizardImportLoading] = useState(false);

  // Line CRUD state
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineEditId, setLineEditId] = useState<string | null>(null);
  const [lineForm, setLineForm] = useState<CreateFeeScheduleLineRequest>({ cptHcpcs: "", feeAmount: 0 });
  const [lineSubmitLoading, setLineSubmitLoading] = useState(false);
  const [lineDeleteId, setLineDeleteId] = useState<string | null>(null);
  const [lineDeleteLoading, setLineDeleteLoading] = useState(false);
  const [lineSelectedIds, setLineSelectedIds] = useState<Set<string>>(new Set());
  const [lineBulkDeleteConfirm, setLineBulkDeleteConfirm] = useState(false);
  const [lineBulkDeleteLoading, setLineBulkDeleteLoading] = useState(false);

  const api = feeSchedulesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Fee Schedules");

  const loadList = useCallback(() => {
    setError(null);
    api.getList({
      pageNumber: page,
      pageSize,
      status: statusFilter === "all" ? undefined : Number(statusFilter),
    }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, pageSize, statusFilter]);

  const handleStatusChange = async (row: FeeScheduleDto, statusValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      const detail = await api.getById(row.id);
      const payload: CreateFeeScheduleCommand = {
        scheduleCode: detail.scheduleCode ?? "",
        category: detail.category,
        state: detail.state ?? "",
        geoType: detail.geoType,
        geoCode: detail.geoCode ?? "",
        geoName: detail.geoName ?? "",
        billingType: detail.billingType,
        years: detail.years ?? [],
        quarters: detail.quarters ?? [],
        calculationModel: detail.calculationModel,
        adoptFeeScheduleId: detail.adoptFeeScheduleId ?? null,
        multiplierPct: detail.multiplierPct,
        fallbackCategory: detail.fallbackCategory ?? null,
        status: statusValue,
        source: detail.source ?? "",
        notes: detail.notes ?? "",
      };
      await api.update(row.id, payload);
      loadList();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    api.getLookups().then(setLookups).catch(() => setLookups(null));
    api.getList({ pageSize: 500, status: 0 }).then((res) => setFsOptions(res.items)).catch(() => {});
  }, []);

  // Debounced search for fee schedule lines
  useEffect(() => {
    if (linesSchedule) {
      setLinesPage(1);
      loadLines(linesSchedule.id, 1, debouncedLinesSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLinesSearch]);

  const openCreate = () => {
    setEditId(null);
    setCreatedScheduleId(null);
    setCreatedScheduleIds([]);
    setWizardStep(1);
    const currentYear = new Date().getFullYear();
    setForm({
      ...defaultForm,
      years: [lookups?.years?.find((y) => y === currentYear) ?? lookups?.years?.[0] ?? currentYear],
      quarters: [],
    });
    setFormError(null);
    setWizardLinesData(null);
    setModalOpen(true);
  };
  const openEdit = (row: FeeScheduleDto) => {
    setEditId(row.id);
    setWizardStep(2); // Edit goes directly to fields step
    setFormError(null);
    setModalOpen(true);
    api.getById(row.id).then((detail: FeeScheduleDetailDto) => {
      setForm({
        scheduleCode: detail.scheduleCode ?? "",
        category: resolveFromLookup(detail.category, lookups?.categories),
        state: detail.state ?? "",
        geoType: resolveFromLookup(detail.geoType, lookups?.geoTypes),
        geoCode: detail.geoCode ?? "",
        geoName: detail.geoName ?? "",
        billingType: resolveFromLookup(detail.billingType, lookups?.billingTypes),
        years: detail.years ?? [],
        quarters: detail.quarters ?? [],
        calculationModel: resolveFromLookup(detail.calculationModel, lookups?.calculationModels),
        adoptFeeScheduleId: detail.adoptFeeScheduleId ?? null,
        multiplierPct: detail.multiplierPct,
        fallbackCategory: resolveFromLookupNullable(detail.fallbackCategory, lookups?.categories),
        status: resolveFromLookup(detail.status, STATUS_OPTIONS.map((o) => ({ value: o.value, name: o.name }))),
        source: detail.source ?? "",
        notes: detail.notes ?? "",
      });
    }).catch(() => setFormError("Failed to load."));
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, form);
        setModalOpen(false);
        loadList();
        toast.success("Updated successfully.");
      } else {
        const newId = await api.create(form);
        setCreatedScheduleIds([newId]);
        setCreatedScheduleId(newId);
        loadList();
        toast.success("Fee schedule created. You can now import lines.");
        setWizardStep(3);
      }
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

  const openLines = (row: FeeScheduleDto) => {
    setLinesSchedule(row);
    setLinesPage(1);
    setLinesSearch("");
    setLinesData(null);
    setLineSelectedIds(new Set());
    loadLines(row.id, 1);
  };

  const loadLines = (id: string, pg: number, search?: string) => {
    setLinesLoading(true);
    api.getLines(id, { pageNumber: pg, pageSize: 20, search: search || undefined })
      .then(setLinesData)
      .catch(() => toast.error("Failed to load lines."))
      .finally(() => setLinesLoading(false));
  };

  const handleImportLines = async (file: File, scheduleId: string, isWizard = false) => {
    const setLoading = isWizard ? setWizardImportLoading : setImportLoading;
    setLoading(true);
    try {
      const result = await api.importLines(scheduleId, file);
      if (result.success) {
        toast.success(`Imported ${result.rowsImported} lines.`);
        if (isWizard) {
          loadWizardLines(scheduleId);
        } else {
          setLinesSearch("");
          loadLines(scheduleId, 1);
          setLinesPage(1);
        }
      } else {
        toast.error(result.errors?.join("; ") || "Import failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
      if (isWizard && wizardFileRef.current) wizardFileRef.current.value = "";
      if (!isWizard && fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadWizardLines = (id: string) => {
    setWizardLinesLoading(true);
    api.getLines(id, { pageNumber: 1, pageSize: 20 })
      .then(setWizardLinesData)
      .catch(() => {})
      .finally(() => setWizardLinesLoading(false));
  };

  // Line CRUD handlers
  const openAddLine = () => {
    setLineEditId(null);
    setLineForm({ cptHcpcs: "", feeAmount: 0, zip: "", modifier: "", rv: null, pctcIndicator: null, fee50th: null, fee60th: null, fee70th: null, fee75th: null, fee80th: null, fee85th: null, fee90th: null, fee95th: null });
    setLineModalOpen(true);
  };
  const openEditLine = (line: FeeScheduleLineDto) => {
    setLineEditId(line.id);
    setLineForm({
      cptHcpcs: line.cptHcpcs, feeAmount: line.feeAmount, zip: line.zip ?? "", modifier: line.modifier ?? "",
      rv: line.rv, pctcIndicator: line.pctcIndicator,
      fee50th: line.fee50th, fee60th: line.fee60th, fee70th: line.fee70th, fee75th: line.fee75th,
      fee80th: line.fee80th, fee85th: line.fee85th, fee90th: line.fee90th, fee95th: line.fee95th,
    });
    setLineModalOpen(true);
  };
  const handleLineSave = async () => {
    if (!linesSchedule) return;
    if (!lineForm.cptHcpcs.trim()) { toast.error("CPT/HCPCS is required."); return; }
    setLineSubmitLoading(true);
    try {
      const payload = { ...lineForm, zip: lineForm.zip || null, modifier: lineForm.modifier || null };
      if (lineEditId) {
        await api.updateLine(lineEditId, payload);
        toast.success("Line updated.");
      } else {
        await api.createLine(linesSchedule.id, payload);
        toast.success("Line created.");
      }
      setLineModalOpen(false);
      loadLines(linesSchedule.id, linesPage, linesSearch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setLineSubmitLoading(false);
    }
  };
  const handleLineDelete = async () => {
    if (!lineDeleteId || !linesSchedule) return;
    setLineDeleteLoading(true);
    try {
      await api.deleteLine(lineDeleteId);
      toast.success("Line deleted.");
      setLineDeleteId(null);
      loadLines(linesSchedule.id, linesPage, linesSearch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setLineDeleteLoading(false);
    }
  };

  const handleLineBulkDelete = async () => {
    if (lineSelectedIds.size === 0 || !linesSchedule) return;
    setLineBulkDeleteLoading(true);
    try {
      await Promise.all(Array.from(lineSelectedIds).map((id) => api.deleteLine(id)));
      toast.success(`Deleted ${lineSelectedIds.size} line(s).`);
      setLineSelectedIds(new Set());
      setLineBulkDeleteConfirm(false);
      loadLines(linesSchedule.id, linesPage, linesSearch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setLineBulkDeleteLoading(false);
    }
  };
  const toggleLineSelect = (id: string) => {
    setLineSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllLines = () => {
    if (!linesData) return;
    const allOnPage = linesData.items.map((l) => l.id);
    const allSelected = allOnPage.every((id) => lineSelectedIds.has(id));
    setLineSelectedIds((prev) => {
      const next = new Set(prev);
      allOnPage.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const downloadTemplateForCategory = async (category: number | string) => {
    try {
      await api.downloadLinesTemplate(resolveCategoryStr(category));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const categoryLabel = (n: number | string) => {
    const num = typeof n === "string" ? lookups?.categories?.find((c) => c.name === n)?.value : n;
    return lookups?.categories?.find((c) => c.value === num)?.name ?? String(n);
  };
  const statusLabel = (n: number) => STATUS_OPTIONS.find((o) => o.value === n)?.name ?? String(n);

  const filteredItems = data?.items.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (row.scheduleCode?.toLowerCase().includes(q)) ||
      (row.state?.toLowerCase().includes(q)) ||
      categoryLabel(row.category).toLowerCase().includes(q);
  }) ?? [];

  // Wizard step titles
  const wizardTitle = editId
    ? "Edit fee schedule"
    : wizardStep === 1
      ? "Step 1: Select Category"
      : wizardStep === 2
        ? `Step 2: ${resolveCategoryStr(form.category)} Configuration`
        : `Step 3: Import Lines (${resolveCategoryStr(form.category)})`;

  const wizardFooter = (
    <div className="flex w-full items-center justify-between border-t border-border bg-card px-6 py-4">
      {!editId && wizardStep === 2 ? (
        <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      ) : (
        <div />
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
          {wizardStep === 3 && !editId ? "Close" : "Cancel"}
        </Button>

        {!editId && wizardStep === 1 && (
          <Button onClick={() => setWizardStep(2)} className="bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}

        {wizardStep === 2 && (
          <Button onClick={handleSubmit} disabled={submitLoading} className="bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
            {submitLoading ? "Saving…" : editId ? "Update" : <>Next: Import Lines <ArrowRight className="ml-1 h-4 w-4" /></>}
          </Button>
        )}

        {!editId && wizardStep === 3 && (
          <Button onClick={() => { setModalOpen(false); loadList(); }} className="bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
            Done
          </Button>
        )}
      </div>
    </div>
  );

  const wizardStepper = !editId ? (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            wizardStep === s ? "bg-[#0066CC] text-white" : wizardStep > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
          }`}>
            {wizardStep > s ? "✓" : s}
          </div>
          <span className={`text-sm ${wizardStep === s ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            {s === 1 ? "Category" : s === 2 ? "Configuration" : "CPT Fees"}
          </span>
          {s < 3 && <div className={`h-0.5 w-8 ${wizardStep > s ? "bg-green-500" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  ) : null;

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
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Fee Schedules" description="Centralized valuation datasets." />

      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-l-[5px] font-aileron text-[14px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="0">Active</SelectItem>
              <SelectItem value="1">Inactive</SelectItem>
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
              apiBase="/api/FeeSchedules"
              templateFileName="FeeSchedules_BulkImport_Template.xlsx"
              onImportSuccess={loadList}
            />
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add Fee Schedule <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {data && (
        <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
          <Table className="min-w-[1200px] table-fixed">
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
                  <TableHeaderCell className="w-[160px] min-w-[160px]">Code</TableHeaderCell>
                  <TableHeaderCell className="w-[180px] min-w-[180px]">Category</TableHeaderCell>
                  <TableHeaderCell className="w-[110px] min-w-[110px]">State</TableHeaderCell>
                  <TableHeaderCell className="w-[110px] min-w-[110px]">Year / Q</TableHeaderCell>
                  <TableHeaderCell className="w-[160px] min-w-[160px]">Status</TableHeaderCell>
                  <TableHeaderCell className="w-[130px] min-w-[130px]">CPT Fees</TableHeaderCell>
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
                    <TableCell className="w-[160px] min-w-[160px]">
                      <div className="max-w-[140px] truncate">{row.scheduleCode ?? "—"}</div>
                    </TableCell>
                    <TableCell className="w-[180px] min-w-[180px]">
                      <div className="max-w-[160px] truncate">{categoryLabel(row.category)}</div>
                    </TableCell>
                    <TableCell className="w-[110px] min-w-[110px]">
                      <div className="max-w-[90px] truncate">{row.state ?? "—"}</div>
                    </TableCell>
                    <TableCell className="w-[110px] min-w-[110px]">
                      <div className="max-w-[90px] truncate" title={`${row.years?.join(", ") ?? ""}${row.quarters?.length ? ` / Q${row.quarters.join(",")}` : ""}`}>{row.years?.join(", ") ?? ""}{row.quarters?.length ? ` / Q${row.quarters.join(",")}` : ""}</div>
                    </TableCell>
                    <TableCell className="w-[160px] min-w-[160px]">
                      <select
                        value={resolveFromLookup(row.status, STATUS_OPTIONS.map((o) => ({ value: o.value, name: o.name })))}
                        onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="input-enterprise w-[140px] rounded-l-[5px] rounded-r-0 px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="w-[130px] min-w-[130px]">
                      <button onClick={() => openLines(row)} className="text-xs text-blue-600 hover:underline" title="Manage CPT Fees">
                        <FileSpreadsheet className="inline h-4 w-4 mr-0.5" />CPT Fees
                      </button>
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
          <div className="mt-auto shrink-0 pt-4">
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
      {!data && !error && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}

      {/* 3-step wizard / edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={wizardTitle} size="lg" position="right" headerContent={wizardStepper} footer={wizardFooter}>
        {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

        {/* STEP 1: Category selection (create only) */}
        {!editId && wizardStep === 1 && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">Select the fee schedule category to configure.</p>
            <div>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: Number(e.target.value) }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {lookups?.categories?.map((c) => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* STEP 2: Configuration fields */}
        {wizardStep === 2 && (
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Schedule code</label>
                <input type="text" value={form.scheduleCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, scheduleCode: e.target.value }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
              </div>
              {editId && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                    {lookups?.categories?.map((c) => (
                      <option key={c.value} value={c.value}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!editId && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
                  <div className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">{resolveCategoryStr(form.category)}</div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">State</label>
                <select value={form.state ?? ""} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  <option value="">—</option>
                  {lookups?.states?.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Geo type</label>
                <select value={form.geoType} onChange={(e) => setForm((f) => ({ ...f, geoType: Number(e.target.value), geoCode: "", geoName: "" }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  {lookups?.geoTypes?.map((g) => (
                    <option key={g.value} value={g.value}>{g.name}</option>
                  ))}
                </select>
              </div>
              {/* Geo Type = Area (1): show Region input */}
              {form.geoType === 1 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Region</label>
                  <input type="text" placeholder="e.g. Northern New Jersey" value={form.geoName ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoName: e.target.value }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
                </div>
              )}
              {/* Geo Type = Zip (2): show mapping type + zip inputs */}
              {form.geoType === 2 && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Mapping type</label>
                    <select value={form.geoName === "ZipRange" ? "ZipRange" : "ZipExact"} onChange={(e) => setForm((f) => ({ ...f, geoName: e.target.value, geoCode: "" }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                      <option value="ZipExact">ZipExact</option>
                      <option value="ZipRange">ZipRange</option>
                    </select>
                  </div>
                  {form.geoName !== "ZipRange" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">ZIP code</label>
                      <input type="text" placeholder="e.g. 07040" value={form.geoCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoCode: e.target.value }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">ZIP from</label>
                        <input type="text" placeholder="e.g. 07000" value={(form.geoCode ?? "").split("-")[0] ?? ""} onChange={(e) => { const to = (form.geoCode ?? "").split("-")[1] ?? ""; setForm((f) => ({ ...f, geoCode: `${e.target.value}-${to}` })); }} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">ZIP to</label>
                        <input type="text" placeholder="e.g. 07999" value={(form.geoCode ?? "").split("-")[1] ?? ""} onChange={(e) => { const from = (form.geoCode ?? "").split("-")[0] ?? ""; setForm((f) => ({ ...f, geoCode: `${from}-${e.target.value}` })); }} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
                      </div>
                    </>
                  )}
                </>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Billing type</label>
                <select value={form.billingType} onChange={(e) => setForm((f) => ({ ...f, billingType: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  {lookups?.billingTypes?.map((b) => (
                    <option key={b.value} value={b.value}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Calculation model</label>
                <select value={form.calculationModel} onChange={(e) => setForm((f) => ({ ...f, calculationModel: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  {lookups?.calculationModels?.map((c) => (
                    <option key={c.value} value={c.value}>{c.name}</option>
                  ))}
                </select>
              </div>
              <MultiSelectDropdown
                label="Year(s)"
                options={lookups?.years?.map((y) => ({ value: y, label: String(y) })) ?? []}
                selected={form.years}
                onChange={(yrs) => setForm((f) => ({ ...f, years: yrs }))}
                placeholder="Select year(s)"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Quarter(s)</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.quarters.length === 0} onChange={() => setForm((f) => ({ ...f, quarters: [] }))} className="rounded border-input" />
                    <span className="text-sm font-medium">Whole Year</span>
                  </label>
                  {[1, 2, 3, 4].map((q) => (
                    <label key={q} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.quarters.includes(q)}
                        onChange={() => setForm((f) => ({
                          ...f,
                          quarters: f.quarters.includes(q) ? f.quarters.filter((v) => v !== q) : [...f.quarters, q].sort()
                        }))}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Q{q}</span>
                    </label>
                  ))}
                </div>
                {form.quarters.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Applies to the entire year.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Multiplier %</label>
                <input type="number" step={0.01} value={form.multiplierPct} onChange={(e) => setForm((f) => ({ ...f, multiplierPct: Number(e.target.value) || 0 }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Fallback category</label>
                <select value={form.fallbackCategory ?? ""} onChange={(e) => setForm((f) => ({ ...f, fallbackCategory: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  <option value="">None</option>
                  {lookups?.categories?.map((c) => (
                    <option key={c.value} value={c.value}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Adopt fee schedule</label>
                <select value={form.adoptFeeScheduleId ?? ""} onChange={(e) => setForm((f) => ({ ...f, adoptFeeScheduleId: e.target.value || null }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  <option value="">None</option>
                  {fsOptions.filter((fs) => fs.id !== editId).map((fs) => (
                    <option key={fs.id} value={fs.id}>
                      {fs.scheduleCode ?? "—"} — {categoryLabel(fs.category)} {fs.state ? `(${fs.state})` : ""} {fs.years?.join(",")}{fs.quarters?.length ? `/Q${fs.quarters.join(",")}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Source</label>
                <input type="text" value={form.source ?? ""} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" placeholder="e.g. CMS Medicare PFS" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
                <textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Lines import (create flow only) */}
        {!editId && wizardStep === 3 && createdScheduleId && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Fee schedule created. Download the template, fill in your CPT/HCPCS lines, and import.
            </p>
            <div className="mb-4 flex items-center gap-3">
              <Button onClick={() => downloadTemplateForCategory(form.category)} variant="outline" className="h-9 text-sm gap-1.5">
                <Download className="h-4 w-4" /> Download Template
              </Button>
              <Button onClick={() => wizardFileRef.current?.click()} disabled={wizardImportLoading} className="h-9 text-sm gap-1.5 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
                <Upload className="h-4 w-4" /> {wizardImportLoading ? "Importing…" : "Import Lines"}
              </Button>
              <input ref={wizardFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                // Import into ALL created fee schedules
                const ids = createdScheduleIds.length > 0 ? createdScheduleIds : (createdScheduleId ? [createdScheduleId] : []);
                for (const id of ids) {
                  await handleImportLines(f, id, id === ids[ids.length - 1]);
                }
              }} />
              {wizardLinesData && <span className="text-xs text-muted-foreground ml-auto">{wizardLinesData.totalCount} total lines</span>}
            </div>

            {wizardLinesLoading && <div className="py-6 text-center text-sm text-muted-foreground">Loading lines…</div>}
            {!wizardLinesLoading && wizardLinesData && wizardLinesData.items.length > 0 && (
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">CPT/HCPCS</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Modifier</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Fee Amount</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">RV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {wizardLinesData.items.map((line) => (
                      <tr key={line.id} className="hover:bg-muted">
                        <td className="px-3 py-2 font-mono">{line.cptHcpcs}</td>
                        <td className="px-3 py-2">{line.modifier ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{line.feeAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{line.rv?.toFixed(4) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!wizardLinesLoading && (!wizardLinesData || wizardLinesData.items.length === 0) && (
              <div className="py-6 text-center text-sm text-muted-foreground">No lines imported yet. Download the template and upload to add lines.</div>
            )}

          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete fee schedule" message="Are you sure you want to delete this fee schedule?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected fee schedules"
        message={`Are you sure you want to delete ${selectedIds.size} fee schedule(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />

      <OverlayLoader visible={overlayLoading} />

      {/* Line add/edit modal */}
      <Modal open={lineModalOpen} onClose={() => setLineModalOpen(false)} title={lineEditId ? "Edit Fee Schedule Line" : "Add Fee Schedule Line"} size="md" position="right">
        <div className="grid grid-cols-2 gap-4">
          {(String(linesSchedule?.category) === "1" || String(linesSchedule?.category) === "UCR") && (
            <div>
              <label className="text-sm font-medium">ZIP</label>
              <input className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.zip ?? ""} onChange={(e) => setLineForm({ ...lineForm, zip: e.target.value })} placeholder="e.g. 070403716" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">CPT/HCPCS *</label>
            <input className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.cptHcpcs} onChange={(e) => setLineForm({ ...lineForm, cptHcpcs: e.target.value })} placeholder="e.g. 99213" />
          </div>
          <div>
            <label className="text-sm font-medium">Modifier</label>
            <input className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.modifier ?? ""} onChange={(e) => setLineForm({ ...lineForm, modifier: e.target.value })} placeholder="e.g. 26" />
          </div>
          <div>
            <label className="text-sm font-medium">Fee Amount *</label>
            <input type="number" step="0.01" className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.feeAmount} onChange={(e) => setLineForm({ ...lineForm, feeAmount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm font-medium">RV</label>
            <input type="number" step="0.0001" className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.rv ?? ""} onChange={(e) => setLineForm({ ...lineForm, rv: e.target.value ? parseFloat(e.target.value) : null })} />
          </div>
          {(String(linesSchedule?.category) === "1" || String(linesSchedule?.category) === "UCR") && (
            <>
              <div>
                <label className="text-sm font-medium">50th Percentile</label>
                <input type="number" step="0.01" className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.fee50th ?? ""} onChange={(e) => setLineForm({ ...lineForm, fee50th: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div>
                <label className="text-sm font-medium">75th Percentile</label>
                <input type="number" step="0.01" className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.fee75th ?? ""} onChange={(e) => setLineForm({ ...lineForm, fee75th: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div>
                <label className="text-sm font-medium">90th Percentile</label>
                <input type="number" step="0.01" className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.fee90th ?? ""} onChange={(e) => setLineForm({ ...lineForm, fee90th: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
            </>
          )}
          {(String(linesSchedule?.category) === "3" || String(linesSchedule?.category) === "WC") && (
            <div>
              <label className="text-sm font-medium">PC/TC Indicator</label>
              <select className="mt-1 w-full rounded-[5px] border px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" value={lineForm.pctcIndicator ?? ""} onChange={(e) => setLineForm({ ...lineForm, pctcIndicator: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                <option value="0">Professional (P)</option>
                <option value="1">Technical (T)</option>
              </select>
            </div>
          )}
        </div>
        <ModalFooter
          onCancel={() => setLineModalOpen(false)}
          onSubmit={handleLineSave}
          submitLabel={lineSubmitLoading ? "Saving…" : lineEditId ? "Update" : "Create"}
          loading={lineSubmitLoading}
        />
      </Modal>

      {/* Line delete confirm */}
      <ConfirmDialog
        open={!!lineDeleteId}
        onClose={() => setLineDeleteId(null)}
        onConfirm={handleLineDelete}
        title="Delete Fee Schedule Line"
        message="Are you sure you want to delete this fee schedule line? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={lineDeleteLoading}
      />

      {/* Line bulk delete confirm */}
      <ConfirmDialog
        open={lineBulkDeleteConfirm}
        onClose={() => setLineBulkDeleteConfirm(false)}
        onConfirm={handleLineBulkDelete}
        title="Delete Selected Lines"
        message={`Are you sure you want to delete ${lineSelectedIds.size} selected line(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={lineBulkDeleteLoading}
      />

      {/* Lines management modal (from table Actions) */}
      <Modal open={!!linesSchedule} onClose={() => setLinesSchedule(null)} title={`CPT Fees — ${linesSchedule?.scheduleCode ?? ""} (${categoryLabel(linesSchedule?.category ?? 0)})`} size="lg">
        <div className="mb-4 flex items-center gap-3">
          <Button onClick={() => linesSchedule && downloadTemplateForCategory(linesSchedule.category)} variant="outline" className="h-9 text-sm gap-1.5">
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} className="h-9 text-sm gap-1.5 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
            <Upload className="h-4 w-4" /> {importLoading ? "Importing…" : "Import Lines"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && linesSchedule) handleImportLines(f, linesSchedule.id); }} />
          <Button onClick={openAddLine} className="h-9 text-sm gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4" /> Add Line
          </Button>
          {lineSelectedIds.size > 0 && (
            <Button onClick={() => setLineBulkDeleteConfirm(true)} variant="outline" className="h-9 text-sm gap-1.5 text-red-600 border-red-300 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Delete ({lineSelectedIds.size})
            </Button>
          )}
          {linesData && <span className="text-xs text-muted-foreground ml-auto">{linesData.totalCount} total lines</span>}
        </div>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search by CPT code, ZIP, or modifier..."
            value={linesSearch}
            onChange={(e) => setLinesSearch(e.target.value)}
            className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
        </div>
        {linesLoading && <div className="py-6 text-center text-sm text-muted-foreground">Loading lines…</div>}
        {!linesLoading && linesData && linesData.items.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">No lines yet. Import an Excel file to add lines.</div>
        )}
        {!linesLoading && linesData && linesData.items.length > 0 && (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    <th className="px-3 py-2 w-8"><Checkbox checked={linesData ? linesData.items.every((l) => lineSelectedIds.has(l.id)) : false} onCheckedChange={toggleAllLines} /></th>
                    {String(linesSchedule?.category) === "1" || String(linesSchedule?.category) === "UCR" ? <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">ZIP</th> : null}
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">CPT/HCPCS</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Modifier</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Fee Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">RV</th>
                    {String(linesSchedule?.category) === "3" || String(linesSchedule?.category) === "WC" ? <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">PC/TC</th> : null}
                    {(String(linesSchedule?.category) === "1" || String(linesSchedule?.category) === "UCR") && (
                      <>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">50th</th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">75th</th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">90th</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-center text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linesData.items.map((line) => {
                    const isUCR = String(linesSchedule?.category) === "1" || String(linesSchedule?.category) === "UCR";
                    const isWC = String(linesSchedule?.category) === "3" || String(linesSchedule?.category) === "WC";
                    return (
                      <tr key={line.id} className="hover:bg-muted">
                        <td className="px-3 py-2 w-8"><Checkbox checked={lineSelectedIds.has(line.id)} onCheckedChange={() => toggleLineSelect(line.id)} /></td>
                        {isUCR && <td className="px-3 py-2">{line.zip ?? "—"}</td>}
                        <td className="px-3 py-2 font-mono">{line.cptHcpcs}</td>
                        <td className="px-3 py-2">{line.modifier ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{line.feeAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{line.rv?.toFixed(4) ?? "—"}</td>
                        {isWC && <td className="px-3 py-2">{line.pctcIndicator === 0 ? "P" : line.pctcIndicator === 1 ? "T" : "—"}</td>}
                        {isUCR && (
                          <>
                            <td className="px-3 py-2 text-right">{line.fee50th?.toFixed(2) ?? "—"}</td>
                            <td className="px-3 py-2 text-right">{line.fee75th?.toFixed(2) ?? "—"}</td>
                            <td className="px-3 py-2 text-right">{line.fee90th?.toFixed(2) ?? "—"}</td>
                          </>
                        )}
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditLine(line)} className="p-1 rounded hover:bg-muted" title="Edit">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </button>
                            <button onClick={() => setLineDeleteId(line.id)} className="p-1 rounded hover:bg-red-50" title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {linesData.totalPages > 1 && (
              <div className="mt-3">
                <Pagination
                  pageNumber={linesData.pageNumber}
                  totalPages={linesData.totalPages}
                  totalCount={linesData.totalCount}
                  hasPreviousPage={linesData.hasPreviousPage}
                  hasNextPage={linesData.hasNextPage}
                  onPrevious={() => { const p = linesPage - 1; setLinesPage(p); loadLines(linesSchedule!.id, p, linesSearch); }}
                  onNext={() => { const p = linesPage + 1; setLinesPage(p); loadLines(linesSchedule!.id, p, linesSearch); }}
                  onPageChange={(p) => { setLinesPage(p); loadLines(linesSchedule!.id, p, linesSearch); }}
                  pageSize={20}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
