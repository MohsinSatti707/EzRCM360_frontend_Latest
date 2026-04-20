"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/lib/api";
import { Upload } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { organizationsApi } from "@/lib/services/organizations";
import { OrganizationIcon } from "@/lib/icons/OrganizationIcon";
import { PhoneIcon } from "@/lib/icons/PhoneIcon";
import type {
  OrganizationProfileDto,
  UpdateCurrentOrganizationRequest,
} from "@/lib/services/organizations";
import { PageShell } from "@/components/layout/PageShell";
import { DrawerForm } from "@/components/ui/DrawerForm";
import { DrawerFooter } from "@/components/ui/ModalFooter";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";

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

const EMPLOYEE_COUNT_OPTIONS = [
  { value: "", label: "Select" },
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "501-1000", label: "501-1000" },
  { value: "1001-5000", label: "1001-5000" },
  { value: "5000+", label: "5000+" },
];

const COUNTRY_OPTIONS = [
  { value: "", label: "Select" },
  { value: "USA", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "UK", label: "United Kingdom" },
  { value: "India", label: "India" },
  { value: "Australia", label: "Australia" },
];

const COUNTRY_CODE_OPTIONS = [
  { code: "+1", flag: "🇺🇸", label: "+1" },
  { code: "+44", flag: "🇬🇧", label: "+44" },
  { code: "+91", flag: "🇮🇳", label: "+91" },
  { code: "+61", flag: "🇦🇺", label: "+61" },
  { code: "+1CA", flag: "🇨🇦", label: "+1" },
];

const ALLOWED_LOGO_TYPES = ".png,.jpg,.jpeg,.pdf";
const MAX_LOGO_MB = 5;
const MAX_LOGO_BYTES = MAX_LOGO_MB * 1024 * 1024;

/** Check if the organization has been fully set up (has meaningful data beyond defaults). */
function isOrgAdded(profile: OrganizationProfileDto): boolean {
  return !!(
    profile.industry ||
    profile.numberOfEmployees ||
    profile.primaryAddress ||
    profile.companyOverviewWebsite ||
    (profile.phoneNumber && profile.phoneNumber !== profile.name)
  );
}

