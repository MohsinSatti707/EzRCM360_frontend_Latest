"use client";

import { useCallback, useState } from "react";
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
import { Loader } from "@/components/ui/Loader";
import { EntityFormModal } from "./EntityFormModal";
import { entitiesApi } from "@/lib/services/entities";
import { usePaginatedList } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { EntityListItemDto, CreateEntityRequest, UpdateEntityRequest } from "@/lib/services/entities";

const MODULE_NAME = "Entities";

const STATUS_OPTIONS: { value: number; name: string }[] = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

const defaultForm: CreateEntityRequest = {
  legalName: "",
  displayName: "",
  groupNpi: "",
  taxId: "",
  status: 1,
};

export default function EntitiesPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEntityRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = entitiesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission(MODULE_NAME);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize: 10,
    fetch: api.getList,
  });

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: EntityListItemDto) => {
    setEditId(row.id);
    setForm({
      legalName: row.legalName,
      displayName: row.displayName,
      groupNpi: row.groupNpi,
      taxId: row.taxId,
      status: row.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!form.legalName.trim() || !form.displayName.trim() || !form.groupNpi.trim() || !form.taxId.trim()) {
      setFormError("Legal name, display name, group NPI, and tax ID are required.");
      return;
    }
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, form as UpdateEntityRequest);
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
  }, [editId, form, api]);

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

  const statusLabel = (n: number) => STATUS_OPTIONS.find((o) => o.value === n)?.name ?? String(n);

  if (!canView) {
    return (
      <div>
        <PageHeader title="Entity Information" description="Define entity identity and structure." />
        <Card>
          <AccessRestrictedContent sectionName="Entity Information" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Entity Information" description="Define entity identity and structure." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add entity</Button>
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
                  <TableHeaderCell>Legal / Display name</TableHeaderCell>
                  <TableHeaderCell>Organization</TableHeaderCell>
                  <TableHeaderCell>Group NPI</TableHeaderCell>
                  <TableHeaderCell>Tax ID</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  {(canUpdate || canDelete) && <TableHeaderCell align="right">Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium text-slate-900">{row.legalName}</span> / {row.displayName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">{row.organizationName ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.groupNpi}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.taxId}</TableCell>
                    <TableCell className="whitespace-nowrap">{statusLabel(row.status)}</TableCell>
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
        {loading && !data && !error && <Loader variant="inline" />}
      </Card>

      <EntityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={editId}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        loading={submitLoading}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete entity"
        message="Are you sure you want to delete this entity?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
