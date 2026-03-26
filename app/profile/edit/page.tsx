"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/lib/contexts/ToastContext";
import { profileApi, type UserProfileDto, type UpdateMyProfileRequest } from "@/lib/services/profile";

const ALLOWED_TYPES = ".png,.jpg,.jpeg,.webp";
const MAX_MB = 2;
const MAX_BYTES = MAX_MB * 1024 * 1024;

function getInitials(name: string, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || "?";
  }
  return (email || "U")[0].toUpperCase();
}

export default function EditProfilePage() {
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateMyProfileRequest & { newPassword?: string; confirmPassword?: string }>({
    userName: "",
    email: "",
  });
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  const api = profileApi();
  const toast = useToast();

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getMe()
      .then((p) => {
        setProfile(p);
        setForm({ userName: p.userName ?? "", email: p.email ?? "" });
        const nameParts = (p.userName ?? "").trim().split(/\s+/).filter(Boolean);
        setFirstName(nameParts[0] ?? "");
        setLastName(nameParts.slice(1).join(" "));
        setJobTitle(typeof p.role === "string" ? p.role : "");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!profile) return;
    const combinedName = `${firstName} ${lastName}`.trim();
    if (!combinedName) {
      setFormError("First name and Last name are required.");
      return;
    }
    if (!form.email?.trim()) {
      setFormError("Email is required.");
      return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setFormError("New password must be at least 6 characters.");
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitLoading(true);
    try {
      if (pictureFile) {
        if (pictureFile.size > MAX_BYTES) {
          setFormError(`Profile picture must be ${MAX_MB} MB or less.`);
          setSubmitLoading(false);
          return;
        }
        await api.uploadProfilePicture(pictureFile);
      }
      await api.updateMe({
        userName: combinedName,
        email: form.email?.trim() ?? undefined,
        newPassword: form.newPassword?.trim() || undefined,
      });
      setPictureFile(null);
      loadProfile();
      toast.success("Profile updated successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const profilePictureUrl = profile?.profilePictureUrl;
  const avatarSrc = profilePictureUrl
    ? profilePictureUrl.startsWith("http")
      ? profilePictureUrl
      : getApiUrl(`/api/files/${profilePictureUrl}`)
    : null;

  if (loading) {
    return (
      <PageShell title="Edit Profile">
        <div className="h-80 animate-shimmer-bg rounded-xl" />
      </PageShell>
    );
  }

  if (error || !profile) {
    return (
      <PageShell title="Edit Profile">
        <Card className="p-6">
          <p className="text-sm text-red-600">{error ?? "Profile not found."}</p>
          <Button variant="secondary" className="mt-4" onClick={loadProfile}>
            Retry
          </Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title=""
      titleWrapperClassName="mb-4 px-6"
      description=""
    >
      <Card className="mx-6 w-[96%] animate-fade-in-up border-none bg-[linear-gradient(120deg,rgba(226,232,240,0.12)_25%,transparent_25%,transparent_50%,rgba(226,232,240,0.12)_50%,rgba(226,232,240,0.12)_75%,transparent_75%,transparent)] bg-[length:64px_64px] px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center pt-1">
            <div className="group relative flex h-20 w-20 shrink-0 items-center justify-center text-2xl font-medium text-primary-700">
              <div className="h-full w-full overflow-hidden rounded-full bg-primary-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
                ) : pictureFile ? (
                  <img src={URL.createObjectURL(pictureFile)} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {getInitials(profile.userName ?? "", profile.email ?? "")}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => profileImageInputRef.current?.click()}
                className="absolute bottom-[-1px] left-[67px] z-30 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0066CC] shadow-sm"
                aria-label="Add profile picture"
                title="Add profile picture"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <input
              ref={profileImageInputRef}
              type="file"
              accept={ALLOWED_TYPES}
              className="hidden"
              onChange={(e) => setPictureFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-3 font-aileron text-[20px] font-bold leading-none text-[#2A2C33]">{`${firstName} ${lastName}`.trim() || "—"}</p>
            <p className="mt-1 font-aileron text-[15px] leading-none text-[#64748B]">{form.email ?? "—"}</p>
          </div>

          <div className="max-h-[calc(100vh-400px)] overflow-auto border-t border-[#E2E8F0] pt-6 pr-1">
            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block font-aileron text-[14px] leading-none text-[#2A2C33]">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5 block h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block font-aileron text-[14px] leading-none text-[#2A2C33]">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5 block h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div>
                <label className="block font-aileron text-[14px] leading-none text-[#2A2C33]">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1.5 block h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] text-[#2A2C33] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="email" className="block font-aileron text-[14px] leading-none text-[#2A2C33]">
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="mt-1.5 block h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div>
                <label className="block font-aileron text-[14px] leading-none text-[#2A2C33]">Phone</label>
                <div className="mt-1.5 flex h-[39px] overflow-hidden rounded-[5px] border border-[#E2E8F0] bg-background">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="h-full border-r border-[#E2E8F0] bg-transparent px-3 text-[14px] focus:outline-none"
                  >
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+91">+91</option>
                  </select>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="212 456 7890"
                    className="h-full w-full bg-transparent px-4 font-aileron text-[14px] placeholder:text-[#94A3B8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-aileron text-[14px] leading-none text-[#2A2C33]">Password</label>
                <div className="mt-1.5 flex h-[39px] items-center justify-between rounded-[5px] border border-[#E2E8F0] bg-background px-4">
                  <span className="font-aileron text-[14px] text-[#94A3B8]">*************</span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields((prev) => !prev)}
                    className="font-aileron text-[14px] text-[#0066CC] hover:text-[#0066CC]/80"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            {showPasswordFields && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="newPassword" className="block font-aileron text-[14px] leading-none text-[#2A2C33]">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={form.newPassword ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                    className="mt-1.5 block h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block font-aileron text-[14px] leading-none text-[#2A2C33]">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    className="mt-1.5 block h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            )}

          </div>

          <div className="mt-5 border-t border-[#E2E8F0] pt-4">
            <div className="flex gap-3">
              <Button type="submit" disabled={submitLoading} className="h-10 rounded-[5px] px-[18px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]">
                {submitLoading ? "Saving…" : "Update Profile"}
                {!submitLoading && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
