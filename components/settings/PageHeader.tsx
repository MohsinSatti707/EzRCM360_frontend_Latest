import type { ReactNode } from "react";
import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref = "/settings",
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-5">
      {/* Breadcrumb bar - P2 pattern */}
      <nav className="-mx-6 mb-4 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Link href={backHref} className="transition-colors hover:text-foreground">
          Settings &amp; Configurations
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{title}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="font-aileron font-bold text-[24px] leading-none tracking-tight text-[#202830]">{title}</h1>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
