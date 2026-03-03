"use client";

import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessDenied } from "./AccessDenied";

interface PermissionRouteGuardProps {
  /** Backend module name for permission check (e.g. "Users", "Organizations") */
  moduleName: string;
  children: React.ReactNode;
  /** Optional: show loading skeleton instead of AccessDenied while resolving */
  loadingFallback?: React.ReactNode;
}

/**
 * Enterprise-level route guard. Either user has access or they don't.
 * Fail-secure: denies access when loading or when permission check fails.
 */
export function PermissionRouteGuard({
  moduleName,
  children,
  loadingFallback,
}: PermissionRouteGuardProps) {
  const { canView, loading } = useModulePermission(moduleName);

  if (loading) {
    return (
      loadingFallback ?? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm text-muted-foreground">Verifying access…</p>
          </div>
        </div>
      )
    );
  }

  if (!canView) {
    return <AccessDenied moduleName={moduleName} />;
  }

  return <>{children}</>;
}
