import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names (design pattern from EzRCM360_Design-main) */
export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

/** Format ISO date string for use in <input type="date"> (YYYY-MM-DD) */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
