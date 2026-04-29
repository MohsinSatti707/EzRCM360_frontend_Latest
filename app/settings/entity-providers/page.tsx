"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ArrowRight, Trash2, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { entityProvidersApi } from "@/lib/services/entityProviders";
import { lookupsApi } from "@/lib/services/lookups";
import { Alert } from "@/components/ui/Alert";
import { useDebounce } from "@/lib/hooks";
import { resolveEnum, ENUMS } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Loader } from "@/components/ui/Loader";
import type { EntityProviderListItemDto, CreateEntityProviderRequest, UpdateEntityProviderRequest } from "@/lib/services/entityProviders";
import type { EntityLookupDto } from "@/lib/services/lookups";
import type { PaginatedList } from "@/lib/types";
import { CellTooltip } from "@/components/ui/CellTooltip";

const MAX_PROVIDER_NAME_LENGTH = 200;
const MAX_NPI_LENGTH = 10;

const PROVIDER_TYPES = [{ value: 0, name: "Physician" }, { value: 1, name: "Non-Physician" }];

function SortArrows({
  columnKey,
  sortBy,
  sortOrder,
  onSort,
}: {
  columnKey: string;
  sortBy: string | null;
  sortOrder: "asc" | "desc" | null;
  onSort: (key: string, order: "asc" | "desc" | null) => void;
}) {
  const isAsc = sortBy === columnKey && sortOrder === "asc";
  const isDesc = sortBy === columnKey && sortOrder === "desc";
  return (
    <span className="inline-flex flex-col gap-0" role="group" aria-label="Sort">
      <button type="button" onClick={(e) => { e.stopPropagation(); onSort(columnKey, isAsc ? null : "asc"); }} className="p-0 border-0 bg-transparent cursor-pointer rounded leading-none hover:opacity-80 focus:outline-none" aria-label="Sort ascending">
        <Play className={`h-2 w-2 shrink-0 -rotate-90 ${isAsc ? "fill-[#0066CC] text-[#0066CC]" : "fill-[#E2E8F0] text-[#E2E8F0]"}`} />
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onSort(columnKey, isDesc ? null : "desc"); }} className="p-0 border-0 bg-transparent cursor-pointer rounded leading-none hover:opacity-80 focus:outline-none" aria-label="Sort descending">
        <Play className={`h-2 w-2 shrink-0 rotate-90 ${isDesc ? "fill-[#0066CC] text-[#0066CC]" : "fill-[#E2E8F0] text-[#E2E8F0]"}`} />
      </button>
    </span>
  );
}

const defaultForm: CreateEntityProviderRequest = {
  entityId: "",
  providerName: "",
  npi: "",
  ssn: "",
  providerType: 0,
  primarySpecialty: "",
  secondarySpecialty: "",
  isActive: true,
};

