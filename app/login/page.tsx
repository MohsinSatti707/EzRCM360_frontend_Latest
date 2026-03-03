"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, MFA_USER_ID_KEY, MFA_SETUP_USER_ID_KEY, AUTH_COOKIE } from "@/lib/env";
import { useToast } from "@/lib/contexts/ToastContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const redirectTo = searchParams.get("redirect") ?? "/settings";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/Auth/authenticate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.title || "Login failed");

      const payload = data.data ?? data;
      const requiresMfa = payload.requiresMfa === true || payload.RequiresMfa === true;
      const requiresMfaSetup = payload.requiresMfaSetup === true || payload.RequiresMfaSetup === true;
      const userId = payload.userId ?? payload.UserId;

      if (requiresMfa && userId && typeof window !== "undefined") {
        sessionStorage.setItem(MFA_USER_ID_KEY, userId);
        sessionStorage.setItem("mfa_redirect", redirectTo);
        router.push("/authentication/verify");
        router.refresh();
        return;
      }

      const token = payload.accessToken ?? payload.AccessToken ?? data.accessToken;
      const refresh = payload.refreshToken ?? payload.RefreshToken ?? data.refreshToken;

      if (requiresMfaSetup && userId && token && typeof window !== "undefined") {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
        document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
        sessionStorage.setItem(MFA_SETUP_USER_ID_KEY, userId);
        sessionStorage.setItem("mfa_redirect", redirectTo);
        toast.success("Please set up Multi-Factor Authentication.");
        router.push("/authentication/setup");
        router.refresh();
        return;
      }

      if (token && typeof window !== "undefined") {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
        document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
      }
      toast.success("Signed in successfully.");
      router.push(redirectTo.startsWith("/") ? redirectTo : "/settings");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <Card className="w-full max-w-md animate-fade-in-up overflow-hidden border border-border bg-card p-8 shadow-none">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-sm">
            E
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">EzRCM360</span>
        </div>
        <h2 className="font-aileron text-2xl font-semibold tracking-tight text-foreground">Sign in</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Use your credentials to access the settings portal.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200/50 animate-fade-in">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="input-enterprise mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="input-enterprise mt-1.5"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
