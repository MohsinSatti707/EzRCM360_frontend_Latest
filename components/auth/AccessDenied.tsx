"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AccessDeniedProps {
  /** Optional module/resource name for contextual message */
  moduleName?: string;
  /** Optional custom message */
  message?: string;
  /** Show back to Settings link (default: true when on settings path) */
  showBackLink?: boolean;
  /** Custom back href */
  backHref?: string;
}

/**
 * Enterprise-style Access Denied component (Netflix/Amazon pattern).
 * Clear, professional messaging when user lacks permission.
 */
export function AccessDenied({
  moduleName,
  message,
  showBackLink,
  backHref,
}: AccessDeniedProps) {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith("/settings");
  const defaultBackHref = isSettings ? "/settings" : "/dashboard";
  const shouldShowBack = showBackLink ?? true;

  const displayMessage =
    message ??
    (moduleName
      ? `You don't have permission to access ${moduleName}.`
      : "You don't have permission to access this page.");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-10 w-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground">
          Access restricted
        </h2>

        {/* Message */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {displayMessage}
        </p>

        {/* Support note */}
        <p className="mt-4 text-xs text-muted-foreground">
          Contact your administrator if you believe you should have access.
        </p>

        {/* Action */}
        {shouldShowBack && (
          <Link
            href={backHref ?? defaultBackHref}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {isSettings ? "Back to Settings" : "Back to Dashboard"}
          </Link>
        )}
      </div>
    </div>
  );
}
