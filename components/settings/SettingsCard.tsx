import Link from "next/link";

export interface SettingsLink {
  label: string;
  href: string;
}

/**
 * Settings card — exact copy of Organization & Access design.
 * White card, rounded corners, subtle shadow, no border.
 * Title (bold dark), description (gray), separator, links with blue arrow prefix.
 */
export function SettingsCard({
  title,
  description,
  links,
  className = "",
}: {
  title: string;
  description: string;
  links: SettingsLink[];
  className?: string;
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-5 shadow-none ${className}`}
    >
      <h3 className="font-aileron text-base font-semibold leading-tight text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {links.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <ul className="flex flex-col gap-1.5">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-2 text-sm font-normal text-primary transition-colors hover:text-primary/80"
                >
                  <span aria-hidden>→</span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
