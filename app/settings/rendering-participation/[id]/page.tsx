"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, User, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { renderingParticipationsApi } from "@/lib/services/renderingParticipations";
import { lookupsApi } from "@/lib/services/lookups";
import { resolveEnum, ENUMS, toDateInput } from "@/lib/utils";
import type { RenderingProviderPlanParticipationDetailDto } from "@/lib/services/renderingParticipations";
import type { EntityProviderLookupDto, PlanLookupDto, ValueLabelDto } from "@/lib/services/lookups";

const MODULE_NAME = "Rendering Provider Plan Participations";

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return "-"; }
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch { return "-"; }
}

export default function RenderingParticipationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params.id === "string" ? params.id : "";
  const { canView, canUpdate, loading: permLoading } = useModulePermission(MODULE_NAME);

  const [participation, setParticipation] = useState<RenderingProviderPlanParticipationDetailDto | null>(null);
  const [providers, setProviders] = useState<EntityProviderLookupDto[]>([]);
  const [plans, setPlans] = useState<PlanLookupDto[]>([]);
  const [participationStatuses, setParticipationStatuses] = useState<ValueLabelDto[]>([]);
  const [participationSources, setParticipationSources] = useState<ValueLabelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    entityProviderId: "",
    payerId: "",
    planId: "",
    participationStatus: 0,
    effectiveFrom: null as string | null,
    effectiveTo: null as string | null,
    source: 0,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchParticipation = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await renderingParticipationsApi().getById(id);
      setParticipation(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load participation details.";
      setError(msg);
      toast.error("Load Failed", msg);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchParticipation(); }, [fetchParticipation]);
  useEffect(() => {
    lookupsApi().getEntityProviders().then(setProviders).catch(() => setProviders([]));
    lookupsApi().getPlans().then(setPlans).catch(() => setPlans([]));
    lookupsApi().getParticipationStatuses().then(setParticipationStatuses).catch(() => setParticipationStatuses([]));
    lookupsApi().getParticipationSources().then(setParticipationSources).catch(() => setParticipationSources([]));
  }, []);

  const providerName = providers.find((p) => p.id === participation?.entityProviderId)?.displayName ?? "-";
  const planName = plans.find((p) => p.id === participation?.planId)?.displayName ?? "-";
  const statusLabel = participationStatuses.find((s) => Number(s.value) === resolveEnum(participation?.participationStatus ?? 0, ENUMS.ParticipationStatus))?.label ?? "-";

  const openEdit = () => {
    if (!participation) return;
    setFormError(null);
    setForm({
      entityProviderId: participation.entityProviderId,
      payerId: participation.payerId,
      planId: participation.planId,
      participationStatus: resolveEnum(participation.participationStatus, ENUMS.ParticipationStatus),
      effectiveFrom: participation.effectiveFrom ?? null,
      effectiveTo: participation.effectiveTo ?? null,
      source: resolveEnum(participation.source, ENUMS.ParticipationSource),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.planId) {
      setFormError("Plan is required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      await renderingParticipationsApi().update(id, {
        entityProviderId: form.entityProviderId,
        payerId: form.payerId,
        planId: form.planId,
        participationStatus: form.participationStatus,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo,
        source: form.source,
        isActive: participation?.isActive ?? true,
      });
      setModalOpen(false);
      await fetchParticipation();
      toast.success("Participation Updated", "The participation has been updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (isActive: boolean) => {
    if (!participation || !canUpdate) return;
    try {
      setStatusUpdating(true);
      await renderingParticipationsApi().update(id, {
        entityProviderId: participation.entityProviderId,
        payerId: participation.payerId,
        planId: participation.planId,
        participationStatus: resolveEnum(participation.participationStatus, ENUMS.ParticipationStatus),
        effectiveFrom: participation.effectiveFrom ?? null,
        effectiveTo: participation.effectiveTo ?? null,
        source: resolveEnum(participation.source, ENUMS.ParticipationSource),
        isActive,
      });
      setParticipation((prev) => prev ? { ...prev, isActive } : prev);
      toast.success("Status Updated", "The participation status has been updated.");
    } catch (err: unknown) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (permLoading || loading) {
    return <div className="flex min-h-0 flex-1 items-center justify-center"><Loader /></div>;
  }
  if (!canView) {
    return <div className="flex min-h-0 flex-1 flex-col px-6"><AccessRestrictedContent /></div>;
  }
  if (error || !participation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground">{error ?? "Participation not found."}</p>
        <Button onClick={() => router.push("/settings/rendering-participation")} className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]">
          Back to Participations
        </Button>
      </div>
    );
  }

  const initials = getInitials(providerName !== "-" ? providerName : "P P");

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      {/* Breadcrumb */}
      <nav className="-mx-6 mb-5 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Link href="/settings" className="transition-colors hover:text-foreground">Settings &amp; Configurations</Link>
        <span aria-hidden>/</span>
        <Link href="/settings/rendering-participation" className="transition-colors hover:text-foreground">Provider-Plan Participation</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{providerName}</span>
      </nav>

      {/* Page Title */}
      <h1 className="mb-4 font-aileron text-[24px] font-bold text-[#202830]">Provider-Plan Participation Details</h1>

      {/* Header Card */}
      <div className="mb-6 rounded-[8px]  bg-[#F7F8F9] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DBEAFE] text-lg font-bold text-[#3B82F6] font-aileron">
              {initials}
            </div>
            <div>
              <h2 className="font-aileron text-[20px] font-bold leading-tight text-[#202830]">{providerName}</h2>
              <div className="mt-1 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                  <User className="h-4 w-4" />
                  <span>{planName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                  <FileText className="h-4 w-4" />
                  <span>{statusLabel}</span>
                </div>
              </div>
            </div>
          </div>
          <select
            value={participation.isActive ? "1" : "0"}
            onChange={(e) => handleStatusChange(e.target.value === "1")}
            disabled={!canUpdate || statusUpdating}
            className="h-10 w-[130px] rounded-[5px] border border-[#E2E8F0] bg-white pl-3 pr-8 font-aileron text-[14px] text-[#202830] disabled:opacity-50 focus:outline-none focus:ring-0"
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>

      {/* General Information */}
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Image src="/icons/svg/admin.svg" alt="" width={16} height={16} />
          <h2 className="font-aileron text-[16px] font-bold text-[#202830]">General Information</h2>
        </div>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 ml-6">
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Provider</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{providerName}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Plan</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{planName}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Participation Status</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{statusLabel}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Effective From</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{formatDateOnly(participation.effectiveFrom)}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Effective To</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{formatDateOnly(participation.effectiveTo)}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Created At</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{formatDate(participation.createdAt)}</p>
          </div>
        </div>

        {canUpdate && (
          <div className="mt-6">
            <Button onClick={openEdit} className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px] ml-6">
              Edit <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Edit Drawer */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[500px] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <h2 className="font-aileron text-[18px] font-bold text-[#202830]">Update Participation</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-[5px] border border-[#E2E8F0] p-1.5 hover:bg-[#F7F8F9] focus:outline-none">
                <X className="h-4 w-4 text-[#64748B]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {formError && <div className="mb-4"><Alert variant="error">{formError}</Alert></div>}
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Provider</label>
                  <select value={form.entityProviderId} onChange={(e) => setForm((f) => ({ ...f, entityProviderId: e.target.value }))} className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0">
                    <option value="">Select provider</option>
                    {providers.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Plan</label>
                  <select
                    value={form.planId}
                    onChange={(e) => {
                      const planId = e.target.value;
                      const plan = plans.find((p) => p.id === planId);
                      setForm((f) => ({ ...f, planId, payerId: plan?.payerId ?? "" }));
                    }}
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0"
                  >
                    <option value="">Select plan</option>
                    {plans.filter((p) => !!p.payerId).map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Participation Status</label>
                  <select value={form.participationStatus} onChange={(e) => setForm((f) => ({ ...f, participationStatus: Number(e.target.value) }))} className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0">
                    {participationStatuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Effective From</label>
                  <input type="date" value={toDateInput(form.effectiveFrom ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value || null }))} className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Effective To</label>
                  <input type="date" value={toDateInput(form.effectiveTo ?? undefined)} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value || null }))} className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Source</label>
                  <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: resolveEnum(e.target.value, ENUMS.ParticipationSource) }))} className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0">
                    {participationSources.map((o) => <option key={o.value} value={String(resolveEnum(o.value, ENUMS.ParticipationSource))}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-[#E2E8F0] px-6 py-4">
              <Button onClick={handleSubmit} disabled={submitLoading} className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]">
                {submitLoading ? "Saving…" : <> Update <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitLoading} className="h-10 rounded-[5px] border border-[#E2E8F0] px-[18px] font-aileron text-[14px] text-[#202830]">
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}

      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
