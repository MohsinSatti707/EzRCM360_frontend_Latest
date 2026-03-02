"use client";

import { useMemo } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { usePermissionsOptional } from "@/lib/contexts/PermissionsContext";
import { SETTINGS_HREF_TO_MODULE_NAME } from "@/lib/constants/routeModuleMap";

/** Exact 9-section layout matching client design. Order and labels from spec. */
const configSections = [
  {
    title: "Organization & Access",
    description:
      "Define enterprise-level governance, identity, access control, and security enforcement.",
    links: [
      { label: "Organization", href: "/settings/organization" },
      { label: "Users Access", href: "/settings/users" },
      { label: "Roles & Permissions", href: "/settings/roles-permissions" },
      { label: "Security Access", href: "/settings/security-access" },
    ],
  },
  {
    title: "Entity Configurations",
    description:
      "Define Entity identity and structure for access control and downstream operational configuration.",
    links: [
      { label: "Entity Information", href: "/settings/entities" },
      { label: "Entity Providers", href: "/settings/entity-providers" },
      { label: "Entity Locations", href: "/settings/entity-locations" },
      { label: "Entity Billable Fee Schedules", href: "/settings/entity-fee-schedules" },
    ],
  },
  {
    title: "Payers & Plans Configurations",
    description: "Centralized payer and plan registry used across all modules.",
    links: [
      { label: "Payer Configuration", href: "/settings/payers" },
      { label: "Plan Configuration", href: "/settings/plans" },
    ],
  },
  {
    title: "Group Provider-Plan Participation",
    description:
      "Authoritative record of network participation status used by all modules.",
    links: [
      { label: "Provider-Plan Participation", href: "/settings/group-participation" },
    ],
  },
  {
    title: "Rendering Provider-Plan Participation",
    description:
      "Authoritative record of network participation status used by all modules.",
    links: [
      { label: "Provider-Plan Participation", href: "/settings/rendering-participation" },
    ],
  },
  {
    title: "Facilities Configurations",
    description: "Define independent service locations separate from Entity practices.",
    links: [
      { label: "Facility Configuration", href: "/settings/facilities" },
    ],
  },
  {
    title: "Fee Schedules Configurations",
    description:
      "Centralized valuation datasets for reimbursement calculation and analysis.",
    links: [
      { label: "Fee Schedules", href: "/settings/fee-schedules" },
      { label: "Geography Resolution", href: "/settings/geography-resolution" },
      { label: "Applicability Rules", href: "/settings/applicability-rules" },
    ],
  },
  {
    title: "Codes & Modifiers Configurations",
    description: "Standardized coding and financial adjustment logic.",
    links: [
      { label: "ICD Codes", href: "/settings/icd-codes" },
      { label: "NDC Codes", href: "/settings/ndc-codes" },
      { label: "CPT/HCPCS Codes", href: "/settings/cpt-hcpcs-codes" },
      { label: "Modifiers", href: "/settings/modifiers" },
      { label: "Financial Modifiers", href: "/settings/financial-modifiers" },
      { label: "Bundling / Reduction Rules", href: "/settings/bundling-reduction-rules" },
      { label: "Procedure Grouping Rules", href: "/settings/procedure-grouping-rules" },
    ],
  },
  {
    title: "NSA Configuration",
    description: "Centralized NSA eligibility and valuation governance.",
    links: [
      { label: "NSA Eligibility Rules", href: "/settings/nsa-eligibility" },
      { label: "Federal NSA Rules", href: "/settings/nsa-federal" },
      { label: "State NSA Rules", href: "/settings/nsa-state" },
      { label: "Emergency Override Rules", href: "/settings/nsa-emergency" },
    ],
  },
];

export default function SettingsPage() {
  const permissions = usePermissionsOptional();
  const filteredSections = useMemo(() => {
    if (!permissions || permissions.loading) return null;
    return configSections
      .map((section) => ({
        ...section,
        links: section.links.filter((link) => {
          const moduleName = SETTINGS_HREF_TO_MODULE_NAME[link.href];
          if (!moduleName) return false;
          return permissions.canView(moduleName);
        }),
      }))
      .filter((section) => section.links.length > 0);
  }, [permissions]);

  const loading = !permissions || permissions.loading;

  return (
    <PageShell
      title="Settings & Configurations"
      description={undefined}
    >
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-56 animate-shimmer-bg rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : filteredSections && filteredSections.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 xl:grid-rows-3">
          {filteredSections.map((section, i) => (
            <div
              key={section.title}
              className="flex animate-fade-in-up opacity-0"
              style={{
                animationDelay: `${Math.min(i, 8) * 0.05}s`,
                animationFillMode: "forwards",
              }}
            >
              <SettingsCard
                title={section.title}
                description={section.description}
                links={section.links}
                className="w-full"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-12 text-center">
          <p className="text-sm text-slate-600">
            You don&apos;t have access to any settings. Contact your administrator.
          </p>
        </div>
      )}
    </PageShell>
  );
}
