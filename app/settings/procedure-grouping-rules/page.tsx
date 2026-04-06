"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Search, ArrowRight, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { procedureGroupingRulesApi } from "@/lib/services/procedureGroupingRules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { ProcedureGroupingRuleDto, CreateProcedureGroupingRuleCommand } from "@/lib/services/procedureGroupingRules";
import type { PaginatedList } from "@/lib/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Loader } from "@/components/ui/Loader";
import { toDateInput } from "@/lib/utils";
import { CellTooltip } from "@/components/ui/CellTooltip";

const MAX_GROUP_CODE_LENGTH = 20;
const MAX_GROUP_NAME_LENGTH = 100;
const MAX_CPT_HCPCS_CODE_LENGTH = 20;

const ACTIVE_OPTIONS = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

const defaultForm: CreateProcedureGroupingRuleCommand = {
  groupCode: "",
  groupName: "",
  cptHcpcsCode: "",
  sortOrder: 0,
  effectiveStartDate: null,
  effectiveEndDate: null,
  isActive: true,
};

export default function ProcedureGroupingRulesPage() {
  const [data, setData] = useState<PaginatedList<ProcedureGroupingRuleDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateProcedureGroupingRuleCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const groupCodeOverLimit = form.groupCode.length > MAX_GROUP_CODE_LENGTH;
  const groupNameOverLimit = form.groupName.length > MAX_GROUP_NAME_LENGTH;
  const cptHcpcsCodeOverLimit = form.cptHcpcsCode.length > MAX_CPT_HCPCS_CODE_LENGTH;
  const hasOverLimit = groupCodeOverLimit || groupNameOverLimit || cptHcpcsCodeOverLimit;
  const formDisabled = hasOverLimit || form.groupName.trim().length < 1;

  const api = procedureGroupingRulesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete, loading: permLoading } = useModulePermission("Procedure Grouping Rules");

  const loadList = useCallback(() => {
    setError(null);
    const isActive =
      statusFilter === "all"
        ? undefined
        : statusFilter === "active";
    api
      .getList({
        pageNumber: page,
        pageSize,
        ...(searchTerm.trim() ? { groupCode: searchTerm.trim() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [page, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (row: ProcedureGroupingRuleDto) => {
    setEditId(row.id);
    setForm({
      groupCode: row.groupCode,
      groupName: row.groupName,
      cptHcpcsCode: row.cptHcpcsCode,
      sortOrder: row.sortOrder,
      effectiveStartDate: row.effectiveStartDate ?? null,
      effectiveEndDate: row.effectiveEndDate ?? null,
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.groupCode.trim() || !form.groupName.trim() || !form.cptHcpcsCode.trim()) {
      setFormError("Group code, group name, and CPT/HCPCS code are required.");
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

  const handleStatusChange = async (row: ProcedureGroupingRuleDto, activeValue: number) => {
    if (!canUpdate) return;
    setStatusUpdatingId(row.id);
    try {
      const payload: CreateProcedureGroupingRuleCommand = {
        groupCode: row.groupCode,
        groupName: row.groupName,
        cptHcpcsCode: row.cptHcpcsCode,
        sortOrder: row.sortOrder,
        effectiveStartDate: row.effectiveStartDate ?? null,
        effectiveEndDate: row.effectiveEndDate ?? null,
        isActive: activeValue === 1,
      };
      await api.update(row.id, payload);
      loadList();
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(deleteId);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteId); return next; });
      setDeleteId(null);
      loadList();
      toast.success("Deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
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
      loadList();
      toast.success(`${selectedIds.size} record(s) deleted successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleteLoading(false);
      setOverlayLoading(false);
    }
  };

  if (permLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <PageHeader title="Procedure Grouping Rules" description="Procedure grouping for ranking and reporting." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div>
        <PageHeader title="Procedure Grouping Rules" description="Procedure grouping for ranking and reporting." />
        <Card>
          <AccessRestrictedContent sectionName="Procedure Grouping Rules" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Procedure Grouping Rules" description="Procedure grouping for ranking and reporting." />
      {/* Toolbar: search + add button */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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
              apiBase="/api/ProcedureGroupingRules"
              templateFileName="ProcedureGroupingRules_Import_Template.xlsx"
              onImportSuccess={loadList}
              onLoadingChange={setOverlayLoading}
            />
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add Procedure Grouping Rule <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
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
            <Table className="min-w-[900px] table-fixed">
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
                  <TableHeaderCell className="w-[120px] min-w-[120px]">Group code</TableHeaderCell>
                  <TableHeaderCell className="w-[200px] min-w-[200px]">Group name</TableHeaderCell>
                  <TableHeaderCell className="w-[150px] min-w-[150px]">CPT/HCPCS code</TableHeaderCell>
                  <TableHeaderCell className="w-[120px] min-w-[120px]">Sort order</TableHeaderCell>
                  <TableHeaderCell className="w-[180px] min-w-[180px]">Status</TableHeaderCell>
                  {(canUpdate || canDelete) && (
                    <TableHeaderCell className="!w-[120px] min-w-[120px]">Actions</TableHeaderCell>
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
                    <TableCell className="w-[140px] min-w-[140px]">
                      <div className="max-w-[120px] truncate">
                        <CellTooltip text={row.groupCode} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[200px] min-w-[200px]">
                      <div className="max-w-[180px] truncate">
                        <CellTooltip text={row.groupName} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[140px] min-w-[140px]">
                      <div className="max-w-[120px] truncate">
                        <CellTooltip text={row.cptHcpcsCode} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px] min-w-[100px]">
                      <div className="max-w-[80px] truncate">
                        <CellTooltip text={row.sortOrder} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[160px] min-w-[160px]">
                      <select
                        value={row.isActive ? 1 : 0}
                        onChange={(e) => handleStatusChange(row, Number(e.target.value))}
                        disabled={!canUpdate || statusUpdatingId === row.id}
                        className="input-enterprise w-[140px] rounded-l-[5px] rounded-r-0 px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        {ACTIVE_OPTIONS.map((o) => (
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
          <div className="mt-auto shrink-0 pt-4">
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
        title={editId ? "Edit rule" : "Add rule"}
        size="lg"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                {editId ? "Update" : "Create"}
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
                {groupCodeOverLimit && <>{`The length of 'Group Code' must be ${MAX_GROUP_CODE_LENGTH} characters or fewer. You entered ${form.groupCode.length} characters.`}</>}
                {groupCodeOverLimit && (groupNameOverLimit || cptHcpcsCodeOverLimit) && <br />}
                {groupNameOverLimit && <>{`The length of 'Group Name' must be ${MAX_GROUP_NAME_LENGTH} characters or fewer. You entered ${form.groupName.length} characters.`}</>}
                {groupNameOverLimit && cptHcpcsCodeOverLimit && <br />}
                {cptHcpcsCodeOverLimit && <>{`The length of 'CPT/HCPCS Code' must be ${MAX_CPT_HCPCS_CODE_LENGTH} characters or fewer. You entered ${form.cptHcpcsCode.length} characters.`}</>}
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
              <label className="mb-1 block text-sm font-medium text-foreground">
                Group code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.groupCode}
                onChange={(e) => setForm((f) => ({ ...f, groupCode: e.target.value }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Group name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.groupName}
                onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                CPT/HCPCS code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.cptHcpcsCode}
                onChange={(e) => setForm((f) => ({ ...f, cptHcpcsCode: e.target.value }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Sort order
              </label>
              <input
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective start date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveStartDate ?? undefined)}
                onChange={(e) => setForm((f) => ({ ...f, effectiveStartDate: e.target.value || null }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective end date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveEndDate ?? undefined)}
                onChange={(e) => setForm((f) => ({ ...f, effectiveEndDate: e.target.value || null }))}
                className="w-full rounded-[5px] border border-input px-3 py-2 text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center">
              <label htmlFor="procedure-grouping-active" className="inline-flex w-fit cursor-pointer items-center gap-2">
                <input
                  id="procedure-grouping-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-5 w-5 rounded border-input"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete rule" message={<>Are you sure you want to delete the rule <strong>{data?.items.find((r) => r.id === deleteId)?.groupName ?? ""}</strong>?</>} confirmLabel="Delete" variant="danger" loading={deleteLoading} />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected procedure grouping rules"
        message={`Are you sure you want to delete ${selectedIds.size} procedure grouping rule(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
