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
import { ModifierFormModal } from "./ModifierFormModal";
import { modifiersApi } from "@/lib/services/modifiers";
import { usePaginatedList } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { ModifierDto, CreateModifierCommand } from "@/lib/services/modifiers";

const MODULE_NAME = "Modifiers";
const MODIFIER_TYPE_OPTIONS = [
  { value: 0, label: "Procedure" },
  { value: 1, label: "Financial" },
  { value: 2, label: "Both" },
];

const defaultForm: CreateModifierCommand = {
  modifierCode: "",
  description: "",
  modifierType: 0,
  isActive: true,
};

export default function ModifiersPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateModifierCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = modifiersApi();
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

  const openEdit = (row: ModifierDto) => {
    setEditId(row.id);
    setForm({
      modifierCode: row.modifierCode,
      description: row.description,
      modifierType: row.modifierType,
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!form.modifierCode.trim() || !form.description.trim()) {
      setFormError("Modifier code and description are required.");
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

  const modifierTypeLabel = (n: number) =>
    MODIFIER_TYPE_OPTIONS.find((o) => o.value === n)?.label ?? String(n);

  if (!canView) {
    return (
      <div>
        <PageHeader title="Modifiers" description="Procedure and billing modifiers." />
        <Card>
          <AccessRestrictedContent sectionName="Modifiers" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Modifiers" description="Procedure and billing modifiers." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add modifier</Button>
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
                  <TableHeaderCell>Modifier code</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Modifier type</TableHeaderCell>
                  <TableHeaderCell>Active</TableHeaderCell>
                  {(canUpdate || canDelete) && <TableHeaderCell align="right">Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-medium text-slate-900">
                      {row.modifierCode}
                    </TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {modifierTypeLabel(row.modifierType)}
                    </TableCell>
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

      <ModifierFormModal
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
        title="Delete modifier"
        message="Are you sure you want to delete this modifier?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
