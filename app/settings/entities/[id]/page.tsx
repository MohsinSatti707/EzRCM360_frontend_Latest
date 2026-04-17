"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { entitiesApi } from "@/lib/services/entities";
import { resolveEnum, ENUMS } from "@/lib/utils";
import type { EntityDetailDto } from "@/lib/services/entities";

const MODULE_NAME = "Entities";

const STATUS_OPTIONS = [
  { value: 0, name: "Inactive" },
  { value: 1, name: "Active" },
];

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

export default function EntityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params.id === "string" ? params.id : "";
  const { canView, canUpdate, loading: permLoading } = useModulePermission(MODULE_NAME);

  const [entity, setEntity] = useState<EntityDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Edit drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ legalName: "", displayName: "", groupNpi: "", taxId: "" });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEntity = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await entitiesApi().getById(id);
      setEntity(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load entity details.";
      setError(msg);
      toast.error("Load Failed", msg);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchEntity(); }, [fetchEntity]);

  const openEdit = () => {
    if (!entity) return;
    setFormError(null);
    setForm({
      legalName: entity.legalName,
      displayName: entity.displayName,
      groupNpi: entity.groupNpi,
      taxId: entity.taxId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.legalName.trim() || !form.displayName.trim() || !form.groupNpi.trim() || !form.taxId.trim()) {
      setFormError("All fields are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      await entitiesApi().update(id, {
        legalName: form.legalName,
        displayName: form.displayName,
        groupNpi: form.groupNpi,
        taxId: form.taxId,
        status: resolveEnum(entity?.status ?? 1, ENUMS.EntityStatus),
      });
      setModalOpen(false);
      await fetchEntity();
      toast.success("Entity Updated", <>The entity, <strong>{form.legalName}</strong>, has been updated successfully.</>);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: number) => {
    if (!entity || !canUpdate) return;
    try {
      setStatusUpdating(true);
      await entitiesApi().update(id, {
        legalName: entity.legalName,
        displayName: entity.displayName,
        groupNpi: entity.groupNpi,
        taxId: entity.taxId,
        status: newStatus,
      });
      setEntity((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast.success("Status Updated", <>Status for <strong>{entity.legalName}</strong> has been updated.</>);
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
  if (error || !entity) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground">{error ?? "Entity not found."}</p>
        <Button onClick={() => router.push("/settings/entities")} className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]">
          Back to Entities
        </Button>
      </div>
    );
  }

  const initials = getInitials(entity.legalName);
  const statusNum = resolveEnum(entity.status, ENUMS.EntityStatus);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      {/* Breadcrumb */}
      <nav className="-mx-6 mb-5 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Link href="/settings" className="transition-colors hover:text-foreground">Settings &amp; Configurations</Link>
        <span aria-hidden>/</span>
        <Link href="/settings/entities" className="transition-colors hover:text-foreground">Entity Information</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{entity.legalName}</span>
      </nav>

      {/* Page Title */}
      <h1 className="mb-4 font-aileron text-[24px] font-bold text-[#202830]">Entity Details</h1>

      {/* Header Card */}
      <div className="mb-6 rounded-[8px] border border-[#E2E8F0] bg-[#F7F8F9] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DBEAFE] text-lg font-bold text-[#3B82F6] font-aileron">
              {initials}
            </div>
            <div>
              <h2 className="font-aileron text-[20px] font-bold leading-tight text-[#202830]">{entity.legalName}</h2>
              <div className="mt-1 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                  <FileText className="h-4 w-4" />
                  <span>{entity.groupNpi || "-"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                  <Users className="h-4 w-4" />
                  <span>{entity.taxId || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          <select
            value={statusNum}
            onChange={(e) => handleStatusChange(Number(e.target.value))}
            disabled={!canUpdate || statusUpdating}
            className="h-10 w-[130px] rounded-[5px] border border-[#E2E8F0] bg-white pl-3 pr-8 font-aileron text-[14px] text-[#202830] disabled:opacity-50 focus:outline-none focus:ring-0"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* General Information */}
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#64748B]" />
          <h2 className="font-aileron text-[16px] font-bold text-[#202830]">General Information</h2>
        </div>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Entity Legal Name</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{entity.legalName || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Entity Display Name</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{entity.displayName || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Entity Group NPI</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{entity.groupNpi || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Entity Tax ID</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{entity.taxId || "-"}</p>
          </div>
          <div>
            <p className="text-[12px] font-aileron font-medium text-[#64748B] tracking-wide">Created At</p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">{formatDate(entity.createdAt)}</p>
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

      {/* Update Entity Drawer */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[500px] flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <h2 className="font-aileron text-[18px] font-bold text-[#202830]">Update Entity</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-[5px] border border-[#E2E8F0] p-1.5 hover:bg-[#F7F8F9] focus:outline-none">
                <X className="h-4 w-4 text-[#64748B]" />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {formError && <div className="mb-4"><Alert variant="error">{formError}</Alert></div>}
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Entity Legal Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} placeholder="e.g., MedixBilling Solutions" className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Entity Display Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="e.g., MedixBilling" className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Entity Group NPI <span className="text-red-500">*</span></label>
                  <input type="text" value={form.groupNpi} onChange={(e) => setForm((f) => ({ ...f, groupNpi: e.target.value }))} placeholder="e.g., 1987654321" className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="mb-1.5 block font-aileron text-[14px] font-medium text-[#202830]">Entity Tax ID <span className="text-red-500">*</span></label>
                  <input type="text" value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} placeholder="e.g., 98-7654321" className="h-10 w-full rounded-[5px] border border-[#E2E8F0] bg-background px-3 font-aileron text-[14px] text-[#202830] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0" />
                </div>
              </div>
            </div>
            {/* Footer */}
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
