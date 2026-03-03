"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { organizationsApi } from "@/lib/services/organizations";
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
      description="Manage organization profile and preferences."
    >
      {/* Summary card - design: bg-[#F7F8F9] rounded-[5px] h-[120px] */}
      <Card className="mb-8 overflow-hidden animate-fade-in-up rounded-[5px] border border-border bg-[#F7F8F9]">
        <div className="flex flex-col sm:flex-row">
          <div className="flex min-h-[120px] min-w-[140px] items-center justify-center p-6">
            <div className="flex h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-primary-600 text-2xl font-semibold text-white shadow-lg shadow-primary-600/20">
              {profile.logoUrl ? (
                <img
                  src={
                    profile.logoUrl.startsWith("http")
                      ? profile.logoUrl
                      : getApiUrl(`/api/files/${profile.logoUrl}`)
                  }
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">{getInitials(profile.name)}</span>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center px-6 py-5">
            <h2 className="font-aileron text-xl font-bold leading-none text-[#202830]">{profile.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Organization profile and settings
            </p>
          </div>
        </div>
      </Card>

      {/* Organization Information - design style */}
      <Card className="overflow-hidden animate-fade-in-up stagger-1 border border-border bg-card">
        <div className="flex min-h-[80px] items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-foreground">Organization Information</h3>
        </div>
        <div className="grid gap-x-10 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Organization Name
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Primary Administrator
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground" title={profile.primaryAdministratorUserId ?? undefined}>
              {formatId(profile.primaryAdministratorUserId)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Default Time Zone
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {profile.defaultTimeZone ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              System Date Format
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {profile.systemDateFormat
                ? `${profile.systemDateFormat} (e.g. ${formatDateExample(profile.systemDateFormat)})`
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              System Time Format
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {profile.systemTimeFormat
                ? `${profile.systemTimeFormat} (e.g. ${formatTimeExample(profile.systemTimeFormat)})`
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Organization Status
            </dt>
            <dd className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {profile.isActive ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
        </div>
        {canUpdate && (
          <div className="border-t border-border px-6 py-5">
            <Button onClick={openEdit} className="inline-flex items-center gap-2">
              Edit Organization
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
        )}
      </Card>

      {/* Update Organization modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Organization"
        size="lg"
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
                <span className="text-sm text-muted-foreground">
                  → {formatDateExample(form.systemDateFormat)}
                </span>
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
                <span className="text-sm text-muted-foreground">
                  → {formatTimeExample(form.systemTimeFormat)}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Upload Logo
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                Supported Formats (PNG, JPG, PDF) | Maximum file size: {MAX_LOGO_MB} MB
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload File(s)
                <input
                  type="file"
                  accept={ALLOWED_LOGO_TYPES}
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              {logoFile && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Selected: {logoFile.name}
                </p>
              )}
            </div>
          </div>
          <ModalFooter
            onCancel={() => setEditOpen(false)}
            submitLabel="Update"
            onSubmit={handleSubmit}
            loading={submitLoading}
          />
        </form>
      </Modal>
    </PageShell>
  );
}
