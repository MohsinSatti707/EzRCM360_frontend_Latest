"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ArrowRight, Upload, Download, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { Checkbox } from "@/components/ui/Checkbox";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { geographyApi } from "@/lib/services/geography";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type {
  ZipGeoMappingDto,
  ZipGeoMappingLookupsDto,
  CreateZipGeoMappingCommand,
} from "@/lib/services/geography";
import type { PaginatedList } from "@/lib/types";

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
  const [overlayLoading, setOverlayLoading] = useState(false);

  const api = geographyApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Zip Geo Mappings");

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

  const openEdit = (row: ZipGeoMappingDto) => {
    setEditId(row.id);
    setForm({
      mappingName: row.mappingName,
      fsCategory: row.fsCategory,
      state: row.state,
      zip: row.zip,
      mappingType: row.mappingType,
      source: row.source,
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

  const fsCategoryLabel = (n: number) =>
    lookups?.fsCategories?.find((c) => c.value === n)?.name ?? String(n);
  const mappingTypeLabel = (n: number) =>
    lookups?.mappingTypes?.find((m) => m.value === n)?.name ?? String(n);
  const sourceLabel = (n: number) =>
    lookups?.sources?.find((s) => s.value === n)?.name ?? String(n);

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
    <div>
      <PageHeader
        title="Geography Resolution"
        description="Zip-to-geography mappings for fee schedule resolution."
      />

      {/* Toolbar: search + import + add button */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-[5px] font-aileron text-[14px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
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
        <div className="flex items-center gap-2">
          {canDelete && selectedIds.size > 0 && (
            <Button
              onClick={() => setBulkDeleteConfirm(true)}
              className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
            >
              <><Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})</>
            </Button>
          )}
          <select value={importCategory} onChange={(e) => setImportCategory(Number(e.target.value))} className="h-9 rounded-lg border border-input px-2 text-sm">
            {lookups?.fsCategories?.map((c) => (
              <option key={c.value} value={c.value}>{c.name}</option>
            ))}
          </select>
          <Button onClick={handleDownloadTemplate} variant="outline" className="h-9 text-sm gap-1.5">
            <Download className="h-4 w-4" /> Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} variant="outline" className="h-9 text-sm gap-1.5">
            <Upload className="h-4 w-4" /> {importLoading ? "Importing…" : "Import"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-9 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
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
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  {canDelete && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground" style={{ width: 50 }}>
                      <Checkbox
                        checked={!!data?.items.length && data.items.every((r) => selectedIds.has(r.id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Mapping Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    State / Zip
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Geo Code / Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Year
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Active
                  </th>
                  {(canUpdate || canDelete) && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((row) => (
                  <tr key={row.id} className="hover:bg-muted">
                    {canDelete && (
                      <td className="px-4 py-3 text-sm">
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">
                      {row.mappingName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {fsCategoryLabel(row.fsCategory)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.state} / {row.zip}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.geoCode ?? "—"} / {row.geoName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.year}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.active ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
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
      {!data && !error && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit mapping" : "Add mapping"}
        size="lg"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Mapping name *
              </label>
              <input
                type="text"
                value={form.mappingName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mappingName: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                State *
              </label>
              <select
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {lookups?.states?.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Zip *
              </label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) =>
                  setForm((f) => ({ ...f, zip: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
          </div>
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={editId ? "Update" : "Create"}
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete mapping"
        message="Are you sure you want to delete this zip-geo mapping? This cannot be undone."
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
