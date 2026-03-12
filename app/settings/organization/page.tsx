"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { getApiUrl } from "@/lib/api";
import { PhoneCall, Upload } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { organizationsApi } from "@/lib/services/organizations";
import { OrganizationIcon } from "@/lib/icons/OrganizationIcon";
import type {
  OrganizationProfileDto,
  UpdateCurrentOrganizationRequest,
} from "@/lib/services/organizations";
import { PageShell } from "@/components/layout/PageShell";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "—";
}

/** First letter of first two words only (e.g. "PrimeCare Billing Solutions" → "PB"). */
function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const chars = parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
  return chars.toUpperCase() || "—";
}

function formatId(id: string | null | undefined): string {
  if (!id || !id.trim()) return "—";
  if (id.length <= 20) return id;
  return `${id.slice(0, 8)}…`;
}

const DATE_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
  { value: "MM-DD-YYYY", label: "MM-DD-YYYY" },
];

const TIME_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: "HH:MM", label: "HH:MM (24h)" },
  { value: "HH:MM:SS", label: "HH:MM:SS (24h)" },
  { value: "hh:mm A", label: "hh:mm A (12h)" },
  { value: "hh:mm:ss A", label: "hh:mm:ss A (12h)" },
];

const TIME_ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Eastern Time (ET) – UTC −5 / UTC −4 (DST)", label: "Eastern Time (ET) – UTC −5 / UTC −4 (DST)" },
  { value: "Central Time (CT) – UTC −6 / UTC −5 (DST)", label: "Central Time (CT) – UTC −6 / UTC −5 (DST)" },
  { value: "Mountain Time (MT) – UTC −7 / UTC −6 (DST)", label: "Mountain Time (MT) – UTC −7 / UTC −6 (DST)" },
  { value: "Pacific Time (PT) – UTC −8 / UTC −7 (DST)", label: "Pacific Time (PT) – UTC −8 / UTC −7 (DST)" },
  { value: "UTC", label: "UTC" },
  { value: "", label: "—" },
];

function formatDateExample(format: string | null | undefined): string {
  if (!format) return "—";
  const d = new Date(2026, 0, 29); // 2026-01-29
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const mm = m;
  const dd = day;
  const map: Record<string, string> = {
    "YYYY-MM-DD": `${y}-${m}-${dd}`,
    "MM/DD/YYYY": `${mm}/${dd}/${y}`,
    "DD/MM/YYYY": `${dd}/${mm}/${y}`,
    "DD-MM-YYYY": `${dd}-${mm}-${y}`,
    "MM-DD-YYYY": `${mm}-${dd}-${y}`,
  };
  return map[format] ?? format;
}

function formatTimeExample(format: string | null | undefined): string {
  if (!format) return "—";
  const d = new Date(2026, 0, 29, 14, 45, 0); // 14:45
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const hh12 = String(h12).padStart(2, "0");
  const map: Record<string, string> = {
    "HH:MM": `${hh}:${mm}`,
    "HH:MM:SS": `${hh}:${mm}:${ss}`,
    "hh:mm A": `${hh12}:${mm} ${ampm}`,
    "hh:mm:ss A": `${hh12}:${mm}:${ss} ${ampm}`,
  };
  return map[format] ?? format;
}

