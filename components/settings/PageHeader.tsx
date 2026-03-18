import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
}

export function PageHeader({
  title,
  description,
  backHref = "/settings",
}: PageHeaderProps) {
  return (
    <div className="mb-5">
      {/* Breadcrumb bar - P2 pattern */}
      <nav className="-mx-6 -mt-4 mb-4 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Link href={backHref} className="transition-colors hover:text-foreground">
          Settings &amp; Configurations
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{title}</span>
      </nav>
      <h1 className="font-aileron font-bold text-[24px] leading-none tracking-tight text-[#202830]">{title}</h1>
    </div>
  );
}
