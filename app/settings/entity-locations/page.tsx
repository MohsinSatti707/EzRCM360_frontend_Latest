"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
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
import { EntityLocationFormModal } from "./EntityLocationFormModal";
import { entityLocationsApi } from "@/lib/services/entityLocations";
import { lookupsApi } from "@/lib/services/lookups";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { usePaginatedList, useDebounce } from "@/lib/hooks";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type {
  EntityLocationListItemDto,
  CreateEntityLocationRequest,
  UpdateEntityLocationRequest,
} from "@/lib/services/entityLocations";
import type { EntityLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Entity Locations";
const defaultForm: CreateEntityLocationRequest = {
  entityId: "",
  locationName: "",
  locationType: "",
  physicalAddress: "",
  posCode: "",
  isActive: true,
};

export default function EntityLocationsPage() {
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
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

  const api = entityLocationsApi();
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

  if (!canView) {
    return (
      <div>
        <PageHeader title="Entity Locations" description="Manage entity locations." />
        <Card>
          <AccessRestrictedContent sectionName="Entity Locations" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Entity Locations" description="Manage entity locations." />

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
        <div className="flex items-center gap-3">
          {canDelete && selectedIds.size > 0 && (
            <Button
              onClick={() => setBulkDeleteConfirm(true)}
              className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
            >
              <><Trash2 className="mr-1 h-4 w-4" /> Delete ({selectedIds.size})</>
            </Button>
          )}
          {canCreate && (
            <>
              <BulkImportActions
                apiBase="/api/EntityLocations"
                templateFileName="EntityLocations_Import_Template.xlsx"
                onImportSuccess={reload}
                onLoadingChange={setOverlayLoading}
              />
              <Button
                onClick={openCreate}
                className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
              >
                <>Add Entity Location <ArrowRight className="ml-1 h-4 w-4" /></>
              </Button>
            </>
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
                {canDelete && (
                  <TableHeaderCell className="!min-w-[50px] w-[50px]">
                    <Checkbox
                      checked={!!data?.items.length && data.items.every((r) => selectedIds.has(r.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHeaderCell>
                )}
                <TableHeaderCell>Entity</TableHeaderCell>
                <TableHeaderCell>Location name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Physical address</TableHeaderCell>
                <TableHeaderCell>POS code</TableHeaderCell>
                <TableHeaderCell>Active</TableHeaderCell>
                {(canUpdate || canDelete) && <TableHeaderCell>Actions</TableHeaderCell>}
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
                  <TableCell>{row.entityDisplayName}</TableCell>
                  <TableCell>{row.locationName}</TableCell>
                  <TableCell>{row.locationType}</TableCell>
                  <TableCell>{row.physicalAddress ?? "—"}</TableCell>
                  <TableCell>{row.posCode ?? "—"}</TableCell>
                  <TableCell>{row.isActive ? "Yes" : "No"}</TableCell>
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
        message="Are you sure you want to delete this location?"
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
