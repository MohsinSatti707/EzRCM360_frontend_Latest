"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ArrowRight, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { Pagination } from "@/components/ui/Pagination";
import { feeSchedulesApi } from "@/lib/services/feeSchedules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { FeeScheduleDto, FeeScheduleDetailDto, FeeScheduleLineDto, CreateFeeScheduleCommand } from "@/lib/services/feeSchedules";
import type { PaginatedList } from "@/lib/types";

const CATEGORY_TEMPLATE_MAP: Record<number, string> = { 0: "Medicare", 1: "UCR", 2: "MVA", 3: "WC" };

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

  // Fee schedule options for adoptFeeScheduleId dropdown
  const [fsOptions, setFsOptions] = useState<FeeScheduleDto[]>([]);

  // Lines modal state
  const [linesSchedule, setLinesSchedule] = useState<FeeScheduleDto | null>(null);
  const [linesData, setLinesData] = useState<PaginatedList<FeeScheduleLineDto> | null>(null);
  const [linesPage, setLinesPage] = useState(1);
  const [linesLoading, setLinesLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportLines = async (file: File) => {
    if (!linesSchedule) return;
    setImportLoading(true);
    try {
      const result = await api.importLines(linesSchedule.id, file);
      if (result.success) {
        toast.success(`Imported ${result.importedCount} lines.`);
        loadLines(linesSchedule.id, 1);
        setLinesPage(1);
      } else {
        toast.error(result.errors?.join("; ") || "Import failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplateForCategory = async (category: number) => {
    const cat = Number(category);
    const tpl = cat === 1 ? "UCR" : cat === 2 ? "MVA" : cat === 3 ? "WC" : "Medicare";
    try {
      await api.downloadLinesTemplate(tpl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const categoryLabel = (n: number) => lookups?.categories?.find((c) => c.value === n)?.name ?? String(n);
  const statusLabel = (n: number) => STATUS_OPTIONS.find((o) => o.value === n)?.name ?? String(n);

  const filteredItems = data?.items.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (row.scheduleCode?.toLowerCase().includes(q)) ||
      (row.state?.toLowerCase().includes(q)) ||
      categoryLabel(row.category).toLowerCase().includes(q);
  }) ?? [];

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

      {/* Toolbar: search + add button */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-[5px] font-aileron text-[14px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="0">Active</SelectItem>
              <SelectItem value="1">Inactive</SelectItem>
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
            <>Add Fee Schedule <ArrowRight className="ml-1 h-4 w-4" /></>
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">State</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Year / Q</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((row) => (
                  <tr key={row.id} className="hover:bg-muted">
                    <td className="px-4 py-3 text-sm">{row.scheduleCode ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{categoryLabel(row.category)}</td>
                    <td className="px-4 py-3 text-sm">{row.state ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{row.year} / {row.quarter}</td>
                    <td className="px-4 py-3 text-sm">{statusLabel(row.status)}</td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3 text-sm">
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
              <label className="mb-1 block text-sm font-medium text-foreground">Geo code</label>
              <input type="text" value={form.geoCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoCode: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="e.g. 01, 99" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Geo name</label>
              <input type="text" value={form.geoName ?? ""} onChange={(e) => setForm((f) => ({ ...f, geoName: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
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
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Fallback category</label>
              <select value={form.fallbackCategory ?? ""} onChange={(e) => setForm((f) => ({ ...f, fallbackCategory: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                <option value="">None</option>
                {lookups?.categories?.map((c) => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Adopt fee schedule</label>
              <select value={form.adoptFeeScheduleId ?? ""} onChange={(e) => setForm((f) => ({ ...f, adoptFeeScheduleId: e.target.value || null }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
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
              <input type="text" value={form.source ?? ""} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="e.g. CMS Medicare PFS" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
              <textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
          </div>
          <ModalFooter onCancel={() => setModalOpen(false)} submitLabel={editId ? "Update" : "Create"} onSubmit={handleSubmit} loading={submitLoading} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete fee schedule" message="Are you sure you want to delete this fee schedule?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />

      {/* Lines management modal */}
      <Modal open={!!linesSchedule} onClose={() => setLinesSchedule(null)} title={`Fee Schedule Lines — ${linesSchedule?.scheduleCode ?? ""} (${categoryLabel(linesSchedule?.category ?? 0)})`} size="lg">
        <div className="mb-4 flex items-center gap-3">
          <Button onClick={() => linesSchedule && downloadTemplateForCategory(linesSchedule.category)} variant="outline" className="h-9 text-sm gap-1.5">
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} className="h-9 text-sm gap-1.5 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white">
            <Upload className="h-4 w-4" /> {importLoading ? "Importing…" : "Import Lines"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportLines(f); }} />
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
                    {linesSchedule?.category === 1 && <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">ZIP</th>}
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">CPT/HCPCS</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Modifier</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Fee Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">RV</th>
                    {linesSchedule?.category === 3 && <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">PC/TC</th>}
                    {linesSchedule?.category === 1 && (
                      <>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">50th</th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">75th</th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">90th</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linesData.items.map((line) => (
                    <tr key={line.id} className="hover:bg-muted">
                      {linesSchedule?.category === 1 && <td className="px-3 py-2">{line.zip ?? "—"}</td>}
                      <td className="px-3 py-2 font-mono">{line.cptHcpcs}</td>
                      <td className="px-3 py-2">{line.modifier ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{line.feeAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{line.rv?.toFixed(4) ?? "—"}</td>
                      {linesSchedule?.category === 3 && <td className="px-3 py-2">{line.pctcIndicator === 0 ? "P" : line.pctcIndicator === 1 ? "T" : "—"}</td>}
                      {linesSchedule?.category === 1 && (
                        <>
                          <td className="px-3 py-2 text-right">{line.fee50th?.toFixed(2) ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{line.fee75th?.toFixed(2) ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{line.fee90th?.toFixed(2) ?? "—"}</td>
                        </>
                      )}
                    </tr>
                  ))}
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
