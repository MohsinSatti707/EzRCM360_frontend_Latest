"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/lib/contexts/ToastContext";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordError =
    newPassword.length > 0 && newPassword.length < 6
      ? "Password must be at least 6 characters."
      : "";
  const confirmError =
    confirmPassword.length > 0 && newPassword !== confirmPassword
      ? "Passwords do not match."
      : "";
  const canSubmit =
    token &&
    newPassword.length >= 6 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !passwordError &&
    !confirmError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/Users/set-initial-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const message = data.message ?? data.title ?? data.detail;
      if (!res.ok) {
        const msg = message || "Failed to set password. The link may have expired.";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(message || "Password set successfully. You can now sign in.");
      router.push("/login?activated=1");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 via-background to-primary/10 p-6">
        <Card className="w-full max-w-md border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Image src="/logo.png" alt="EzRCM360" width={147} height={32} className="h-10 w-auto shrink-0" priority />
          </div>
          <h2 className="font-aileron text-2xl font-semibold tracking-tight text-foreground">Invalid or missing link</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            This set-password link is invalid or has expired. Please request a new invitation or contact your
            administrator.
          </p>
          <Link href="/login" className="mt-8 inline-block">
            <Button variant="primary">Go to sign in</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 via-background to-primary/10 p-6">
      <Card className="w-full max-w-md animate-fade-in-up overflow-hidden border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/logo.png" alt="EzRCM360" width={147} height={32} className="h-10 w-auto shrink-0" priority />
        </div>
        <h2 className="font-aileron text-2xl font-semibold tracking-tight text-foreground">Set Your Password</h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Create a password to activate your account and sign in.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200/50 animate-fade-in">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
              Set New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="input-enterprise w-full pr-20"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="input-enterprise w-full pr-20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {confirmError && <p className="mt-1 text-sm text-red-600">{confirmError}</p>}
          </div>
          <Button type="submit" disabled={!canSubmit || loading} className="w-full">
            {loading ? "Setting password…" : "Continue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 via-background to-primary/10 p-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