export default function OrganizationPage() {
  const [profile, setProfile] = useState<OrganizationProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<UpdateCurrentOrganizationRequest>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const ALLOWED_LOGO_TYPES = ".png,.jpg,.jpeg,.pdf";
  const MAX_LOGO_MB = 5;
  const MAX_LOGO_BYTES = MAX_LOGO_MB * 1024 * 1024;

  const api = organizationsApi();
  const toast = useToast();
  const { canView, canUpdate } = useModulePermission("Organizations");

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getCurrent()
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load organization")
      )
      .finally(() => setLoading(false));
  }, []);

  const openEdit = () => {
    if (!profile) return;
    setForm({
      name: profile.name,
      primaryAdministratorUserId: profile.primaryAdministratorUserId ?? undefined,
      defaultTimeZone: profile.defaultTimeZone ?? undefined,
      systemDateFormat: profile.systemDateFormat ?? undefined,
      systemTimeFormat: profile.systemTimeFormat ?? undefined,
      logoUrl: profile.logoUrl ?? undefined,
    });
    setLogoFile(null);
    setFormError(null);
    setEditOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (logoFile && logoFile.size > MAX_LOGO_BYTES) {
      setFormError(`Logo must be ${MAX_LOGO_MB} MB or less.`);
      return;
    }
    setSubmitLoading(true);
    try {
      if (logoFile) {
        await api.updateCurrentWithForm(form, logoFile);
      } else {
        await api.updateCurrent(form);
      }
      const updated = await api.getCurrent();
      setProfile(updated);
      setEditOpen(false);
      toast.success("Saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Organization">
        <div className="h-80 animate-shimmer-bg rounded-xl" />
      </PageShell>
    );
  }

  if (!canView) {
    return (
      <PageShell breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Organization" }]} title="Organization">
        <Card className="p-6">
          <AccessRestrictedContent sectionName="Organization" />
        </Card>
      </PageShell>
    );
  }

  if (error || !profile) {
    return (
      <PageShell breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Organization" }]} title="Organization">
        <Card>
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error ?? "Organization not found."}
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Organization" }]}
      title="Organization"
      titleWrapperClassName="mb-5"
    >
      {/* Organization summary card - light grey bg, avatar light blue circle with dark blue initials */}
      <Card className="mb-5 overflow-hidden rounded-[5px] border-none bg-[#F8FAFC] shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-2xl font-semibold text-[#0066CC]">
            <span className="flex h-full w-full items-center justify-center">
              {getAvatarInitials(profile.name)}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center min-h-[64px]">
            <h2 className="font-aileron text-lg font-semibold leading-tight text-[#1F2937]">
              {profile.name}
            </h2>
            {(profile.phoneNumber != null && profile.phoneNumber !== "") && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-normal text-[#6B7280]">
                <PhoneCall className="h-4 w-4 shrink-0" aria-hidden />
                {profile.phoneNumber}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Organization Information */}
      <Card className="overflow-hidden border-none  shadow-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <OrganizationIcon className="h-5 w-5 text-[#6B7280]" />
          </div>
          <h3 className="text-[18px] font-semibold text-[#1F2937]">Organization Information</h3>
        </div>
        <div className="grid gap-x-10 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Organization Name
            </dt>
            <dd className="mt-1 text-sm font-medium text-[#1F2937]">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Primary Administrator
            </dt>
            <dd className="mt-1 text-sm font-medium text-[#1F2937]" title={profile.primaryAdministratorUserId ?? undefined}>
              {formatId(profile.primaryAdministratorUserId)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Default Time Zone
            </dt>
            <dd className="mt-1 text-sm text-[#1F2937]">
              {profile.defaultTimeZone ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              System Date Format
            </dt>
            <dd className="mt-1 text-sm text-[#1F2937]">
              {profile.systemDateFormat
                ? `${profile.systemDateFormat} → ${formatDateExample(profile.systemDateFormat)}`
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              System Time Format
            </dt>
            <dd className="mt-1 text-sm text-[#1F2937]">
              {profile.systemTimeFormat
                ? `${profile.systemTimeFormat} → ${formatTimeExample(profile.systemTimeFormat)}`
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Organization Status
            </dt>
            <dd className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.isActive ? "bg-emerald-50 text-emerald-700" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                {profile.isActive ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
        </div>
        {canUpdate && (
          <div className="border-t border-border px-6 py-5">
            <Button
              onClick={openEdit}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8]"
            >
              Edit
              <span aria-hidden>→</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Update Organization modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Organization"
        size="sm"
        position="right"
        footer={
          <ModalFooter
            onCancel={() => setEditOpen(false)}
            submitLabel="Update"
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Organization Name
              </label>
              <input
                type="text"
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-enterprise"
                placeholder="e.g. PrimeCare Billing Solutions"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Primary Administrator
              </label>
              <input
                type="text"
                value={form.primaryAdministratorUserId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primaryAdministratorUserId: e.target.value || undefined,
                  }))
                }
                className="input-enterprise"
                placeholder="User ID (e.g. RCM-12453 or Guid)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Default Time Zone
              </label>
              <select
                value={form.defaultTimeZone ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultTimeZone: e.target.value || undefined,
                  }))
                }
                className="input-enterprise"
              >
                {TIME_ZONE_OPTIONS.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {form.defaultTimeZone &&
                  !TIME_ZONE_OPTIONS.some((o) => o.value === form.defaultTimeZone) && (
                    <option value={form.defaultTimeZone}>{form.defaultTimeZone}</option>
                  )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                System Date Format
              </label>
              <div className="flex flex-wrap items-baseline gap-2">
                <select
                  value={form.systemDateFormat ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      systemDateFormat: e.target.value || undefined,
                    }))
                  }
                  className="input-enterprise"
                >
                  <option value="">—</option>
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {/* <span className="text-sm text-muted-foreground">
                  → {formatDateExample(form.systemDateFormat)}
                </span> */}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                System Time Format
              </label>
              <div className="flex flex-wrap items-baseline gap-2">
                <select
                  value={form.systemTimeFormat ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      systemTimeFormat: e.target.value || undefined,
                    }))
                  }
                  className="input-enterprise"
                >
                  <option value="">—</option>
                  {TIME_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {/* <span className="text-sm text-muted-foreground">
                  → {formatTimeExample(form.systemTimeFormat)}
                </span> */}
              </div>
            </div>
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                Upload Logo
              </h3>
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Supported Formats (PNG, JPG, PDF)</span>
                <span className="h-3 w-px bg-border" aria-hidden />
                <span>Maximum file size: {MAX_LOGO_MB} MB</span>
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-8 transition-colors hover:bg-[#F1F5F9] focus-within:border-primary-500 focus-within:outline-none focus-within:ring-1 focus-within:ring-primary-500">
                <Upload className="h-8 w-8 text-[#0066CC]" />
                <span className="text-sm font-medium text-[#0066CC]">Upload File(s)</span>
                <input
                  type="file"
                  accept={ALLOWED_LOGO_TYPES}
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              {logoFile && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Selected: {logoFile.name}
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
