"use client";

import { cn } from "@/lib/utils";

type LoaderProps = {
  /** "inline" = minimal height for tables/cards, "page" = centered full-height block */
  variant?: "inline" | "page";
  /** Dot size */
  size?: "sm" | "md" | "lg";
  /** Optional label below dots (e.g. "Loading…") */
  label?: string;
  className?: string;
};

const dotSizes = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function Loader({
  variant = "inline",
  size = "md",
  label = "Loading…",
  className = "",
}: LoaderProps) {
  const dots = (
    <div className="flex items-center gap-1.5" role="status" aria-label={label}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "rounded-full bg-primary animate-bounce-dot",
            dotSizes[size],
          )}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );

  if (variant === "page") {
    return (
      <div
        className={cn(
          "flex min-h-[12rem] flex-col items-center justify-center gap-3 py-12",
          className,
        )}
      >
        {dots}
        {label && (
          <p className="font-aileron text-[16px] font-semibold text-primary">{label}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-8",
        className,
      )}
    >
      {dots}
      {label && (
        <p className="font-aileron text-[16px] font-semibold text-primary">{label}</p>
      )}
    </div>
  );
}
