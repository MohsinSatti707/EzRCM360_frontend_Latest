"use client";

type LoaderProps = {
  /** "inline" = minimal height for tables/cards, "page" = centered full-height block */
  variant?: "inline" | "page";
  /** Spinner size */
  size?: "sm" | "md" | "lg";
  /** Optional label below spinner (e.g. "Loading…") */
  label?: string;
  className?: string;
};

const sizeClasses = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export function Loader({
  variant = "inline",
  size = "md",
  label = "Loading…",
  className = "",
}: LoaderProps) {
  const spinner = (
    <div
      className={`animate-spin rounded-full border-primary-600 border-t-transparent ${sizeClasses[size]}`}
      role="status"
      aria-label={label}
    />
  );

  if (variant === "page") {
    return (
      <div
        className={`flex min-h-[12rem] flex-col items-center justify-center gap-3 py-12 ${className}`}
      >
        {spinner}
        {label && (
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-8 ${className}`}
    >
      {spinner}
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
    </div>
  );
}
