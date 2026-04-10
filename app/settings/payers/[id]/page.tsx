"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
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
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { resolveEnum, ENUMS } from "@/lib/utils";
import { payersApi } from "@/lib/services/payers";
import { plansApi } from "@/lib/services/plans";
import { lookupsApi } from "@/lib/services/lookups";
import type { PayerDetailDto } from "@/lib/services/payers";
import type { PlanListItemDto } from "@/lib/services/plans";

const MODULE_NAME = "Payers";

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

function entityTypeName(val: number | string, lookup: { value: string; label: string }[]): string {
  const num = resolveEnum(val, ENUMS.PayerEntityType);
  return lookup.find((e) => Number(e.value) === num)?.label ?? String(val);
}

function planCategoryName(val: number | string, lookup: { value: string; label: string }[]): string {
  const num = resolveEnum(val, ENUMS.PlanCategory);
  return lookup.find((e) => Number(e.value) === num)?.label ?? String(val);
}

function planTypeName(val: number | string, lookup: { value: string; label: string }[]): string {
  const num = resolveEnum(val, ENUMS.PlanType);
  return lookup.find((e) => Number(e.value) === num)?.label ?? String(val);
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
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params.id === "string" ? params.id : "";
  const { canView, canUpdate, loading: permLoading } = useModulePermission(MODULE_NAME);

  const [payer, setPayer] = useState<PayerDetailDto | null>(null);
  const [plans, setPlans] = useState<PlanListItemDto[]>([]);
  const [entityTypes, setEntityTypes] = useState<{ value: string; label: string }[]>([]);
  const [planCategories, setPlanCategories] = useState<{ value: string; label: string }[]>([]);
  const [planTypes, setPlanTypes] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  /* ---- data fetching ---- */

  const fetchPayer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await payersApi().getById(id);
      setPayer(detail);

      // If Insurance payer, fetch linked plans
      const entityNum = resolveEnum(detail.entityType, ENUMS.PayerEntityType);
      if (entityNum === ENUMS.PayerEntityType.Insurance) {
        try {
          const planResult = await plansApi().getList({ payerId: id, pageSize: 200 });
          setPlans(planResult.items ?? []);
        } catch {
          setPlans([]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load payer details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchPayer();
  }, [fetchPayer]);

  useEffect(() => {
    lookupsApi().getPayerEntityTypes().then(setEntityTypes).catch(() => setEntityTypes([]));
    lookupsApi().getPlanCategories().then(setPlanCategories).catch(() => setPlanCategories([]));
    lookupsApi().getPlanTypes().then(setPlanTypes).catch(() => setPlanTypes([]));
  }, []);

  /* ---- status update ---- */

  const handleStatusChange = async (newStatus: string) => {
    if (!payer) return;
    const statusNum = Number(newStatus);
    const currentStatus = resolveEnum(payer.status, ENUMS.PayerStatus);
    if (statusNum === currentStatus) return;

    try {
      setStatusUpdating(true);
      await payersApi().update(payer.id, {
        payerName: payer.payerName,
        aliases: payer.aliases ?? "",
        entityType: resolveEnum(payer.entityType, ENUMS.PayerEntityType),
        insuranceSubCategory: payer.insuranceSubCategory != null
          ? resolveEnum(payer.insuranceSubCategory, ENUMS.PlanCategory)
          : null,
        status: statusNum,
        addresses: payer.addresses?.map((a) => ({
          addressLine1: a.addressLine1,
          addressLine2: a.addressLine2,
          city: a.city,
          state: a.state,
          zip: a.zip,
          label: a.label,
        })) ?? [],
        phoneNumbers: payer.phoneNumbers?.map((p) => ({
          phoneNumber: p.phoneNumber,
          label: p.label,
        })) ?? [],
        emails: payer.emails?.map((e) => ({
          emailAddress: e.emailAddress,
          label: e.label,
        })) ?? [],
      });
      setPayer((prev) => prev ? { ...prev, status: statusNum } : prev);
      toast.success("Status updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  /* ---- derived values ---- */

  const entityNum = payer ? resolveEnum(payer.entityType, ENUMS.PayerEntityType) : 0;
  const isInsurance = entityNum === ENUMS.PayerEntityType.Insurance;
  const statusNum = payer ? resolveEnum(payer.status, ENUMS.PayerStatus) : 1;
  const payerName = payer?.payerName ?? "";
  const initials = getInitials(payerName);
  const entityLabel = payer ? entityTypeName(payer.entityType, entityTypes) : "";

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

  if (error || !payer) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground">{error ?? "Payer not found."}</p>
        <Button
          onClick={() => router.push("/settings/payers")}
          className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]"
        >
          Back to Payers
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
          <Link href="/settings/payers" className="transition-colors hover:text-foreground">
            Payers Configurations
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{payerName}</span>
        </nav>
      </div>

      {/* Header Card */}
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between">
          {/* Left: avatar + name + entity badge */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0066CC] text-lg font-bold text-white">
              {initials}
            </div>
            <div>
              <h1 className="font-aileron text-[20px] font-bold leading-tight text-[#202830]">
                {payerName}
              </h1>
              <span className="mt-1 inline-block rounded-full bg-[#E8F0FE] px-3 py-0.5 text-xs font-medium text-[#0066CC]">
                {entityLabel}
              </span>
            </div>
          </div>

          {/* Right: status dropdown + edit button */}
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
                onClick={() => router.push(`/settings/payers?edit=${payerId}`)}
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
          {/* Payer Name */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payer Name
            </p>
            <p className="mt-1 font-aileron text-[14px] text-[#202830]">{payerName}</p>
          </div>
          {/* Aliases */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payer Aliases
            </p>
            <p className="mt-1 font-aileron text-[14px] text-[#202830]">
              {payer.aliases || "-"}
            </p>
          </div>
          {/* Entity Type */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payer Entity Type
            </p>
            <p className="mt-1 font-aileron text-[14px] text-[#202830]">{entityLabel}</p>
          </div>
        </div>
      </Card>

      {/* Conditional section: Insurance -> Linked Plans table, Non-insurance -> Contact Info */}
      {isInsurance ? (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 font-aileron text-[16px] font-bold text-[#202830]">
            Linked Plans
          </h2>
          {plans.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No plans linked to this payer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Plan Name</TableHeaderCell>
                    <TableHeaderCell>Plan ID</TableHeaderCell>
                    <TableHeaderCell>Plan Category</TableHeaderCell>
                    <TableHeaderCell>Plan Type</TableHeaderCell>
                    <TableHeaderCell>Out-of-Network Benefits</TableHeaderCell>
                    <TableHeaderCell>NSA Eligible</TableHeaderCell>
                    <TableHeaderCell className="w-[80px]">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <span className="font-medium text-[#202830]">{plan.planName}</span>
                      </TableCell>
                      <TableCell>{plan.planIdPrefix || "-"}</TableCell>
                      <TableCell>{planCategoryName(plan.planCategory, planCategories)}</TableCell>
                      <TableCell>{planTypeName(plan.planType, planTypes)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            plan.oonBenefits
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {plan.oonBenefits ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            plan.nsaEligible
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {plan.nsaEligible ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          title="View plan"
                          onClick={() => router.push(`/settings/plans/${plan.id}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F1F5F9] hover:text-[#0066CC]"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Addresses */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 font-aileron text-[16px] font-bold text-[#202830]">
              Addresses
            </h2>
            {(!payer.addresses || payer.addresses.length === 0) ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No addresses on file.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Address Line 1</TableHeaderCell>
                      <TableHeaderCell>City</TableHeaderCell>
                      <TableHeaderCell>State</TableHeaderCell>
                      <TableHeaderCell>Zip</TableHeaderCell>
                      <TableHeaderCell>Label</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payer.addresses.map((addr) => (
                      <TableRow key={addr.id}>
                        <TableCell>{addr.addressLine1}</TableCell>
                        <TableCell>{addr.city || "-"}</TableCell>
                        <TableCell>{addr.state || "-"}</TableCell>
                        <TableCell>{addr.zip || "-"}</TableCell>
                        <TableCell>{addr.label || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Phone Numbers */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 font-aileron text-[16px] font-bold text-[#202830]">
              Phone Numbers
            </h2>
            {(!payer.phoneNumbers || payer.phoneNumbers.length === 0) ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No phone numbers on file.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Phone Number</TableHeaderCell>
                      <TableHeaderCell>Label</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payer.phoneNumbers.map((phone) => (
                      <TableRow key={phone.id}>
                        <TableCell>{phone.phoneNumber}</TableCell>
                        <TableCell>{phone.label || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Emails */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 font-aileron text-[16px] font-bold text-[#202830]">
              Emails
            </h2>
            {(!payer.emails || payer.emails.length === 0) ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No email addresses on file.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Email Address</TableHeaderCell>
                      <TableHeaderCell>Label</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payer.emails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell>{email.emailAddress}</TableCell>
                        <TableCell>{email.label || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
