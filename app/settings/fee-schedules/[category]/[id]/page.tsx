"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import {
  Search,
  ArrowLeft,
  Upload,
  Download,
  Pencil,
  Plus,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableActionsCell } from "@/components/ui/TableActionsCell";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/lib/contexts/ToastContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { feeSchedulesApi } from "@/lib/services/feeSchedules";
import type {
  FeeScheduleDetailDto,
  FeeScheduleLineDto,
  CreateFeeScheduleLineRequest,
} from "@/lib/services/feeSchedules";
import type { PaginatedList } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Category config                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_CONFIG: Record<
  string,
  { value: number; label: string; templateType: string }
> = {
  medicare: { value: 0, label: "Medicare", templateType: "Medicare" },
  ucr: { value: 1, label: "UCR", templateType: "UCR" },
  mva: { value: 2, label: "MVA", templateType: "MVA" },
  wc: { value: 3, label: "WC", templateType: "WC" },
};

/* ------------------------------------------------------------------ */
/*  Label helpers                                                      */
/* ------------------------------------------------------------------ */

const geoTypeLabel = (v: number | string) => {
  const map: Record<string, string> = {
    "0": "Statewide",
    "1": "Area - Region",
    "2": "Zip",
    State: "Statewide",
    Area: "Area - Region",
    Zip: "Zip",
  };
  return map[String(v)] ?? String(v);
};

const billingTypeLabel = (v: number | string) => {
  const map: Record<string, string> = {
    "0": "Professional",
    "1": "Facility",
    Professional: "Professional",
    Facility: "Facility",
  };
  return map[String(v)] ?? String(v);
};

const statusLabel = (v: number | string) => {
  const map: Record<string, string> = {
    "0": "Active",
    "1": "Inactive",
    Active: "Active",
    Inactive: "Inactive",
  };
  return map[String(v)] ?? String(v);
};

const categoryLabel = (v: number | string) => {
  const map: Record<string, string> = {
    "0": "Medicare",
    "1": "UCR",
    "2": "MVA",
    "3": "WC",
    Medicare: "Medicare",
    UCR: "UCR",
    MVA: "MVA",
    WC: "WC",
  };
  return map[String(v)] ?? String(v);
};

/* ------------------------------------------------------------------ */
/*  Empty default for line form                                        */
/* ------------------------------------------------------------------ */

