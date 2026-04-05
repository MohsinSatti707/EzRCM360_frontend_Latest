import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names (design pattern from EzRCM360_Design-main) */
export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

/**
 * Resolve a backend enum value (string name or number) to its numeric value.
 * The backend uses JsonStringEnumConverter, so getById returns e.g. "WC" instead of 5.
 */
export function resolveEnum(val: unknown, map: Record<string, number>): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    if (val in map) return map[val];
    const n = Number(val);
    if (!isNaN(n)) return n;
  }
  return 0;
}
export function resolveEnumNullable(val: unknown, map: Record<string, number>): number | null {
  if (val == null || val === "") return null;
  return resolveEnum(val, map);
}

// Backend enum maps (must match C# enum member names exactly)
export const ENUMS = {
  PlanCategory: { Commercial: 0, Medicaid: 1, Medicare: 2, MVA: 3, Tricare: 4, WC: 5, HmoManaged: 6, RailroadMedicare: 7, Na: 8 },
  PlanType: { Hmo: 0, Ppo: 1, Epo: 2, Pos: 3, PartA: 4, PartB: 5, PartC: 6, PartD: 7, CHAMPUS: 8, CHAMPVA: 9, Na: 10 },
  MarketType: { Individual: 0, Group: 1, Aso: 2, FullyInsured: 3, SelfFunded: 4 },
  NsaCategory: { None: 0, State: 1, Federal: 2 },
  PayerStatus: { Inactive: 0, Active: 1 },
  EntityStatus: { Inactive: 0, Active: 1 },
  PayerEntityType: { Insurance: 0, Attorney: 1, Employer: 2, Other: 3 },
  ParticipationStatus: { InNetwork: 0, OutOfNetwork: 1, UnknownNotVerified: 2 },
  ParticipationSource: { Credentialing: 0, EntityProvided: 1, InferredAssumed: 2 },
  ProviderType: { Physician: 0, NonPhysician: 1 },
} as const;

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
