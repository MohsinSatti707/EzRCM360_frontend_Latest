"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ArrowRight, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import { applicabilityRulesApi } from "@/lib/services/applicabilityRules";
import { feeSchedulesApi, type FeeScheduleDto } from "@/lib/services/feeSchedules";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type {
  ApplicabilityRuleDto,
  CreateApplicabilityRuleCommand,
} from "@/lib/services/applicabilityRules";
import type { PaginatedList } from "@/lib/types";
import { BulkImportActions } from "@/components/settings/BulkImportActions";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Checkbox } from "@/components/ui/Checkbox";

const PROVIDER_PARTICIPATION = [
  { value: 0, name: "In Network" },
  { value: 1, name: "Out of Network" },
  { value: 2, name: "N/A" },
];
const PAYER_CATEGORY = [
  { value: 0, name: "Attorney/Employer/Other" },
  { value: 1, name: "Medicare" },
  { value: 2, name: "Railroad Medicare" },
  { value: 3, name: "Tricare" },
  { value: 4, name: "Medicaid" },
  { value: 5, name: "Commercial IN" },
  { value: 6, name: "Commercial OON" },
  { value: 7, name: "MVA" },
  { value: 8, name: "Workers Compensation" },
];
const FEE_SCHEDULE_APPLIED = [
  { value: 0, name: "UCR" },
  { value: 1, name: "Medicare" },
  { value: 2, name: "Medicare Multiplier" },
  { value: 3, name: "MVA" },
  { value: 4, name: "WC" },
];
const MER_CALCULATION_SCOPE = [
  { value: 0, name: "None" },
  { value: 1, name: "No Pay Denial Only" },
  { value: 2, name: "Full MER" },
];

