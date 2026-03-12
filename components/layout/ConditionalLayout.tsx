"use client";

import { usePathname } from "next/navigation";
import { MainLayout } from "./MainLayout";
import { MfaRouteGuard } from "@/components/auth/MfaRouteGuard";

/** Routes that should NOT render the MainLayout (sidebar/header). */
const NO_LAYOUT_PATHS = ["/login", "/set-password", "/authentication"];

/**
 * Wraps children in MfaRouteGuard + MainLayout for all protected routes.
 * Auth routes (login, MFA) render children directly without the shell.
 *
 * Placed in the root layout so the sidebar/header stay mounted across
 * route navigations and don't re-render or re-fetch data.
 */
export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = NO_LAYOUT_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(p + "/")
  );

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <MfaRouteGuard>
      <MainLayout>{children}</MainLayout>
    </MfaRouteGuard>
  );
}
