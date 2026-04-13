"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/lib/contexts/ToastContext";
import {
  insuranceArAnalysisApi,
  type ArAnalysisReportDto,
  type StepResolutionSummary,
} from "@/lib/services/insuranceArAnalysis";

/** Dummy successful report for "Skip (dummy)" preview. */
const DUMMY_REPORT: ArAnalysisReportDto = {
  analysisSummary: {
    sessionName: "AR Analysis – Sample Session",
    practiceName: "Sample Medical Group",
    uploadedBy: "Demo User",
    uploadedAt: new Date().toISOString(),
    sourceType: "Insurance",
    pmSourceReportFiles: [],
    totalRows: 20,
  },
  totalClaimsAnalyzed: 18,
  totalUnderpayment: 12500,
  riskAdjustedRecovery: 10000,
  claimCategorisationBreakdown: [
    { category: "Insurance", count: 14, layer: 1 },
    { category: "Attorney", count: 3, layer: 1 },
    { category: "Other", count: 1, layer: 1 },
    { category: "Commercial", count: 8, layer: 2 },
    { category: "Medicare", count: 4, layer: 2 },
    { category: "MVA", count: 2, layer: 2 },
    { category: "Commercial OON", count: 6, layer: 3 },
    { category: "Commercial IN", count: 2, layer: 3 },
  ],
  underpaymentByPriority: [
    { priority: "High", amount: 7500 },
    { priority: "Medium", amount: 3500 },
    { priority: "Low", amount: 1500 },
  ],
  recoveryProjectionSummary: {
    maxPotentialRecovery: 12500,
    riskAdjustedRecovery: 10000,
    historicalCollectionRatePct: 80,
  },
  contingencyFeeByClaimAge: [
    { ageBand: "0–90 days", feePct: 25, amount: 2500 },
    { ageBand: "91–180 days", feePct: 30, amount: 1800 },
    { ageBand: "181–365 days", feePct: 35, amount: 1200 },
  ],
  underbilledClaimCount: 3,
  totalUnderbilledAmount: 2200,
  totalBilledAmount: 45000,
  totalPaidAmount: 32500,
  totalMerFs: 48000,
  totalMerAllowed: 42000,
  totalMerOonAdjusted: 21000,
  totalUnderpaymentFs: 15500,
  totalUnderpaymentAllowed: 9500,
  totalUnderpaymentOon: 0,
  noPayDenialSummary: {
    fullNoPayClaimCount: 2,
    partialNoPayClaimCount: 3,
    denialClaimCount: 1,
    totalNoPayLineCount: 8,
    totalDenialLineCount: 2,
  },
  resolutionSummary: null,
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function InsuranceArAnalysisReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const isDummy = searchParams.get("dummy") === "1";
  const toast = useToast();
  const apiRef = useRef(insuranceArAnalysisApi());
  const [report, setReport] = useState<ArAnalysisReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    if (isDummy) {
      setReport(DUMMY_REPORT);
      setLoading(false);
      return;
    }
    apiRef.current
      .getReport(sessionId)
      .then(setReport)
      .catch(() => toast.error("Load Failed", "Failed to load report."))
      .finally(() => setLoading(false));
  }, [sessionId, isDummy]);

  const handleExport = async () => {
    if (isDummy) {
      toast.success("Export Unavailable", "Export is not available for the dummy report.");
      return;
    }
    setExporting(true);
    try {
      const blob = await apiRef.current.downloadReportExport(sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AR_Analysis_Report.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report Exported", "Report exported.");
    } catch (err) {
      toast.error("Export Failed", err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
      const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${date} - ${time}`;
    } catch {
      return s;
    }
  };
  const formatSessionDetails = (sessionName: string, uploadedAt: string) => {
  // Split session name
  const parts = sessionName?.split(" - ") || [];
  const name = parts.slice(0, -1).join(" - ") || sessionName;

  // Format uploadedAt
  let formattedDate = "";
  if (uploadedAt) {
    const d = new Date(uploadedAt);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    formattedDate = `${day}/${month}/${year}, ${hours}:${minutes}`;
  }

  return { name, date: formattedDate };
};

  if (loading || !report) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-4 py-16">
        <Loader variant="inline" size="lg" label="Loading report…" />
        <p className="text-sm text-muted-foreground">Preparing your analysis results</p>
      </div>
    );
  }

  const { analysisSummary, totalClaimsAnalyzed, totalUnderpayment, riskAdjustedRecovery } = report;
const formattedSession = formatSessionDetails(
  analysisSummary.sessionName,
  analysisSummary.uploadedAt
);
  return (
    <PageShell
      breadcrumbs={[
        { label: "Insurance AR Analysis", href: "/rcm/insurance-ar-analysis" },
        { label: `${analysisSummary.practiceName} – ${formatDate(analysisSummary.uploadedAt)}` },
      ]}
      title={`${formattedSession.name} - ${formattedSession.date}`}
      description={`AR Analysis report for ${analysisSummary.practiceName}`}
      titleWrapperClassName="px-6"
      actions={
        <Button
          onClick={handleExport}
          disabled={exporting || isDummy}
          className="h-10 rounded-[5px] py-3 px-[18px] gap-[5px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-['Aileron'] text-[14px] font-medium"
        >
          {exporting ? "Exporting…" : "Export Full Report"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      }
    >
      {isDummy && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Dummy report (preview).</strong> This is sample data for UI preview. Use &quot;Refresh status&quot; or complete the pipeline to see the real report.
        </div>
      )}
      <div className="space-y-8 px-6 h-[calc(100vh-237px)] overflow-auto mt-3">
        <Card className="border-none overflow-hidden p-0">
          <h2 className="mb-0 text-[17px] font-['Aileron'] font-bold text-foreground">Analysis Summary</h2>
          <div className="space-y-0">
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Session Name</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">
  {formattedSession.name} - {formattedSession.date}
</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Practice Name</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{analysisSummary.practiceName}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Uploaded by</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{analysisSummary.uploadedBy}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Uploaded at</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{formatDate(analysisSummary.uploadedAt)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Source Type</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{analysisSummary.sourceType}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Intake Template File</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{analysisSummary.intakeTemplateFile ?? "—"}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">PM Source Report File</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">
                {analysisSummary.pmSourceReportFiles?.length ? analysisSummary.pmSourceReportFiles.join(", ") : "—"}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Total Rows</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{analysisSummary.totalRows ?? "—"} Rows</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Claims passed</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{totalClaimsAnalyzed.toLocaleString()} Claims</span>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 text-[17px] font-['Aileron'] font-bold text-foreground">Analysis Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-[#F8FAFC] rounded-lg p-5 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-foreground mb-1">
                {totalClaimsAnalyzed.toLocaleString()}
              </div>
              <div className="text-[13px] font-['Aileron'] text-muted-foreground">Total Claims Analyzed</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-5 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-[#DC2626] mb-1">
                {formatCurrency(totalUnderpayment)}
              </div>
              <div className="text-[13px] font-['Aileron'] text-muted-foreground">Total Underpayment</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-5 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-[#16A34A] mb-1">
                {formatCurrency(riskAdjustedRecovery)}
              </div>
              <div className="text-[13px] font-['Aileron'] text-muted-foreground">Risk-Adjusted Recovery</div>
            </div>
          </div>

          {/* Claim-Level Underpayment Aggregation (Section 7.1.3) */}
          <h2 className="mt-6 mb-3 text-[17px] font-['Aileron'] font-bold text-foreground">Underpayment Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-[#F8FAFC] rounded-lg p-5 text-center border border-border">
              <div className="text-[24px] font-bold font-['Aileron'] text-foreground mb-1">
                {formatCurrency(report.totalUnderpaymentFs ?? 0)}
              </div>
              <div className="text-[13px] font-['Aileron'] text-muted-foreground">Underpayment (Fee Schedule)</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-5 text-center border border-border">
              <div className="text-[24px] font-bold font-['Aileron'] text-foreground mb-1">
                {formatCurrency(report.totalUnderpaymentAllowed ?? 0)}
              </div>
              <div className="text-[13px] font-['Aileron'] text-muted-foreground">Underpayment (Allowed)</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-5 text-center border border-border">
              <div className="text-[24px] font-bold font-['Aileron'] text-foreground mb-1">
                {formatCurrency(report.totalUnderpaymentOon ?? 0)}
              </div>
              <div className="text-[13px] font-['Aileron'] text-muted-foreground">Underpayment (OON)</div>
            </div>
          </div>
          {(report.underbilledClaimCount > 0 || report.totalUnderbilledAmount > 0) && (
            <div className="grid gap-5 sm:grid-cols-2 mt-5">
              <div className="bg-[#FFFBEB] rounded-lg p-6 text-center border border-[#F59E0B]/30">
                <div className="text-[32px] font-bold font-['Aileron'] text-[#D97706] mb-1">
                  {report.underbilledClaimCount.toLocaleString()}
                </div>
                <div className="text-[14px] font-['Aileron'] text-muted-foreground">Underbilled Claims</div>
              </div>
              <div className="bg-[#FFFBEB] rounded-lg p-6 text-center border border-[#F59E0B]/30">
                <div className="text-[32px] font-bold font-['Aileron'] text-[#D97706] mb-1">
                  {formatCurrency(report.totalUnderbilledAmount)}
                </div>
                <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total Underbilled Amount</div>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[17px] font-['Aileron'] font-bold text-foreground">Financial Summary</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-foreground mb-1">
                {formatCurrency(report.totalBilledAmount)}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total Billed Amount</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-[#2563EB] mb-1">
                {formatCurrency(report.totalPaidAmount)}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total Paid Amount</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-foreground mb-1">
                {formatCurrency(report.totalMerFs)}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total MER (Fee Schedule)</div>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 mt-5">
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-foreground mb-1">
                {formatCurrency(report.totalMerAllowed)}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total MER Allowed</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[28px] font-bold font-['Aileron'] text-foreground mb-1">
                {formatCurrency(report.totalMerOonAdjusted)}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total MER OON Plan-Benefits Adjusted</div>
            </div>
          </div>
        </section>

        <Card className="p-0 border-none">
          <h2 className="mb-3 text-[17px] font-bold font-['Aileron'] text-foreground">
            Claim Categorisation Breakdown
          </h2>
          {report.claimCategorisationBreakdown?.length ? (
            <div className="space-y-6">
              {[
                { layer: 1, title: "Layer 1 — Payer Entity Type" },
                { layer: 2, title: "Layer 2 — Plan Category (Insurance Only)" },
                { layer: 3, title: "Layer 3 — Commercial Sub-Categorization" },
                { layer: 4, title: "Layer 4 — Claim Service Type" },
              ].map(({ layer, title }) => {
                const items = report.claimCategorisationBreakdown.filter((x) => x.layer === layer);
                if (!items.length) return null;
                return (
                  <div key={layer}>
                    <p className="text-[12px] font-['Aileron'] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {title}
                    </p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      {items.map((item, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded"
                        >
                          <span className="text-[14px] font-['Aileron'] text-muted-foreground">
                            {item.category}
                          </span>
                          <span className="text-[14px] font-['Aileron'] text-foreground font-medium text-right">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground">No categorisation data</span>
              <span className="text-[14px] font-['Aileron'] text-foreground font-medium">—</span>
            </div>
          )}
        </Card>

        <Card className="p-0 border-none">
            <h2 className="mb-3 text-[17px] font-bold font-['Aileron'] text-foreground">
              Underpayment Analysis by Priority
            </h2>
            {report.underpaymentByPriority?.length > 0 ? (
              <div className="space-y-3">
                {report.underpaymentByPriority.map((item, i) => {
                  const isHigh = item.priority.toLowerCase().includes("high");
                  const isMid = item.priority.toLowerCase().includes("mid");
                  const bg = isHigh
                    ? "rgba(220, 38, 38, 0.1)"
                    : isMid
                      ? "rgba(245, 158, 11, 0.1)"
                      : "rgba(59, 130, 246, 0.12)";
                  const color = isHigh ? "#DC2626" : isMid ? "#F59E0B" : "#2563EB";
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded px-5 py-4"
                      style={{ backgroundColor: bg }}
                    >
                      <span className="text-[14px] font-['Aileron'] font-medium" style={{ color }}>
                        {item.priority}
                      </span>
                      <span className="text-[14px] font-['Aileron'] font-medium text-right" style={{ color }}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] font-['Aileron'] text-muted-foreground italic py-4 px-4 bg-[#F9FAFC] rounded">
                No underpayment detected — all claims were paid at or above the expected MER.
              </p>
            )}
          </Card>

        <Card className="p-0 border-none">
          <h2 className="mb-3 text-[17px] font-bold font-['Aileron'] text-foreground">
            No-Pay / Denial Summary
          </h2>
          {report.noPayDenialSummary && (report.noPayDenialSummary.fullNoPayClaimCount > 0 || report.noPayDenialSummary.partialNoPayClaimCount > 0 || report.noPayDenialSummary.denialClaimCount > 0) ? (
            <>
              <div className="grid gap-5 sm:grid-cols-3 mb-4">
                <div className="bg-[#FEF2F2] rounded-lg p-5 text-center border border-[#DC2626]/20">
                  <div className="text-[28px] font-bold font-['Aileron'] text-[#DC2626] mb-1">
                    {report.noPayDenialSummary.fullNoPayClaimCount}
                  </div>
                  <div className="text-[13px] font-['Aileron'] text-muted-foreground">Full No-Pay Claims</div>
                </div>
                <div className="bg-[#FFFBEB] rounded-lg p-5 text-center border border-[#F59E0B]/20">
                  <div className="text-[28px] font-bold font-['Aileron'] text-[#D97706] mb-1">
                    {report.noPayDenialSummary.partialNoPayClaimCount}
                  </div>
                  <div className="text-[13px] font-['Aileron'] text-muted-foreground">Partial No-Pay Claims</div>
                </div>
                <div className="bg-[#FEF2F2] rounded-lg p-5 text-center border border-[#DC2626]/20">
                  <div className="text-[28px] font-bold font-['Aileron'] text-[#DC2626] mb-1">
                    {report.noPayDenialSummary.denialClaimCount}
                  </div>
                  <div className="text-[13px] font-['Aileron'] text-muted-foreground">Claims with Denials</div>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Total No-Pay Service Lines</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground font-medium">{report.noPayDenialSummary.totalNoPayLineCount}</span>
                </div>
                <div className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Total Denial Service Lines</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground font-medium">{report.noPayDenialSummary.totalDenialLineCount}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-[13px] font-['Aileron'] text-muted-foreground italic py-4 px-4 bg-[#F9FAFC] rounded">
              No no-pay or denial conditions were detected in this analysis. All service lines received payment.
            </p>
          )}
        </Card>

        <Card className="p-0 border-none">
          <h2 className="mb-3 text-[17px] font-bold font-['Aileron'] text-foreground">
            Recovery Projection Summary
          </h2>
          {report.recoveryProjectionSummary ? (
            <>
              <div className="grid gap-5 sm:grid-cols-3 mb-5">
                <div className="bg-background rounded-lg p-6 sm:p-7 text-center border border-border">
                  <div className="text-[32px] font-bold font-['Aileron'] text-foreground mb-2">
                    {formatCurrency(totalUnderpayment)}
                  </div>
                  <div className="text-[15px] font-['Aileron'] font-normal leading-snug text-center text-muted-foreground">
                    Total Underpayment
                  </div>
                </div>
                <div className="bg-background rounded-lg p-6 sm:p-7 text-center border border-border">
                  <div className="text-[32px] font-bold font-['Aileron'] text-foreground mb-2">
                    {formatCurrency(report.recoveryProjectionSummary.maxPotentialRecovery)}
                  </div>
                  <div className="text-[15px] font-['Aileron'] font-normal leading-snug text-center text-muted-foreground">
                    Maximum Potential Recovery
                  </div>
                </div>
                <div className="rounded-lg p-6 sm:p-7 text-center border-2 border-[#16A34A] bg-green-50/50">
                  <div className="text-[32px] font-bold font-['Aileron'] text-[#16A34A] mb-2">
                    {formatCurrency(report.recoveryProjectionSummary.riskAdjustedRecovery)}
                  </div>
                  <div className="text-[15px] font-['Aileron'] font-normal leading-snug text-center text-[#16A34A]">
                    Risk-Adjusted Recovery
                    {report.recoveryProjectionSummary.historicalCollectionRatePct != null
                      ? ` (${report.recoveryProjectionSummary.historicalCollectionRatePct}% Historical)`
                      : ""}
                  </div>
                </div>
              </div>
              {report.recoveryProjectionSummary.historicalCollectionRatePct != null && (
                <p className="text-[13px] font-['Aileron'] text-muted-foreground text-center pt-1">
                  Historical Collection Rate: {report.recoveryProjectionSummary.historicalCollectionRatePct}% (based on 3-year rolling average)
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] font-['Aileron'] text-muted-foreground italic py-4 px-4 bg-[#F9FAFC] rounded">
              No recovery projection available. This may occur when no underpayment was identified.
            </p>
          )}
        </Card>

        <Card className="p-0 border-none">
          <h2 className="mb-3 text-[17px] font-bold font-['Aileron'] text-foreground">
            Contingency Fee Application by Claim Age
          </h2>
          <div className="space-y-3">
            {report.contingencyFeeByClaimAge?.length
              ? report.contingencyFeeByClaimAge.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded"
                  >
                    <span className="text-[15px] font-['Aileron'] text-muted-foreground">
                      {item.ageBand} ({item.feePct}% fee)
                    </span>
                    <span className="text-[14px] font-['Aileron'] text-foreground font-medium text-right">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))
              : (
                  <div className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded">
                    <span className="text-[14px] font-['Aileron'] text-muted-foreground">No contingency fee data</span>
                    <span className="text-[14px] font-['Aileron'] text-foreground font-medium">—</span>
                  </div>
                )}
          </div>
        </Card>

        <Card className="p-0 border-none">
          <h2 className="mb-3 text-[17px] font-bold font-['Aileron'] text-foreground">
            Resolution Summary
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F5F9] text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Validation Step</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Analyzed</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Pending</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Resolved</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Excluded</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Proceeding</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["Claim Integrity", report.resolutionSummary?.claimIntegrity],
                  ["Payer Validation", report.resolutionSummary?.payer],
                  ["Plan Validation", report.resolutionSummary?.plan],
                  ["Provider Participation", report.resolutionSummary?.providerParticipation],
                ] as [string, StepResolutionSummary | null | undefined][]).map(([label, step]) => (
                  <tr key={label} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">{label}</td>
                    {step ? (
                      <>
                        <td className="px-4 py-3 text-right">{step.claimsAnalyzed}</td>
                        <td className="px-4 py-3 text-right">{step.claimsPending}</td>
                        <td className="px-4 py-3 text-right">{step.claimsResolved}</td>
                        <td className="px-4 py-3 text-right">{step.claimsExcluded}</td>
                        <td className="px-4 py-3 text-right font-medium">{step.claimsProceeding}</td>
                      </>
                    ) : (
                      <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">N/A</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