const emptyLineForm: CreateFeeScheduleLineRequest = {
  cptHcpcs: "",
  feeAmount: 0,
  zip: "",
  modifier: "",
  rv: null,
  pctcIndicator: null,
  fee50th: null,
  fee60th: null,
  fee70th: null,
  fee75th: null,
  fee80th: null,
  fee85th: null,
  fee90th: null,
  fee95th: null,
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function FeeScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const categorySlug =
    typeof params.category === "string" ? params.category.toLowerCase() : "";
  const scheduleId = typeof params.id === "string" ? params.id : "";
  const categoryConfig = CATEGORY_CONFIG[categorySlug];
  const isUCR = categorySlug === "ucr";
  const isWC = categorySlug === "wc";

  if (!categoryConfig) {
    notFound();
  }

  const api = feeSchedulesApi();
  const toast = useToast();
  const {
    canView,
    canCreate,
    canUpdate,
    canDelete,
    loading: permLoading,
  } = useModulePermission("Fee Schedules");

  /* ---------------------------------------------------------------- */
  /*  State                                                            */
  /* ---------------------------------------------------------------- */

  const [detail, setDetail] = useState<FeeScheduleDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Active tab: "lines" | "zip" | "fallback"
  const [activeTab, setActiveTab] = useState<"lines" | "zip" | "fallback">(
    "lines",
  );

  // CPT Fee Lines state
  const [linesData, setLinesData] =
    useState<PaginatedList<FeeScheduleLineDto> | null>(null);
  const [linesPage, setLinesPage] = useState(1);
  const [linesPageSize, setLinesPageSize] = useState(10);
  const [linesSearch, setLinesSearch] = useState("");
  const debouncedLinesSearch = useDebounce(linesSearch, 300);
  const [linesLoading, setLinesLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Line CRUD state
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineEditId, setLineEditId] = useState<string | null>(null);
  const [lineForm, setLineForm] =
    useState<CreateFeeScheduleLineRequest>(emptyLineForm);
  const [lineSubmitLoading, setLineSubmitLoading] = useState(false);
  const [lineDeleteId, setLineDeleteId] = useState<string | null>(null);
  const [lineDeleteLoading, setLineDeleteLoading] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadDetail = useCallback(() => {
    if (!scheduleId) return;
    setDetailLoading(true);
    setDetailError(null);
    api
      .getById(scheduleId)
      .then(setDetail)
      .catch((err) =>
        setDetailError(
          err instanceof Error ? err.message : "Failed to load fee schedule.",
        ),
      )
      .finally(() => setDetailLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  const loadLines = useCallback(
    (pg: number, ps: number, search?: string) => {
      if (!scheduleId) return;
      setLinesLoading(true);
      api
        .getLines(scheduleId, {
          pageNumber: pg,
          pageSize: ps,
          search: search || undefined,
        })
        .then(setLinesData)
        .catch(() => toast.error("Load Failed", "Failed to load CPT fee lines."))
        .finally(() => setLinesLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleId],
  );

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (activeTab === "lines") {
      loadLines(linesPage, linesPageSize, debouncedLinesSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, linesPage, linesPageSize, debouncedLinesSearch]);

  /* ---------------------------------------------------------------- */
  /*  Line CRUD handlers                                               */
  /* ---------------------------------------------------------------- */

  const openAddLine = () => {
    setLineEditId(null);
    setLineForm({ ...emptyLineForm });
    setLineModalOpen(true);
  };

  const openEditLine = (line: FeeScheduleLineDto) => {
    setLineEditId(line.id);
    setLineForm({
      cptHcpcs: line.cptHcpcs,
      feeAmount: line.feeAmount,
      zip: line.zip ?? "",
      modifier: line.modifier ?? "",
      rv: line.rv,
      pctcIndicator: line.pctcIndicator,
      fee50th: line.fee50th,
      fee60th: line.fee60th,
      fee70th: line.fee70th,
      fee75th: line.fee75th,
      fee80th: line.fee80th,
      fee85th: line.fee85th,
      fee90th: line.fee90th,
      fee95th: line.fee95th,
    });
    setLineModalOpen(true);
  };

  const handleLineSave = async () => {
    if (!lineForm.cptHcpcs.trim()) {
      toast.error("Validation Error", "CPT/HCPCS is required.");
      return;
    }
    setLineSubmitLoading(true);
    try {
      const payload = {
        ...lineForm,
        zip: lineForm.zip || null,
        modifier: lineForm.modifier || null,
      };
      if (lineEditId) {
        await api.updateLine(lineEditId, payload);
        toast.success(
          "Fee Schedule Line Updated",
          (
            <>
              The fee schedule line, <strong>{lineForm.cptHcpcs}</strong>, has
              been updated successfully.
            </>
          ),
        );
      } else {
        await api.createLine(scheduleId, payload);
        toast.success(
          "Fee Schedule Line Added",
          (
            <>
              A new fee schedule line, <strong>{lineForm.cptHcpcs}</strong>, has
              been added successfully.
            </>
          ),
        );
      }
      setLineModalOpen(false);
      loadLines(linesPage, linesPageSize, debouncedLinesSearch);
    } catch (err) {
      toast.error(
        "Save Failed",
        err instanceof Error ? err.message : "Save failed.",
      );
    } finally {
      setLineSubmitLoading(false);
    }
  };

  const handleLineDelete = async () => {
    if (!lineDeleteId) return;
    setLineDeleteLoading(true);
    try {
      await api.deleteLine(lineDeleteId);
      toast.success(
        "Fee Schedule Line Deleted",
        <>The fee schedule line has been deleted successfully.</>,
      );
      setLineDeleteId(null);
      loadLines(linesPage, linesPageSize, debouncedLinesSearch);
    } catch (err) {
      toast.error(
        "Delete Failed",
        err instanceof Error ? err.message : "Delete failed.",
      );
    } finally {
      setLineDeleteLoading(false);
    }
  };

  const handleImportLines = async (file: File) => {
    setImportLoading(true);
    try {
      const result = await api.importLines(scheduleId, file);
      if (result.success) {
        toast.success(
          "Lines Imported",
          (
            <>
              {result.rowsImported} line(s) have been imported successfully.
            </>
          ),
        );
        setLinesSearch("");
        setLinesPage(1);
        loadLines(1, linesPageSize);
      } else {
        toast.error(
          "Import Failed",
          result.errors?.join("; ") || "Import failed.",
        );
      }
    } catch (err) {
      toast.error(
        "Import Failed",
        err instanceof Error ? err.message : "Import failed.",
      );
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = async () => {
    try {
      await api.downloadLinesTemplate(categoryConfig.templateType);
    } catch (err) {
      toast.error(
        "Download Failed",
        err instanceof Error ? err.message : "Download failed.",
      );
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Derived values                                                   */
  /* ---------------------------------------------------------------- */

  const scheduleCode = detail?.scheduleCode ?? "---";
  const isActive = detail ? statusLabel(detail.status) === "Active" : false;
  const stateName = detail?.state ?? "---";
  const yearsDisplay =
    detail?.years && detail.years.length > 0
      ? detail.years.sort((a, b) => a - b).join(" - ")
      : "---";
  const quartersDisplay =
    detail?.quarters && detail.quarters.length > 0
      ? detail.quarters
          .sort((a, b) => a - b)
          .map((q) => `Q${q}`)
          .join(", ")
      : "All";

  /* ---------------------------------------------------------------- */
  /*  Permission / loading guards                                      */
  /* ---------------------------------------------------------------- */

  if (permLoading || detailLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="px-6">
        <h1 className="mb-5 font-aileron font-bold text-[24px] text-[#202830]">
          Fee Schedule Detail
        </h1>
        <Card>
          <AccessRestrictedContent sectionName="Fee Schedules" />
        </Card>
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <nav className="-mx-6 mb-4 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Link
            href="/settings"
            className="transition-colors hover:text-foreground"
          >
            Settings &amp; Configurations
          </Link>
          <span aria-hidden>/</span>
          <Link
            href="/settings/fee-schedules"
            className="transition-colors hover:text-foreground"
          >
            Fee Schedules
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Not Found</span>
        </nav>
        <Card className="p-8 text-center">
          <p className="font-aileron text-[16px] text-[#64748B]">
            {detailError ?? "Fee schedule not found."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              router.push(`/settings/fee-schedules/${categorySlug}`)
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {categoryConfig.label} Fee Schedules
          </Button>
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Tab content renderers                                            */
  /* ---------------------------------------------------------------- */

  const renderCptFeeLinesTab = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search CPT/HCPCS..."
            value={linesSearch}
            onChange={(e) => {
              setLinesSearch(e.target.value);
              setLinesPage(1);
            }}
            className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="h-10 rounded-[5px] px-[18px] border-[#E2E8F0] font-aileron text-[14px] text-[#2A2C33]"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>

          {canCreate && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportLines(file);
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="h-10 rounded-[5px] px-[18px] bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importLoading ? "Importing..." : "Upload CPT Fees"}
              </Button>
            </>
          )}

          {canCreate && (
            <Button
              onClick={openAddLine}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {linesLoading ? (
        <Loader variant="inline" label="Loading CPT fee lines..." />
      ) : !linesData || linesData.items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-aileron text-[14px] text-[#64748B]">
            No CPT fee lines found. Upload a template or add lines manually.
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table className={isUCR ? "min-w-[1200px]" : ""}>
              <TableHead>
                <TableRow>
                  {isUCR && <TableHeaderCell>Zip</TableHeaderCell>}
                  <TableHeaderCell>CPT</TableHeaderCell>
                  {!isUCR && <TableHeaderCell>Fee Amount</TableHeaderCell>}
                  <TableHeaderCell>Modifier</TableHeaderCell>
                  <TableHeaderCell>RV</TableHeaderCell>
                  {isWC && <TableHeaderCell>PC/TC</TableHeaderCell>}
                  {isUCR && (
                    <>
                      <TableHeaderCell>50th FA</TableHeaderCell>
                      <TableHeaderCell>60th FA</TableHeaderCell>
                      <TableHeaderCell>70th FA</TableHeaderCell>
                      <TableHeaderCell>75th FA</TableHeaderCell>
                      <TableHeaderCell>80th FA</TableHeaderCell>
                      <TableHeaderCell>85th FA</TableHeaderCell>
                      <TableHeaderCell>90th FA</TableHeaderCell>
                      <TableHeaderCell>95th FA</TableHeaderCell>
                    </>
                  )}
                  <TableHeaderCell className="w-[100px] text-right">
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {linesData.items.map((line) => (
                  <TableRow key={line.id}>
                    {isUCR && <TableCell>{line.zip ?? "—"}</TableCell>}
                    <TableCell className="font-medium">
                      {line.cptHcpcs}
                    </TableCell>
                    {!isUCR && (
                      <TableCell>
                        ${line.feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    )}
                    <TableCell>{line.modifier ?? "—"}</TableCell>
                    <TableCell>
                      {line.rv != null ? line.rv.toFixed(4) : "—"}
                    </TableCell>
                    {isWC && (
                      <TableCell>
                        {line.pctcIndicator != null
                          ? ({ 0: "P", 1: "T", 2: "G" } as Record<number, string>)[Number(line.pctcIndicator)] ?? "—"
                          : "—"}
                      </TableCell>
                    )}
                    {isUCR && (
                      <>
                        <TableCell>{line.fee50th?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>{line.fee60th?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>{line.fee70th?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>{line.fee75th?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>{line.fee80th?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>{line.fee85th?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>{line.fee90th?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>{line.fee95th?.toFixed(2) ?? "—"}</TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      <TableActionsCell
                        onEdit={
                          canUpdate ? () => openEditLine(line) : undefined
                        }
                        onDelete={
                          canDelete ? () => setLineDeleteId(line.id) : undefined
                        }
                        canEdit={canUpdate}
                        canDelete={canDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Pagination
            pageNumber={linesData.pageNumber}
            totalPages={linesData.totalPages}
            totalCount={linesData.totalCount}
            hasPreviousPage={linesData.hasPreviousPage}
            hasNextPage={linesData.hasNextPage}
            onPrevious={() => setLinesPage((p) => Math.max(1, p - 1))}
            onNext={() => setLinesPage((p) => p + 1)}
            onPageChange={(p) => setLinesPage(p)}
            pageSize={linesPageSize}
            onPageSizeChange={(s) => {
              setLinesPageSize(s);
              setLinesPage(1);
            }}
          />
        </>
      )}
    </div>
  );

  const renderZipGeoTab = () => (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F7FF]">
          <Info className="h-6 w-6 text-[#0066CC]" />
        </div>
        <h3 className="font-aileron text-[16px] font-semibold text-[#202830]">
          ZIP Geography Mapping
        </h3>
        <p className="max-w-md font-aileron text-[14px] text-[#64748B]">
          ZIP Geography Mapping data is managed in Settings &gt; Geography
          Resolution. Visit the Geography Resolution settings to view and manage
          ZIP-to-geography mappings for your fee schedules.
        </p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => router.push("/settings/geography-resolution")}
        >
          Go to Geography Resolution
        </Button>
      </div>
    </Card>
  );

  const renderFallbackTab = () => {
    const fallbackCat = detail.fallbackCategory;
    const hasFallback = fallbackCat != null;

    return (
      <div className="space-y-6">
        <h3 className="font-aileron text-[16px] font-semibold text-[#202830]">
          CPT-Level Fallback Rules
        </h3>

        {/* Default rule */}
        <div className="rounded-lg border-l-4 border-l-[#0066CC] bg-[#F7F8F9] p-4">
          <p className="font-aileron text-[14px] font-semibold text-[#202830]">
            Default Rule
          </p>
          <p className="mt-1 font-aileron text-[13px] text-[#64748B]">
            If a CPT code is not found in this fee schedule, the system will flag the claim line for manual review.
          </p>
        </div>

        {/* Missing CPT Fallback Category */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-aileron text-[14px] font-medium text-[#202830]">
                Missing CPT Fallback Category
              </p>
              <p className="font-aileron text-[13px] text-[#64748B]">
                If configured, the system will attempt to price using the selected fallback category before flagging.
              </p>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasFallback ? "bg-[#0066CC]" : "bg-[#CBD5E1]"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasFallback ? "translate-x-6" : "translate-x-1"}`} />
            </div>
          </div>
          {hasFallback && (
            <select disabled className="w-full max-w-xs rounded-[5px] border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
              <option>{categoryLabel(fallbackCat)}</option>
            </select>
          )}
          {!hasFallback && (
            <select disabled className="w-full max-w-xs rounded-[5px] border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <option>Select</option>
            </select>
          )}
        </div>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      {/* Breadcrumb */}
      <div className="mb-5">
        <nav className="-mx-6 mb-4 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Link
            href="/settings"
            className="transition-colors hover:text-foreground"
          >
            Settings &amp; Configurations
          </Link>
          <span aria-hidden>/</span>
          <Link
            href="/settings/fee-schedules"
            className="transition-colors hover:text-foreground"
          >
            Fee Schedules
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/settings/fee-schedules/${categorySlug}`}
            className="transition-colors hover:text-foreground"
          >
            {categoryConfig.label} Fee Schedules
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{scheduleCode}</span>
        </nav>
      </div>

      {/* Header Card */}
      <Card className="mb-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-aileron text-[24px] font-bold leading-none tracking-tight text-[#202830]">
                {scheduleCode}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                  isActive
                    ? "bg-[#DCFCE7] text-[#16A34A]"
                    : "bg-[#FEE2E2] text-[#EF4444]"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1.5 font-aileron text-[14px] text-[#64748B]">
              {categoryLabel(detail.category)} &bull; {stateName} &bull;{" "}
              {yearsDisplay}
            </p>
          </div>
          {canUpdate && (
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/settings/fee-schedules/${categorySlug}?edit=${scheduleId}`)
              }
              className="h-10 rounded-[5px] px-[18px] border-[#E2E8F0] font-aileron text-[14px] text-[#2A2C33]"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </Card>

      {/* General Information */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-aileron text-[16px] font-semibold text-[#202830]">
          General Information
        </h2>
        <div className="grid grid-cols-3 gap-x-8 gap-y-5">
          {/* Row 1 */}
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Fee Schedule ID
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {scheduleCode}
            </p>
          </div>
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Category
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {categoryLabel(detail.category)}
            </p>
          </div>
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              State
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {stateName}
            </p>
          </div>

          {/* Row 2 */}
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Geography Type
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {geoTypeLabel(detail.geoType)}
            </p>
          </div>
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Geography Code
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {detail.geoCode ?? "---"}
            </p>
          </div>
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Geography Name
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {detail.geoName ?? "---"}
            </p>
          </div>

          {/* Row 3 */}
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Billing Type
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {billingTypeLabel(detail.billingType)}
            </p>
          </div>
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Effective Year
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {yearsDisplay}
            </p>
          </div>
          <div>
            <p className="mb-1 font-aileron text-[12px] font-medium uppercase tracking-wide text-[#64748B]">
              Quarter
            </p>
            <p className="font-aileron text-[14px] text-[#202830]">
              {quartersDisplay}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F7F8F9] p-1 w-fit">
        {(isUCR
          ? [
              { key: "lines" as const, label: "CPT Fee Lines" },
              { key: "fallback" as const, label: "Fallback Configuration" },
            ]
          : [
              { key: "lines" as const, label: "CPT Fee Lines" },
              { key: "zip" as const, label: "ZIP Geography Mapping" },
              { key: "fallback" as const, label: "Fallback Configuration" },
            ]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 font-aileron text-[14px] font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-[#202830] shadow-sm"
                : "text-[#64748B] hover:text-[#202830]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 pb-6">
        {activeTab === "lines" && renderCptFeeLinesTab()}
        {activeTab === "zip" && renderZipGeoTab()}
        {activeTab === "fallback" && renderFallbackTab()}
      </div>

      {/* -------------------------------------------------------------- */}
      {/*  Add / Edit Line Modal                                          */}
      {/* -------------------------------------------------------------- */}
      <Modal
        open={lineModalOpen}
        onClose={() => setLineModalOpen(false)}
        title={lineEditId ? "Edit Fee Schedule Line" : "Add Fee Schedule Line"}
        footer={
          <ModalFooter
            onCancel={() => setLineModalOpen(false)}
            onSubmit={handleLineSave}
            submitLabel={lineEditId ? "Update" : "Add Line"}
            loading={lineSubmitLoading}
          />
        }
      >
        <div className="space-y-4">
          {/* CPT/HCPCS */}
          <div>
            <label className="mb-1.5 block font-aileron text-[13px] font-medium text-[#202830]">
              CPT/HCPCS <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={lineForm.cptHcpcs}
              onChange={(e) =>
                setLineForm((prev) => ({ ...prev, cptHcpcs: e.target.value }))
              }
              placeholder="e.g. 99213"
              className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
            />
          </div>

          {/* Fee Amount */}
          <div>
            <label className="mb-1.5 block font-aileron text-[13px] font-medium text-[#202830]">
              Fee Amount <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={lineForm.feeAmount}
              onChange={(e) =>
                setLineForm((prev) => ({
                  ...prev,
                  feeAmount: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0.00"
              className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
            />
          </div>

          {/* Modifier */}
          <div>
            <label className="mb-1.5 block font-aileron text-[13px] font-medium text-[#202830]">
              Modifier
            </label>
            <input
              type="text"
              value={lineForm.modifier ?? ""}
              onChange={(e) =>
                setLineForm((prev) => ({ ...prev, modifier: e.target.value }))
              }
              placeholder="e.g. 26, TC"
              className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
            />
          </div>

          {/* RVU */}
          <div>
            <label className="mb-1.5 block font-aileron text-[13px] font-medium text-[#202830]">
              RVU
            </label>
            <input
              type="number"
              step="0.0001"
              value={lineForm.rv ?? ""}
              onChange={(e) =>
                setLineForm((prev) => ({
                  ...prev,
                  rv: e.target.value ? parseFloat(e.target.value) : null,
                }))
              }
              placeholder="0.0000"
              className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
            />
          </div>

          {/* ZIP (optional) */}
          <div>
            <label className="mb-1.5 block font-aileron text-[13px] font-medium text-[#202830]">
              ZIP
            </label>
            <input
              type="text"
              value={lineForm.zip ?? ""}
              onChange={(e) =>
                setLineForm((prev) => ({ ...prev, zip: e.target.value }))
              }
              placeholder="e.g. 10001"
              className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
            />
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------- */}
      {/*  Delete Line Confirmation                                       */}
      {/* -------------------------------------------------------------- */}
      <ConfirmDialog
        open={!!lineDeleteId}
        onClose={() => setLineDeleteId(null)}
        onConfirm={handleLineDelete}
        title="Delete Fee Schedule Line"
        message="Are you sure you want to delete this fee schedule line? This action cannot be undone."
        confirmLabel="Delete"
        loading={lineDeleteLoading}
      />
    </div>
  );
}
