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
    icon: "/icons/svg/organization-access.svg",
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
    icon: "/icons/svg/entity-configurations.svg",
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
    icon: "/icons/svg/payers-plans.svg",
    description: "Centralized payer and plan registry used across all modules.",
    links: [
      { label: "Payer Configuration", href: "/settings/payers" },
      { label: "Plan Configuration", href: "/settings/plans" },
    ],
  },
  {
    title: "Group Provider-Plan Participation",
    icon: "/icons/svg/group-provider.svg",
    description:
      "Authoritative record of network participation status used by all modules.",
    links: [
      { label: "Provider-Plan Participation", href: "/settings/group-participation" },
    ],
  },
  {
    title: "Rendering Provider-Plan Participation",
    icon: "/icons/svg/rendering-provider.svg",
    description:
      "Authoritative record of network participation status used by all modules.",
    links: [
      { label: "Provider-Plan Participation", href: "/settings/rendering-participation" },
    ],
  },
  {
    title: "Facilities Configurations",
    icon: "/icons/svg/facilities.svg",
    description: "Define independent service locations separate from Entity practices.",
    links: [
      { label: "Facility Configuration", href: "/settings/facilities" },
    ],
  },
  {
    title: "Fee Schedules Configurations",
    icon: "/icons/svg/fee-schedules.svg",
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
    icon: "/icons/svg/codes-modifiers.svg",
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
    icon: "/icons/svg/nsa-configuration.svg",
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
      .map((section) => {
        const filteredLinks = section.links.filter((link) => {
          const moduleName = SETTINGS_HREF_TO_MODULE_NAME[link.href];
          if (!moduleName) return false;
          return permissions.canView(moduleName);
        });
        // Always show NSA Configuration and Facilities Configurations card with all links (permission checked on target pages)
        const links =
          section.title === "NSA Configuration" || section.title === "Facilities Configurations"
            ? section.links
            : filteredLinks;
        return { ...section, links };
      })
      .filter((section) => section.links.length > 0);
  }, [permissions]);

  const loading = !permissions || permissions.loading;

  return (
    <PageShell
      title="Settings & Configurations"
      description={undefined}
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-56 animate-shimmer-bg rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : filteredSections && filteredSections.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 h-[calc(100vh-172px)] overflow-y-auto custom-scrollbar pb-6">
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
                icon={section.icon}
                className="w-full"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have access to any settings. Contact your administrator.
          </p>
        </div>
      )}
    </PageShell>
  );
}
