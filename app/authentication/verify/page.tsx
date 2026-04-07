"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, MFA_USER_ID_KEY, MFA_VERIFIED_KEY, AUTH_COOKIE } from "@/lib/env";
import { useToast } from "@/lib/contexts/ToastContext";
import { usePermissionsOptional } from "@/lib/contexts/PermissionsContext";

export default function MfaVerifyPage() {
  const router = useRouter();
  const toast = useToast();
  const permissions = usePermissionsOptional();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const userId = sessionStorage.getItem(MFA_USER_ID_KEY);
    if (!userId) {
      router.replace("/login");
    }
  }, [mounted, router]);

  const handleBackToLogin = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(MFA_USER_ID_KEY);
    }
    router.push("/login");
    router.refresh();
  };

  const handleSendEmailOtp = async () => {
    const userId = typeof window !== "undefined" ? sessionStorage.getItem(MFA_USER_ID_KEY) : null;
    if (!userId) {
      toast.error("Session Expired", "Session expired. Please log in again.");
      return;
    }
    setSendingOtp(true);
    try {
      const res = await fetch(getApiUrl("/api/Auth/mfa/send-email-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string; title?: string; detail?: string };
        throw new Error(errData.message || errData.title || errData.detail || "Failed to send code");
      }
      toast.success("Code Sent", "Verification code has been sent to your email.");
    } catch (err) {
      toast.error("Send Failed", err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = typeof window !== "undefined" ? sessionStorage.getItem(MFA_USER_ID_KEY) : null;
    if (!userId || !code || code.length !== 6) {
      toast.error("Invalid Code", "Please enter a valid 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/Auth/mfa/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.title || "Verification failed");

      const payload = data.data ?? data;
      const token = payload.accessToken ?? data.accessToken;
      const refresh = payload.refreshToken ?? data.refreshToken;

      if (token && typeof window !== "undefined") {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
        document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
        sessionStorage.setItem(MFA_VERIFIED_KEY, "true");
        sessionStorage.removeItem(MFA_USER_ID_KEY);
        await permissions?.reload();
      }

      toast.success("Verified", "Verification successful.");
      const redirect = typeof window !== "undefined" ? sessionStorage.getItem("mfa_redirect") : null;
      if (typeof window !== "undefined") sessionStorage.removeItem("mfa_redirect");
      router.push(redirect?.startsWith("/") ? redirect : "/settings");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast.error("Verification Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-muted/50 via-background to-primary/10 p-6">
      <div className="mb-8 flex w-full max-w-lg items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white font-semibold shadow-md shadow-primary-600/25">
            E
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">EzRCM360</span>
        </div>
        <Button variant="secondary" onClick={handleBackToLogin}>
          Back to Login
        </Button>
      </div>

      <Card className="w-full max-w-lg overflow-hidden p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Multi-Factor Authentication
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          For security, verify your identity using your authenticator app.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-muted/50 p-6">
          <p className="text-sm font-medium text-foreground">Steps to verify</p>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">1</span>
              Open your authenticator app (Google Authenticator, Authy, etc.)
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">2</span>
              Locate the code for EzRCM360
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">3</span>
              Enter the 6-digit code below
            </li>
          </ol>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Prefer email?</span>
          <button
            type="button"
            onClick={handleSendEmailOtp}
            disabled={sendingOtp || loading}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {sendingOtp ? "Sending…" : "Send code to my email instead"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-foreground">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="input-enterprise mt-2 text-center text-lg tracking-[0.5em]"
              autoComplete="one-time-code"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying…" : "Verify & Continue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
