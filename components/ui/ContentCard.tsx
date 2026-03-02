import Link from "next/link";

export interface ContentCardLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface ContentCardProps {
  /** Icon - displayed in colored container top-left */
  icon: React.ReactNode;
  /** Category label - uppercase, light grey (e.g. "GET STARTED", "CONFIGURATION") */
  category: string;
  /** Title - main blue text (optional) */
  title?: string;
  /** Description - supporting text below category/title */
  description?: string;
  /** Links - each as blue title with arrow, supports external link indicator */
  links?: ContentCardLink[];
  /** Single href - when provided, entire card is clickable */
  href?: string;
  /** Icon background color - gradient class (e.g. "from-primary-100 to-primary-200") */
  iconBg?: string;
  className?: string;
}

const ExternalLinkIcon = () => (
  <svg className="ml-1 h-4 w-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

/**
 * ContentCard - Microsoft-style card with icon, category, title/links.
 * Matches design: icon top-left, category in uppercase grey, title/links in blue.
 */
export function ContentCard({
  icon,
  category,
  title,
  description,
  links = [],
  href,
  iconBg = "from-primary-100 to-primary-200",
  className = "",
}: ContentCardProps) {
  const cardContent = (
    <>
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} text-primary-700`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </p>
          {title && (
            <p className="mt-1.5 text-base font-semibold text-primary">
              {title}
            </p>
          )}
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {links.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
          {links.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {link.label}
                  <ExternalLinkIcon />
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="group inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {link.label}
                  <ChevronIcon />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const baseClass =
    "flex flex-col rounded-lg border border-border bg-card p-6 shadow-none transition-all duration-300 hover:shadow-[var(--shadow-card)]";

  if (href) {
    return (
      <Link href={href} className={`block ${baseClass} ${className}`}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={`flex flex-col ${baseClass} ${className}`}>
      {cardContent}
    </div>
  );
}
