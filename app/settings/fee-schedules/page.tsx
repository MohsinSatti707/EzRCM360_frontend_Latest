"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ArrowRight, ArrowLeft, Upload, Download, FileSpreadsheet, Trash2 } from "lucide-react";
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
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { Pagination } from "@/components/ui/Pagination";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { Checkbox } from "@/components/ui/Checkbox";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { feeSchedulesApi } from "@/lib/services/feeSchedules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { FeeScheduleDto, FeeScheduleDetailDto, FeeScheduleLineDto, CreateFeeScheduleCommand } from "@/lib/services/feeSchedules";
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
  multiplierPct: 1.0,
  fallbackCategory: null,
  status: 0,
  source: "",
  notes: "",
};

function resolveCategoryStr(category: number | string): string {
  const catStr = String(category);
  const catMap: Record<string, string> = {
    "0": "Medicare", "Medicare": "Medicare",
    "1": "UCR", "UCR": "UCR",
    "2": "MVA", "MVA": "MVA",
    "3": "WC", "WC": "WC",
    "4": "Custom", "Custom": "Custom",
  };
  return catMap[catStr] ?? "Medicare";
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Medicare: "CMS Medicare Physician Fee Schedule",
  UCR: "Usual, Customary & Reasonable (percentile-based)",
  MVA: "Motor Vehicle Accident fee schedule",
  WC: "Workers' Compensation fee schedule",
  Custom: "Custom fee schedule (v1.1)",
};

