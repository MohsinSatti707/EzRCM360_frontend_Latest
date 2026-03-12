"use client";

import { useEffect, useState, FC } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissionsOptional } from "@/lib/contexts/PermissionsContext";
import { useSidebar } from "@/lib/contexts/SidebarContext";
import Image from "next/image";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ChevronDown } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { profileApi } from "@/lib/services/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { ScrollArea } from "@/components/ui/ScrollArea";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  DashboardIcon,
  PatientsIcon,
  ClaimsIcon,
  OperationalModulesIcon,
  RcmIntelligenceIcon,
  SettingsIcon,
  HelpSupportIcon,
  defaultColor,
  activeColor,
} from "@/components/icons/SidebarIcons";

type IconComponent = FC<{ className?: string; color?: string }>;

const mainNav: { href: string; label: string; moduleName: string; Icon: IconComponent }[] = [
  { href: "/dashboard", label: "Dashboard", moduleName: "Dashboard", Icon: DashboardIcon },
  { href: "/patients", label: "Patients", moduleName: "Patients", Icon: PatientsIcon },
  { href: "/claims", label: "Claims", moduleName: "Claims", Icon: ClaimsIcon },
];

const operationalModulesSubItems: { href: string; label: string; moduleName: string }[] = [
  { href: "/modules/credentialing", label: "EzCredentialing", moduleName: "EzCredentialing" },
  { href: "/modules/enrollment", label: "EzEnrollment", moduleName: "EzEnrollment" },
  { href: "/modules/scheduler", label: "EzScheduler", moduleName: "EzScheduler" },
  { href: "/modules/benefits-verification", label: "EzBenefitsVerification", moduleName: "EzBenefitsVerification" },
  { href: "/modules/medical-records", label: "EzMedicalRecords", moduleName: "EzMedicalRecords" },
  { href: "/modules/auth", label: "EzAuth", moduleName: "EzAuth" },
  { href: "/modules/surgical-coordination", label: "EzSurgicalCoordination", moduleName: "EzSurgicalCoordination" },
  { href: "/modules/medical-coding", label: "EzMedicalCoding", moduleName: "EzMedicalCoding" },
  { href: "/modules/claim-processing", label: "EzClaimProcessing", moduleName: "EzClaimProcessing" },
  { href: "/modules/payment-validation", label: "EzPaymentValidation", moduleName: "EzPaymentValidation" },
  { href: "/modules/negotiations", label: "EzNegotiations", moduleName: "EzNegotiations" },
  { href: "/modules/ar-management", label: "EzARManagement", moduleName: "EzARManagement" },
  { href: "/modules/nsa-arbitration", label: "EzNSAArbitration", moduleName: "EzNSAArbitration" },
  { href: "/modules/appeals", label: "EzAppeals", moduleName: "EzAppeals" },
  { href: "/modules/mva-litigation", label: "EzMVALitigation", moduleName: "EzMVALitigation" },
  { href: "/modules/patient-ar", label: "EzPatientAR", moduleName: "EzPatientAR" },
  { href: "/modules/payment-posting", label: "EzPaymentPosting", moduleName: "EzPaymentPosting" },
  { href: "/modules/quality-assurance", label: "EzQualityAssurance", moduleName: "EzQualityAssurance" },
  { href: "/modules/accounting", label: "EzAccounting", moduleName: "EzAccounting" },
];

const rcmSubItems: { href: string; label: string; moduleName: string }[] = [
  { href: "/rcm/insurance-ar-analysis", label: "Insurance AR Analysis", moduleName: "Insurance AR Analysis" },
];

const helpSubItems: { href: string; label: string }[] = [
  { href: "/help/resource-library", label: "Resource Library" },
  { href: "/help/contact", label: "Contact Support" },
  { href: "/help/feedback", label: "Feedback & Feature Req..." },
];

