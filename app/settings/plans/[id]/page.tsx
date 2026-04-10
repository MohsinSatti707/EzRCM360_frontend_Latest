"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Building2, Tag } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { resolveEnum, ENUMS } from "@/lib/utils";
import { plansApi } from "@/lib/services/plans";
import { lookupsApi } from "@/lib/services/lookups";
import type { PlanDetailDto, UpdatePlanRequest } from "@/lib/services/plans";
import type { PayerLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Plans";

const STATUS_OPTIONS: { value: number; name: string }[] = [
  { value: 1, name: "Active" },
  { value: 0, name: "Inactive" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

function planCategoryLabel(val: number | string): string {
  const map: Record<string, string> = {
    "0": "Commercial",
    "1": "Medicaid",
    "2": "Medicare",
    "3": "MVA",
    "4": "Tricare",
    "5": "WC",
    "6": "HMO-Managed",
    "7": "Railroad Medicare",
    "8": "N/A",
    Commercial: "Commercial",
    Medicaid: "Medicaid",
    Medicare: "Medicare",
    MVA: "MVA",
    Tricare: "Tricare",
    WC: "WC",
    HmoManaged: "HMO-Managed",
    RailroadMedicare: "Railroad Medicare",
    Na: "N/A",
  };
  return map[String(val)] ?? String(val);
}

function planTypeLabel(val: number | string): string {
  const map: Record<string, string> = {
    "0": "HMO",
    "1": "PPO",
    "2": "EPO",
    "3": "POS",
    "4": "Part A",
    "5": "Part B",
    "6": "Part C",
    "7": "Part D",
    "8": "CHAMPUS",
    "9": "CHAMPVA",
    "10": "N/A",
    Hmo: "HMO",
    Ppo: "PPO",
    Epo: "EPO",
    Pos: "POS",
    PartA: "Part A",
    PartB: "Part B",
    PartC: "Part C",
    PartD: "Part D",
    CHAMPUS: "CHAMPUS",
    CHAMPVA: "CHAMPVA",
    Na: "N/A",
  };
  return map[String(val)] ?? String(val);
}

function marketTypeLabel(val: number | string | null | undefined): string {
  if (val == null) return "\u2014";
  const map: Record<string, string> = {
    "0": "Individual",
    "1": "Group",
    "2": "ASO",
    "3": "Fully Insured",
    "4": "Self Funded",
    Individual: "Individual",
    Group: "Group",
    Aso: "ASO",
    FullyInsured: "Fully Insured",
    SelfFunded: "Self Funded",
  };
  return map[String(val)] ?? String(val);
}

function nsaCategoryLabel(val: number | string | null | undefined): string {
  if (val == null) return "\u2014";
  const map: Record<string, string> = {
    "0": "None",
    "1": "State",
    "2": "Federal",
    None: "None",
    State: "State",
    Federal: "Federal",
  };
  return map[String(val)] ?? String(val);
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "\u2014";
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(val: number | null | undefined): string {
  if (val == null) return "\u2014";
  return `${val}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}

/* ------------------------------------------------------------------ */
/*  Info field component                                               */
/* ------------------------------------------------------------------ */

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-aileron text-[14px] text-[#202830]">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params.id === "string" ? params.id : "";
  const { canView, canUpdate, loading: permLoading } = useModulePermission(MODULE_NAME);

  const [plan, setPlan] = useState<PlanDetailDto | null>(null);
  const [payers, setPayers] = useState<PayerLookupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  /* ---- data fetching ---- */

  const fetchPlan = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await plansApi().getById(id);
      setPlan(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load plan details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    lookupsApi()
      .getPayers()
      .then(setPayers)
      .catch(() => setPayers([]));
  }, []);

  /* ---- status update ---- */

  const handleStatusChange = async (newStatus: string) => {
    if (!plan) return;
    const statusNum = Number(newStatus);
    const currentStatus = resolveEnum(plan.status, ENUMS.PayerStatus);
    if (statusNum === currentStatus) return;

    try {
      setStatusUpdating(true);
      const body: UpdatePlanRequest = {
        payerId: plan.payerId,
        planName: plan.planName,
        aliases: plan.aliases,
        planIdPrefix: plan.planIdPrefix,
        planCategory: resolveEnum(plan.planCategory, ENUMS.PlanCategory),
        planType: resolveEnum(plan.planType, ENUMS.PlanType),
        marketType: plan.marketType != null ? resolveEnum(plan.marketType, ENUMS.MarketType) : null,
        oonBenefits: plan.oonBenefits,
        planResponsibilityPct: plan.planResponsibilityPct,
        patientResponsibilityPct: plan.patientResponsibilityPct,
        typicalDeductible: plan.typicalDeductible,
        oopMax: plan.oopMax,
        nsaEligible: plan.nsaEligible,
        nsaCategory: plan.nsaCategory != null ? resolveEnum(plan.nsaCategory, ENUMS.NsaCategory) : null,
        providerParticipationApplicable: plan.providerParticipationApplicable,
        timelyFilingInitialDays: plan.timelyFilingInitialDays,
        timelyFilingResubmissionDays: plan.timelyFilingResubmissionDays,
        timelyFilingAppealDays: plan.timelyFilingAppealDays,
        status: statusNum,
      };
      await plansApi().update(id, body);
      setPlan((prev) => (prev ? { ...prev, status: statusNum } : prev));
      toast.success("Status updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  /* ---- derived values ---- */

  const statusNum = plan ? resolveEnum(plan.status, ENUMS.PayerStatus) : 1;
  const planName = plan?.planName ?? "";
  const initials = getInitials(planName);
  const categoryNum = plan ? resolveEnum(plan.planCategory, ENUMS.PlanCategory) : -1;
  const isCommercial = categoryNum === ENUMS.PlanCategory.Commercial;
  const payerName =
    payers.find((p) => p.id === plan?.payerId)?.payerName ?? plan?.payerId ?? "\u2014";

  /* ---- render ---- */

  if (permLoading || loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <AccessRestrictedContent />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground">{error ?? "Plan not found."}</p>
        <Button
          onClick={() => router.push("/settings/plans")}
          className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]"
        >
          Back to Plans
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      {/* Breadcrumb */}
      <div className="mb-5">
        <nav className="-mx-6 mb-4 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Link href="/settings" className="transition-colors hover:text-foreground">
            Settings &amp; Configurations
          </Link>
          <span aria-hidden>/</span>
          <Link href="/settings/plans" className="transition-colors hover:text-foreground">
            Plan Configurations
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{planName}</span>
        </nav>
      </div>

      {/* Header Card */}
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between">
          {/* Left: avatar + name + meta */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0066CC] text-lg font-bold text-white">
              {initials}
            </div>
            <div>
              <h1 className="font-aileron text-[20px] font-bold leading-tight text-[#202830]">
                {planName}
              </h1>
              <div className="mt-1 flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {payerName}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  {planCategoryLabel(plan.planCategory)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Edit button + status dropdown */}
          <div className="flex items-center gap-3">
            {canUpdate && (
              <Select
                value={String(statusNum)}
                onValueChange={handleStatusChange}
                disabled={statusUpdating}
              >
                <SelectTrigger className="w-[140px] h-10 border-[#E2E8F0] rounded-[5px] font-aileron text-[14px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!canUpdate && (
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  statusNum === 1
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {statusNum === 1 ? "Active" : "Inactive"}
              </span>
            )}
            {canUpdate && (
              <Button
                onClick={() => router.push("/settings/plans")}
                className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]"
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* General Information */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-aileron text-[16px] font-bold text-[#202830]">
          General Information
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {/* Row 1 */}
          <InfoField label="Plan Name" value={planName} />
          <InfoField label="Plan ID" value={plan.planIdPrefix || "\u2014"} />
          <InfoField label="Linked Payer" value={payerName} />

          {/* Row 2 */}
          <InfoField label="Plan Category" value={planCategoryLabel(plan.planCategory)} />
          <InfoField label="Plan Type" value={planTypeLabel(plan.planType)} />
          <InfoField
            label="Out-of-Network Benefits"
            value={
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  plan.oonBenefits
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {plan.oonBenefits ? "Yes" : "No"}
              </span>
            }
          />

          {/* Row 3 */}
          <InfoField
            label="NSA Eligible"
            value={
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  plan.nsaEligible
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {plan.nsaEligible ? "Yes" : "No"}
              </span>
            }
          />
          <InfoField label="NSA Category" value={nsaCategoryLabel(plan.nsaCategory)} />
          <InfoField
            label="Created At"
            value={formatDate((plan as Record<string, unknown>).createdAt as string)}
          />
        </div>
      </Card>

      {/* Commercial Intelligence — only for Commercial plans */}
      {isCommercial && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 font-aileron text-[16px] font-bold text-[#202830]">
            Commercial Intelligence
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {/* Row 1 */}
            <InfoField label="Market Type" value={marketTypeLabel(plan.marketType)} />
            <InfoField
              label="Out-of-Network Benefits"
              value={
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    plan.oonBenefits
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {plan.oonBenefits ? "Yes" : "No"}
                </span>
              }
            />
            <InfoField
              label="Plan Responsibility"
              value={formatPct(plan.planResponsibilityPct)}
            />

            {/* Row 2 */}
            <InfoField
              label="Patient Responsibility"
              value={formatPct(plan.patientResponsibilityPct)}
            />
            <InfoField
              label="Deductible"
              value={formatCurrency(plan.typicalDeductible)}
            />
            <InfoField label="OOP Max" value={formatCurrency(plan.oopMax)} />

            {/* Row 3 — Jurisdiction shown when NSA Eligible */}
            {plan.nsaEligible && (
              <InfoField
                label="Jurisdiction"
                value={nsaCategoryLabel(plan.nsaCategory)}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
