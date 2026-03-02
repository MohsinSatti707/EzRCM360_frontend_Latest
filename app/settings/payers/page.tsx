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
import { Loader } from "@/components/ui/Loader";
import { PayerFormModal } from "./PayerFormModal";
import { payersApi } from "@/lib/services/payers";
import { lookupsApi } from "@/lib/services/lookups";
import { usePaginatedList } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type {
  PayerListItemDto,
  CreatePayerRequest,
  UpdatePayerRequest,
  PayerAddressRequest,
  PayerPhoneRequest,
  PayerEmailRequest,
} from "@/lib/services/payers";

const MODULE_NAME = "Payers";
const defaultForm: CreatePayerRequest = {
  payerName: "",
  aliases: "",
  entityType: 0,
  status: 1,
  planIds: [],
  addresses: [],
  phoneNumbers: [],
  emails: [],
};

export default function PayersPage() {
  const [entityTypes, setEntityTypes] = useState<{ value: string; label: string }[]>([]);
  const [planOptions, setPlanOptions] = useState<{ id: string; displayName: string }[]>([]);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePayerRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const api = payersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission(MODULE_NAME);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize: 10,
    fetch: api.getList,
  });

  useEffect(() => {
    lookupsApi().getPayerEntityTypes().then(setEntityTypes).catch(() => setEntityTypes([]));
    lookupsApi().getPlans().then(setPlanOptions).catch(() => setPlanOptions([]));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: PayerListItemDto) => {
    setEditId(row.id);
    setFormError(null);
    setModalOpen(true);
    api
      .getById(row.id)
      .then((detail) => {
        const mapAddresses = (): PayerAddressRequest[] =>
          detail.addresses?.map((a) => ({
            addressLine1: a.addressLine1,
            addressLine2: a.addressLine2 ?? "",
            city: a.city,
            state: a.state,
            zip: a.zip,
            label: a.label ?? "",
          })) ?? [];
        const mapPhones = (): PayerPhoneRequest[] =>
          detail.phoneNumbers?.map((p) => ({
            phoneNumber: p.phoneNumber,
            label: p.label ?? "",
          })) ?? [];
        const mapEmails = (): PayerEmailRequest[] =>
          detail.emails?.map((e) => ({
            emailAddress: e.emailAddress,
            label: e.label ?? "",
          })) ?? [];
        setForm({
          payerName: detail.payerName,
          aliases: detail.aliases ?? "",
          entityType: detail.entityType,
          status: detail.status,
          planIds: detail.planIds ?? [],
          addresses: mapAddresses(),
          phoneNumbers: mapPhones(),
          emails: mapEmails(),
        });
      })
      .catch(() => setFormError("Failed to load payer."));
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!form.payerName.trim()) {
      setFormError("Payer name is required.");
      return;
    }
    // Send only non-empty contact rows so backend receives valid data
    const addresses = (form.addresses ?? []).filter((a) => (a.addressLine1 ?? "").trim() !== "");
    const phoneNumbers = (form.phoneNumbers ?? []).filter((p) => (p.phoneNumber ?? "").trim() !== "");
    const emails = (form.emails ?? []).filter((e) => (e.emailAddress ?? "").trim() !== "");
    const planIds = form.planIds ?? [];
    const payload = {
      ...form,
      addresses: addresses.length ? addresses : undefined,
      phoneNumbers: phoneNumbers.length ? phoneNumbers : undefined,
      emails: emails.length ? emails : undefined,
      planIds: planIds.length ? planIds : undefined,
    };
    setSubmitLoading(true);
    try {
      if (editId) {
        await api.update(editId, { ...payload, status: form.status } as UpdatePayerRequest);
      } else {
        await api.create(payload);
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

  const entityTypeLabel = (n: number) =>
    entityTypes.find((e) => Number(e.value) === n)?.label ?? String(n);

  if (!canView) {
    return (
      <div>
        <PageHeader title="Payer Configuration" description="Centralized payer registry." />
        <Card>
          <AccessRestrictedContent sectionName="Payer Configuration" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Payer Configuration" description="Centralized payer registry." />
      <Card>
        {canCreate && (
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate}>Add payer</Button>
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
                  <TableHeaderCell>Payer name</TableHeaderCell>
                  <TableHeaderCell>Aliases</TableHeaderCell>
                  <TableHeaderCell>Entity type</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  {(canUpdate || canDelete) && <TableHeaderCell align="right">Actions</TableHeaderCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-slate-900">{row.payerName}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-slate-600">{row.aliases ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {entityTypeLabel(row.entityType)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.status === 1 ? "Active" : "Inactive"}</TableCell>
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

      <PayerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={editId}
        form={form}
        onFormChange={setForm}
        entityTypeOptions={entityTypes}
        planOptions={planOptions}
        onSubmit={handleSubmit}
        loading={submitLoading}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete payer"
        message="Are you sure you want to delete this payer?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
