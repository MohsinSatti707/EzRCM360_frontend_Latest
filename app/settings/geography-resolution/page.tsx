"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, ArrowRight, Upload, Download, Trash2 } from "lucide-react";
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
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Loader } from "@/components/ui/Loader";
import { geographyApi } from "@/lib/services/geography";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { CellTooltip } from "@/components/ui/CellTooltip";

import type {
  ZipGeoMappingDto,
  ZipGeoMappingLookupsDto,
  CreateZipGeoMappingCommand,
} from "@/lib/services/geography";
import type { PaginatedList } from "@/lib/types";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "AS", "GU", "MP", "PR", "VI",
];

const ACTIVE_OPTIONS = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

const defaultForm: CreateZipGeoMappingCommand = {
  mappingName: "",
  fsCategory: 0,
  state: "",
  zip: "",
  mappingType: 0,
  source: 0,
  geoCode: "",
  geoName: "",
  year: new Date().getFullYear(),
  quarter: null,
  active: true,
};

export default function GeographyResolutionPage() {
  const [data, setData] = useState<PaginatedList<ZipGeoMappingDto> | null>(null);
  const [lookups, setLookups] = useState<ZipGeoMappingLookupsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importLoading, setImportLoading] = useState(false);
  const [importCategory, setImportCategory] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateZipGeoMappingCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const api = geographyApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission("Zip Geo Mappings");

  const loadList = useCallback(() => {
    setError(null);
    api
      .getList({
        pageNumber: page,
        pageSize,
        active: statusFilter === "all" ? undefined : statusFilter === "true",
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    api
      .getLookups()
      .then(setLookups)
      .catch(() => setLookups(null));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const resolveLookup = (val: unknown, items: { value: number; name: string }[] | undefined): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string" && items) {
      const match = items.find((i) => i.name === val);
      if (match) return match.value;
      const n = Number(val);
      if (!isNaN(n)) return n;
    }
    return 0;
  };

  const openEdit = (row: ZipGeoMappingDto) => {
    setEditId(row.id);
    setForm({
      mappingName: row.mappingName,
      fsCategory: resolveLookup(row.fsCategory, lookups?.fsCategories),
      state: row.state,
      zip: row.zip,
      mappingType: resolveLookup(row.mappingType, lookups?.mappingTypes),
      source: resolveLookup(row.source, lookups?.sources),
      geoCode: row.geoCode ?? "",
      geoName: row.geoName ?? "",
      year: row.year,
      quarter: row.quarter ?? null,
      active: row.active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.mappingName.trim() || !form.state.trim() || !form.zip.trim()) {
      setFormError("Mapping name, state, and zip are required.");
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

  const handleStatusChange = async (row: ZipGeoMappingDto, activeValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      await api.update(row.id, {
        mappingName: row.mappingName,
        fsCategory: resolveLookup(row.fsCategory, lookups?.fsCategories),
        state: row.state,
        zip: row.zip,
        mappingType: resolveLookup(row.mappingType, lookups?.mappingTypes),
        source: resolveLookup(row.source, lookups?.sources),
        geoCode: row.geoCode ?? undefined,
        geoName: row.geoName ?? undefined,
        year: row.year,
        quarter: row.quarter ?? undefined,
        active: activeValue === 1,
      });
      await loadList();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleImport = async (file: File) => {
    setImportLoading(true);
    try {
      const result = await api.importMappings(importCategory, file);
      if (result.success) {
        toast.success(`Imported ${result.rowsImported} mappings.`);
        loadList();
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

  const handleDownloadTemplate = async () => {
    try {
      await api.downloadTemplate(importCategory);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const fsCategoryLabel = (n: number | string) => {
    if (typeof n === "string") return lookups?.fsCategories?.find((c) => c.name === n)?.name ?? n;
    return lookups?.fsCategories?.find((c) => c.value === n)?.name ?? String(n);
  };
  const mappingTypeLabel = (n: number | string) => {
    if (typeof n === "string") return lookups?.mappingTypes?.find((m) => m.name === n)?.name ?? n;
    return lookups?.mappingTypes?.find((m) => m.value === n)?.name ?? String(n);
  };
  const sourceLabel = (n: number | string) => {
    if (typeof n === "string") return lookups?.sources?.find((s) => s.name === n)?.name ?? n;
    return lookups?.sources?.find((s) => s.value === n)?.name ?? String(n);
  };

  const filteredItems = data?.items.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return row.mappingName.toLowerCase().includes(q) ||
      row.state.toLowerCase().includes(q) ||
      row.zip.toLowerCase().includes(q) ||
      (row.geoCode?.toLowerCase().includes(q)) ||
      (row.geoName?.toLowerCase().includes(q)) ||
      fsCategoryLabel(row.fsCategory).toLowerCase().includes(q);
  }) ?? [];

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Geography Resolution" description="Zip-to-geography mappings for fee schedule resolution." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div>
        <PageHeader title="Geography Resolution" description="Zip-to-geography mappings for fee schedule resolution." />
        <Card>
          <AccessRestrictedContent sectionName="Geography Resolution" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader
        title="Geography Resolution"
        description="Zip-to-geography mappings for fee schedule resolution."
      />

      {/* Toolbar: search + import + add button */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
          <select
            value={importCategory}
            onChange={(e) => setImportCategory(Number(e.target.value))}
            className="h-10 rounded-[5px] border border-input px-3 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          >
            {lookups?.fsCategories?.map((c) => (
              <option key={c.value} value={c.value}>{c.name}</option>
            ))}
          </select>
          <Button onClick={handleDownloadTemplate} variant="outline" className="h-10 rounded-[5px] text-sm gap-1.5">
            <Download className="h-4 w-4" /> Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} variant="outline" className="h-10 rounded-[5px] text-sm gap-1.5">
            <Upload className="h-4 w-4" /> {importLoading ? "Importing…" : "Import"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
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
                  <TableHeaderCell className="w-[180px] min-w-[180px]">Mapping Name</TableHeaderCell>
                  <TableHeaderCell className="w-[120px] min-w-[120px]">Category</TableHeaderCell>
                  <TableHeaderCell className="w-[140px] min-w-[140px]">State / Zip</TableHeaderCell>
                  <TableHeaderCell className="w-[180px] min-w-[180px]">Geo Code / Name</TableHeaderCell>
                  <TableHeaderCell className="w-[80px] min-w-[80px]">Year</TableHeaderCell>
                  <TableHeaderCell className="w-[160px] min-w-[160px]">Active</TableHeaderCell>
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
                    <TableCell className="w-[180px] min-w-[180px]">
                      <div className="max-w-[160px] truncate">
                        <CellTooltip text={row.mappingName} />

                      </div>
                    </TableCell>
                    <TableCell className="w-[120px] min-w-[120px]">
                      <div className="max-w-[100px] truncate">
                        <CellTooltip text={fsCategoryLabel(row.fsCategory)} />

                      </div>
                    </TableCell>
                    <TableCell className="w-[140px] min-w-[140px]">
                      <div className="max-w-[120px] truncate">
                        <CellTooltip text={`${row.state ?? "—"} / ${row.zip ?? "—"}`} />
                      </div>
                    </TableCell>

                    <TableCell className="w-[180px] min-w-[180px]">
                      <div className="max-w-[160px] truncate">
                        <CellTooltip text={`${row.geoCode ?? "—"} / ${row.geoName ?? "—"}`} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[80px] min-w-[80px]">
                      <div className="max-w-[60px] truncate">
                        <CellTooltip text={row.year} />

                      </div>
                    </TableCell>
                    <TableCell className="w-[160px] min-w-[160px]">
                      <select
                        value={row.active ? 1 : 0}
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
      {!data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit mapping" : "Add mapping"}
        size="lg"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                {editId ? "Update" : "Add Mapping"}
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
                Mapping name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.mappingName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mappingName: e.target.value }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Fee schedule category
              </label>
              <select
                value={form.fsCategory}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    fsCategory: Number(e.target.value),
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {lookups?.fsCategories?.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Zip <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={form.zip}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setForm((f) => ({ ...f, zip: val }));
                }}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Mapping type
              </label>
              <select
                value={form.mappingType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mappingType: Number(e.target.value),
                  }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {lookups?.mappingTypes?.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Source
              </label>
              <select
                value={form.source}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source: Number(e.target.value) }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {lookups?.sources?.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Geo code
              </label>
              <input
                type="text"
                value={form.geoCode ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, geoCode: e.target.value || null }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Geo name
              </label>
              <input
                type="text"
                value={form.geoName ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, geoName: e.target.value || null }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Year
              </label>
              <select
                value={form.year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, year: Number(e.target.value) }))
                }
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                {lookups?.years?.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Quarter
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={form.quarter ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    quarter: v === "" ? null : Number(v),
                  }));
                }}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="inline-flex w-fit cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  id="geo-active-checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
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
        title="Delete mapping"
        message={<>Are you sure you want to delete the zip-geo mapping <strong>{data?.items.find((r) => r.id === deleteId)?.mappingName ?? ""}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected geo mappings"
        message={`Are you sure you want to delete ${selectedIds.size} geo mapping(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
