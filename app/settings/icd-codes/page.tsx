"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { icdCodesApi } from "@/lib/services/icdCodes";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { CreateIcdCodeCommand } from "@/lib/services/icdCodes";
import type { IcdCodeDto } from "@/lib/types";
import type { PaginatedList } from "@/lib/types";

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
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateIcdCodeCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add ICD code</Button>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Billable
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Active
                    </th>
                    {(canUpdate || canDelete) && (
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                        {row.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {row.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {row.version}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {row.isBillable ? "Yes" : "No"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {row.isActive ? "Yes" : "No"}
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          {canUpdate && (
                            <Button variant="ghost" className="mr-1" onClick={() => openEdit(row)}>
                              Edit
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="danger" onClick={() => setDeleteId(row.id)}>
                              Delete
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                Page {data.pageNumber} of {data.totalPages} ({data.totalCount}{" "}
                total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={!data.hasPreviousPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={!data.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
        {!data && !error && (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading…
          </div>
        )}
      </Card>

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
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Code *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Version
              </label>
              <input
                type="text"
                value={form.version ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, version: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Billable</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Active</span>
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
    </div>
  );
}
