"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, MoveRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getApiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, MFA_USER_ID_KEY, MFA_SETUP_USER_ID_KEY, AUTH_COOKIE } from "@/lib/env";
import { useToast } from "@/lib/contexts/ToastContext";
import { usePermissionsOptional } from "@/lib/contexts/PermissionsContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const permissions = usePermissionsOptional();
  const redirectTo = searchParams.get("redirect") ?? "/settings";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasShownActivatedToast = useRef(false);
  useEffect(() => {
    if (searchParams.get("activated") === "1" && !hasShownActivatedToast.current) {
      hasShownActivatedToast.current = true;
      toast.success("Password Set Successfully. Your account has been activated successfully!");
      router.replace("/login");
    }
  }, [searchParams, toast, router]);

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
        await permissions?.reload();
        toast.success("Please set up Multi-Factor Authentication.");
        router.push("/authentication/setup");
        router.refresh();
        return;
      }

      if (token && typeof window !== "undefined") {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
        document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
        await permissions?.reload();
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

  const inputClass = "flex h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] ring-offset-background transition-colors placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <Card className="w-full max-w-md animate-fade-in-up overflow-hidden border border-border bg-white p-8 shadow-sm rounded-lg">
        <div className="mb-5 flex items-center gap-3">
          <Image src="/logo.png" alt="EzRCM360" width={147} height={32} className="h-10 w-auto shrink-0" priority />
          {/* <span className="text-xl font-semibold tracking-tight text-foreground">EzRCM360</span> */}
        </div>
        <h2 className="font-aileron text-2xl font-bold tracking-tight text-[#202830]">Login to your account</h2>
        {/* <p className="mt-2 font-aileron text-base text-muted-foreground">
          Use your credentials to access the settings portal.
        </p> */}
        <form onSubmit={handleSubmit} className="my-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200/50 animate-fade-in">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="font-aileron font-semibold text-[14px] leading-none text-[#2A2C33]">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="password" className="font-aileron font-semibold text-[14px] leading-none text-[#2A2C33]">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-4 mb-1">

              <div className="flex gap-2 items-center justify-center">
                <input
                  type="checkbox"
                  className="h-5 w-5 border-red-500 rounded cursor-pointer"
                />
                <label className="text-[#202830]">Remember me?</label>
              </div>
              <span className="text-[#0066CC] cursor-pointer">Forgot password</span>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-fit h-10 rounded-[5px] bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
          >
            {loading ? "Logging in…" : "Log in"} <MoveRight/>
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
