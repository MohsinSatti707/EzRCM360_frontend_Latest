"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FileUploadZone } from "@/components/rcm/FileUploadZone";
import { Loader } from "@/components/ui/Loader";
import { ArrowRight } from "lucide-react";
import { ValidationAnalysisIcon } from "@/components/rcm/ValidationAnalysisIcon";
import { useToast } from "@/lib/contexts/ToastContext";
import {
  insuranceArAnalysisApi,
  type ArAnalysisProcessingStatusDto,
  type ArAnalysisSessionDetailDto,
  type StepResolutionSummary,
} from "@/lib/services/insuranceArAnalysis";
import { usePipelineSignalR } from "@/lib/hooks/usePipelineSignalR";

const POLL_BASE_MS = 1000; // 1st after 1s, 2nd after 2s, 3rd after 4s, 4th after 8s, 5th after 16s...
const POLL_MAX_MS = 30000; // Cap at 30s

/** Per-step "Hint: What to do next" content. Column names match backend-generated Excel files. */
const RESOLUTION_HINTS = {
  claimIntegrity: (
    <>
      <strong>What this file is:</strong> One row per claim group (Client Claim ID) with header conflicts (e.g. conflicting Client Entity Name, Billing Provider, Rendering Provider, Patient Name, DOB, etc.).{" "}
      <strong>Resolve:</strong> Correct the header values for that row and set the <strong>Action</strong> column to <strong>Resolve</strong>.{" "}
      <strong>Exclude:</strong> Set <strong>Action</strong> to <strong>Exclude</strong> to remove that claim group from this analysis session.{" "}
      Then save the file and re-upload the corrected file here.
    </>
  ),
  payerNotFound: (
    <>
      <strong>What this file is:</strong> Lists payers from your intake that were not matched to an existing payer. Columns include Primary Payer Name, Client Claim ID, Status, and <strong>Action</strong>.{" "}
      <strong>Resolve:</strong> Map to an existing payer (or add and map) and set <strong>Action</strong> to <strong>Resolve</strong>.{" "}
      <strong>Exclude:</strong> Set <strong>Action</strong> to <strong>Exclude</strong> to exclude affected claims from this session.{" "}
      Then save and re-upload the corrected file.
    </>
  ),
  planNotFound: (
    <>
      <strong>What this file is:</strong> Lists unmatched plan identifiers (Primary Payer Name, Plan Name, Plan ID #, Client Claim ID, Status, <strong>Action</strong>).{" "}
      <strong>Resolve:</strong> Map to an existing plan and set <strong>Action</strong> to <strong>Resolve</strong>.{" "}
      <strong>Exclude:</strong> Set <strong>Action</strong> to <strong>Exclude</strong> to exclude affected claims.{" "}
      Then save and re-upload the corrected file.
    </>
  ),
  providerParticipation: (
    <>
      <strong>What this file is:</strong> Lists unique Rendering Provider × Payer × Plan combinations that need participation status.{" "}
      <strong>Columns:</strong> Rendering Provider Name, Payer Name, Plan Name, Plan ID/Prefix, Plan Type, DOS Range, <strong>Participation Status</strong>, Status.{" "}
      <strong>Resolve:</strong> Fill in the <strong>Participation Status</strong> column with <strong>IN</strong> (In-Network) or <strong>OON</strong> (Out-of-Network) for each row.{" "}
      Then save and re-upload the completed file.
    </>
  ),
  facilityParticipation: (
    <>
      <strong>What this file is:</strong> Lists facility × payer × plan combinations that need participation. Same idea as Provider Participation; columns include Client Claim ID and <strong>Action</strong>.{" "}
      <strong>Resolve:</strong> Set participation or correct data and set <strong>Action</strong> to <strong>Resolve</strong>.{" "}
      <strong>Exclude:</strong> Set <strong>Action</strong> to <strong>Exclude</strong> to exclude affected claims.{" "}
      Then save and re-upload the corrected file.
    </>
  ),
};

function PipelineStep({
  step,
  index,
  isLast,
  onSkip,
  resolutionStep,
}: {
  step: { name: string; status: string; message?: string | null; count?: number | null };
  index: number;
  isLast: boolean;
  onSkip?: () => void;
  resolutionStep?: StepResolutionSummary | null;
}) {
  const completed = step.status === "Completed";
  const inProgress = step.status === "InProgress";
  const failed = step.status === "Failed";
  const pending = step.status === "Pending";

  return (
    <div
      className={`flex items-start gap-4 animate-fade-in-up opacity-0 ${
        completed || inProgress || failed ? "opacity-100" : "opacity-60"
      }`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "forwards" }}
    >
      <div className="relative flex shrink-0 flex-col items-center">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
            completed
              ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
              : failed
                ? "border-red-500 bg-red-500 text-white"
                : inProgress
                  ? "border-[#0066CC] bg-[#0066CC]/10 text-[#0066CC] ring-4 ring-[#0066CC]/20 animate-pulse-soft"
                  : "border-border bg-card text-muted-foreground"
          }`}
        >
          {completed ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : failed ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-label="Failed">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : inProgress ? (
            <Loader variant="inline" size="sm" />
          ) : (
            <span className="text-sm font-semibold">{index + 1}</span>
          )}
        </div>
        {!isLast && (
          <div
            className={`absolute top-12 left-1/2 h-8 w-0.5 -translate-x-1/2 rounded-full transition-colors duration-500 ${
              completed ? "bg-emerald-400" : "bg-border"
            }`}
          />
        )}
      </div>
      <div className="flex-1 pt-1 pb-6">
        <p
          className={`text-sm font-medium transition-colors ${
            completed
              ? "text-emerald-700"
              : failed
                ? "text-red-700"
                : inProgress
                  ? "text-foreground"
                  : "text-muted-foreground"
          }`}
        >
          {step.name}
          {step.count != null ? (
            <span className="ml-1.5 text-muted-foreground">({step.count})</span>
          ) : null}
        </p>
        {completed && resolutionStep && (
          <div className="mt-2 grid grid-cols-5 gap-2 max-w-md">
            {([
              ["Analyzed", resolutionStep.claimsAnalyzed],
              ["Pending", resolutionStep.claimsPending],
              ["Resolved", resolutionStep.claimsResolved],
              ["Excluded", resolutionStep.claimsExcluded],
              ["Proceeding", resolutionStep.claimsProceeding],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label} className="text-center rounded bg-[#F1F5F9] px-2 py-1.5">
                <div className="text-xs font-semibold text-foreground">{val}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
              </div>
            ))}
          </div>
        )}
        {failed && step.message && (
          <p className="mt-1 text-xs text-red-600">{step.message}</p>
        )}
        {inProgress && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full w-3/5 rounded-full bg-primary-500 animate-pulse-soft"
            />
          </div>
        )}
        {onSkip && (failed || inProgress) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="mt-2 h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
            title="Show sample report (preview)"
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

interface ResolutionBlockProps {
  title: string;
  description: string;
  hint?: React.ReactNode;
  downloadLabel: string;
  filename: string;
  onDownload: () => Promise<void>;
  onUpload: () => Promise<void>;
  file: File | null;
  setFile: (f: File | null) => void;
  disabled: boolean;
  uploading: boolean;
  /** When set, show this API error message prominently (e.g. file not yet available). */
  downloadError?: string | null;
  /** If true, show required column headers so the backend can parse the file. */
  showRequiredColumns?: boolean;
  /** Optional "Skip and Continue": exclude all affected records and resume pipeline without uploading a file. */
  onSkip?: () => Promise<void>;
  /** True while skip request is in progress. */
  skipping?: boolean;
}

function ResolutionBlock({
  title,
  description,
  hint,
  downloadLabel,
  filename,
  onDownload,
  onUpload,
  file,
  setFile,
  disabled,
  uploading,
  downloadError,
  showRequiredColumns,
  onSkip,
  skipping,
}: ResolutionBlockProps) {
  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
      {downloadError && (
        <div className="mb-4 rounded-lg border border-amber-400 bg-amber-100 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Download not available</p>
          <p className="mt-1 text-sm text-amber-800">{downloadError}</p>
        </div>
      )}
      {showRequiredColumns && (
        <div className="mb-4 rounded-lg border border-amber-400 bg-amber-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Required for upload to work</p>
          <p className="mt-1 text-sm text-amber-800">
            Keep the column headers <strong>exactly</strong> as in the downloaded file: <strong>Client Claim ID</strong> and <strong>Action</strong>. Do not rename or remove columns. For rows you want to exclude, set <strong>Action</strong> to <strong>Exclude</strong>. The backend reads the first sheet only.
          </p>
        </div>
      )}
      <h4 className="text-base font-semibold text-amber-900">{title}</h4>
      <p className="mt-2 text-sm text-amber-800">{description}</p>
      {hint != null && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-100/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Hint: What to do next</p>
          <p className="mt-1.5 text-sm text-amber-900">{hint}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={onDownload} disabled={disabled} variant="secondary">
          {disabled ? "Downloading…" : downloadLabel}
        </Button>
      </div>
      <div className="mt-6">
        <h5 className="text-sm font-medium text-amber-900">Upload corrected file</h5>
        <p className="mt-0.5 text-xs text-amber-800">Re-upload the same file after you correct it or mark rows to exclude.</p>
        <p className="mt-1 text-xs text-amber-700">After you upload, the pipeline resumes in the background (may take up to a minute). Use &quot;Refresh status&quot; above to see when it moves to the next step.</p>
        <div className="mt-2">
          <FileUploadZone
            label={`Drop ${filename} here`}
            hint="XLSX or XLS"
            onFiles={(f) => setFile(f[0] ?? null)}
          />
        </div>
        {file && (
          <Button onClick={onUpload} disabled={uploading} className="mt-3">
            {uploading ? "Uploading…" : "Resume Analysis"}
          </Button>
        )}
      </div>
      {onSkip != null && (
        <div className="mt-6 border-t border-amber-200 pt-4">
          <p className="text-xs text-amber-800 mb-2">Skip all affected records and continue the analysis without uploading a file.</p>
          <Button onClick={onSkip} disabled={skipping ?? disabled} variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100">
            {skipping ? "Skipping…" : "Skip and Continue"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function InsuranceArAnalysisProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const toast = useToast();
  const apiRef = useRef(insuranceArAnalysisApi());

  const [status, setStatus] = useState<ArAnalysisProcessingStatusDto | null>(null);
  const [session, setSession] = useState<ArAnalysisSessionDetailDto | null>(null);
  const [conflictFile, setConflictFile] = useState<File | null>(null);
  const [payerFile, setPayerFile] = useState<File | null>(null);
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [providerFile, setProviderFile] = useState<File | null>(null);
  const [facilityFile, setFacilityFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [skippingConflict, setSkippingConflict] = useState(false);
  const [skippingPayer, setSkippingPayer] = useState(false);
  const [skippingPlan, setSkippingPlan] = useState(false);
  const [skippingProvider, setSkippingProvider] = useState(false);
  const [resumingValidation, setResumingValidation] = useState(false);
  const [providerUploadPreview, setProviderUploadPreview] = useState<{ totalCombos: number; inNetworkCount: number; outOfNetworkCount: number; unfilledCount: number } | null>(null);
  const [resumingProvider, setResumingProvider] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [planDownloadError, setPlanDownloadError] = useState<string | null>(null);
  const [payerDownloadError, setPayerDownloadError] = useState<string | null>(null);
  const [providerDownloadError, setProviderDownloadError] = useState<string | null>(null);
  const [facilityDownloadError, setFacilityDownloadError] = useState<string | null>(null);

  const routerRef = useRef(router);
  routerRef.current = router;

  // SignalR: real-time pipeline updates. Updates UI directly from events — NO status API calls.
  // Only falls back to polling when SignalR is not connected.
  const signalRConnectedRef = useRef(false);
  const { connected: signalRConnected } = usePipelineSignalR(sessionId, (event) => {
    // Update status state directly from SignalR event — no API call needed
    setStatus((prev) => {
      if (!prev) return prev;
      // Terminal: pipeline completed — update status (no auto-redirect, let user see summary first)
      if (event.stageName === "Completed" && event.status === "Completed") {
        return { ...prev, sessionStatus: "Completed", currentStage: "Completed" };
      }
      // Terminal: pipeline failed
      if (event.status === "Failed") {
        return { ...prev, sessionStatus: "Failed", currentStage: event.message ?? event.stageName };
      }
      // Action required (pause step) — update session status + step
      if (event.status === "ActionRequired") {
        const updatedSteps = prev.steps.map((s) =>
          s.name === event.stageName ? { ...s, status: "Failed", message: event.message } : s
        );
        const sessionStatus = event.stageName.includes("Claim integrity") ? "ConflictResolution" : "EnrichmentPending";
        return { ...prev, steps: updatedSteps, sessionStatus, currentStage: event.message ?? event.stageName };
      }
      // Stage completed — mark it and advance
      const updatedSteps = prev.steps.map((s) =>
        s.name === event.stageName ? { ...s, status: "Completed" } : s
      );
      return { ...prev, steps: updatedSteps, currentStage: event.stageName };
    });
  });
  signalRConnectedRef.current = signalRConnected;

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;

    const scheduleNext = () => {
      if (cancelled || signalRConnectedRef.current) return;
      const delay = Math.min(POLL_BASE_MS * Math.pow(2, pollCount), POLL_MAX_MS);
      pollCount += 1;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        pollOnce();
      }, delay);
    };

    const pollOnce = async () => {
      if (cancelled || signalRConnectedRef.current) return;
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNext();
        return;
      }
      try {
        const s = await apiRef.current.getStatus(sessionId);
        if (cancelled) return;
        setStatus(s);
        if (s.sessionStatus === "Completed") return;
        if (s.sessionStatus === "Failed") return;
        scheduleNext();
      } catch {
        if (!cancelled) scheduleNext();
      }
    };

    // 1. Always do ONE initial fetch for status + session
    const initialFetch = async () => {
      try {
        const [s, sess] = await Promise.all([
          apiRef.current.getStatus(sessionId),
          apiRef.current.getSession(sessionId),
        ]);
        if (cancelled) return;
        setStatus(s);
        setSession(sess);
        if (s.sessionStatus === "Completed") return;
        if (s.sessionStatus === "Failed") return;
      } catch { /* ignore */ }

      // 2. Wait 2s for SignalR to connect before starting polling fallback
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      if (!signalRConnectedRef.current) {
        // SignalR did not connect — start polling fallback
        scheduleNext();
      }
    };

    initialFetch();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId]); // sessionId only - stable deps prevent effect re-runs

  const refreshStatus = useCallback(async (): Promise<ArAnalysisProcessingStatusDto | null> => {
    if (!sessionId) return null;
    try {
      const [s, sess] = await Promise.all([
        apiRef.current.getStatus(sessionId),
        apiRef.current.getSession(sessionId),
      ]);
      setStatus(s);
      setSession(sess);
      return s;
    } catch {
      return null;
    }
  }, [sessionId]);

  /** Poll status every 2s until Completed/Failed or max 60s. Skipped when SignalR is connected (real-time events handle it). */
  const pollUntilSettled = useCallback(async () => {
    if (!sessionId) return;
    // When SignalR is connected, StageChanged events will trigger refreshStatus automatically — no need to poll.
    if (signalRConnectedRef.current) return;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (signalRConnectedRef.current) return; // SignalR connected mid-poll, stop
      const s = await refreshStatus();
      if (s?.sessionStatus === "Completed" || s?.sessionStatus === "Failed") return;
    }
  }, [sessionId, refreshStatus]);

  const needsResolution = (val: string | null | undefined) =>
    val && /NotFound|Pending|ActionRequired|Failed/i.test(val);

  const payerPlanStepFailed = status?.steps?.some(
    (s) => s.name === "Payer & Plan Validation" && s.status === "Failed"
  );

  const needsPayerResolution =
    needsResolution(session?.payerValidationStatus) || payerPlanStepFailed;
  const needsPlanResolution =
    needsResolution(session?.planValidationStatus) || payerPlanStepFailed;
  const needsProviderResolution = needsResolution(session?.providerParticipationValidationStatus);
  const needsFacilityResolution = needsResolution(session?.facilityParticipationValidationStatus);

  useEffect(() => {
    if (!needsPlanResolution) setPlanDownloadError(null);
    if (!needsPayerResolution) setPayerDownloadError(null);
    if (!needsProviderResolution) setProviderDownloadError(null);
    if (!needsFacilityResolution) setFacilityDownloadError(null);
  }, [needsPlanResolution, needsPayerResolution, needsProviderResolution, needsFacilityResolution]);

  const handleDownloadConflicts = async () => {
    setDownloading(true);
    try {
      const blob = await apiRef.current.downloadClaimIntegrityConflicts(sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ConflictClaims.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File Downloaded", "Conflict file downloaded.");
    } catch (err) {
      toast.error("Download Failed", err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadConflicts = async () => {
    if (!conflictFile) {
      toast.error("Validation Error", "Please select a file.");
      return;
    }
    setUploading(true);
    try {
      await apiRef.current.uploadClaimIntegrityConflicts(sessionId, conflictFile);
      setConflictFile(null);
      toast.success("Upload Successful", "File uploaded. Resuming analysis…");
      await refreshStatus();
      pollUntilSettled(); // poll until Completed/Failed so UI updates
    } catch (err) {
      toast.error("Upload Failed", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const createDownloadHandler = (
    name: string,
    downloadFn: () => Promise<Blob>,
    filename: string,
    callbacks?: { onError?: (message: string) => void; onSuccess?: () => void }
  ) => async () => {
    setDownloading(true);
    try {
      const blob = await downloadFn();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File Downloaded", `${name} file downloaded.`);
      callbacks?.onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed.";
      toast.error("Download Failed", message);
      callbacks?.onError?.(message);
    } finally {
      setDownloading(false);
    }
  };

  const createUploadHandler = (name: string, file: File | null, uploadFn: (f: File) => Promise<void>, setFile: (f: File | null) => void) => async () => {
    if (!file) {
      toast.error("Validation Error", "Please select a file.");
      return;
    }
    setUploading(true);
    try {
      await uploadFn(file);
      setFile(null);
      toast.success("Upload Successful", "File uploaded. Resuming analysis…");
      await refreshStatus();
      pollUntilSettled(); // poll until Completed/Failed so UI updates
    } catch (err) {
      toast.error("Upload Failed", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await apiRef.current.startAnalysis(sessionId);
      toast.success("Analysis Restarted", "Analysis restarted.");
      await refreshStatus();
      pollUntilSettled();
    } catch (err) {
      toast.error("Retry Failed", err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }, [sessionId, refreshStatus, pollUntilSettled, toast]);

  const handleRefreshStatus = useCallback(async () => {
    setRefreshingStatus(true);
    try {
      const s = await refreshStatus();
      if (s?.sessionStatus === "Completed") {
        toast.success("Analysis Complete", "Analysis completed.");
      } else if (s?.sessionStatus === "Failed") {
        toast.error("Analysis Failed", "Analysis failed. Check the pipeline steps for details.");
      } else {
        toast.success("Status Updated", "Status updated.");
      }
    } catch {
      toast.error("Refresh Failed", "Could not refresh status.");
    } finally {
      setRefreshingStatus(false);
    }
  }, [refreshStatus, toast]);

  const handleDownloadPayer = createDownloadHandler(
    "Payer-NotFound",
    () => apiRef.current.downloadPayerNotFound(sessionId),
    "Payer-NotFound.xlsx",
    { onError: (m) => setPayerDownloadError(m || null), onSuccess: () => setPayerDownloadError(null) }
  );
  const handleDownloadPlan = createDownloadHandler(
    "Plan-NotFound",
    () => apiRef.current.downloadPlanNotFound(sessionId),
    "Plan-NotFound.xlsx",
    { onError: (m) => setPlanDownloadError(m || null), onSuccess: () => setPlanDownloadError(null) }
  );
  const handleDownloadProvider = createDownloadHandler(
    "Provider participation",
    () => apiRef.current.downloadProviderParticipationNotFound(sessionId),
    "ProviderParticipation-NotFound.xlsx",
    { onError: (m) => setProviderDownloadError(m || null), onSuccess: () => setProviderDownloadError(null) }
  );
  const handleDownloadFacility = createDownloadHandler(
    "Facility participation",
    () => apiRef.current.downloadFacilityParticipationNotFound(sessionId),
    "FacilityParticipation-NotFound.xlsx",
    { onError: (m) => setFacilityDownloadError(m || null), onSuccess: () => setFacilityDownloadError(null) }
  );

  const handleUploadPayer = createUploadHandler("Payer-NotFound", payerFile, (f) => apiRef.current.uploadPayerNotFound(sessionId, f), setPayerFile);
  const handleUploadPlan = createUploadHandler("Plan-NotFound", planFile, (f) => apiRef.current.uploadPlanNotFound(sessionId, f), setPlanFile);
  const handleUploadProvider = async () => {
    if (!providerFile) { toast.error("Validation Error", "Please select a file."); return; }
    setUploading(true);
    try {
      const preview = await apiRef.current.uploadProviderParticipationNotFound(sessionId, providerFile);
      setProviderUploadPreview(preview);
      toast.success("File Uploaded", "File uploaded successfully. Review the summary below and click Continue to resume.");
    } catch (err) {
      toast.error("Upload Failed", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleResumeProvider = async () => {
    setResumingProvider(true);
    try {
      await apiRef.current.resumeProviderParticipation(sessionId);
      setProviderUploadPreview(null);
      setProviderFile(null);
      toast.success("Resuming", "Pipeline is resuming with the uploaded participation data...");
      await refreshStatus();
      pollUntilSettled();
    } catch (err) {
      toast.error("Resume Failed", err instanceof Error ? err.message : "Resume failed.");
    } finally {
      setResumingProvider(false);
    }
  };
  const handleUploadFacility = createUploadHandler("Facility participation", facilityFile, (f) => apiRef.current.uploadFacilityParticipationNotFound(sessionId, f), setFacilityFile);

  const createSkipHandler = (
    name: string,
    skipFn: () => Promise<void>,
    setSkipping: (v: boolean) => void
  ) => async () => {
    setSkipping(true);
    try {
      await skipFn();
      toast.success("Step Skipped", `${name} skipped. Resuming analysis…`);
      await refreshStatus();
      pollUntilSettled(); // poll until Completed/Failed so UI updates
    } catch (err) {
      toast.error("Skip Failed", err instanceof Error ? err.message : "Skip failed.");
    } finally {
      setSkipping(false);
    }
  };

  const handleSkipConflicts = createSkipHandler(
    "Claim integrity conflicts",
    () => apiRef.current.skipClaimIntegrityConflicts(sessionId),
    setSkippingConflict
  );
  const handleSkipPayer = createSkipHandler("Payer validation", () => apiRef.current.skipPayerNotFound(sessionId), setSkippingPayer);
  const handleSkipPlan = createSkipHandler("Plan validation", () => apiRef.current.skipPlanNotFound(sessionId), setSkippingPlan);

  const handleResumeValidation = async () => {
    setResumingValidation(true);
    try {
      await apiRef.current.resumePayerPlanValidation(sessionId);
      toast.success("Re-validating", "Pipeline is re-checking payers and plans against current configuration...");
      await refreshStatus();
      pollUntilSettled();
    } catch (err) {
      toast.error("Resume Failed", err instanceof Error ? err.message : "Resume failed.");
    } finally {
      setResumingValidation(false);
    }
  };
  const handleSkipProvider = createSkipHandler("Provider participation", () => apiRef.current.skipProviderParticipationNotFound(sessionId), setSkippingProvider);

  const needsConflictResolution =
    status?.sessionStatus === "ConflictResolution" ||
    status?.currentStage?.toLowerCase().includes("conflict");

  const stage = status?.currentStage?.toLowerCase() ?? "";
  const isPayerStepCurrent = stage.includes("payer enrollment");
  const isPlanStepCurrent = stage.includes("plan enrollment");
  const isProviderStepCurrent = stage.includes("rendering provider") || stage.includes("provider participation");

  const isEnrichmentPending = status?.sessionStatus === "EnrichmentPending";
  const isFailed = status?.sessionStatus === "Failed";
  const isProcessing =
    !isEnrichmentPending &&
    !isFailed &&
    (status?.sessionStatus === "Processing" ||
      (status?.sessionStatus !== "Completed" && status?.sessionStatus !== "Failed"));
  /** Backend sets CurrentStage to "Resuming" when pipeline is resuming after Skip or Upload. */
  const isResuming =
    status?.sessionStatus === "Processing" &&
    (status?.currentStage?.toLowerCase() === "resuming" ||
      (status?.overallMessage?.toLowerCase().includes("resuming") ?? false));

  /** When session has already failed (or completed), do not show resolution blocks—nothing to resolve. */
  const showResolutionBlocks = !isFailed && !(status?.sessionStatus === "Completed");

  return (
    <PageShell
      breadcrumbs={[
        { label: "Insurance AR Analysis", href: "/rcm/insurance-ar-analysis" },
        { label: "Upload AR Intake" },
      ]}
      title="Data Upload and AR Analysis Session Creation"
      description="Review session summary and complete any required actions."
      titleWrapperClassName="px-6 mt-4"
    >
      <div className="space-y-6 px-6 h-[calc(100vh-235px)] overflow-auto">
        {session && (
          <Card className="animate-fade-in-up border border-[#E2E8F0] bg-card p-6 sm:p-8 mt-2">
            <h3 className="mb-6 text-[13px] font-['Aileron'] font-semibold uppercase tracking-wide text-[#64748B]">
              SESSION SUMMARY
            </h3>
            <dl className="grid gap-x-10 gap-y-6 text-[14px] font-['Aileron'] sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <dt className="text-muted-foreground">Uploaded by</dt>
                <dd className="font-medium text-foreground">
                  {session.uploadedBy ?? "—"}
                </dd>
              </div>
              <div className="space-y-1.5">
                <dt className="text-muted-foreground">Uploaded at</dt>
                <dd className="font-medium text-foreground">
                  {session.uploadedAt
                    ? (() => {
                        const d = new Date(session.uploadedAt);
                        const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
                        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                        return `${date} - ${time}`;
                      })()
                    : "—"}
                </dd>
              </div>
              <div className="space-y-1.5">
                <dt className="text-muted-foreground">Total rows</dt>
                <dd className="font-medium text-foreground">
                  {session.totalRows ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>
        )}

        <Card className="overflow-hidden border border-[#E2E8F0]">
          <div
            className={`border-b border-border px-6 py-5 ${
              isFailed
                ? "bg-red-50 border-red-200/60"
                : isEnrichmentPending
                  ? "bg-[#FEFCE8] border-amber-200/60"
                  : "bg-[#F0F7FF]"
            }`}
          >
          <div className="flex items-center gap-4">
            {isFailed ? (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-red-500 shadow-[0_0_0_2px_#ef4444]"
                aria-label="Analysis failed"
              >
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            ) : isEnrichmentPending ? (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#EA580C] shadow-[0_0_0_2px_#EA580C]"
                aria-label="Action required"
              >
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0066CC]/10">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-2 border-[#0066CC] border-t-transparent"
                  role="status"
                  aria-label="Loading"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-['Aileron'] font-semibold text-foreground">
                {isFailed
                  ? "Analysis failed"
                  : isEnrichmentPending
                    ? "Action required"
                    : isResuming
                      ? "Resuming analysis"
                      : isProcessing
                        ? "Processing AR Data..."
                        : status?.overallMessage ?? "Processing"}
              </h2>
              <p className={`text-[13px] font-['Aileron'] ${isFailed ? "text-red-800" : isEnrichmentPending ? "text-amber-800" : "text-[#0066CC]"}`}>
                {isFailed
                  ? (status?.currentStage ?? status?.overallMessage ?? "The pipeline could not complete. Check the steps above for details.")
                  : isEnrichmentPending
                    ? status?.overallMessage ??
                      "Pending your action: Pending Payer Enrollment. Download the file for this step, resolve or exclude, then re-upload."
                    : isResuming
                      ? "Pipeline is resuming. This may take a minute—page will update when ready."
                      : isProcessing
                        ? "This may take a few minutes. Please do not close this window."
                        : status?.overallMessage ?? ""}
              </p>
            </div>
            {isFailed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={retrying}
                className="shrink-0 border-red-300 text-red-700 hover:bg-red-50 font-['Aileron'] text-[14px]"
              >
                {retrying ? "Retrying…" : "Retry Analysis"}
              </Button>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {signalRConnected && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-['Aileron']" title="Real-time updates active">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={refreshingStatus}
                className="border-[#E2E8F0] font-['Aileron'] text-[14px]"
              >
                {refreshingStatus ? "Refreshing…" : "Refresh status"}
              </Button>
            </div>
          </div>
          </div>

          <div className="px-6 py-6">
            {!status ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <ValidationAnalysisIcon className="h-20 w-20" />
                <p className="text-sm font-medium text-foreground">
                  Loading pipeline status…
                </p>
                <p className="text-xs text-muted-foreground">
                  No errors detected so far.
                </p>
              </div>
            ) : status?.steps && status.steps.length > 0 ? (
              <div className="space-y-3">
                {status.steps.map((s, i) => {
                  // When session is Completed, override all steps to show as Completed
                  const step = status.sessionStatus === "Completed"
                    ? { ...s, status: "Completed", message: null }
                    : s;
                  // Map step names to resolution summary keys
                  const rs = status.resolutionSummary;
                  const sn = s.name.toLowerCase();
                  const resStep =
                    sn.includes("claim integrity") ? rs?.claimIntegrity :
                    sn.includes("payer") && sn.includes("plan") ? (rs?.payer ?? rs?.plan) :
                    sn.includes("provider participation") ? rs?.providerParticipation :
                    null;
                  return (
                  <PipelineStep
                    key={s.name}
                    step={step}
                    index={i}
                    isLast={i === status.steps.length - 1}
                    resolutionStep={resStep}
                  />
                  );
                })}
              </div>
            ) : null}

            {showResolutionBlocks && needsConflictResolution && (
              <div className="mt-8 animate-fade-in-up">
                <h3 className="mb-4 text-base font-semibold text-amber-900">Action required</h3>
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
                <h4 className="text-base font-semibold text-amber-900">Claim integrity conflicts</h4>
                <p className="mt-2 text-sm text-amber-800">
                  We detected claim integrity conflicts. Download the report, correct header inconsistencies or mark claim groups as <strong>Exclude</strong> in the Action column, then re-upload that same corrected file to continue.
                </p>
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-100/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Hint: What to do next</p>
                  <p className="mt-1.5 text-sm text-amber-900">{RESOLUTION_HINTS.claimIntegrity}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    onClick={handleDownloadConflicts}
                    disabled={downloading}
                    variant="secondary"
                  >
                    {downloading ? "Downloading…" : "Download Conflict Claims"}
                  </Button>
                </div>
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-amber-900">Upload corrected file</h5>
                  <p className="mt-0.5 text-xs text-amber-800">Re-upload the same file after you correct it or mark rows to exclude.</p>
                  <p className="mt-1 text-xs text-amber-700">After you upload, the pipeline resumes in the background (may take up to a minute). Use &quot;Refresh status&quot; above to see when it moves to the next step.</p>
                  <div className="mt-2">
                    <FileUploadZone
                      label="Drop corrected file here"
                      hint="XLSX or XLS"
                      onFiles={(f) => setConflictFile(f[0] ?? null)}
                    />
                  </div>
                  {conflictFile && (
                    <Button
                      onClick={handleUploadConflicts}
                      disabled={uploading}
                      className="mt-3"
                    >
                      {uploading ? "Uploading…" : "Resume Analysis"}
                    </Button>
                  )}
                </div>
                <div className="mt-6 border-t border-amber-200 pt-4">
                  <p className="text-xs text-amber-800 mb-2">Skip all affected claim groups and continue the analysis without uploading a file.</p>
                  <Button onClick={handleSkipConflicts} disabled={skippingConflict || downloading} variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100">
                    {skippingConflict ? "Skipping…" : "Skip and Continue"}
                  </Button>
                </div>
              </div>
              </div>
            )}

            {showResolutionBlocks && isPlanStepCurrent && needsPlanResolution && (
              <div className="mt-8 animate-fade-in-up space-y-4">
                <h3 className="mb-2 text-base font-semibold text-amber-900">Action required</h3>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-amber-900">Plan not found — Pending Plan Enrollment</h4>
                  <p className="text-sm text-amber-800">
                    Some plans in your intake were not matched to configured plans. Configure the missing plans in{" "}
                    <strong>Settings &amp; Configurations &gt; Plans</strong>, then click <strong>Configured and Resume</strong>.
                  </p>
                  <Button variant="outline" onClick={handleDownloadPlan} disabled={downloading} className="border-amber-400 text-amber-900 hover:bg-amber-100 text-xs h-8">
                    Download Plan-NotFound.xlsx
                  </Button>
                  {planDownloadError && <p className="text-xs text-red-600">{planDownloadError}</p>}
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleResumeValidation} disabled={resumingValidation || downloading} className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]">
                    {resumingValidation ? "Re-validating..." : "Configured and Resume"}
                  </Button>
                  <Button onClick={handleSkipPlan} disabled={skippingPlan || downloading} variant="outline" className="h-10 rounded-[5px] px-[18px] border-amber-400 text-amber-900 hover:bg-amber-100 font-aileron text-[14px]">
                    {skippingPlan ? "Skipping..." : "Skip and Continue"}
                  </Button>
                </div>
              </div>
            )}

            {showResolutionBlocks && isPayerStepCurrent && needsPayerResolution && (
              <div className="mt-8 animate-fade-in-up space-y-4">
                <h3 className="mb-2 text-base font-semibold text-amber-900">Action required</h3>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-amber-900">Payer not found — Pending Payer Enrollment</h4>
                  <p className="text-sm text-amber-800">
                    Some payers in your intake were not matched to configured payers. Configure the missing payers in{" "}
                    <strong>Settings &amp; Configurations &gt; Payers</strong>, then click <strong>Configured and Resume</strong>.
                  </p>
                  <Button variant="outline" onClick={handleDownloadPayer} disabled={downloading} className="border-amber-400 text-amber-900 hover:bg-amber-100 text-xs h-8">
                    Download Payer-NotFound.xlsx
                  </Button>
                  {payerDownloadError && <p className="text-xs text-red-600">{payerDownloadError}</p>}
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleResumeValidation} disabled={resumingValidation || downloading} className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]">
                    {resumingValidation ? "Re-validating..." : "Configured and Resume"}
                  </Button>
                  <Button onClick={handleSkipPayer} disabled={skippingPayer || downloading} variant="outline" className="h-10 rounded-[5px] px-[18px] border-amber-400 text-amber-900 hover:bg-amber-100 font-aileron text-[14px]">
                    {skippingPayer ? "Skipping..." : "Skip and Continue"}
                  </Button>
                </div>
              </div>
            )}

            {/* Plan/Payer ResolutionBlocks removed — replaced by Configured and Resume above */}
            {false && needsPlanResolution && (
              <div className="mt-8 animate-fade-in-up">
                <ResolutionBlock
                  title="Plan not found"
                  description=""
                  hint={RESOLUTION_HINTS.planNotFound}
                  downloadLabel="Download Plan-NotFound.xlsx"
                  filename="Plan-NotFound.xlsx"
                  onDownload={handleDownloadPlan}
                  onUpload={handleUploadPlan}
                  file={planFile}
                  setFile={setPlanFile}
                  disabled={downloading}
                  uploading={uploading}
                  downloadError={planDownloadError}
                  showRequiredColumns
                  onSkip={isPlanStepCurrent ? handleSkipPlan : undefined}
                  skipping={skippingPlan}
                />
              </div>
            )}

            {showResolutionBlocks && needsProviderResolution && (
              <div className="mt-8 animate-fade-in-up">
                <h3 className="mb-4 text-base font-semibold text-amber-900">Action required</h3>
                {providerUploadPreview ? (
                  <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 space-y-4">
                    <h4 className="text-base font-semibold text-emerald-900">Participation File Uploaded — Review Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="rounded-lg bg-white p-3 text-center border border-emerald-200">
                        <div className="text-2xl font-bold text-foreground">{providerUploadPreview.totalCombos}</div>
                        <div className="text-xs text-muted-foreground mt-1">Total Pending Providers</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 text-center border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-700">{providerUploadPreview.inNetworkCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">In-Network (IN)</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 text-center border border-emerald-200">
                        <div className="text-2xl font-bold text-amber-700">{providerUploadPreview.outOfNetworkCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Out-of-Network (OON)</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 text-center border border-emerald-200">
                        <div className="text-2xl font-bold text-red-600">{providerUploadPreview.unfilledCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Unfilled</div>
                      </div>
                    </div>
                    {providerUploadPreview.unfilledCount > 0 && (
                      <p className="text-sm text-amber-800 bg-amber-100 rounded px-3 py-2">
                        {providerUploadPreview.unfilledCount} row(s) have no participation status. These will be treated as unknown during processing.
                      </p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleResumeProvider}
                        disabled={resumingProvider}
                        className="h-10 rounded-[5px] px-6 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
                      >
                        {resumingProvider ? "Resuming..." : "Continue"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setProviderUploadPreview(null); setProviderFile(null); }}
                        disabled={resumingProvider}
                        className="h-10 rounded-[5px] px-[18px] border-border"
                      >
                        Re-upload Different File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ResolutionBlock
                    title="Rendering Provider Participation Validation"
                    description="Download the file, fill in the Participation Status column with IN (In-Network) or OON (Out-of-Network) for each rendering provider / payer / plan combination, then re-upload."
                    hint={RESOLUTION_HINTS.providerParticipation}
                    downloadLabel="Download RenderingProviderParticipation-Pending.xlsx"
                    filename="RenderingProviderParticipation-Pending.xlsx"
                    onDownload={handleDownloadProvider}
                    onUpload={handleUploadProvider}
                    file={providerFile}
                    setFile={setProviderFile}
                    disabled={downloading}
                    uploading={uploading}
                    downloadError={providerDownloadError}
                    onSkip={isProviderStepCurrent ? handleSkipProvider : undefined}
                    skipping={skippingProvider}
                  />
                )}
              </div>
            )}

            {showResolutionBlocks && needsFacilityResolution && (
              <div className="mt-8 animate-fade-in-up">
                <h3 className="mb-4 text-base font-semibold text-amber-900">Action required</h3>
                <ResolutionBlock
                  title="Facility participation not found"
                  description="Facility × payer × plan combinations need resolution. Download the report, correct the data or mark rows as Exclude in the Action column, then re-upload that same corrected file."
                  hint={RESOLUTION_HINTS.facilityParticipation}
                  downloadLabel="Download FacilityParticipation-NotFound.xlsx"
                  filename="FacilityParticipation-NotFound.xlsx"
                  onDownload={handleDownloadFacility}
                  onUpload={handleUploadFacility}
                  file={facilityFile}
                  setFile={setFacilityFile}
                  disabled={downloading}
                  uploading={uploading}
                  downloadError={facilityDownloadError}
                />
              </div>
            )}
          </div>

          {/* Pipeline Complete — show View Report button */}
          {status?.sessionStatus === "Completed" && (
            <div className="mt-8 animate-fade-in-up rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <svg className="h-8 w-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-bold text-emerald-900">Analysis Complete</h3>
              </div>
              <p className="text-sm text-emerald-800 mb-4">
                The AR Analysis pipeline has completed successfully. Click below to view the full report.
              </p>
              <Button
                onClick={() => router.push(`/rcm/insurance-ar-analysis/${sessionId}/report`)}
                className="h-10 rounded-[5px] px-6 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
              >
                View Report <span className="ml-1 inline-block">→</span>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
