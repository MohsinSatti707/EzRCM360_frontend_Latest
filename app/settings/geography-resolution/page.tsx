"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateZipGeoMappingCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = geographyApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Zip Geo Mappings");

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

  const fsCategoryLabel = (n: number) =>
    lookups?.fsCategories?.find((c) => c.value === n)?.name ?? String(n);
  const mappingTypeLabel = (n: number) =>
    lookups?.mappingTypes?.find((m) => m.value === n)?.name ?? String(n);
  const sourceLabel = (n: number) =>
    lookups?.sources?.find((s) => s.value === n)?.name ?? String(n);

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

      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add mapping</Button>
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
                      Mapping Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      State / Zip
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Geo Code / Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Year
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
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                        {row.mappingName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {fsCategoryLabel(row.fsCategory)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {row.state} / {row.zip}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {row.geoCode ?? "—"} / {row.geoName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {row.year}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {row.active ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
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
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mapping name *
              </label>
              <input
                type="text"
                value={form.mappingName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mappingName: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {lookups?.fsCategories?.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                State *
              </label>
              <select
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Zip *
              </label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) =>
                  setForm((f) => ({ ...f, zip: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {lookups?.mappingTypes?.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Source
              </label>
              <select
                value={form.source}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {lookups?.sources?.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Geo code
              </label>
              <input
                type="text"
                value={form.geoCode ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, geoCode: e.target.value || null }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Geo name
              </label>
              <input
                type="text"
                value={form.geoName ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, geoName: e.target.value || null }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Year
              </label>
              <select
                value={form.year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, year: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {lookups?.years?.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
        title="Delete mapping"
        message="Are you sure you want to delete this zip-geo mapping? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
