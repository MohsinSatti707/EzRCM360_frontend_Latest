"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ArrowRight, Trash2, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
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
import { EntityLocationFormModal } from "./EntityLocationFormModal";
import { CellTooltip } from "@/components/ui/CellTooltip";
import { entityLocationsApi } from "@/lib/services/entityLocations";
import { lookupsApi } from "@/lib/services/lookups";
import { usePaginatedList, useDebounce } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import type {
  EntityLocationListItemDto,
  CreateEntityLocationRequest,
  UpdateEntityLocationRequest,
} from "@/lib/services/entityLocations";
import type { EntityLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Entity Locations";
const STATUS_OPTIONS: { value: boolean; name: string }[] = [
  { value: true, name: "Active" },
  { value: false, name: "Inactive" },
];
const defaultForm: CreateEntityLocationRequest = {
  entityId: "",
  locationName: "",
  locationType: "",
  physicalAddress: "",
  posCode: "",
  isActive: true,
};

function SortArrows({
  columnKey, sortBy, sortOrder, onSort,
}: {
  columnKey: string; sortBy: string | null; sortOrder: "asc" | "desc" | null;
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

export default function EntityLocationsPage() {
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEntityLocationRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const api = entityLocationsApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission(MODULE_NAME);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize,
    extraParams: {
      search: debouncedSearch || undefined,
      isActive: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    },
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

  const openEdit = (row: EntityLocationListItemDto) => {
    setEditId(row.id);
    setForm({
      entityId: row.entityId,
      locationName: row.locationName,
      locationType: row.locationType,
      physicalAddress: row.physicalAddress ?? "",
      posCode: row.posCode ?? "",
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!form.entityId || !form.locationName.trim() || !form.locationType.trim()) {
      setFormError("Entity, location name, and location type are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      if (editId) {
        await api.update(editId, { ...form, isActive: form.isActive ?? true } as UpdateEntityLocationRequest);
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      await reload();
      toast.success(editId ? "Location Updated" : "Location Added", <>{editId ? "The" : "A new"} location, <strong>{form.locationName}</strong>, has been {editId ? "updated" : "added"} successfully.</>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
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
      const deletedName = data?.items.find((r) => r.id === deleteId)?.locationName ?? "";
      await api.delete(deleteId);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      await reload();
      toast.success("Location Deleted", <>The location, <strong>{deletedName}</strong>, has been deleted successfully.</>);
    } catch (err) {
      toast.error("Delete Failed", err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const allOnPage = data.items.map((r) => r.id);
    const allSelected = allOnPage.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => { const next = new Set(prev); allOnPage.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); allOnPage.forEach((id) => next.add(id)); return next; });
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
      toast.success("Locations Deleted", <>{selectedIds.size} location(s) have been deleted successfully.</>);
    } catch (err) {
      toast.error("Bulk Delete Failed", err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (row: EntityLocationListItemDto, isActive: boolean) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      await api.update(row.id, {
        entityId: row.entityId,
        locationName: row.locationName,
        locationType: row.locationType,
        physicalAddress: row.physicalAddress ?? null,
        posCode: row.posCode ?? null,
        isActive,
      });
      await reload();
      toast.success("Status Updated", <>The status for <strong>{row.locationName}</strong> has been updated successfully.</>);
    } catch (err) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleSort = useCallback((key: string, order: "asc" | "desc" | null) => {
    setSortBy(order === null ? null : key);
    setSortOrder(order);
  }, []);

  const displayItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;
    if (searchTerm.trim() && searchField !== "all") {
      const q = searchTerm.trim().toLowerCase();
      items = items.filter((r) => {
        switch (searchField) {
          case "locationName": return (r.locationName ?? "").toLowerCase().includes(q);
          case "locationType": return (r.locationType ?? "").toLowerCase().includes(q);
          case "physicalAddress": return (r.physicalAddress ?? "").toLowerCase().includes(q);
          case "entity": return (r.entityDisplayName ?? "").toLowerCase().includes(q);
          default: return true;
        }
      });
    }
    if (!sortBy || !sortOrder) return items;
    return [...items].sort((a, b) => {
      let va = "", vb = "";
      switch (sortBy) {
        case "locationName": va = a.locationName ?? ""; vb = b.locationName ?? ""; break;
        case "locationType": va = a.locationType ?? ""; vb = b.locationType ?? ""; break;
        case "physicalAddress": va = a.physicalAddress ?? ""; vb = b.physicalAddress ?? ""; break;
        case "entity": va = a.entityDisplayName ?? ""; vb = b.entityDisplayName ?? ""; break;
      }
      const cmp = va.localeCompare(vb, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [data?.items, sortBy, sortOrder, searchField, searchTerm]);

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Entity Locations" description="Manage entity locations." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div>
        <PageHeader title="Entity Locations" description="Manage entity locations." />
        <Card><AccessRestrictedContent sectionName="Entity Locations" /></Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Entity Locations" description="Manage entity locations." />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-3">
        {/* Search field selector */}
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="h-10 min-w-[90px] rounded-[5px] border border-[#E2E8F0] bg-background pl-3 pr-8 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:outline-none"
        >
          <option value="all">All</option>
          <option value="locationName">Location Name</option>
          <option value="locationType">Location Type</option>
          <option value="physicalAddress">Physical Address</option>
          <option value="entity">Linked Entity</option>
        </select>

        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 min-w-[90px] rounded-[5px] border border-[#E2E8F0] bg-background pl-3 pr-8 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:outline-none"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {canDelete && selectedIds.size > 0 && (
          <Button onClick={() => setBulkDeleteConfirm(true)} className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]">
            <><Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})</>
          </Button>
        )}
        {canCreate && (
          <Button onClick={openCreate} className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px] whitespace-nowrap">
            <>Add New Location <ArrowRight className="ml-1 h-4 w-4" /></>
          </Button>
        )}
      </div>

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      {data && data.items.length === 0 && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Image src="/icons/svg/no-data-found.svg" alt="No Data Found" width={180} height={180} />
          <h3 className="mt-4 text-2xl font-bold font-['Aileron'] text-gray-800">No Data Found</h3>
          <p className="mt-1 text-[15px] font-['Aileron'] text-[#151529]">No data available yet.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[calc(100vh-316px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
            <Table className="min-w-[1100px] table-fixed">
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
                    { key: "locationName", label: "Location Name", width: "w-[220px] min-w-[220px]" },
                    { key: "locationType", label: "Location Type", width: "w-[160px] min-w-[160px]" },
                    { key: "physicalAddress", label: "Physical Address", width: "w-[220px] min-w-[220px]" },
                    { key: "entity", label: "Linked Entity", width: "w-[200px] min-w-[200px]" },
                  ].map(({ key, label, width }) => (
                    <TableHeaderCell key={key} className={width}>
                      <div className="flex items-center gap-2">
                        {label}
                        <SortArrows columnKey={key} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                      </div>
                    </TableHeaderCell>
                  ))}
                  <TableHeaderCell className="w-[150px] min-w-[150px]">
                    <div className="flex items-center gap-2">
                      Status
                      <SortArrows columnKey="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    </div>
                  </TableHeaderCell>
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
                          <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
                        </TableCell>
                      )}
                      <TableCell>
                        <Link
                          href={`/settings/entity-locations/${row.id}`}
                          className={`font-aileron text-[14px] hover:underline cursor-pointer ${cellColor}`}
                        >
                          {row.locationName}
                        </Link>
                      </TableCell>
                      <TableCell className={cellColor}>
                        <CellTooltip text={row.locationType} />
                      </TableCell>
                      <TableCell className={cellColor}>
                        <CellTooltip text={row.physicalAddress ?? "—"} />
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
                          {STATUS_OPTIONS.map((o) => (
                            <option key={String(o.value)} value={o.value ? "1" : "0"}>{o.name}</option>
                          ))}
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

      {loading && !data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

      <EntityLocationFormModal
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
        title="Delete location"
        message={<>Are you sure you want to delete the location <strong>{data?.items.find((r) => r.id === deleteId)?.locationName ?? ""}</strong>?</>}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected locations"
        message={`Are you sure you want to delete ${selectedIds.size} location(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
