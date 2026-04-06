"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Search, ArrowRight, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Loader } from "@/components/ui/Loader";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { PayerFormModal } from "./PayerFormModal";
import { AddPlanModal } from "./AddPlanModal";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { payersApi } from "@/lib/services/payers";
import { lookupsApi } from "@/lib/services/lookups";
import { usePaginatedList, useDebounce } from "@/lib/hooks";
import { resolveEnum, ENUMS } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { CellTooltip } from "@/components/ui/CellTooltip";

import type {
  PayerListItemDto,
  CreatePayerRequest,
  UpdatePayerRequest,
  PayerAddressRequest,
  PayerPhoneRequest,
  PayerEmailRequest,
} from "@/lib/services/payers";

const MODULE_NAME = "Payers";
const STATUS_OPTIONS: { value: number; name: string }[] = [
  { value: 1, name: "Active" },
  { value: 0, name: "Inactive" },
];
const defaultForm: CreatePayerRequest = {
  payerName: "",
  aliases: "",
  entityType: 0,
  insuranceSubCategory: null,
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePayerRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [originalPlanIds, setOriginalPlanIds] = useState<string[]>([]);

  const api = payersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission(MODULE_NAME);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize,
    extraParams: {
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
    },
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
      const planIds = detail.planIds ?? [];
      setOriginalPlanIds(planIds);
      setForm({
        payerName: detail.payerName,
        aliases: detail.aliases ?? "",
        entityType: resolveEnum(detail.entityType, ENUMS.PayerEntityType),
        insuranceSubCategory: detail.insuranceSubCategory != null ? resolveEnum(detail.insuranceSubCategory, ENUMS.PlanCategory) : null,
        status: resolveEnum(detail.status, ENUMS.PayerStatus),
        planIds,
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
    // Calculate explicit plan add/remove lists for updates
    const currentPlanIds = form.planIds ?? [];
    const planIdsToAdd = currentPlanIds.filter((id) => !originalPlanIds.includes(id));
    const planIdsToRemove = originalPlanIds.filter((id) => !currentPlanIds.includes(id));

    const payload = {
      ...form,
      addresses: addresses.length ? addresses : undefined,
      phoneNumbers: phoneNumbers.length ? phoneNumbers : undefined,
      emails: emails.length ? emails : undefined,
      planIds: undefined,
    };
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, {
          ...payload,
          status: form.status,
          planIdsToAdd: planIdsToAdd.length ? planIdsToAdd : undefined,
          planIdsToRemove: planIdsToRemove.length ? planIdsToRemove : undefined,
        } as UpdatePayerRequest);
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

  const handleSubmitAndAddPlan = useCallback(async () => {
    setFormError(null);
    if (!form.payerName.trim()) {
      setFormError("Payer name is required.");
      return;
    }
    const addresses = (form.addresses ?? []).filter((a) => (a.addressLine1 ?? "").trim() !== "");
    const phoneNumbers = (form.phoneNumbers ?? []).filter((p) => (p.phoneNumber ?? "").trim() !== "");
    const emails = (form.emails ?? []).filter((e) => (e.emailAddress ?? "").trim() !== "");
    const payload = {
      ...form,
      addresses: addresses.length ? addresses : undefined,
      phoneNumbers: phoneNumbers.length ? phoneNumbers : undefined,
      emails: emails.length ? emails : undefined,
      planIds: undefined,
    };
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      const newId = await api.create(payload);
      await reload();
      toast.success("Payer created. Now add a plan.");
      // Close the payer modal first, then open the Add Plan modal
      setModalOpen(false);
      setEditId(newId);
      setAddPlanOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  }, [form, api, reload]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      await api.delete(deleteId);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
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
      await reload();
      toast.success(`${selectedIds.size} record(s) deleted successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (row: PayerListItemDto, statusValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      const detail = await api.getById(row.id);
      await api.update(row.id, {
        payerName: detail.payerName,
        aliases: detail.aliases ?? "",
        entityType: detail.entityType,
        insuranceSubCategory: detail.insuranceSubCategory != null ? resolveEnum(detail.insuranceSubCategory, ENUMS.PlanCategory) : null,
        status: statusValue,
        addresses: (detail.addresses ?? []).map((a) => ({
          addressLine1: a.addressLine1,
          addressLine2: a.addressLine2 ?? "",
          city: a.city,
          state: a.state,
          zip: a.zip,
          label: a.label ?? "",
        })),
        phoneNumbers: (detail.phoneNumbers ?? []).map((p) => ({
          phoneNumber: p.phoneNumber,
          label: p.label ?? "",
        })),
        emails: (detail.emails ?? []).map((e) => ({
          emailAddress: e.emailAddress,
          label: e.label ?? "",
        })),
      });
      await reload();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const entityTypeLabel = (n: number) =>
    entityTypes.find((e) => Number(e.value) === n)?.label ?? String(n);

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Payer Configuration" description="Centralized payer registry." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

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
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Payer Configuration" description="Centralized payer registry." />

      {/* Toolbar: search + add button */}
      <div className="mb-3 flex items-center justify-between gap-3 ">
        <div className="flex flex-1 items-center">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-l-[5px] font-aileron text-[14px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
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
        <div className="max-h-[calc(100vh-316px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
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
                  <TableHeaderCell className="w-[250px] min-w-[250px]">Payer name</TableHeaderCell>
                  <TableHeaderCell className="w-[140px] min-w-[140px]">Aliases</TableHeaderCell>
                  <TableHeaderCell className="w-[140px] min-w-[140px]">Entity type</TableHeaderCell>
                  <TableHeaderCell className="w-[140px] min-w-[140px]">Status</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <TableHeaderCell className="!w-[100px] min-w-[100px]">Actions</TableHeaderCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-xs truncate">
                        <CellTooltip text={row.payerName} />
                        
                        </div>
                    </TableCell>
                    <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-xs truncate">
                        <CellTooltip text={row.aliases ?? "—"} />
                        
                        </div>
                    </TableCell>
                    <TableCell className="w-[250px] min-w-[250px]">
                      <div className="max-w-[140px] truncate">
                        <CellTooltip text={entityTypeLabel(row.entityType)} />
                        
                      </div>
                    </TableCell>
                    <TableCell className="w-[250px] min-w-[250px]">
                      <select
                        value={typeof row.status === "string" ? (row.status === "Active" ? "1" : "0") : String(row.status ?? 0)}
                        onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="input-enterprise w-[140px] rounded-l-[5px] rounded-r-0 px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        {STATUS_OPTIONS.map((o) => (
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
          <div className="shrink-0 pt-4">
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
      {loading && !data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

      <PayerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={editId}
        form={form}
        onFormChange={setForm}
        entityTypeOptions={entityTypes}
        planOptions={planOptions}
        onSubmit={handleSubmit}
        onSubmitAndAddPlan={handleSubmitAndAddPlan}
        loading={submitLoading}
        error={formError}
        onAddNewPlan={() => setAddPlanOpen(true)}
      />

      {editId && (
        <AddPlanModal
          open={addPlanOpen}
          onClose={() => setAddPlanOpen(false)}
          payerId={editId}
          payerName={form.payerName}
          onSuccess={async () => {
            // Refresh plan options so linked plans list updates
            lookupsApi().getPlans().then(setPlanOptions).catch(() => {});
            // Refresh payer detail to get updated planIds
            try {
              const detail = await api.getById(editId);
              setForm((f) => ({ ...f, planIds: detail.planIds ?? [] }));
            } catch { /* ignore */ }
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete payer"
        message={<>Are you sure you want to delete the payer <strong>{data?.items.find((r) => r.id === deleteId)?.payerName ?? ""}</strong>?</>}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected payers"
        message={`Are you sure you want to delete ${selectedIds.size} payer(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
