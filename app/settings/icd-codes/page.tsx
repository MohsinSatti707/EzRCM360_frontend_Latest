"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Checkbox } from "@/components/ui/Checkbox";
import { Pagination } from "@/components/ui/Pagination";
import { icdCodesApi } from "@/lib/services/icdCodes";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { CreateIcdCodeCommand } from "@/lib/services/icdCodes";
import type { IcdCodeDto } from "@/lib/types";
import type { PaginatedList } from "@/lib/types";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { OverlayLoader } from "@/components/ui/OverlayLoader";

const defaultForm: CreateIcdCodeCommand = {
  code: "",
  description: "",
  version: "ICD-10",
  effectiveStartDate: null,
  effectiveEndDate: null,
  isBillable: true,
  isActive: true,
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function IcdCodesPage() {
  const [data, setData] = useState<PaginatedList<IcdCodeDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateIcdCodeCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const api = icdCodesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("ICD Codes");

  const loadList = useCallback(() => {
    setError(null);
    api
      .getList({ pageNumber: page, pageSize })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: IcdCodeDto) => {
    setEditId(row.id);
    setForm({
      code: row.code,
      description: row.description,
      version: row.version ?? "ICD-10",
      effectiveStartDate: row.effectiveStartDate ?? null,
      effectiveEndDate: row.effectiveEndDate ?? null,
      isBillable: row.isBillable,
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.code.trim() || !form.description.trim()) {
      setFormError("Code and description are required.");
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

  if (!canView) {
    return (
      <div>
        <PageHeader title="ICD Codes" description="Standardized diagnosis codes (e.g. ICD-10)." />
        <Card>
          <AccessRestrictedContent sectionName="ICD Codes" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="ICD Codes"
        description="Standardized diagnosis codes (e.g. ICD-10)."
      />

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
              apiBase="/api/IcdCodes"
              templateFileName="IcdCodes_Import_Template.xlsx"
              onImportSuccess={loadList}
              onLoadingChange={setOverlayLoading}
            />
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add ICD Code <ArrowRight className="ml-1 h-4 w-4" /></>
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
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Billable
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
                {data.items.map((row) => (
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
                      {row.code}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.version}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.isBillable ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.isActive ? "Yes" : "No"}
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
        title={editId ? "Edit ICD code" : "Add ICD code"}
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
                Code *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Version
              </label>
              <input
                type="text"
                value={form.version ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, version: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective start date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveStartDate ?? undefined)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    effectiveStartDate: e.target.value
                      ? e.target.value
                      : null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective end date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveEndDate ?? undefined)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    effectiveEndDate: e.target.value
                      ? e.target.value
                      : null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isBillable}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isBillable: e.target.checked }))
                  }
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Billable</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
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
        title="Delete ICD code"
        message="Are you sure you want to delete this ICD code? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected ICD codes"
        message={`Are you sure you want to delete ${selectedIds.size} ICD code(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
