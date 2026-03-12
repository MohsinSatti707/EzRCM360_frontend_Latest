"use client";

import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageShellProps {
  breadcrumbs?: Breadcrumb[];
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Optional actions (e.g. Add button) */
  actions?: React.ReactNode;
  className?: string;
  /** Override title row spacing (e.g. "mb-0" to remove gap below title) */
  titleWrapperClassName?: string;
}

/** Consistent page layout with breadcrumbs, title, optional description and actions. */
export function PageShell({
  breadcrumbs,
  title,
  description,
  children,
  actions,
  className = "",
  titleWrapperClassName,
}: PageShellProps) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {/* Breadcrumbs - P2 design: bg-[#F7F8F9] bar */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="-mx-6 mb-3 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-muted-foreground" aria-hidden>
                  /
                </span>
              )}
              {b.href ? (
                <Link
                  href={b.href}
                  className="text-muted-foreground transition-colors hover:text-foreground uppercase tracking-wide text-xs font-medium"
                >
                  {b.label}
                </Link>
              ) : (
                <span className="text-foreground uppercase tracking-wide text-xs font-medium">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row - P2 design: font-aileron font-bold text-[24px] text-[#202830] */}
      <div className={titleWrapperClassName ? `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${titleWrapperClassName}` : "mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
        <div>
          <h1 className="font-aileron font-bold text-[24px] leading-none tracking-tight text-[#202830]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
