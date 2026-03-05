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
    { category: "Commercial OON", count: 8 },
    { category: "Commercial IN", count: 6 },
    { category: "Government", count: 4 },
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
};

function formatCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
      .catch(() => toast.error("Failed to load report."))
      .finally(() => setLoading(false));
  }, [sessionId, isDummy]);

  const handleExport = async () => {
    if (isDummy) {
      toast.success("Export is not available for the dummy report.");
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
      toast.success("Report exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
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

  return (
    <PageShell
      breadcrumbs={[
        { label: "Insurance AR Analysis", href: "/rcm/insurance-ar-analysis" },
        { label: `${analysisSummary.practiceName} – ${formatDate(analysisSummary.uploadedAt)}` },
      ]}
      title={analysisSummary.sessionName}
      description={`AR Analysis report for ${analysisSummary.practiceName}`}
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
      <div className="space-y-8 pb-10">
        <Card className="border border-[#E2E8F0] overflow-hidden p-6 sm:p-8">
          <h2 className="mb-5 text-[16px] font-['Aileron'] font-bold text-foreground">Analysis Summary</h2>
          <div className="space-y-0">
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-[14px] font-['Aileron'] text-muted-foreground pl-[8px]">Session Name</span>
              <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%] pr-[10px]">{analysisSummary.sessionName}</span>
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
          </div>
        </Card>

        <section>
          <h2 className="mb-5 text-[16px] font-['Aileron'] font-bold text-foreground">Analysis Report</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[32px] font-bold font-['Aileron'] text-foreground mb-1">
                {totalClaimsAnalyzed.toLocaleString()}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total Claims Analyzed</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[32px] font-bold font-['Aileron'] text-[#DC2626] mb-1">
                {formatCurrency(totalUnderpayment)}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Total Underpayment</div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-6 text-center border border-border">
              <div className="text-[32px] font-bold font-['Aileron'] text-[#16A34A] mb-1">
                {formatCurrency(riskAdjustedRecovery)}
              </div>
              <div className="text-[14px] font-['Aileron'] text-muted-foreground">Risk-Adjusted Recovery</div>
            </div>
          </div>
        </section>

        <Card className="p-6 sm:p-8">
          <h2 className="mb-5 text-[16px] font-bold font-['Aileron'] text-foreground">
            Claim Categorisation Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {report.claimCategorisationBreakdown?.length
              ? report.claimCategorisationBreakdown.map((item, i) => (
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
                ))
              : (
                  <div className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded col-span-2">
                    <span className="text-[14px] font-['Aileron'] text-muted-foreground">No categorisation data</span>
                    <span className="text-[14px] font-['Aileron'] text-foreground font-medium">—</span>
                  </div>
                )}
          </div>
        </Card>

        {report.underpaymentByPriority?.length > 0 && (
          <Card className="p-6 sm:p-8">
            <h2 className="mb-5 text-[16px] font-bold font-['Aileron'] text-foreground">
              Underpayment Analysis by Priority
            </h2>
            <div className="space-y-3">
              {report.underpaymentByPriority.map((item, i) => {
                const isHigh = item.priority.toLowerCase().includes("high");
                const isMid = item.priority.toLowerCase().includes("mid");
                const isLow = item.priority.toLowerCase().includes("low");
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
          </Card>
        )}

        {report.recoveryProjectionSummary && (
          <Card className="p-6 sm:p-8">
            <h2 className="mb-5 text-[16px] font-bold font-['Aileron'] text-foreground">
              Recovery Projection Summary
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 mb-5">
              <div className="bg-background rounded-lg p-6 sm:p-7 text-center border border-border">
                <div className="text-[32px] font-bold font-['Aileron'] text-foreground mb-2">
                  {formatCurrency(report.recoveryProjectionSummary.maxPotentialRecovery)}
                </div>
                <div className="text-[15px] font-['Aileron'] font-normal leading-snug text-center text-muted-foreground">
                  Maximum Potential Recovery (100%)
                </div>
              </div>
              <div className="bg-background rounded-lg p-6 sm:p-7 text-center border-2 border-[#16A34A] bg-green-50/50">
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
          </Card>
        )}

        <Card className="p-6 sm:p-8">
          <h2 className="mb-5 text-[16px] font-bold font-['Aileron'] text-foreground">
            Contingency Fee Application by Claim Age
          </h2>
          <div className="space-y-3">
            {report.contingencyFeeByClaimAge?.length
              ? report.contingencyFeeByClaimAge.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-4 px-4 bg-[#F9FAFC] rounded"
                  >
                    <span className="text-[14px] font-['Aileron'] text-muted-foreground">
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
      </div>
    </PageShell>
  );
}
