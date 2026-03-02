"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FacilityFormModal } from "./FacilityFormModal";
import { facilitiesApi } from "@/lib/services/facilities";
import { lookupsApi } from "@/lib/services/lookups";
import { usePaginatedList } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { FacilityListItemDto, CreateFacilityRequest, UpdateFacilityRequest } from "@/lib/services/facilities";
import type { EntityLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Facilities";
const defaultForm: CreateFacilityRequest = {
  name: "",
  facilityType: "",
  physicalAddress: "",
  entityId: "",
  posCode: "",
  isActive: true,
};

export default function FacilitiesPage() {
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFacilityRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = facilitiesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission(MODULE_NAME);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize: 10,
    fetch: api.getList,
  });

  useEffect(() => {
    lookupsApi().getEntities().then(setEntities).catch(() => setEntities([]));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, entityId: entities[0]?.id ?? "" });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: FacilityListItemDto) => {
    setEditId(row.id);
    setFormError(null);
    setModalOpen(true);
    api
      .getById(row.id)
      .then((detail) => {
        setForm({
          name: detail.name,
          facilityType: detail.facilityType,
          physicalAddress: detail.physicalAddress ?? "",
          entityId: detail.entityId,
          posCode: detail.posCode ?? "",
          isActive: detail.isActive,
        });
      })
      .catch(() => setFormError("Failed to load."));
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!form.name.trim() || !form.facilityType.trim() || !form.entityId) {
      setFormError("Name, facility type, and entity are required.");
      return;
    }
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, { ...form, isActive: form.isActive ?? true } as UpdateFacilityRequest);
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      reload();
      toast.success("Saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  }, [editId, form, api, reload]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(deleteId);
      setDeleteId(null);
      reload();
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
        <PageHeader title="Facility Configuration" description="Independent service locations." />
        <Card>
          <AccessRestrictedContent sectionName="Facility Configuration" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Facility Configuration" description="Independent service locations." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add facility</Button>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        {data && (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Entity</TableHeaderCell>
                  <TableHeaderCell>Physical address</TableHeaderCell>
                  <TableHeaderCell>POS code</TableHeaderCell>
                  <TableHeaderCell>Active</TableHeaderCell>
                  {(canUpdate || canDelete) && <TableHeaderCell align="right">Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-medium text-slate-900">
                      {row.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.facilityType}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.entityDisplayName ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.physicalAddress ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.posCode ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.isActive ? "Yes" : "No"}</TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell align="right" className="whitespace-nowrap">
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
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              totalCount={data.totalCount}
              hasPreviousPage={data.hasPreviousPage}
              hasNextPage={data.hasNextPage}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
        {loading && !data && !error && (
          <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
        )}
      </Card>

      <FacilityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={editId}
        form={form}
        onFormChange={setForm}
        entities={entities}
        onSubmit={handleSubmit}
        loading={submitLoading}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete facility"
        message="Are you sure you want to delete this facility?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