/** Build a single-line address string from parts. */
function buildAddress(profile: OrganizationProfileDto): string {
  const parts = [
    profile.primaryAddress,
    profile.city,
    profile.state ? `${profile.state} ${profile.zipCode ?? ""}`.trim() : profile.zipCode,
    profile.country,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

export default function OrganizationPage() {
  const [profile, setProfile] = useState<OrganizationProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<UpdateCurrentOrganizationRequest>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Phone country code state for org phone
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  // Phone country code state for admin phone
  const [adminPhoneCountryCode, setAdminPhoneCountryCode] = useState("+1");
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");

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

  /** Parse a stored phone string like "+12124567890" into country code and number parts. */
  const parsePhone = (phone: string | null | undefined): { code: string; number: string } => {
    if (!phone) return { code: "+1", number: "" };
    // Try to match known country codes
    for (const cc of COUNTRY_CODE_OPTIONS) {
      if (phone.startsWith(cc.code)) {
        return { code: cc.code, number: phone.slice(cc.code.length) };
      }
    }
    return { code: "+1", number: phone };
  };

  const openEdit = () => {
    if (!profile) return;

    const orgPhone = parsePhone(profile.phoneNumber);
    const admPhone = parsePhone(profile.adminPhone);

    setForm({
      name: profile.name,
      industry: profile.industry ?? undefined,
      numberOfEmployees: profile.numberOfEmployees ?? undefined,
      primaryAddress: profile.primaryAddress ?? undefined,
      city: profile.city ?? undefined,
      state: profile.state ?? undefined,
      zipCode: profile.zipCode ?? undefined,
      country: profile.country ?? undefined,
      companyOverviewWebsite: profile.companyOverviewWebsite ?? undefined,
      adminFirstName: profile.adminFirstName ?? undefined,
      adminLastName: profile.adminLastName ?? undefined,
      adminJobTitle: profile.adminJobTitle ?? undefined,
      adminEmail: profile.adminEmail ?? undefined,
      logoUrl: profile.logoUrl ?? undefined,
    });

    setPhoneCountryCode(orgPhone.code);
    setPhoneNumber(orgPhone.number);
    setAdminPhoneCountryCode(admPhone.code);
    setAdminPhoneNumber(admPhone.number);

    setLogoFile(null);
    if (profile.logoUrl) {
      const url = profile.logoUrl.startsWith("http")
        ? profile.logoUrl
        : getApiUrl("/api/files/" + profile.logoUrl);
      setLogoPreview(url);
    } else {
      setLogoPreview(null);
    }
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (logoFile && logoFile.size > MAX_LOGO_BYTES) {
      setFormError(`Logo must be ${MAX_LOGO_MB} MB or less.`);
      return;
    }

    const payload: UpdateCurrentOrganizationRequest = {
      ...form,
      phoneNumber: phoneNumber ? `${phoneCountryCode}${phoneNumber}` : undefined,
      adminPhone: adminPhoneNumber ? `${adminPhoneCountryCode}${adminPhoneNumber}` : undefined,
    };

    setSubmitLoading(true);
    try {
      if (logoFile) {
        await api.updateCurrentWithForm(payload, logoFile);
      } else {
        await api.updateCurrent(payload);
      }
      const updated = await api.getCurrent();
      setProfile(updated);
      setDrawerOpen(false);
      toast.success("Organization Updated", "Organization settings have been saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
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

  const orgAdded = isOrgAdded(profile);

  return (
    <PageShell
      breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Organization" }]}
      title="Organization"
      titleWrapperClassName="mb-4 px-6"
    >
      {/* Organization summary card */}
      <Card className="mb-5 overflow-hidden rounded-[5px] border-none bg-[#F8FAFC] shadow-none mx-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-2xl font-semibold text-[#0066CC]">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl.startsWith("http") ? profile.logoUrl : getApiUrl("/api/files/" + profile.logoUrl)}
                alt={profile.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <span className={`flex h-full w-full items-center justify-center${profile.logoUrl ? " hidden" : ""}`}>
              {getAvatarInitials(profile.name)}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center min-h-[64px]">
            <h2 className="font-aileron text-lg font-bold leading-tight text-[#1F2937]">
              {profile.name}
            </h2>
            {orgAdded && profile.phoneNumber && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-normal text-[#6B7280]">
                <PhoneIcon className="h-4 w-4 shrink-0 text-[#64748B]" />
                {profile.phoneNumber}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Organization Information */}
      <Card className="overflow-auto border-none shadow-none mx-6 h-[calc(100vh-385px)]">
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <OrganizationIcon className="h-5 w-5 text-[#6B7280]" />
            <h3 className="text-[18px] font-bold text-[#1F2937]">Organization Information</h3>
          </div>
          {canUpdate && (
            <Button
              onClick={openEdit}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8]"
            >
              Edit <span aria-hidden>→</span>
            </Button>
          )}
        </div>

        <div className="grid gap-x-10 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Organization Name
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.name}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Industry
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.industry || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Number of Employees
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.numberOfEmployees || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Phone
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.phoneNumber || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Address
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {orgAdded ? buildAddress(profile) : "—"}
            </dd>
          </div>
        </div>
        <div className="px-6 pb-6">
          <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
            Company Overview Website
          </dt>
          <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
            {profile.companyOverviewWebsite || "—"}
          </dd>
        </div>

        {/* Account Administrator Information */}
        <div className="border-t border-border mx-6" />
        <div className="flex items-center gap-2 px-6 pt-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#6B7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3 className="text-[18px] font-bold text-[#1F2937]">Account Administrator Information</h3>
        </div>
        <div className="grid gap-x-10 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              First Name
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.adminFirstName || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Last Name
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.adminLastName || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Job Title
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.adminJobTitle || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Phone
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.adminPhone || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#64748B]">
              Work Email
            </dt>
            <dd className="mt-1 font-['Aileron'] text-[16px] font-normal leading-[160%] tracking-normal text-black">
              {profile.adminEmail || "—"}
            </dd>
          </div>
        </div>
      </Card>

      {/* Add / Edit Organization drawer */}
      <DrawerForm
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Edit Organization"
        footer={
          <DrawerFooter
            onCancel={() => setDrawerOpen(false)}
            submitLabel="Update"
            onSubmit={handleSubmit}
            loading={submitLoading}
            className="px-0 py-0"
          />
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          {/* Organization Information Section */}
          <h4 className="font-aileron text-[16px] font-bold text-[#1F2937] mb-3">
            Organization Information
          </h4>
          <div className="space-y-4">
            <Input
              label="Organization Name"
              required
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Medical Millennium Billing (MMB)"
            />
            <Input
              label="Industry"
              required
              value={form.industry ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              placeholder="e.g., Medical Billing"
            />
            <NativeSelect
              label="Number of Employees"
              required
              options={EMPLOYEE_COUNT_OPTIONS}
              value={form.numberOfEmployees ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, numberOfEmployees: e.target.value || undefined }))}
            />

            {/* Phone with country code */}
            <div>
              <Label required>Phone</Label>
              <div className="mt-1.5 flex h-[39px] overflow-hidden rounded-[5px] border border-[#E2E8F0] bg-background">
                <select
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="h-full border-r border-[#E2E8F0] bg-transparent px-3 text-[14px] focus:outline-none"
                >
                  {COUNTRY_CODE_OPTIONS.map((cc) => (
                    <option key={cc.code} value={cc.code}>
                      {cc.flag} {cc.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="212 - 456 - 7890"
                  className="h-full w-full bg-transparent px-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none"
                />
              </div>
            </div>

            <Input
              label="Primary Address (Suite #, Apartment #, and Street #)"
              required
              value={form.primaryAddress ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, primaryAddress: e.target.value }))}
              placeholder="e.g., Suite 204, 1827 Willow Creek Dr. San Jose"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                required
                value={form.city ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g., New York"
              />
              <Input
                label="State"
                required
                value={form.state ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="e.g, CA"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Zip Code"
                required
                value={form.zipCode ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="e.g., 95125"
              />
              <NativeSelect
                label="Country"
                required
                options={COUNTRY_OPTIONS}
                value={form.country ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value || undefined }))}
              />
            </div>
            <Input
              label="Company Overview Website"
              value={form.companyOverviewWebsite ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, companyOverviewWebsite: e.target.value }))}
              placeholder="www.example.com"
            />

            {/* Upload Logo */}
            <div>
              <Label>Upload Logo</Label>
              <div className="mt-1 mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Supported Formats (PNG, JPG, PDF)</span>
                <span className="h-3 w-px bg-border" aria-hidden />
                <span>Maximum file size: {MAX_LOGO_MB} MB</span>
              </div>
              <label className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden transition-colors hover:bg-[#F1F5F9] focus-within:border-primary-500 focus-within:outline-none focus-within:ring-1 focus-within:ring-primary-500" style={{ minHeight: logoPreview ? undefined : '120px' }}>
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full max-h-48 object-contain p-3"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition-opacity hover:opacity-100">
                      Change File
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <Upload className="h-8 w-8 text-[#0066CC]" />
                    <span className="text-sm font-medium text-[#0066CC]">Upload File(s)</span>
                  </div>
                )}
                <input
                  type="file"
                  accept={ALLOWED_LOGO_TYPES}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;
                    setLogoFile(file);
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    if (file.type.startsWith("image/")) {
                      setLogoPreview(URL.createObjectURL(file));
                    } else {
                      setLogoPreview(null);
                    }
                  }}
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

          {/* Account Administrator Information Section */}
          <h4 className="font-aileron text-[16px] font-bold text-[#1F2937] mt-6 mb-3">
            Account Administrator Information
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                value={form.adminFirstName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                placeholder="e.g., John"
              />
              <Input
                label="Last Name"
                required
                value={form.adminLastName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                placeholder="e.g, Doe"
              />
            </div>
            <Input
              label="Job Title"
              required
              disabled
              value={form.adminJobTitle ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, adminJobTitle: e.target.value }))}
              placeholder="e.g., Chief Executive Officer (CEO)"
            />

            {/* Admin Phone with country code */}
            <div>
              <Label required>Phone</Label>
              <div className="mt-1.5 flex h-[39px] overflow-hidden rounded-[5px] border border-[#E2E8F0] bg-background">
                <select
                  value={adminPhoneCountryCode}
                  onChange={(e) => setAdminPhoneCountryCode(e.target.value)}
                  className="h-full border-r border-[#E2E8F0] bg-transparent px-3 text-[14px] focus:outline-none"
                >
                  {COUNTRY_CODE_OPTIONS.map((cc) => (
                    <option key={cc.code} value={cc.code}>
                      {cc.flag} {cc.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={adminPhoneNumber}
                  onChange={(e) => setAdminPhoneNumber(e.target.value)}
                  placeholder="212 - 456 - 7890"
                  className="h-full w-full bg-transparent px-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none"
                />
              </div>
            </div>

            <Input
              label="Work Email"
              type="email"
              disabled
              value={form.adminEmail ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
              placeholder="nicolas.rito@example.com"
            />
          </div>
        </form>
      </DrawerForm>
    </PageShell>
  );
}