const defaultForm: CreateApplicabilityRuleCommand = {
  sortOrder: 0,
  ruleSetName: "",
  displayName: "",
  payerEntityType: "",
  planCategory: "",
  claimCategory: "",
  providerParticipation: 0,
  payerCategory: 0,
  feeScheduleApplied: 0,
  merCalculationScope: 0,
  isActive: true,
  state: null,
  placeOfService: null,
  primaryFeeScheduleId: null,
  modifier: null,
  effectiveStartDate: null,
  effectiveEndDate: null,
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function ApplicabilityRulesPage() {
  const [data, setData] = useState<PaginatedList<ApplicabilityRuleDto> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateApplicabilityRuleCommand>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [feeScheduleOptions, setFeeScheduleOptions] = useState<FeeScheduleDto[]>([]);
  const [fsCategoryLookup, setFsCategoryLookup] = useState<Record<number, string>>({});

  const api = applicabilityRulesApi();
  const fsApi = feeSchedulesApi();
  const toast = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission("Applicability Rules");

  useEffect(() => {
    fsApi.getList({ pageSize: 500, status: 0 }).then((res) => setFeeScheduleOptions(res.items)).catch(() => {});
    fsApi.getLookups().then((lk) => {
      const map: Record<number, string> = {};
      lk.categories.forEach((c) => { map[c.value] = c.name; });
      setFsCategoryLookup(map);
    }).catch(() => {});
  }, []);

  const loadList = useCallback(() => {
    setError(null);
    api
      .getList({
        pageNumber: page,
        pageSize,
        isActive: statusFilter === "all" ? undefined : statusFilter === "true",
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: ApplicabilityRuleDto) => {
    setEditId(row.id);
    setForm({
      sortOrder: row.sortOrder,
      ruleSetName: row.ruleSetName,
      displayName: row.displayName,
      payerEntityType: row.payerEntityType,
      planCategory: row.planCategory,
      claimCategory: row.claimCategory,
      providerParticipation: row.providerParticipation,
      payerCategory: row.payerCategory,
      feeScheduleApplied: row.feeScheduleApplied,
      merCalculationScope: row.merCalculationScope,
      isActive: row.isActive,
      state: row.state ?? null,
      placeOfService: row.placeOfService ?? null,
      primaryFeeScheduleId: row.primaryFeeScheduleId ?? null,
      modifier: row.modifier ?? null,
      effectiveStartDate: row.effectiveStartDate ?? null,
      effectiveEndDate: row.effectiveEndDate ?? null,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (
      !form.ruleSetName.trim() ||
      !form.displayName.trim() ||
      !form.payerEntityType.trim() ||
      !form.planCategory.trim() ||
      !form.claimCategory.trim()
    ) {
      setFormError(
        "Rule set name, display name, payer entity type, plan category, and claim category are required."
      );
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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(deleteId);
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

  const payerCategoryLabel = (n: number) =>
    PAYER_CATEGORY.find((c) => c.value === n)?.name ?? String(n);

  const filteredItems = data?.items.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return row.ruleSetName.toLowerCase().includes(q) ||
      row.displayName.toLowerCase().includes(q) ||
      row.payerEntityType.toLowerCase().includes(q) ||
      row.planCategory.toLowerCase().includes(q) ||
      payerCategoryLabel(row.payerCategory).toLowerCase().includes(q);
  }) ?? [];

  if (!canView) {
    return (
      <div>
        <PageHeader title="Applicability Rules" description="Fee schedule applicability rules." />
        <Card>
          <AccessRestrictedContent sectionName="Applicability Rules" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Applicability Rules"
        description="Fee schedule applicability rules."
      />
      {/* Toolbar: search + add button */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10 border-[#E2E8F0] rounded-[5px] font-aileron text-[14px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
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
              apiBase="/api/ApplicabilityRules"
              templateFileName="ApplicabilityRules_Import_Template.xlsx"
              onImportSuccess={loadList}
              onLoadingChange={setOverlayLoading}
            />
          )}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <>Add Applicability Rule <ArrowRight className="ml-1 h-4 w-4" /></>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  {canDelete && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground" style={{ width: 50 }}>
                      <Checkbox
                        checked={!!data?.items.length && data.items.every((r) => selectedIds.has(r.id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Sort
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Rule set / Display
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Payer category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Active
                  </th>
                  {(canUpdate || canDelete) && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((row) => (
                  <tr key={row.id} className="hover:bg-muted">
                    {canDelete && (
                      <td className="px-4 py-3 text-sm">
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">
                      {row.sortOrder}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.ruleSetName} / {row.displayName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payerCategoryLabel(row.payerCategory)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.isActive ? "Yes" : "No"}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3 text-sm">
                        <TableActionsCell
                          canEdit={canUpdate}
                          canDelete={canDelete}
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteId(row.id)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      {!data && !error && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit applicability rule" : "Add applicability rule"}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Sort order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value) || 0,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2" />
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Rule set name *
              </label>
              <input
                type="text"
                value={form.ruleSetName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ruleSetName: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Display name *
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Payer entity type *
              </label>
              <input
                type="text"
                value={form.payerEntityType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payerEntityType: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Plan category *
              </label>
              <input
                type="text"
                value={form.planCategory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, planCategory: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Claim category *
              </label>
              <input
                type="text"
                value={form.claimCategory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, claimCategory: e.target.value }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Provider participation
              </label>
              <select
                value={form.providerParticipation}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    providerParticipation: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                {PROVIDER_PARTICIPATION.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Payer category
              </label>
              <select
                value={form.payerCategory}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    payerCategory: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                {PAYER_CATEGORY.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Fee schedule applied
              </label>
              <select
                value={form.feeScheduleApplied}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    feeScheduleApplied: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                {FEE_SCHEDULE_APPLIED.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                MER calculation scope
              </label>
              <select
                value={form.merCalculationScope}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    merCalculationScope: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                {MER_CALCULATION_SCOPE.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                State
              </label>
              <input
                type="text"
                value={form.state ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    state: e.target.value.trim() || null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Place of service
              </label>
              <input
                type="text"
                value={form.placeOfService ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    placeOfService: e.target.value.trim() || null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Modifier
              </label>
              <input
                type="text"
                value={form.modifier ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    modifier: e.target.value.trim() || null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Primary fee schedule (optional override)
              </label>
              <select
                value={form.primaryFeeScheduleId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primaryFeeScheduleId: e.target.value || null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              >
                <option value="">Automatic selection</option>
                {feeScheduleOptions.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.scheduleCode ?? "—"} — {fsCategoryLookup[fs.category] ?? fs.category} {fs.state ? `(${fs.state})` : ""} {fs.year}/Q{fs.quarter}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective start date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveStartDate)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    effectiveStartDate: e.target.value || null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Effective end date
              </label>
              <input
                type="date"
                value={toDateInput(form.effectiveEndDate)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    effectiveEndDate: e.target.value || null,
                  }))
                }
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
          </div>
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={editId ? "Update" : "Create"}
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete applicability rule"
        message="Are you sure you want to delete this rule? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete selected applicability rules"
        message={`Are you sure you want to delete ${selectedIds.size} applicability rule(s)? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={deleteLoading}
      />
      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
