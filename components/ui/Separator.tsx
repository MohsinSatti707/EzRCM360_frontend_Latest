"use client";

import { cn } from "@/lib/utils";

interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

/** Matches design components/ui/separator.tsx - shrink-0 bg-border */
export function Separator({ className, orientation = "horizontal" }: SeparatorProps) {
  return (
    <div
      role="separator"
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
    />
  );
}
