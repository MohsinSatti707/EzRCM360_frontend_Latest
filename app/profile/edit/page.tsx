"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
    if (!form.userName?.trim()) {
      setFormError("User name is required.");
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
        userName: form.userName?.trim() ?? undefined,
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
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: "Edit Profile" },
      ]}
      title="Edit Profile"
      description="Update your basic details and profile picture."
    >
      <Card className="max-w-2xl animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {formError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-foreground">Profile Picture</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-2xl font-medium text-primary-700">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : pictureFile ? (
                  <img
                    src={URL.createObjectURL(pictureFile)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(profile.userName ?? "", profile.email ?? "")
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
                  onChange={(e) => setPictureFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, JPEG or WebP. Max {MAX_MB} MB.
                </p>
              </div>
            </div>
          </div>

          {/* User Name */}
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-foreground">
              User Name
            </label>
            <input
              id="userName"
              type="text"
              value={form.userName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
              required
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* New Password (optional) */}
          <div className="space-y-4 border-t border-border pt-6">
            <p className="text-sm font-medium text-foreground">Change Password (optional)</p>
            <div>
              <label htmlFor="newPassword" className="block text-sm text-muted-foreground">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={form.newPassword ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Leave blank to keep current"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-muted-foreground">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitLoading}>
              {submitLoading ? "Saving…" : "Save Changes"}
            </Button>
            <Link href="/settings">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