export default function EntityProvidersPage() {
  const [data, setData] = useState<PaginatedList<EntityProviderListItemDto> | null>(null);
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEntityProviderRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchField, setSearchField] = useState<string>("all");
  const [providerTypeFilter, setProviderTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const providerNameOverLimit = form.providerName.length > MAX_PROVIDER_NAME_LENGTH;
  const npiOverLimit = form.npi.length > MAX_NPI_LENGTH;
  const hasOverLimit = providerNameOverLimit || npiOverLimit;
  const formDisabled = hasOverLimit || !form.entityId || form.providerName.trim().length < 1 || form.npi.trim().length < 1;

  const api = entityProvidersApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission("Entity Providers");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const loadList = useCallback(() => {
    setError(null);
    api.getList({ pageNumber: page, pageSize, search: debouncedSearch || undefined, isActive: statusFilter === "all" ? undefined : statusFilter === "active" }).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    lookupsApi().getEntities().then(setEntities).catch(() => setEntities([]));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, entityId: entities[0]?.id ?? "" });
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = async (row: EntityProviderListItemDto) => {
    setEditId(row.id);
    setFormError(null);
    try {
      const detail = await api.getById(row.id);
      setForm({
        entityId: detail.entityId,
        providerName: detail.providerName,
        npi: detail.npi,
        ssn: detail.ssn ?? "",
        providerType: resolveEnum(detail.providerType, ENUMS.ProviderType),
        primarySpecialty: detail.primarySpecialty ?? "",
        secondarySpecialty: detail.secondarySpecialty ?? "",
        isActive: detail.isActive,
      });
      setModalOpen(true);
    } catch {
      setFormError("Failed to load.");
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.entityId || !form.providerName.trim() || !form.npi.trim()) {
      setFormError("Entity, provider name, and NPI are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, {
          entityId: form.entityId,
          providerName: form.providerName,
          npi: form.npi,
          ssn: form.ssn || null,
          providerType: form.providerType,
          primarySpecialty: form.primarySpecialty || null,
          secondarySpecialty: form.secondarySpecialty || null,
          isActive: form.isActive ?? true,
        });
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      await loadList();
      toast.success(editId ? "Provider Updated" : "Provider Added", <>{editId ? "The" : "A new"} provider, <strong>{form.providerName}</strong>, has been {editId ? "updated" : "added"} successfully.</>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setOverlayLoading(true);
    try {
      const deletedName = data?.items.find((r) => r.id === deleteId)?.providerName ?? "";
      await api.delete(deleteId);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      await loadList();
      toast.success("Provider Deleted", <>The provider, <strong>{deletedName}</strong>, has been deleted successfully.</>);
    } catch (err) {
      toast.error("Delete Failed", err instanceof Error ? err.message : "Delete failed.");
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
      await loadList();
      toast.success("Providers Deleted", <>{selectedIds.size} provider(s) have been deleted successfully.</>);
    } catch (err) {
      toast.error("Bulk Delete Failed", err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const providerTypeLabel = (n: number) => PROVIDER_TYPES.find((p) => p.value === n)?.name ?? String(n);

  const handleSort = useCallback((key: string, order: "asc" | "desc" | null) => {
    setSortBy(order === null ? null : key);
    setSortOrder(order);
  }, []);

  const displayItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;
    if (providerTypeFilter !== "all") {
      items = items.filter((r) => String(resolveEnum(r.providerType, ENUMS.ProviderType)) === providerTypeFilter);
    }
    if (searchTerm.trim() && searchField !== "all") {
      const q = searchTerm.trim().toLowerCase();
      items = items.filter((r) => {
        switch (searchField) {
          case "providerName": return (r.providerName ?? "").toLowerCase().includes(q);
          case "npi": return (r.npi ?? "").toLowerCase().includes(q);
          case "ssn": return (r.ssn ?? "").toLowerCase().includes(q);
          case "providerType": return providerTypeLabel(resolveEnum(r.providerType, ENUMS.ProviderType)).toLowerCase().includes(q);
          case "primarySpecialty": return (r.primarySpecialty ?? "").toLowerCase().includes(q);
          case "secondarySpecialty": return (r.secondarySpecialty ?? "").toLowerCase().includes(q);
          case "entity": return (r.entityDisplayName ?? "").toLowerCase().includes(q);
          default: return true;
        }
      });
    }
    if (!sortBy || !sortOrder) return items;
    return [...items].sort((a, b) => {
      let va = "", vb = "";
      switch (sortBy) {
        case "providerName": va = a.providerName ?? ""; vb = b.providerName ?? ""; break;
        case "npi": va = a.npi ?? ""; vb = b.npi ?? ""; break;
        case "ssn": va = a.ssn ?? ""; vb = b.ssn ?? ""; break;
        case "providerType": va = providerTypeLabel(resolveEnum(a.providerType, ENUMS.ProviderType)); vb = providerTypeLabel(resolveEnum(b.providerType, ENUMS.ProviderType)); break;
        case "primarySpecialty": va = a.primarySpecialty ?? ""; vb = b.primarySpecialty ?? ""; break;
        case "secondarySpecialty": va = a.secondarySpecialty ?? ""; vb = b.secondarySpecialty ?? ""; break;
        case "entity": va = a.entityDisplayName ?? ""; vb = b.entityDisplayName ?? ""; break;
      }
      const cmp = va.localeCompare(vb, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [data?.items, sortBy, sortOrder, providerTypeFilter, searchField, searchTerm]);

  const handleStatusChange = async (row: EntityProviderListItemDto, isActive: boolean) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      await api.update(row.id, {
        entityId: row.entityId,
        providerName: row.providerName,
        npi: row.npi,
        ssn: null,
        providerType: row.providerType,
        primarySpecialty: row.primarySpecialty ?? null,
        secondarySpecialty: row.secondarySpecialty ?? null,
        isActive,
      });
      await loadList();
      toast.success("Status Updated", <>The status for <strong>{row.providerName}</strong> has been updated successfully.</>);
    } catch (err) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Entity Providers" />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div>
        <PageHeader title="Entity Providers" />
        <Card>
          <AccessRestrictedContent sectionName="Entity Providers" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader
        title="Entity Providers"
        actions={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px] whitespace-nowrap"
            >
              Add New Provider <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex flex-1 items-center">
          <Select value={searchField} onValueChange={setSearchField}>
            <SelectTrigger className="h-10 w-[110px] rounded-l-[5px] rounded-r-none border border-r-0 border-[#E2E8F0] bg-background font-aileron text-[14px] text-[#202830] focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="providerName">Provider Name</SelectItem>
              <SelectItem value="npi">Provider NPI</SelectItem>
              <SelectItem value="ssn">Provider SSN</SelectItem>
              <SelectItem value="primarySpecialty">Primary Specialty</SelectItem>
              <SelectItem value="secondarySpecialty">Secondary Specialty</SelectItem>
              <SelectItem value="entity">Linked Entity</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-none border border-r-0 border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
          <Select value={providerTypeFilter} onValueChange={(v) => { setProviderTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[190px] rounded-none border border-r-0 border-[#E2E8F0] bg-background font-aileron text-[14px] text-[#202830] focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter by Provider Type</SelectItem>
              <SelectItem value="0">Physician</SelectItem>
              <SelectItem value="1">Non-Physician</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[160px] rounded-r-[5px] rounded-l-none border border-[#E2E8F0] bg-background font-aileron text-[14px] text-[#202830] focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter by Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={() => { setProviderTypeFilter("all"); setStatusFilter("all"); setSearchTerm(""); setSearchField("all"); setPage(1); }}
          className="h-10 rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] text-[#202830] hover:text-[#0066CC] hover:border-[#0066CC] transition-colors focus:outline-none focus:text-[#0066CC] focus:border-[#0066CC]"
        >
          Clear
        </button>

        {canDelete && selectedIds.size > 0 && (
          <Button
            onClick={() => setBulkDeleteConfirm(true)}
            className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
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
            <Table className="min-w-[1600px] table-fixed">
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
                  {[
                    { key: "providerName", label: "Provider Name", width: "w-[180px] min-w-[180px]" },
                    { key: "npi", label: "Provider NPI", width: "w-[150px] min-w-[150px]" },
                    { key: "ssn", label: "Provider SSN", width: "w-[150px] min-w-[150px]" },
                    { key: "providerType", label: "Provider Type", width: "w-[150px] min-w-[150px]" },
                    { key: "primarySpecialty", label: "Primary Specialty", width: "w-[180px] min-w-[180px]" },
                    { key: "secondarySpecialty", label: "Secondary Specialty", width: "w-[180px] min-w-[180px]" },
                    { key: "entity", label: "Linked Entity", width: "w-[180px] min-w-[180px]" },
                  ].map(({ key, label, width }) => (
                    <TableHeaderCell key={key} className={width}>
                      <div className="flex items-center gap-2">
                        {label}
                        <SortArrows columnKey={key} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                      </div>
                    </TableHeaderCell>
                  ))}
                  <TableHeaderCell className="w-[150px] min-w-[150px]">Status</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <TableHeaderCell className="!w-[100px] min-w-[100px]">Actions</TableHeaderCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayItems.map((row) => {
                  const isInactive = !row.isActive;
                  const cellColor = isInactive ? "text-[#93C5FD]" : "text-[#202830]";
                  return (
                  <TableRow key={row.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Link
                        href={`/settings/entity-providers/${row.id}`}
                        className="font-aileron text-[14px] font-medium text-[#0066CC] cursor-pointer"
                      >
                        {row.providerName}
                      </Link>
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={row.npi} />
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={row.ssn ?? "—"} />
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={providerTypeLabel(resolveEnum(row.providerType, ENUMS.ProviderType))} />
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={row.primarySpecialty ?? "—"} />
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={row.secondarySpecialty ?? "—"} />
                    </TableCell>
                    <TableCell className={cellColor}>
                      <CellTooltip text={row.entityDisplayName ?? "—"} />
                    </TableCell>
                    <TableCell>
                      <select
                        value={row.isActive ? "1" : "0"}
                        onChange={(e) => handleStatusChange(row, e.target.value === "1")}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="h-9 w-[130px] rounded-[5px] border border-[#E2E8F0] bg-background pl-3 pr-8 font-aileron text-[14px] text-[#202830] disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                      </select>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="!w-[100px]">
                        <TableActionsCell
                          canEdit={canUpdate}
                          canDelete={canDelete}
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteId(row.id)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
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
      {!data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Provider" : "Add Provider"}
        size="lg"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                {editId ? "Update" : "Add Provider"}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </>
            }
            onSubmit={handleSubmit}
            loading={submitLoading}
            disabled={formDisabled}
          />
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {hasOverLimit && (
            <div className="mb-4 text-sm">
              <Alert variant="error">
                {providerNameOverLimit && <>{`The length of 'Provider Name' must be ${MAX_PROVIDER_NAME_LENGTH} characters or fewer. You entered ${form.providerName.length} characters.`}</>}
                {providerNameOverLimit && npiOverLimit && <br />}
                {npiOverLimit && <>{`The length of 'NPI' must be ${MAX_NPI_LENGTH} characters or fewer. You entered ${form.npi.length} characters.`}</>}
              </Alert>
            </div>
          )}
          {formError && (
            <div className="mb-4">
              <Alert variant="error">{formError}</Alert>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.providerName}
                onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))}
                placeholder="e.g., Dr. John Smith"
                required
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider NPI <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.npi}
                onChange={(e) => setForm((f) => ({ ...f, npi: e.target.value }))}
                placeholder="e.g., 1234567890"
                required
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider SSN</label>
              <input
                type="text"
                value={form.ssn ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, ssn: e.target.value }))}
                placeholder="e.g., 222-00-4321"
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Provider Type</label>
              <select
                value={form.providerType}
                onChange={(e) => setForm((f) => ({ ...f, providerType: Number(e.target.value) }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <option value="">Select Provider Type</option>
                {PROVIDER_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Primary Specialty</label>
              <input
                type="text"
                value={form.primarySpecialty ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, primarySpecialty: e.target.value }))}
                placeholder="e.g., Internal Medicine"
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Secondary Specialty</label>
              <input
                type="text"
                value={form.secondarySpecialty ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, secondarySpecialty: e.target.value }))}
                placeholder="e.g., Cardiology"
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Linked Entity <span className="text-red-500">*</span></label>
              <select
                value={form.entityId}
                onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                required
              >
                <option value="">Select Entity</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.displayName}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete provider" message={<>Are you sure you want to delete the provider <strong>{data?.items.find((r) => r.id === deleteId)?.providerName ?? ""}</strong>?</>} confirmLabel="Delete" variant="danger" loading={deleteLoading} />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected providers"
        message={`Are you sure you want to delete ${selectedIds.size} provider(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}