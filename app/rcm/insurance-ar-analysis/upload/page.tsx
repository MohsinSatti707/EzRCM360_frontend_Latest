"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Stepper } from "@/components/rcm/Stepper";
import { FileUploadZone } from "@/components/rcm/FileUploadZone";
import { ValidationAnalysisIcon } from "@/components/rcm/ValidationAnalysisIcon";
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
import { PageShell } from "@/components/layout/PageShell";
import {
  insuranceArAnalysisApi,
  type ArIntakeValidationResult,
  type ArValidationError,
} from "@/lib/services/insuranceArAnalysis";

type Step = 1 | 2 | 3;
type ValidationMode = "Full" | "ColumnsThenRows";

const MODULE_NAME = "Insurance AR Analysis";

export default function InsuranceArAnalysisUploadPage() {
  const router = useRouter();
  const toast = useToast();
  const api = insuranceArAnalysisApi();
  const { canCreate, loading: permLoading } = useModulePermission(MODULE_NAME);

  if (permLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader />
      </div>
    );
  }
  if (!canCreate) {
    return (
      <AccessDenied
        moduleName="Insurance AR Analysis Upload"
        message="You don't have permission to upload data. Contact your administrator."
        backHref="/rcm/insurance-ar-analysis"
      />
    );
  }

  const [step, setStep] = useState<Step>(1);
  const [practiceName, setPracticeName] = useState("");
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [validationMode, setValidationMode] = useState<ValidationMode>("Full");
  const [columnsPassed, setColumnsPassed] = useState(false);
  const [rowsPassed, setRowsPassed] = useState(false);
  const [validationResult, setValidationResult] = useState<ArIntakeValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [pmFiles, setPmFiles] = useState<File[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<{
    sessionName: string;
    practiceName: string;
    uploadedBy?: string;
    uploadedAt: string;
    sourceType: string;
    intakeTemplateFile?: string;
    pmSourceReportFiles: string[];
    totalRows?: number;
  } | null>(null);

  const steps = [
    { id: 1, label: "Practice/Upload AR Intake", completed: step > 1, active: step === 1 },
    { id: 2, label: "Upload PM Report(s)", completed: step > 2, active: step === 2 },
    { id: 3, label: "Process", completed: false, active: step === 3 },
  ];

  const handleCreateSession = useCallback(async () => {
    if (!practiceName.trim()) {
      toast.error("Practice name is required.");
      return;
    }
    if (!intakeFile) {
      toast.error("Please upload an AR intake file.");
      return;
    }
    setSubmitLoading(true);
    setValidationLoading(true);
    setValidationResult(null);
    const scope = validationMode === "Full" ? "Full" : (columnsPassed ? "Rows" : "Columns");
    try {
      if (sessionId) {
        const vr = await api.uploadIntake(sessionId, intakeFile, scope);
        setValidationResult(vr);
        if (validationMode === "ColumnsThenRows") {
          if (scope === "Columns" && vr.columnErrors.length === 0 && vr.columnValidatedCount > 0) {
            setColumnsPassed(true);
          } else if (scope === "Rows" && vr.success) {
            setRowsPassed(true);
          }
        }
        toast.success(scope === "Rows" ? "Row validation complete." : scope === "Columns" ? "Column validation complete." : "Intake re-uploaded and validated.");
      } else {
        const result = await api.createSession({
          practiceName: practiceName.trim(),
          sourceType: "ExcelIntake",
          intakeFile,
          validationScope: scope,
        });
        setSessionId(result.sessionId);
        setValidationResult(result.validationResult ?? null);
        if (validationMode === "ColumnsThenRows" && result.validationResult) {
          if (scope === "Columns" && result.validationResult.columnErrors.length === 0 && result.validationResult.columnValidatedCount > 0) {
            setColumnsPassed(true);
          } else if (scope === "Rows" && result.validationResult.success) {
            setRowsPassed(true);
          }
        }
        toast.success(scope === "Rows" ? "Row validation complete." : scope === "Columns" ? "Column validation complete." : "Session created.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setSubmitLoading(false);
      setValidationLoading(false);
    }
  }, [practiceName, intakeFile, sessionId, api, toast, validationMode, columnsPassed, rowsPassed]);

  const canProceedFromStep1 =
    !!sessionId &&
    !validationLoading &&
    (validationMode === "Full"
      ? validationResult?.success === true
      : columnsPassed && rowsPassed);

  const handleNextFromStep1 = () => {
    if (canProceedFromStep1) setStep(2);
  };

  const handleUploadPmReports = useCallback(async () => {
    if (!sessionId || pmFiles.length === 0) {
      toast.error("Please upload at least one PM report.");
      return;
    }
    setSubmitLoading(true);
    try {
      await api.uploadPmReports(sessionId, pmFiles);
      toast.success("PM reports uploaded.");
      setStep(3);
      const detail = await api.getSession(sessionId);
      setSessionDetail({
        sessionName: detail.sessionName,
        practiceName: detail.practiceName,
        uploadedBy: detail.uploadedBy ?? undefined,
        uploadedAt: detail.uploadedAt,
        sourceType: detail.sourceType,
        intakeTemplateFile: detail.intakeTemplateFile ?? undefined,
        pmSourceReportFiles: detail.pmSourceReportFiles ?? [],
        totalRows: detail.totalRows ?? undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload.");
    } finally {
      setSubmitLoading(false);
    }
  }, [sessionId, pmFiles, api, toast]);

  const handleStartAnalysis = useCallback(async () => {
    if (!sessionId) return;
    setSubmitLoading(true);
    try {
      await api.startAnalysis(sessionId);
      toast.success("AR Analysis started.");
      router.push(`/rcm/insurance-ar-analysis/${sessionId}/processing`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start.");
    } finally {
      setSubmitLoading(false);
    }
  }, [sessionId, api, toast, router]);

  useEffect(() => {
    if (step === 3 && sessionId && !sessionDetail) {
      api.getSession(sessionId).then((d) =>
        setSessionDetail({
          sessionName: d.sessionName,
          practiceName: d.practiceName,
          uploadedBy: d.uploadedBy ?? undefined,
          uploadedAt: d.uploadedAt,
          sourceType: d.sourceType,
          intakeTemplateFile: d.intakeTemplateFile ?? undefined,
          pmSourceReportFiles: d.pmSourceReportFiles ?? [],
          totalRows: d.totalRows ?? undefined,
        })
      );
    }
  }, [step, sessionId, sessionDetail, api]);

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      const date = d.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
      const time = d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${date}. ${time}`;
    } catch {
      return s;
    }
  };

  return (
    <PageShell
      breadcrumbs={[
        { label: "Insurance AR Analysis", href: "/rcm/insurance-ar-analysis" },
        { label: "Upload AR Intake" },
      ]}
      title="Data Upload and AR Analysis Session Creation"
      titleWrapperClassName="px-6 mt-4"
    >
      <div className="space-y-8 px-6 mt-5">
        <Stepper steps={steps} />

        {step === 1 && (
          <Card className="animate-fade-in-up overflow-hidden border-none">
          <div className="space-y-4 overflow-auto h-[calc(100vh-347px)]">
            <div className="space-y-3">
              <label className="block text-[14px] font-['Aileron'] font-medium text-foreground">Validation Mode</label>
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="validationMode"
                    checked={validationMode === "Full"}
                    onChange={() => {
                      setValidationMode("Full");
                      setColumnsPassed(false);
                      setRowsPassed(false);
                      setValidationResult(null);
                    }}
                    className="h-4 w-4 border-input text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-foreground">Full (recommended) — validates columns and rows in one step</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="validationMode"
                    checked={validationMode === "ColumnsThenRows"}
                    onChange={() => {
                      setValidationMode("ColumnsThenRows");
                      setColumnsPassed(false);
                      setRowsPassed(false);
                      setValidationResult(null);
                    }}
                    className="h-4 w-4 border-input text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-foreground">Columns first, then Rows — two-step validation</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[14px] font-['Aileron'] font-semibold text-foreground">Practice Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                placeholder="e.g., Medical Billing"
                className="h-11 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 text-[14px] font-['Aileron'] placeholder:text-muted-foreground focus-visible:outline-none"
              />
            </div>

            <div className="space-y-2 mt-2">
              <label className="block text-[14px] font-['Aileron'] font-semibold text-foreground">
                Upload AR Intake File
              </label>
              {!intakeFile ? (
                <div>
                  <FileUploadZone
                    label="Drag and Drop AR Intake File"
                    hint="Accepted formats: XLSX, XLS"
                    onFiles={(f) => setIntakeFile(f[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{intakeFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      File size: {(intakeFile.size / 1024).toFixed(1)}KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIntakeFile(null);
                      setValidationResult(null);
                      setValidationLoading(false);
                      setColumnsPassed(false);
                      setRowsPassed(false);
                    }}
                    className="ml-auto text-sm text-primary-600 hover:text-primary-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {validationResult && (
              <div className="pt-2">
              <ValidationStatus
                result={validationResult}
                loading={validationLoading}
                intakeFileName={intakeFile?.name}
                sessionId={sessionId}
                onReupload={() => {
                  setIntakeFile(null);
                  setValidationResult(null);
                  setColumnsPassed(false);
                  setRowsPassed(false);
                }}
                onDownloadDataValidationErrors={sessionId ? async () => {
                  try {
                    const blob = await api.downloadDataValidationErrors(sessionId);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "DataValidationErrors.xlsx";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Downloaded.");
                  } catch {
                    toast.error("File not available.");
                  }
                } : undefined}
              />
              </div>
            )}

 
          </div>
          <div className="flex flex-wrap gap-3 pt-4">
              <Button
                onClick={validationResult?.success ? handleNextFromStep1 : handleCreateSession}
                disabled={!practiceName.trim() || !intakeFile || submitLoading}
                className={validationResult?.success ? "h-10 rounded-[5px] py-3 px-[18px] gap-[5px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-['Aileron']" : undefined}
              >
                {submitLoading
                  ? "Validating…"
                  : validationResult?.success
                    ? "Next"
                    : validationMode === "ColumnsThenRows" && columnsPassed
                      ? "Validate Rows"
                      : validationMode === "ColumnsThenRows"
                        ? "Validate Columns"
                        : "Validate"}
                {validationResult?.success && !submitLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
              <Link href="/rcm/insurance-ar-analysis">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="animate-fade-in-up overflow-hidden border-none">
          <div className="h-[calc(100vh-348px)] overflow-auto">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">
                  Upload PM Source Reports (Required for Audit)
                </h3>
                <FileUploadZone
                  label="Drag and Drop PM Source Reports"
                  hint="Accepted formats: XLSX, XLS"
                  multiple
                  onFiles={setPmFiles}
                />
              </div>
              {pmFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Uploaded File(s)</h4>
                  <ul className="space-y-2">
                    {pmFiles.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 transition-colors"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{f.name}</p>
                          <p className="text-xs text-muted-foreground">
                            File size: {(f.size / 1024).toFixed(2)}KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPmFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-border hover:text-muted-foreground"
                          aria-label="Remove file"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-4">
              <Button
                onClick={handleUploadPmReports}
                disabled={pmFiles.length === 0 || submitLoading}
                className="h-10 rounded-[5px] py-3 px-[18px] gap-[5px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-['Aileron']"
              >
                {submitLoading ? "Uploading…" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Link href="/rcm/insurance-ar-analysis">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </div>
          </Card>
        )}

        {step === 3 && sessionDetail && (
          <Card className="animate-fade-in-up overflow-hidden border-none">
          <div className="h-[calc(100vh-348px)] overflow-auto">
            <div className="space-y-4">
              <h2 className="text-[18px] font-['Aileron'] font-semibold text-foreground">Review & Create Session</h2>
              <div className="space-y-0 px-2">
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Session Name</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">{sessionDetail.sessionName}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Practice Name</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">{sessionDetail.practiceName}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Uploaded by</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">{sessionDetail.uploadedBy ?? "—"}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Uploaded at</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">{formatDate(sessionDetail.uploadedAt)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Source Type</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">{sessionDetail.sourceType}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Intake Template File</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">{sessionDetail.intakeTemplateFile ?? "—"}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">PM Source Report File</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">
                    {sessionDetail.pmSourceReportFiles.length > 0 ? sessionDetail.pmSourceReportFiles.join(", ") : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-[14px] font-['Aileron'] text-muted-foreground">Total Rows</span>
                  <span className="text-[14px] font-['Aileron'] text-foreground text-right max-w-[60%]">
                    {sessionDetail.totalRows != null ? `${sessionDetail.totalRows} Rows` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                onClick={handleStartAnalysis}
                disabled={submitLoading}
                className="h-10 rounded-[5px] py-3 px-[18px] gap-[5px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-['Aileron'] text-[14px]"
              >
                {submitLoading ? "Starting…" : "Start AR Analysis"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Link href="/rcm/insurance-ar-analysis">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function ValidationStatus({
  result,
  loading,
  intakeFileName,
  sessionId,
  onReupload,
  onDownloadDataValidationErrors,
}: {
  result: ArIntakeValidationResult;
  loading: boolean;
  intakeFileName?: string;
  sessionId: string | null;
  onReupload: () => void;
  onDownloadDataValidationErrors?: () => Promise<void>;
}) {
  const colOk = result.columnValidatedCount > 0 && result.columnErrors.length === 0;
  const rowOk = result.rowValidatedCount > 0 && result.rowErrors.length === 0;
  const allErrors = [...result.columnErrors, ...result.rowErrors];

  return (
    <div className="space-y-4">
      <h4 className="font-bold text-foreground text-xl">
        {loading ? "Validation In Progress" : result.success ? "Validation Completed" : "Validation In Progress"}
      </h4>
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-4">
          <ValidationAnalysisIcon className="h-20 w-20" />
          <p className="text-sm font-medium text-foreground">
            No errors detected so far.
          </p>
          <p className="text-xs text-muted-foreground">
            Analyzing your intake file. This may take a moment.
          </p>
        </div>
      )}
      {!loading && result.success && (
        <p className="text-sm text-muted-foreground">
          Validation Completed. You can now move to the next step.
        </p>
      )}

      {intakeFileName && (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-foreground">{intakeFileName}</p>
            <p className="text-xs text-muted-foreground">Uploaded AR Intake File</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div>
            <p className="text-[#25213B]">
              {loading ? "Validating Column(s)" : "Column(s) Validation"}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary-600"
                  style={{ width: colOk ? "100%" : "10%" }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{colOk ? "Completed" : "10%"}</span>
            </div>
            {colOk ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-[#00A63E]">
                <svg className="h-7 w-7 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex flex-col">
                <span className="text-[16px]">Validation Successful! </span><span className="text-[#00A63E]">{result.columnValidatedCount} column(s) validated; no errors found</span>
              </div>
              </div>
            ) : result.columnErrors.length > 0 ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Validation Failed! {result.columnValidatedCount} columns validated; {result.columnErrors.length} columns have errors. Please fix them and re-upload the file to continue validation.
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-[#25213B]">
              {loading ? "Validating Row(s)" : "Row(s) Validation"}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary-600"
                  style={{ width: rowOk ? "100%" : result.rowValidatedCount > 0 ? "100%" : "10%" }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {rowOk || (result.rowValidatedCount > 0 && result.rowErrors.length > 0)
                  ? "Completed"
                  : "10%"}
              </span>
            </div>
            {rowOk ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-[#00A63E]">
                <svg className="h-7 w-7 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex flex-col">
                <span className="text-[16px]">Validation Successful! </span><span className="text-[#00A63E]">{result.rowValidatedCount} row(s) validated; no errors found</span>
              </div>
              </div>
            ) : result.rowErrors.length > 0 ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Validation Failed! {result.rowValidatedCount} rows validated; {result.rowErrors.length} rows have errors. Please fix them and re-upload the file to continue validation.
              </div>
            ) : null}
          </div>

          {allErrors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">
                {String(allErrors.length).padStart(2, "0")} Error(s) Found
              </p>
              <Table>
                <TableHead className="sticky top-0 z-20">
                  <TableRow>
                    <TableHeaderCell>Row No.</TableHeaderCell>
                    <TableHeaderCell>Column Name</TableHeaderCell>
                    <TableHeaderCell>Error Found</TableHeaderCell>
                    <TableHeaderCell>Correction</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allErrors.map((e: ArValidationError, i) => (
                    <TableRow key={i}>
                      <TableCell>{e.rowIndex ?? "—"}</TableCell>
                      <TableCell>{e.columnName}</TableCell>
                      <TableCell>{e.message}</TableCell>
                      <TableCell>{e.invalidValue ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 flex items-center gap-4">
                {onDownloadDataValidationErrors && (
                  <button
                    type="button"
                    onClick={onDownloadDataValidationErrors}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Download DataValidationErrors.xlsx
                  </button>
                )}
                <button
                  type="button"
                  onClick={onReupload}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Re-upload AR Intake Template
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