export default function FeeSchedulesPage() {
  const [data, setData] = useState<PaginatedList<FeeScheduleDto> | null>(null);
  const [lookups, setLookups] = useState<Awaited<ReturnType<ReturnType<typeof feeSchedulesApi>["getLookups"]>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [createdScheduleId, setCreatedScheduleId] = useState<string | null>(null);

  // Fee schedule options for adoptFeeScheduleId dropdown
  const [fsOptions, setFsOptions] = useState<FeeScheduleDto[]>([]);
  // Zip mapping type: 0 = ZipExact, 1 = ZipRange (local UI state only)
  const [zipMappingType, setZipMappingType] = useState<number>(0);

  // Lines modal state
  const [linesSchedule, setLinesSchedule] = useState<FeeScheduleDto | null>(null);
  const [linesData, setLinesData] = useState<PaginatedList<FeeScheduleLineDto> | null>(null);
  const [linesPage, setLinesPage] = useState(1);
  const [linesLoading, setLinesLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wizardFileRef = useRef<HTMLInputElement>(null);
  const [wizardLinesData, setWizardLinesData] = useState<PaginatedList<FeeScheduleLineDto> | null>(null);
  const [wizardLinesLoading, setWizardLinesLoading] = useState(false);
  const [wizardImportLoading, setWizardImportLoading] = useState(false);

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

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    api.getLookups().then(setLookups).catch(() => setLookups(null));
    api.getList({ pageSize: 500, status: 0 }).then((res) => setFsOptions(res.items)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditId(null);
    setCreatedScheduleId(null);
    setWizardStep(1);
    setForm({
      ...defaultForm,
      year: lookups?.years?.[0] ?? new Date().getFullYear(),
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
        year: detail.year,
        quarter: detail.quarter,
        calculationModel: detail.calculationModel,
        adoptFeeScheduleId: detail.adoptFeeScheduleId ?? null,
        multiplierPct: detail.multiplierPct,
        fallbackCategory: detail.fallbackCategory ?? null,
        status: statusValue,
        source: detail.source ?? "",
        notes: detail.notes ?? "",
      };
      await api.update(row.id, payload);
      await loadList();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openLines = (row: FeeScheduleDto) => {
    setLinesSchedule(row);
    setLinesPage(1);
    setLinesData(null);
    loadLines(row.id, 1);
  };

  const loadLines = (id: string, pg: number) => {
    setLinesLoading(true);
    api.getLines(id, { pageNumber: pg, pageSize: 20 })
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
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Fee Schedules" description="Centralized valuation datasets." />

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-3">
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
            <Table className="min-w-[900px] table-fixed">
              <TableHead>
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
                  <TableHeaderCell className="w-[140px] min-w-[140px]">Category</TableHeaderCell>
                  <TableHeaderCell className="w-[100px] min-w-[100px]">State</TableHeaderCell>
                  <TableHeaderCell className="w-[100px] min-w-[100px]">Year / Q</TableHeaderCell>
                  <TableHeaderCell className="w-[160px] min-w-[160px]">Status</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <TableHeaderCell className="!w-[160px] min-w-[160px]">Actions</TableHeaderCell>
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
                    <TableCell className="w-[140px] min-w-[140px]">
                      <div className="max-w-[120px] truncate">{categoryLabel(row.category)}</div>
                    </TableCell>
                    <TableCell className="w-[100px] min-w-[100px]">
                      <div className="max-w-[80px] truncate">{row.state ?? "—"}</div>
                    </TableCell>
                    <TableCell className="w-[100px] min-w-[100px]">
                      <div className="max-w-[80px] truncate">{row.year} / {row.quarter}</div>
                    </TableCell>
                    <TableCell className="w-[160px] min-w-[160px]">
                      <select
                        value={row.status}
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
                    {(canUpdate || canDelete) && (
                      <TableCell className="!w-[160px] min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openLines(row)} className="text-xs text-blue-600 hover:underline" title="Manage lines">
                            <FileSpreadsheet className="inline h-4 w-4 mr-0.5" />Lines
                          </button>
                          <TableActionsCell
                            canEdit={canUpdate}
                            canDelete={canDelete}
                            onEdit={() => openEdit(row)}
                            onDelete={() => setDeleteId(row.id)}
                          />
                        </div>
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
      {!data && !error && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}

      {/* 3-step wizard / edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={wizardTitle} size="lg" position="right">
        {formError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

        {/* Step indicator for create */}
        {!editId && (
          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  wizardStep === s ? "bg-[#0066CC] text-white" : wizardStep > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {wizardStep > s ? "✓" : s}
                </div>
                <span className={`text-sm ${wizardStep === s ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Category" : s === 2 ? "Configuration" : "Lines"}
                </span>
                {s < 3 && <div className={`h-0.5 w-8 ${wizardStep > s ? "bg-green-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Category selection (create only) */}
        {!editId && wizardStep === 1 && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">Select the fee schedule category to configure.</p>
            <div>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: Number(e.target.value) }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                {lookups?.categories?.map((c) => (
                  <option key={c.value} value={c.value}>{c.name} — {CATEGORY_DESCRIPTIONS[c.name] ?? ""}</option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setWizardStep(2)} className="bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Configuration fields */}
        {wizardStep === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
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
                  <div className="w-full rounded-[5px] border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">{resolveCategoryStr(form.category)}</div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">State</label>
                <select
                  value={form.state ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({
                      ...f,
                      state: val,
                      // Auto-select State geo type when a state is chosen
                      ...(val ? { geoType: 0 } : {}),
                    }));
                  }}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {lookups?.states?.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Geo type</label>
                <select
                  value={form.geoType}
                  onChange={(e) => {
                    const gt = Number(e.target.value);
                    setForm((f) => ({ ...f, geoType: gt, geoCode: "", geoName: "" }));
                    setZipMappingType(0);
                  }}
                  disabled={!!form.state}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {lookups?.geoTypes?.map((g) => (
                    <option key={g.value} value={g.value}>{g.name}</option>
                  ))}
                </select>
              </div>
              {/* State geo type (0): Geo code + Geo name */}
              {form.geoType === 0 && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Geo code</label>
                    <input type="text" value={form.geoCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoCode: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="e.g. 01, 99" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Geo name</label>
                    <input type="text" value={form.geoName ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoName: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
                  </div>
                </>
              )}
              {/* Area geo type (1): Region field */}
              {form.geoType === 1 && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">Region</label>
                  <input type="text" value={form.geoName ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoName: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="e.g. Northeast, Pacific" />
                </div>
              )}
              {/* Zip geo type (2): Mapping type + conditional inputs */}
              {form.geoType === 2 && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Mapping type</label>
                    <select
                      value={zipMappingType}
                      onChange={(e) => {
                        setZipMappingType(Number(e.target.value));
                        setForm((f) => ({ ...f, geoCode: "", geoName: "" }));
                      }}
                      className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                    >
                      <option value={0}>ZipExact</option>
                      <option value={1}>ZipRange</option>
                    </select>
                  </div>
                  {zipMappingType === 0 ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Zip code</label>
                      <input type="text" value={form.geoCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoCode: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="e.g. 10001" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Zip from</label>
                        <input type="text" value={form.geoCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoCode: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="e.g. 10001" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Zip to</label>
                        <input type="text" value={form.geoName ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoName: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="e.g. 10099" />
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
                <label className="mb-1 block text-sm font-medium text-foreground">Year</label>
                <select value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  {lookups?.years?.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Quarter</label>
                <input type="number" min={1} max={4} value={form.quarter} onChange={(e) => setForm((f) => ({ ...f, quarter: Number(e.target.value) || 1 }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Calculation model</label>
                <select value={form.calculationModel} onChange={(e) => setForm((f) => ({ ...f, calculationModel: Number(e.target.value) }))} className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  {lookups?.calculationModels?.map((c) => (
                    <option key={c.value} value={c.value}>{c.name}</option>
                  ))}
                </select>
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
                      {fs.scheduleCode ?? "—"} — {categoryLabel(fs.category)} {fs.state ? `(${fs.state})` : ""} {fs.year}/Q{fs.quarter}
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
            <div className="mt-6 flex items-center justify-between">
              {!editId && (
                <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
              {editId && <div />}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSubmit} disabled={submitLoading} className="bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
                  {submitLoading ? "Saving…" : editId ? "Update" : <>Next: Import Lines <ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          </form>
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
              <input ref={wizardFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && createdScheduleId) handleImportLines(f, createdScheduleId, true);
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

            <div className="mt-6 flex justify-end">
              <Button onClick={() => { setModalOpen(false); loadList(); }} className="bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
                Done
              </Button>
            </div>
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

      {/* Lines management modal (from table Actions) */}
      <Modal open={!!linesSchedule} onClose={() => setLinesSchedule(null)} title={`Fee Schedule Lines — ${linesSchedule?.scheduleCode ?? ""} (${categoryLabel(linesSchedule?.category ?? 0)})`} size="lg">
        <div className="mb-4 flex items-center gap-3">
          <Button onClick={() => linesSchedule && downloadTemplateForCategory(linesSchedule.category)} variant="outline" className="h-9 text-sm gap-1.5">
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} className="h-9 text-sm gap-1.5 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
            <Upload className="h-4 w-4" /> {importLoading ? "Importing…" : "Import Lines"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && linesSchedule) handleImportLines(f, linesSchedule.id); }} />
          {linesData && <span className="text-xs text-muted-foreground ml-auto">{linesData.totalCount} total lines</span>}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linesData.items.map((line) => {
                    const isUCR = String(linesSchedule?.category) === "1" || String(linesSchedule?.category) === "UCR";
                    const isWC = String(linesSchedule?.category) === "3" || String(linesSchedule?.category) === "WC";
                    return (
                      <tr key={line.id} className="hover:bg-muted">
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
                  onPrevious={() => { const p = linesPage - 1; setLinesPage(p); loadLines(linesSchedule!.id, p); }}
                  onNext={() => { const p = linesPage + 1; setLinesPage(p); loadLines(linesSchedule!.id, p); }}
                  onPageChange={(p) => { setLinesPage(p); loadLines(linesSchedule!.id, p); }}
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
