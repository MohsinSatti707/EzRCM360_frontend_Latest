"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, User, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { entityProvidersApi } from "@/lib/services/entityProviders";
import { lookupsApi } from "@/lib/services/lookups";
import { resolveEnum, ENUMS } from "@/lib/utils";
import type { EntityProviderDetailDto } from "@/lib/services/entityProviders";
import type { EntityLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Entity Providers";

const PROVIDER_TYPES = [{ value: 0, name: "Physician" }, { value: 1, name: "Non-Physician" }];

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

export default function EntityProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params.id === "string" ? params.id : "";
  const { canView, canUpdate, loading: permLoading } = useModulePermission(MODULE_NAME);

  const [provider, setProvider] = useState<EntityProviderDetailDto | null>(null);
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    providerName: "",
    npi: "",
    ssn: "",
    providerType: 0,
    primarySpecialty: "",
    secondarySpecialty: "",
    entityId: "",
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProvider = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await entityProvidersApi().getById(id);
      setProvider(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load provider details.";
      setError(msg);
      toast.error("Load Failed", msg);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchProvider(); }, [fetchProvider]);
  useEffect(() => { lookupsApi().getEntities().then(setEntities).catch(() => setEntities([])); }, []);

  const openEdit = () => {
    if (!provider) return;
    setFormError(null);
    setForm({
      providerName: provider.providerName,
      npi: provider.npi,
      ssn: provider.ssn ?? "",
      providerType: resolveEnum(provider.providerType, ENUMS.ProviderType),
      primarySpecialty: provider.primarySpecialty ?? "",
      secondarySpecialty: provider.secondarySpecialty ?? "",
      entityId: provider.entityId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.providerName.trim() || !form.npi.trim() || !form.entityId) {
      setFormError("Provider name, NPI, and entity are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      await entityProvidersApi().update(id, {
        entityId: form.entityId,
        providerName: form.providerName,
        npi: form.npi,
        ssn: form.ssn || null,
        providerType: form.providerType,
        primarySpecialty: form.primarySpecialty || null,
        secondarySpecialty: form.secondarySpecialty || null,
        isActive: provider?.isActive ?? true,
      });
      setModalOpen(false);
      await fetchProvider();
      toast.success("Provider Updated", <>The provider, <strong>{form.providerName}</strong>, has been updated successfully.</>);
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
    if (!provider || !canUpdate) return;
    try {
      setStatusUpdating(true);
      await entityProvidersApi().update(id, {
        entityId: provider.entityId,
        providerName: provider.providerName,
        npi: provider.npi,
        ssn: provider.ssn ?? null,
        providerType: resolveEnum(provider.providerType, ENUMS.ProviderType),
        primarySpecialty: provider.primarySpecialty ?? null,
        secondarySpecialty: provider.secondarySpecialty ?? null,
        isActive,
      });
      setProvider((prev) => prev ? { ...prev, isActive } : prev);
      toast.success("Status Updated", <>Status for <strong>{provider.providerName}</strong> has been updated.</>);
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
  if (error || !provider) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground">{error ?? "Provider not found."}</p>
        <Button onClick={() => router.push("/settings/entity-providers")} className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]">
          Back to Providers
        </Button>
      </div>
    );
  }

  const initials = getInitials(provider.providerName);
  const providerTypeLabel = PROVIDER_TYPES.find((p) => p.value === resolveEnum(provider.providerType, ENUMS.ProviderType))?.name ?? "-";

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      {/* Breadcrumb */}
      <nav className="-mx-6 mb-5 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Link href="/settings" className="transition-colors hover:text-foreground">Settings &amp; Configurations</Link>
        <span aria-hidden>/</span>
        <Link href="/settings/entity-providers" className="transition-colors hover:text-foreground">Entity Providers</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{provider.providerName}</span>
      </nav>

      {/* Page Title */}
      <h1 className="mb-4 font-aileron text-[24px] font-bold text-[#202830]">Entity Provider Details</h1>

      {/* Header Card */}
      <div className="mb-6 rounded-[8px] border border-[#E2E8F0] bg-[#F7F8F9] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DBEAFE] text-lg font-bold text-[#3B82F6] font-aileron">
              {initials}
            </div>
            <div>
              <h2 className="font-aileron text-[20px] font-bold leading-tight text-[#202830]">{provider.providerName}</h2>
              <div className="mt-1 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                  <User className="h-4 w-4" />
                  <span>{providerTypeLabel}</span>
                </div>
                {provider.primarySpecialty && (
                  <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                    <FileText className="h-4 w-4" />
                    <span>{provider.primarySpecialty}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <select
            value={provider.isActive ? "1" : "0"}
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
        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Provider Name</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{provider.providerName || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Provider NPI</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{provider.npi || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Provider SSN</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{provider.ssn || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Provider Type</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{providerTypeLabel}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Primary Specialty</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{provider.primarySpecialty || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Secondary Specialty</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{provider.secondarySpecialty || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Linked Entity</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{provider.entityDisplayName || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Created At</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{formatDate(provider.createdAt)}</p>
          </div>
        </div>

        {canUpdate && (
          <div className="mt-6">
            <Button onClick={openEdit} className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]">
              Edit <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Update Provider Drawer */}
      {modalOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setModalOpen(false)} />
          {/* Drawer */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[500px] flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <h2 className="font-aileron text-[18px] font-bold text-[#202830]">Update Provider</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-[5px] border border-[#E2E8F0] p-1.5 hover:bg-[#F7F8F9] focus:outline-none">
                <X className="h-4 w-4 text-[#64748B]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {formError && (
                <div className="mb-4"><Alert variant="error">{formError}</Alert></div>
              )}
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Provider Name</label>
                  <input
                    type="text"
                    value={form.providerName}
                    onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))}
                    placeholder="e.g., Dr. John Smith"
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Provider NPI</label>
                  <input
                    type="text"
                    value={form.npi}
                    onChange={(e) => setForm((f) => ({ ...f, npi: e.target.value }))}
                    placeholder="e.g., 1234567890"
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Provider SSN</label>
                  <input
                    type="text"
                    value={form.ssn}
                    onChange={(e) => setForm((f) => ({ ...f, ssn: e.target.value }))}
                    placeholder="e.g., 222-00-4321"
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Provider Type</label>
                  <select
                    value={form.providerType}
                    onChange={(e) => setForm((f) => ({ ...f, providerType: Number(e.target.value) }))}
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0"
                  >
                    {PROVIDER_TYPES.map((p) => (
                      <option key={p.value} value={p.value}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Primary Specialty</label>
                  <input
                    type="text"
                    value={form.primarySpecialty}
                    onChange={(e) => setForm((f) => ({ ...f, primarySpecialty: e.target.value }))}
                    placeholder="e.g., Internal Medicine"
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Secondary Specialty</label>
                  <input
                    type="text"
                    value={form.secondarySpecialty}
                    onChange={(e) => setForm((f) => ({ ...f, secondarySpecialty: e.target.value }))}
                    placeholder="e.g., Cardiology"
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Linked Entity</label>
                  <select
                    value={form.entityId}
                    onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))}
                    className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] focus:outline-none focus:ring-0"
                  >
                    <option value="">Select Entity</option>
                    {entities.map((e) => (
                      <option key={e.id} value={e.id}>{e.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-[#E2E8F0] px-6 py-4">
              <Button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]"
              >
                {submitLoading ? "Saving…" : <> Update <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitLoading}
                className="h-10 rounded-[5px] border border-[#E2E8F0] px-[18px] font-aileron text-[14px] text-[#202830]"
              >
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
