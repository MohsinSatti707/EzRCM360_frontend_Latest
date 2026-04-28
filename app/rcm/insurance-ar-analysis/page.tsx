"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
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
import { insuranceArAnalysisApi, type ArAnalysisSessionListItemDto } from "@/lib/services/insuranceArAnalysis";
import { usePaginatedList } from "@/lib/hooks";
import { CellTooltip } from "@/components/ui/CellTooltip";
import { formatDateTime, formatSessionName } from "@/lib/utils";
import { DateRangePicker, type DateRange } from "./DateRangePicker";

const SEARCH_FIELDS = [
  { value: "all", label: "All" },
  { value: "sessionName", label: "Session Name" },
  { value: "uploadedBy", label: "Uploaded By" },
  { value: "sourceType", label: "Source Type" },
];

const MODULE_NAME = "Insurance AR Analysis";

export default function InsuranceArAnalysisListPage() {
  const router = useRouter();
  const toast = useToast();
  const api = insuranceArAnalysisApi();
  const { canView, canCreate, loading: permLoading } = useModulePermission(MODULE_NAME);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchField, setSearchField] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [downloading, setDownloading] = useState(false);

  const { data, error, loading } = usePaginatedList({
    pageNumber: page,
    pageSize,
    fetch: (p) => api.list({ pageNumber: p.pageNumber, pageSize }),
  });

  useEffect(() => { setPage(1); }, [pageSize]);

  const displayedItems = (() => {
    let items = data?.items ?? [];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      items = items.filter((r) => {
        if (searchField === "sessionName") return formatSessionName(r.sessionName, r.uploadedAt)?.toLowerCase().includes(term);
        if (searchField === "uploadedBy") return r.uploadedBy?.toLowerCase().includes(term);
        if (searchField === "sourceType") return r.sourceType?.toLowerCase().includes(term);
        return (
          r.sessionName?.toLowerCase().includes(term) ||
          r.practiceName?.toLowerCase().includes(term) ||
          r.uploadedBy?.toLowerCase().includes(term) ||
          r.sourceType?.toLowerCase().includes(term)
        );
      });
    }
    if (dateRange.start && dateRange.end) {
      const lo = new Date(dateRange.start); lo.setHours(0, 0, 0, 0);
      const hi = new Date(dateRange.end); hi.setHours(23, 59, 59, 999);
      items = items.filter((r) => {
        if (!r.uploadedAt) return false;
        const d = new Date(r.uploadedAt);
        return d >= lo && d <= hi;
      });
    }
    return items;
  })();

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
      toast.success("Template Downloaded", "The template has been downloaded successfully.");
    } catch (err) {
      toast.error("Download Failed", err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [api, toast]);

  const handleUploadData = () => router.push("/rcm/insurance-ar-analysis/upload");

  if (permLoading) {
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
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <AccessRestrictedContent sectionName="Insurance AR Analysis" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      {/* Title row */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-aileron font-bold text-[24px] leading-none tracking-tight text-[#202830]">
          Insurance AR Analysis
        </h1>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadTemplate}
              disabled={downloading}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px] whitespace-nowrap"
            >
              {downloading ? "Downloading…" : "Download AR Intake Template"}
              <ArrowRight className="ml-1 h-4 w-4 shrink-0" aria-hidden />
            </Button>
            <Button
              onClick={handleUploadData}
              className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px] whitespace-nowrap"
            >
              Upload Data
              <ArrowRight className="ml-1 h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex flex-1 items-center">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="h-10 w-[140px] rounded-l-[5px] rounded-r-none border border-r-0 border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus-visible:outline-none"
          >
            {SEARCH_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-none border border-r-0 border-[#E2E8F0] bg-background pl-9 pr-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            />
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={(r) => { setDateRange(r); setPage(1); }}
            joinedRight
          />
        </div>

        <button
          type="button"
          onClick={() => { setSearchField("all"); setSearch(""); setDateRange({ start: null, end: null }); setPage(1); }}
          className="h-10 rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] text-[#202830] hover:text-[#0066CC] hover:border-[#0066CC] transition-colors focus:outline-none focus:text-[#0066CC] focus:border-[#0066CC]"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[calc(100vh-280px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[5px]">
            <Table className="min-w-[900px]">
              <TableHead className="sticky top-0 z-20">
                <TableRow>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Session Name
                      <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Uploaded By
                      <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Uploaded At
                      <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <div className="flex items-center gap-2">
                      Source Type
                      <ArrowUpDown className="h-3.5 w-3.5 text-[#0066CC]/70" />
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-0 border-0">
                      <div className="flex flex-col items-center justify-center py-12">
                        <Image
                          src="/icons/svg/no-data-found.svg"
                          alt="No Data Found"
                          width={180}
                          height={180}
                        />
                        <h3 className="mt-4 text-2xl font-bold font-['Aileron'] text-gray-800">No Data Found</h3>
                        <p className="mt-1 text-[15px] font-['Aileron'] text-[#151529]">No data available yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedItems.map((row: ArAnalysisSessionListItemDto, idx: number) => (
                    <TableRow
                      key={row.id}
                      className="animate-fade-in-up opacity-0"
                      style={{ animationDelay: `${Math.min(idx, 7) * 40}ms`, animationFillMode: "forwards" }}
                    >
                      <TableCell>
                        <CellTooltip text={formatSessionName(row.sessionName, row.uploadedAt)} />
                      </TableCell>
                      <TableCell>
                        <CellTooltip text={row.uploadedBy} />
                      </TableCell>
                      <TableCell>
                        <CellTooltip text={formatDateTime(row.uploadedAt)} />
                      </TableCell>
                      <TableCell>
                        <CellTooltip text={row.sourceType} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {row.sessionStatus === "Completed" ? (
                            <Link
                              href={`/rcm/insurance-ar-analysis/${row.id}/report`}
                              prefetch={false}
                              className="text-[14px] font-['Aileron'] text-[#0066CC] hover:text-[#0066CC]/80 transition-colors"
                            >
                              View Report
                            </Link>
                          ) : ["PmUploaded", "ValidationCompleted"].includes(row.sessionStatus) ? (
                            <Link
                              href={`/rcm/insurance-ar-analysis/upload?sessionId=${row.id}`}
                              prefetch={false}
                              className="text-[14px] font-['Aileron'] text-[#0066CC] hover:text-[#0066CC]/80 transition-colors"
                            >
                              Start Analysis
                            </Link>
                          ) : ["Processing", "ConflictResolution", "EnrichmentPending"].includes(row.sessionStatus) ? (
                            <Link
                              href={`/rcm/insurance-ar-analysis/${row.id}/processing`}
                              prefetch={false}
                              className="text-[14px] font-['Aileron'] text-[#0066CC] hover:text-[#0066CC]/80 transition-colors"
                            >
                              View Progress
                            </Link>
                          ) : row.sessionStatus === "Failed" ? (
                            <Link
                              href={`/rcm/insurance-ar-analysis/${row.id}/processing`}
                              prefetch={false}
                              className="text-[14px] font-['Aileron'] text-red-600 hover:text-red-500 transition-colors"
                            >
                              Retry
                            </Link>
                          ) : row.sessionStatus === "ValidationFailed" ? (
                            <Link
                              href={`/rcm/insurance-ar-analysis/upload?sessionId=${row.id}`}
                              prefetch={false}
                              className="text-[14px] font-['Aileron'] text-[#0066CC] hover:text-[#0066CC]/80 transition-colors"
                            >
                              Re-upload
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
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

      {loading && !data && !error && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Loader variant="inline" label="Loading" />
        </div>
      )}

    </div>
  );
}
