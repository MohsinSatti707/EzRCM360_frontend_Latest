"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, MFA_SETUP_USER_ID_KEY, MFA_VERIFIED_KEY, APP_NAME, AUTH_COOKIE } from "@/lib/env";
import { useToast } from "@/lib/contexts/ToastContext";
import { authenticator } from "@otplib/preset-default";
import QRCode from "qrcode";

type MfaMethod = "authenticator" | "email";

export default function MfaSetupPage() {
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState<MfaMethod>("authenticator");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const userId = sessionStorage.getItem(MFA_SETUP_USER_ID_KEY);
    const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (!userId || !token) {
      router.replace("/login");
      return;
    }
    generateSecretAndQr(userId);
  }, [mounted, router]);

  const generateSecretAndQr = async (userId: string) => {
    try {
      const newSecret = authenticator.generateSecret();
      setSecret(newSecret);
      const otpauth = authenticator.keyuri(`user-${userId.slice(0, 8)}`, APP_NAME, newSecret);
      const dataUrl = await QRCode.toDataURL(otpauth);
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate QR:", err);
      toast.error("Failed to generate setup code.");
    }
  };

  const handleBackToLogin = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(MFA_SETUP_USER_ID_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    router.push("/login");
    router.refresh();
  };

  const handleSendEmailCode = async () => {
    const userId = typeof window !== "undefined" ? sessionStorage.getItem(MFA_SETUP_USER_ID_KEY) : null;
    const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (!userId || !token) {
      toast.error("Session expired. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/Auth/mfa/enroll-email"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string; title?: string; detail?: string };
        throw new Error(errData.message || errData.title || errData.detail || "Failed to send code");
      }
      setEmailCodeSent(true);
      setMethod("email");
      toast.success("Verification code sent to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = typeof window !== "undefined" ? sessionStorage.getItem(MFA_SETUP_USER_ID_KEY) : null;
    if (!userId || !code || code.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }

    if (method === "email" && emailCodeSent) {
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
        }
        sessionStorage.removeItem(MFA_SETUP_USER_ID_KEY);
        sessionStorage.setItem(MFA_VERIFIED_KEY, "true");
        toast.success("MFA set up successfully with email verification.");
        const redirect = typeof window !== "undefined" ? sessionStorage.getItem("mfa_redirect") : null;
        if (typeof window !== "undefined") sessionStorage.removeItem("mfa_redirect");
        router.push(redirect?.startsWith("/") ? redirect : "/settings");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!secret) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    try {
      const isValid = authenticator.check(code, secret);
      if (!isValid) {
        toast.error("Invalid code. The code may have expired. Please try again.");
        return;
      }
    } catch {
      toast.error("Invalid code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/authenticator/set-auth-token"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}`,
        },
        body: JSON.stringify({ userId, token: secret }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.title || "Failed to save authenticator");
      }

      if (typeof window !== "undefined") {
        document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
      }
      sessionStorage.removeItem(MFA_SETUP_USER_ID_KEY);
      sessionStorage.setItem(MFA_VERIFIED_KEY, "true");
      toast.success("MFA set up successfully. You will be asked to verify on your next login.");
      const redirect = typeof window !== "undefined" ? sessionStorage.getItem("mfa_redirect") : null;
      if (typeof window !== "undefined") sessionStorage.removeItem("mfa_redirect");
      router.push(redirect?.startsWith("/") ? redirect : "/settings");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface p-4">
      <div className="mb-4 flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
            E
          </div>
          <span className="text-xl font-semibold text-foreground">EzRCM360</span>
        </div>
        <Button variant="secondary" onClick={handleBackToLogin}>
          Back to Login
        </Button>
      </div>

      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-foreground">
          Multi-Factor Authentication Setup
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {method === "email" && emailCodeSent
            ? "Enter the 6-digit code sent to your email."
            : "Set up MFA using an authenticator app or receive codes by email."}
        </p>

        {method === "authenticator" && !emailCodeSent && (
          <div className="mt-6 rounded-lg bg-muted p-4">
            <h2 className="text-sm font-semibold text-foreground">Scan the QR Code</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Open your authenticator app (Google Authenticator, Authy, etc.) and scan this code.
            </p>
            <div className="mt-4 flex justify-center bg-card p-4 rounded-lg">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="h-48 w-48" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded bg-muted text-sm text-muted-foreground">
                  Loading…
                </div>
              )}
            </div>
          </div>
        )}

        {method === "authenticator" && !emailCodeSent && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Or</span>
            <button
              type="button"
              onClick={handleSendEmailCode}
              disabled={loading}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
            >
              Send code to my email instead
            </button>
          </div>
        )}

        {(method === "email" && emailCodeSent) && (
          <p className="mt-4 text-sm text-muted-foreground">
            Check your inbox and enter the 6-digit code below. The code expires in 10 minutes.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-foreground">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 text-center text-lg tracking-[0.5em] shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              autoComplete="one-time-code"
            />
          </div>
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Setting up…" : "Complete setup"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
