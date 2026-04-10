"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/settings/PageHeader";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { feeSchedulesApi } from "@/lib/services/feeSchedules";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import type { FeeScheduleCategoryCountsDto } from "@/lib/services/feeSchedules";

const CATEGORIES = [
  {
    key: "medicare",
    title: "Medicare Fee Schedules",
    description: "Provide standardized reimbursement rates, coverage rules, and billing guidelines for Medicare services.",
    href: "/settings/fee-schedules/medicare",
  },
  {
    key: "ucr",
    title: "UCR Fee Schedules",
    description: "Define usual, customary, and reasonable rates to benchmark fair pricing and reimbursement for healthcare services.",
    href: "/settings/fee-schedules/ucr",
  },
  {
    key: "mva",
    title: "MVA Fee Schedules",
    description: "Establish regulated reimbursement rates and billing guidelines for services related to motor vehicle accident claims.",
    href: "/settings/fee-schedules/mva",
  },
  {
    key: "wc",
    title: "WC Fee Schedules",
    description: "Define standardized reimbursement rates and billing rules for services covered under workers' compensation claims.",
    href: "/settings/fee-schedules/wc",
  },
] as const;

export default function FeeSchedulesPage() {
  const [counts, setCounts] = useState<FeeScheduleCategoryCountsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const { canView } = useModulePermission("Fee Schedules");

  useEffect(() => {
    feeSchedulesApi()
      .getCategoryCounts()
      .then(setCounts)
      .catch(() => setCounts(null))
      .finally(() => setLoading(false));
  }, []);

  if (!canView) {
    return (
      <div className="px-6">
        <PageHeader title="Fee Schedules" description="Centralized valuation datasets for reimbursement calculation and analysis." />
        <Card><AccessRestrictedContent sectionName="Fee Schedules" /></Card>
      </div>
    );
  }

  const getCount = (key: string) => {
    if (!counts) return null;
    switch (key) {
      case "medicare": return counts.medicare;
      case "ucr": return counts.ucr;
      case "mva": return counts.mva;
      case "wc": return counts.wc;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      <PageHeader title="Fee Schedules" description="Centralized valuation datasets for reimbursement calculation and analysis." />

      {loading ? (
        <Loader variant="inline" />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const count = getCount(cat.key);
            return (
              <Card key={cat.key} className="flex flex-col justify-between p-6">
                <div>
                  <h3 className="font-aileron text-[16px] font-bold text-[#2A2C33]">{cat.title}</h3>
                  <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{cat.description}</p>
                  {count != null && (
                    <p className="mt-3 text-xs text-[#94A3B8]">{count} fee schedule{count !== 1 ? "s" : ""}</p>
                  )}
                </div>
                <div className="mt-4">
                  <Link
                    href={cat.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#0066CC] hover:underline"
                  >
                    View Details <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