export function Sidebar() {
  const pathname = usePathname();
  const permissions = usePermissionsOptional();
  const { collapsed, toggle } = useSidebar();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  const isSettings = pathname?.startsWith("/settings");
  const isModules = pathname?.startsWith("/modules");
  const isRcm = pathname?.startsWith("/rcm");
  const isHelp = pathname?.startsWith("/help");

  useEffect(() => {
    profileApi()
      .getMe()
      .then((p) => {
        setUserName(p.userName);
        setUserEmail(p.email);
        setProfilePictureUrl(p.profilePictureUrl ?? null);
      })
      .catch(() => {
        setUserName(null);
        setUserEmail(null);
        setProfilePictureUrl(null);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- fetch profile once on mount

  /** Fail-secure: only show nav items user explicitly has canView for. */
  const canView = (moduleName: string) =>
    permissions && !permissions.loading && permissions.canView(moduleName);

  const visibleMain = mainNav.filter((item) => canView(item.moduleName));
  const visibleOperationalModules = operationalModulesSubItems.map((i) => ({ title: i.label, href: i.href }));
  const visibleRcm = rcmSubItems.filter((item) => canView(item.moduleName));

  const userInitial = (userName || userEmail || "U")[0].toUpperCase();

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out ${collapsed ? "w-12" : "w-64"}`}
    >
      {/* Logo / Brand + Toggle */}
      <div className={`flex h-14 shrink-0 items-center border-b border-sidebar-border ${collapsed ? "justify-center px-0" : "px-4"}`}>
        <div className={`flex items-center w-full ${collapsed ? "justify-center" : "gap-2"}`}>
          {!collapsed ? (
            <>
              <Image src="/logo.png" alt="EzRCM360" width={147} height={32} className="h-8 w-auto shrink-0" priority />
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={toggle}
                  className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-1"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={toggle}
              className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-1"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-4 pr-2">
          {/* Main Nav Items */}
          <ul className="space-y-1">
            {visibleMain.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href} className="relative px-0">
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-[24px] bg-primary rounded-tr-full rounded-br-full" />
                  )}
                  <Link
                    href={item.href}
                    className={`sidebar-item-text flex items-center gap-3 rounded-lg ml-3 mr-0 pl-3 pr-3 py-2.5 transition-colors ${
                      isActive
                        ? "bg-[hsl(210,100%,96%)] text-primary font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    } ${collapsed ? "justify-center ml-2 mr-2 px-2" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.Icon className="h-[22px] w-[22px] flex-shrink-0" color={isActive ? activeColor : defaultColor} />
                    {!collapsed && <span className="text-[14px]">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Separator */}
          <div className="mt-[5px] mb-5">
            <div className="w-full h-px bg-sidebar-border" />
          </div>

          {/* Operational Modules - Collapsible */}
          <CollapsibleNavGroup
            label="Operational Modules"
            Icon={OperationalModulesIcon}
            items={visibleOperationalModules}
            collapsed={collapsed}
            pathname={pathname}
            defaultOpen={isModules}
          />
                    {/* Separator */}
                    <div className="mt-4 mb-4">
            <div className="w-full h-px bg-sidebar-border" />
          </div>

          {/* RCM Intelligence - Collapsible */}
          {visibleRcm.length > 0 && (
            <CollapsibleNavGroup
              label="RCM Intelligence"
              Icon={RcmIntelligenceIcon}
              items={visibleRcm.map((i) => ({ title: i.label, href: i.href }))}
              collapsed={collapsed}
              pathname={pathname}
              defaultOpen={isRcm}
            />
          )}

          {/* Settings & Configurations */}
          {canView("Settings & Configurations") && (
            <div className="relative px-0 mt-1">
              {isSettings && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-[24px] bg-primary rounded-tr-full rounded-br-full" />
              )}
              <Link
                href="/settings"
                className={`sidebar-item-text flex items-center gap-3 rounded-lg ml-3 mr-0 pl-3 pr-3 py-2.5 transition-colors ${
                  isSettings
                    ? "bg-[hsl(210,100%,96%)] text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                } ${collapsed ? "justify-center ml-2 mr-2 px-2" : ""}`}
                title={collapsed ? "Settings & Configurations" : undefined}
              >
                <SettingsIcon className="h-[21px] w-[21px] flex-shrink-0" color={isSettings ? activeColor : defaultColor} />
                {!collapsed && <span className="text-[14px]">Settings & Configurations</span>}
              </Link>
            </div>
          )}

          {/* Help & Support - Collapsible */}
          <CollapsibleNavGroup
            label="Help & Support"
            Icon={HelpSupportIcon}
            items={helpSubItems.map((i) => ({ title: i.label, href: i.href }))}
            collapsed={collapsed}
            pathname={pathname}
            defaultOpen={isHelp}
          />
        </nav>
      </ScrollArea>

      {/* Separator before footer */}
      <div className="mt-[5px] w-full h-px bg-sidebar-border" />

      {/* User section */}
      <div className={`shrink-0 p-4 pt-3 ${collapsed ? "px-2" : ""}`}>
        <div className="flex flex-col items-center gap-2">
          <Link href="/profile/edit" title={collapsed ? (userName ?? "Profile") : undefined}>
            <Avatar className="h-11 w-11 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
              {profilePictureUrl ? (
                <AvatarImage
                  src={profilePictureUrl.startsWith("http") ? profilePictureUrl : getApiUrl("/api/files/" + profilePictureUrl)}
                  alt=""
                />
              ) : null}
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          </Link>
          {!collapsed && (
            <>
              <div className="text-center">
                <p className="font-semibold text-base text-foreground">{userName ?? "User"}</p>
                <p className="text-sm text-muted-foreground">{userEmail ?? "—"}</p>
              </div>
              <LogoutButton className="w-full py-2 px-4 rounded-lg bg-[hsl(210,40%,96%)] text-primary font-medium text-base hover:bg-[hsl(210,40%,92%)] transition-colors" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── Collapsible Navigation Group ── */

interface CollapsibleNavGroupProps {
  label: string;
  Icon: IconComponent;
  items: { title: string; href: string }[];
  collapsed: boolean;
  pathname: string | null;
  defaultOpen?: boolean;
}

function CollapsibleNavGroup({
  label,
  Icon,
  items,
  collapsed,
  pathname,
  defaultOpen = false,
}: CollapsibleNavGroupProps) {
  const isGroupActive = items.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/"),
  );
  const [isOpen, setIsOpen] = useState(defaultOpen || isGroupActive);

  useEffect(() => {
    if (!isGroupActive) {
      setIsOpen(false);
    }
  }, [isGroupActive, pathname]);

  const isItemActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  if (collapsed) {
    return (
      <div className="relative px-0 mt-1">
        {isGroupActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-[24px] bg-primary rounded-tr-full rounded-br-full" />
        )}
        <Link
          href={items[0]?.href ?? "#"}
          className={`sidebar-item-text flex items-center justify-center gap-3 rounded-lg ml-2 mr-2 px-2 py-2.5 transition-colors ${
            isGroupActive
              ? "bg-[hsl(210,100%,96%)] text-primary font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`}
          title={label}
        >
          <Icon className="h-[18px] w-[18px] flex-shrink-0" color={isGroupActive ? activeColor : defaultColor} />
        </Link>
      </div>
    );
  }

  return (
    <CollapsiblePrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <CollapsiblePrimitive.Trigger asChild>
        <button
          type="button"
          className={`sidebar-item-text w-[95%] flex items-center justify-between ml-3 mr-0 pl-3 pr-3 py-2.5 rounded-lg transition-colors ${
            isGroupActive || isOpen
              ? "bg-[hsl(210,100%,96%)] text-primary font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-[18px] w-[18px] flex-shrink-0" color={isGroupActive || isOpen ? activeColor : defaultColor} />
            <span className="text-[14px]">{label}</span>
          </div>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content>
        <div className="pt-3 relative">
          {/* Vertical line indicator */}
          <div className="absolute left-[30px] top-1 bottom-1 w-[1.5px] bg-[hsl(210,30%,88%)]" />
          <ul>
            {items.map((item) => {
              const active = isItemActive(item.href);
              return (
                <li key={item.href} className="relative px-0">
                  {active && (
                    <span className="absolute left-[29px] top-1/2 -translate-y-1/2 w-[2px] h-[18px] bg-primary rounded-full z-10" />
                  )}
                  <Link
                    href={item.href}
                    className={`sidebar-item-text block py-2 ml-10 mr-0 pl-3 pr-3 rounded-lg text-[14px] transition-colors ${
                      active
                        ? "bg-[hsl(210,100%,96%)] text-primary font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
