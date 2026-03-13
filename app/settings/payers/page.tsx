"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
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
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Loader } from "@/components/ui/Loader";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { PayerFormModal } from "./PayerFormModal";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { payersApi } from "@/lib/services/payers";
import { lookupsApi } from "@/lib/services/lookups";
import { usePaginatedList, useDebounce } from "@/lib/hooks";
import { resolveEnum, ENUMS } from "@/lib/utils";
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
  const [planOptions, setPlanOptions] = useState<{ id: string; displayName: string; payerId: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePayerRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const api = payersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission(MODULE_NAME);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize,
    extraParams: { search: debouncedSearch || undefined },
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

  const openEdit = async (row: PayerListItemDto) => {
    setEditId(row.id);
    setFormError(null);
    try {
      const detail = await api.getById(row.id);
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
        entityType: resolveEnum(detail.entityType, ENUMS.PayerEntityType),
        status: resolveEnum(detail.status, ENUMS.PayerStatus),
        planIds: detail.planIds ?? [],
        addresses: mapAddresses(),
        phoneNumbers: mapPhones(),
        emails: mapEmails(),
      });
      setModalOpen(true);
    } catch {
      setFormError("Failed to load payer.");
    }
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
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, { ...payload, status: form.status } as UpdatePayerRequest);
      } else {
        await api.create(payload);
      }
      setModalOpen(false);
      await reload();
      toast.success("Saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  }, [editId, form, api, reload]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      await api.delete(deleteId);
      setDeleteId(null);
      await reload();
      toast.success("Deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
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
          {canCreate && (
            <BulkImportActions
              apiBase="/api/Payers"
              templateFileName="Payers_Import_Template.xlsx"
              onImportSuccess={reload}
              onLoadingChange={setOverlayLoading}
            />
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add Payer <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
      </div>

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
                {(canUpdate || canDelete) && <TableHeaderCell>Actions</TableHeaderCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.payerName}</TableCell>
                  <TableCell>{row.aliases ?? "—"}</TableCell>
                  <TableCell>
                    {entityTypeLabel(row.entityType)}
                  </TableCell>
                  <TableCell>{row.status === 1 || row.status === "Active" ? "Active" : "Inactive"}</TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell>
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
      {loading && !data && !error && <Loader variant="inline" />}

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
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
