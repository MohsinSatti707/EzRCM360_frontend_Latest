"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { PageShell } from "@/components/layout/PageShell";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/lib/contexts/ToastContext";
import { insuranceArAnalysisApi, type ArAnalysisSessionListItemDto, type ArAnalysisSessionStatus } from "@/lib/services/insuranceArAnalysis";
import { usePaginatedList } from "@/lib/hooks";

const STATUS_OPTIONS: { value: ArAnalysisSessionStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "IntakeUploaded", label: "Intake Uploaded" },
  { value: "ValidationInProgress", label: "Validation In Progress" },
  { value: "ValidationCompleted", label: "Validation Completed" },
  { value: "ValidationFailed", label: "Validation Failed" },
  { value: "PmUploaded", label: "PM Uploaded" },
  { value: "Processing", label: "Processing" },
  { value: "ConflictResolution", label: "Conflict Resolution" },
  { value: "EnrichmentPending", label: "Enrichment Pending" },
  { value: "EnrichmentCompleted", label: "Enrichment Completed" },
  { value: "Completed", label: "Completed" },
  { value: "Failed", label: "Failed" },
];

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleString(undefined, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

const MODULE_NAME = "Insurance AR Analysis";

export default function InsuranceArAnalysisListPage() {
  const router = useRouter();
  const toast = useToast();
  const api = insuranceArAnalysisApi();
  const { canView, canCreate, loading: permLoading } = useModulePermission(MODULE_NAME);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [uploadedBy, setUploadedBy] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ArAnalysisSessionStatus | "">("");
  const [downloading, setDownloading] = useState(false);

  const { data, error, loading, reload } = usePaginatedList({
    pageNumber: page,
    pageSize,
    fetch: (p) => api.list({ pageNumber: p.pageNumber, pageSize, status: statusFilter || undefined }),
  });

  useEffect(() => {
    setPage(1);
    reload();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps -- reload refetches with new status

  const uniqueUploadedBy = data
    ? Array.from(new Set(data.items.map((r) => r.uploadedBy))).filter(Boolean).sort()
    : [];

  const displayedItems = (() => {
    let items = uploadedBy ? data?.items.filter((r) => r.uploadedBy === uploadedBy) ?? [] : data?.items ?? [];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.sessionName?.toLowerCase().includes(term) ||
          r.practiceName?.toLowerCase().includes(term) ||
          r.uploadedBy?.toLowerCase().includes(term) ||
          r.sourceType?.toLowerCase().includes(term)
      );
    }
    return items;
  })();

  useEffect(() => {
    setPage(1);
  }, [pageSize]);


  const handleDownloadTemplate = useCallback(async () => {
    setDownloading(true);
    try {
      const blob = await api.downloadIntakeTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AR_Intake_Template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [api, toast]);

  const handleUploadData = () => {
    router.push("/rcm/insurance-ar-analysis/upload");
  };

  if (permLoading) {
    return (
      <PageShell title="Insurance AR Analysis">
        <div className="space-y-4">
          <div className="h-12 w-full animate-shimmer-bg rounded-lg" />
          <div className="h-72 animate-shimmer-bg rounded-xl" />
        </div>
      </PageShell>
    );
  }
  if (!canView) {
    return <AccessDenied moduleName="Insurance AR Analysis" backHref="/dashboard" />;
  }

  return (
    <PageShell
      breadcrumbs={[{ label: "RCM Intelligence", href: "/rcm" }, { label: "Insurance AR Analysis" }]}
      title="Insurance AR Analysis"
      description="View and manage AR analysis sessions."
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0">
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ArAnalysisSessionStatus | "")}
            className="h-10 w-[160px] rounded-l-[5px] border border-[#E2E8F0] bg-background pl-3 pr-8 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "_all"} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            id="uploaded-by"
            value={uploadedBy}
            onChange={(e) => {
              setUploadedBy(e.target.value);
              setPage(1);
            }}
            className="h-10 w-[150px] border border-[#E2E8F0] bg-background pl-3 pr-8 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:outline-none"
          >
            <option value="">Uploaded By</option>
            {uniqueUploadedBy.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full min-w-0 rounded-r-[5px] border border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
        </div>
        {canCreate && (
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={handleDownloadTemplate} disabled={downloading} className="h-10 rounded-[5px] py-3 px-[18px] gap-[5px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-['Aileron'] text-[14px]">
              {downloading ? "Downloading…" : "Download AR Intake Template"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleUploadData} className="h-10 rounded-[5px] py-3 px-[18px] gap-[5px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-['Aileron'] text-[14px]">
              Upload Data
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px] border-y border-border bg-card shadow-sm">
            <Table className="w-[1700px] table-fixed">
                <TableHead>
                  <TableRow className="bg-[hsl(210,100%,97%)] hover:bg-[hsl(210,100%,97%)]">
                    <TableHeaderCell className="w-[300px] min-w-[300px] first:rounded-bl-[5px] !bg-[hsl(210,100%,97%)] border-border">
                      <div className="flex items-center gap-3 font-['Aileron'] font-bold text-[13px] leading-none text-[#0066CC]">
                        Session Name
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                      </div>
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[300px] min-w-[300px] !bg-[hsl(210,100%,97%)] border-border">
                      <div className="flex items-center gap-3 font-['Aileron'] font-normal text-[14px] leading-none text-[#0066CC]">
                        Practice Name
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                      </div>
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[200px] min-w-[200px] !bg-[hsl(210,100%,97%)] border-border">
                      <div className="flex items-center gap-3 font-['Aileron'] font-bold text-[13px] leading-none text-[#0066CC]">
                        Status
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                      </div>
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[250px] min-w-[250px] !bg-[hsl(210,100%,97%)] border-border">
                      <div className="flex items-center gap-3 font-['Aileron'] font-normal text-[14px] leading-none text-[#0066CC]">
                        Uploaded By
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                      </div>
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[200px] min-w-[200px] !bg-[hsl(210,100%,97%)] border-border">
                      <div className="flex items-center gap-3 font-['Aileron'] font-bold text-[13px] leading-none text-[#0066CC]">
                        Uploaded At
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                      </div>
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[200px] min-w-[200px] !bg-[hsl(210,100%,97%)] border-border">
                      <div className="flex items-center gap-3 font-['Aileron'] font-bold text-[13px] leading-none text-[#0066CC]">
                        Source Type
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                      </div>
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[180px] min-w-[180px] border-r-0 !bg-[hsl(210,100%,97%)] border-border">
                      <span className="font-['Aileron'] font-bold text-[13px] leading-none text-[#0066CC]">
                        Actions
                      </span>
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                        {canCreate
                          ? "No sessions found. Click \"Upload Data\" to create one."
                          : "No sessions found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedItems.map((row: ArAnalysisSessionListItemDto, idx: number) => (
                      <TableRow
                        key={row.id}
                        className="animate-fade-in-up opacity-0"
                        style={{
                          animationDelay: `${Math.min(idx, 7) * 40}ms`,
                          animationFillMode: "forwards",
                        }}
                      >
                        <TableCell className="w-[300px] min-w-[300px] truncate whitespace-nowrap">{row.sessionName}</TableCell>
                        <TableCell className="w-[300px] min-w-[300px] truncate whitespace-nowrap">{row.practiceName ?? "—"}</TableCell>
                        <TableCell className="w-[300px] min-w-[300px] truncate whitespace-nowrap">{row.sessionStatus}</TableCell>
                        <TableCell className="w-[300px] min-w-[300px] truncate whitespace-nowrap">{row.uploadedBy}</TableCell>
                        <TableCell className="w-[300px] min-w-[300px] truncate whitespace-nowrap">{formatDate(row.uploadedAt)}</TableCell>
                        <TableCell className="w-[300px] min-w-[300px] border-r-0 truncate whitespace-nowrap">{row.sourceType}</TableCell>
                        <TableCell className="w-[180px] min-w-[150px] border-r-0 border-l-0">
                          {row.sessionStatus === "Completed" ? (
                            <Link
                              href={`/rcm/insurance-ar-analysis/${row.id}/report`}
                              prefetch={false}
                              className="inline-flex items-center gap-1.5 rounded-md py-1.5 text-[14px] font-['Aileron'] font-normal text-[#0066CC] hover:text-[#0066CC]/80 transition-colors"
                            >
                              View Report
                            </Link>
                          ) : ["Processing", "ConflictResolution", "EnrichmentPending", "PmUploaded", "ValidationCompleted"].includes(
                            row.sessionStatus
                          ) ? (
                            <Link
                              href={`/rcm/insurance-ar-analysis/${row.id}/processing`}
                              prefetch={false}
                              className="inline-flex items-center gap-1.5 rounded-md py-1.5 text-[14px] font-['Aileron'] font-normal text-[#0066CC] hover:text-[#0066CC]/80 transition-colors"
                            >
                              View Progress
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </div>
          <div className="shrink-0 pt-4">
            <Pagination
              pageNumber={page}
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

      {!data && !error && loading && (
        <div className="space-y-4">
          <div className="h-12 w-full animate-shimmer-bg rounded-lg" />
          <div className="h-72 animate-shimmer-bg rounded-xl" />
        </div>
      )}
    </PageShell>
  );
}
