"use client";

interface AccessRestrictedContentProps {
  /** Optional section name for contextual message (e.g., "Entity Information") */
  sectionName?: string;
}

/**
 * Professional inline access-restricted message for use inside Cards.
 * Use when the user lacks permission to view the page content.
 */
export function AccessRestrictedContent({ sectionName }: AccessRestrictedContentProps) {
  const message = sectionName
    ? `Your account does not have permission to access ${sectionName}. Please contact your administrator if you believe you should have access.`
    : "Your account does not have permission to access this section. Please contact your administrator if you believe you should have access.";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-7 w-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">Access restricted</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}
