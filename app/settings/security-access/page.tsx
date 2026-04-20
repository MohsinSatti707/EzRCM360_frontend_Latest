"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/Table";
import { Loader } from "@/components/ui/Loader";
import { Alert } from "@/components/ui/Alert";
import { securityAccessApi } from "@/lib/services/securityAccess";
import type {
  SecuritySettingsDto,
  UpdateSecuritySettingsRequest,
  SecurityUserDto,
} from "@/lib/services/securityAccess";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";

const MODULE_NAME = "Security Access";

const MFA_FREQUENCY_OPTIONS = [
  { value: "EveryLogin", label: "Require MFA at every login" },
  { value: "OnceEvery24Hours", label: "Require MFA once every 24 hours (default)" },
] as const;

const INACTIVITY_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes (default)" },
] as const;

/** Toggle switch styled as a switch control */
function Toggle({
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${disabled ? "cursor-not-allowed opacity-60" : ""}
        ${checked ? "bg-primary" : "bg-muted"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0
          transition-transform
          ${checked ? "translate-x-5" : "translate-x-0.5"}
        `}
      />
    </button>
  );
}

/** Search icon SVG */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export default function SecurityAccessPage() {
  const [settings, setSettings] = useState<SecuritySettingsDto | null>(null);
  const [users, setUsers] = useState<SecurityUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [form, setForm] = useState<UpdateSecuritySettingsRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mfaDisablingId, setMfaDisablingId] = useState<string | null>(null);

  const api = securityAccessApi();
  const toast = useToast();
  const { canView, canUpdate } = useModulePermission(MODULE_NAME);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadSettings = useCallback(() => {
    api
      .getSettings()
      .then((data) => {
        setSettings(data);
        setForm({
          mfaRequiredForAllUsers: data.mfaRequiredForAllUsers,
          mfaFrequency: data.mfaFrequency,
          inactivityTimeoutMinutes: data.inactivityTimeoutMinutes,
          dailySessionResetEnabled: data.dailySessionResetEnabled,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"));
  }, []);

  const loadUsers = useCallback(() => {
    api
      .getUsers(searchDebounced || undefined)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [searchDebounced]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.getSettings(), api.getUsers()])
      .then(([settingsData, usersData]) => {
        setSettings(settingsData);
        setForm({
          mfaRequiredForAllUsers: settingsData.mfaRequiredForAllUsers,
          mfaFrequency: settingsData.mfaFrequency,
          inactivityTimeoutMinutes: settingsData.inactivityTimeoutMinutes,
          dailySessionResetEnabled: settingsData.dailySessionResetEnabled,
        });
        setUsers(usersData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) loadUsers();
  }, [loading, searchDebounced]);

  const handleSaveSettings = async () => {
    if (!form) return;
    setFormError(null);
    setSaving(true);
    try {
      await api.updateSettings({
        mfaRequiredForAllUsers: form.mfaRequiredForAllUsers,
        mfaFrequency: form.mfaFrequency ?? "OnceEvery24Hours",
        inactivityTimeoutMinutes: form.inactivityTimeoutMinutes ?? 30,
        dailySessionResetEnabled: form.dailySessionResetEnabled ?? false,
      });
      loadSettings();
      toast.success("Settings Saved", "Security settings have been saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async (userId: string) => {
    setMfaDisablingId(userId);
    try {
      await api.disableUserMfa(userId);
      loadUsers();
      toast.success("MFA Disabled", "MFA has been disabled for the user.");
    } catch (err) {
      toast.error("MFA Error", err instanceof Error ? err.message : "Failed to disable MFA.");
    } finally {
      setMfaDisablingId(null);
    }
  };

  if (!canView) {
    return (
      <PageShell
        breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Security Access" }]}
        title="Security Access"
        description="Manage security and MFA settings."
      >
        <Card className="p-6">
          <AccessRestrictedContent sectionName="Security Access" />
        </Card>
      </PageShell>
    );
  }

  if (loading && !settings) {
    return (
      <PageShell
        breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Security Access" }]}
        title="Security Access"
        description="Security settings control how users authenticate and how long sessions remain active."
      >
        <div className="flex min-h-[20rem] items-center justify-center py-12">
          <Loader variant="inline" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Security Access" }]}
      title="Security Access"
      titleWrapperClassName="px-6"
      description={
        <span className="font-['Aileron'] text-[15px] font-normal  tracking-normal text-[#64748B] w-full">
          Security settings control how users authenticate and how long sessions remain active.<br></br>These controls help protect your organization from unauthorized access while maintaining usability for daily operations.
        </span>
      }
    >
      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {form && (
        <div className="space-y-6 px-6 mt-4 ">
          <div className="h-[calc(100vh-330px)] overflow-y-auto ">
          {/* Multi-Factor Authentication (MFA) section - two-column grid */}
          <section>
            <h2 className="mb-3 font-['Aileron'] text-[20px] font-bold leading-[100%] tracking-normal text-[#202830]">
              Multi-Factor Authentication (MFA)
            </h2>
            <div className="grid gap-6 lg:grid-cols-2 items-stretch">
              {/* Left column: MFA for Account Administrator + MFA Frequency */}
              <div className="flex flex-col gap-6">
                <Card className="p-6">
                  <h3 className="font-['Aileron'] text-[18px] font-bold leading-[100%] tracking-normal text-[#202830]">
                    MFA for Account Administrator
                  </h3>
                  <p className="-mx-6 mt-2 mb-3 border-b border-[#E2E8F0] px-6 pb-3 font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#64748B]">
                    Multi-Factor Authentication is mandatory for all Account Administrators and
                    cannot be disabled.
                  </p>
                  <p className="font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#202830]">
                    Account Administrators have elevated permissions that affect system security,
                    user access, and configuration. MFA is always required for these roles to reduce
                    the risk of unauthorized access.
                  </p>
                </Card>

                <Card className="p-6 pb-[155px]">
                  <h3 className="font-['Aileron'] text-[18px] font-bold leading-[100%] tracking-normal text-[#202830]">
                    MFA Frequency
                  </h3>
                  <p className="-mx-6 mt-2 mb-3 border-b border-[#E2E8F0] px-6 pb-3 font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#64748B]">
                    Define how often users must re-confirm their identity using MFA
                  </p>
                  <p className="font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#202830]">
                    By default, users are required to complete MFA at least once every 24 hours. You
                    may choose to require MFA at every login for stricter security.
                  </p>
                  <div className="mt-4 space-y-2">
                    {MFA_FREQUENCY_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <input
                          type="radio"
                          name="mfaFrequency"
                          checked={(form.mfaFrequency ?? "OnceEvery24Hours") === opt.value}
                          onChange={() =>
                            setForm((f) => (f ? { ...f, mfaFrequency: opt.value } : f))
                          }
                          disabled={!canUpdate}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-foreground">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right column: MFA for Users */}
              <Card className="p-6">
                <h3 className="font-['Aileron'] text-[18px] font-bold leading-[100%] tracking-normal text-[#202830]">
                  MFA for Users
                </h3>
                <p className="-mx-6 mt-2 mb-3 border-b border-[#E2E8F0] px-6 pb-3 font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#64748B]">
                  Control whether Multi-Factor Authentication is required for non-administrator
                  users.
                </p>
                <p className="font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#202830]">
                  You may enable MFA for all users or selectively enforce it for specific users
                  based on your organization&apos;s security needs.<br></br> Account Administrators are
                  always protected by MFA and are not affected by this setting.
                </p>
                <div className="mt-4 flex items-center gap-3">
                                    <Toggle
                    checked={form.mfaRequiredForAllUsers}
                    onChange={() =>
                      setForm((f) =>
                        f ? { ...f, mfaRequiredForAllUsers: !f.mfaRequiredForAllUsers } : f
                      )
                    }
                    disabled={!canUpdate}
                    aria-label="Enable MFA for all users"
                  />
                  <span className="text-sm font-medium text-foreground">Enable MFA for all users</span>
                </div>
                <div className="mt-4">
                  <div className="relative max-w-xs">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search user"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="mt-4 max-h-64 overflow-x-auto overflow-y-auto">
                  <Table className="border-b border-[#E2E8F0]">
                    <TableHead className="sticky top-0 z-20">
                      <TableRow className="border-b border-[#E2E8F0] !bg-white">
                        <TableHeaderCell className="border-none px-2 font-['Aileron'] text-[14px] font-normal leading-[130%] tracking-normal text-[#0066CC]">
                          User(s)
                        </TableHeaderCell>
                        <TableHeaderCell
                          align="right"
                          className="border-none px-2 font-['Aileron'] text-[14px] font-normal leading-[130%] tracking-normal text-[#0066CC]"
                        >
                          MFA Status
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow className="border-b border-[#E2E8F0]">
                          <TableCell
                            colSpan={2}
                            className="border-none px-0 text-center"
                          >
                            <div className="flex flex-col items-center justify-center py-6">
                              <Image
                                src="/icons/svg/no-data-found.svg"
                                alt="No Data Found"
                                width={180}
                                height={180}
                              />
                              <h3 className="mt-4 text-2xl font-bold font-['Aileron'] text-gray-800">No Data Found</h3>
                              <p className="mt-1 text-[15px] font-['Aileron'] text-[#151529]">No data available yet.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id} className="border-b border-[#E2E8F0]">
                            <TableCell className="border-none px-2">
                              <div>
                                <div className="font-['Aileron'] text-[15px] font-normal leading-[130%] tracking-normal text-[#202830]">
                                  {u.userName}
                                </div>
                                {u.roleName && (
                                  <div className="font-['Aileron'] text-[14px] font-normal leading-[130%] tracking-normal text-[#64748B]">
                                    {u.roleName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-none px-0 text-right">
                              {u.isTwoFactorEnabled ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Toggle
                                    checked={true}
                                    onChange={() => handleDisableMfa(u.id)}
                                    disabled={!canUpdate || mfaDisablingId === u.id}
                                    aria-label={`Disable MFA for ${u.userName}`}
                                  />
                                  {mfaDisablingId === u.id && (
                                    <Loader variant="inline" />
                                  )}
                                </div>
                              ) : (
                                <Toggle
                                  checked={false}
                                  onChange={() => {}}
                                  disabled
                                  aria-label={`MFA not enrolled for ${u.userName}`}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </section>

          {/* Session Management section - two-column grid */}
          <section>
            <h2 className="mb-3 mt-6 font-['Aileron'] text-[20px] font-bold leading-[100%] tracking-normal text-[#202830]">
              Session Management
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="font-['Aileron'] text-[18px] font-bold leading-[100%] tracking-normal text-[#202830]">
                  Inactivity Timeout
                </h3>
                <p className="-mx-6 mt-2 mb-3 border-b border-[#E2E8F0] px-6 pb-3 font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#64748B]">
                  Automatically log users out after a period of inactivity.
                </p>
                <p className="font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#202830]">
                  If no activity is detected for the selected time period, the user will be logged
                  out and required to sign in again. This helps prevent unauthorized access if a
                  device is left unattended.
                </p>
                <div className="mt-4 space-y-2">
                  {INACTIVITY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="inactivityTimeout"
                        checked={(form.inactivityTimeoutMinutes ?? 30) === opt.value}
                        onChange={() =>
                          setForm((f) =>
                            f ? { ...f, inactivityTimeoutMinutes: opt.value } : f
                          )
                        }
                        disabled={!canUpdate}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-['Aileron'] text-[18px] font-bold leading-[100%] tracking-normal text-[#202830]">
                  Daily Session Reset
                </h3>
                <p className="-mx-6 mt-2 mb-3 border-b border-[#E2E8F0] px-6 pb-3 font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#64748B]">
                  Require all users to log in again once per day.
                </p>
                <p className="font-['Aileron'] text-[15px] font-normal leading-[150%] tracking-normal text-[#202830]">
                  All active sessions are automatically ended at midnight based on your
                  organization&apos;s time zone. Users must sign in again the next time they access
                  the system.
                </p>
                {/* {canUpdate && (
                  <div className="mt-4 flex items-center gap-3">
                    <Toggle
                      checked={form.dailySessionResetEnabled ?? false}
                      onChange={() =>
                        setForm((f) =>
                          f ? { ...f, dailySessionResetEnabled: !f.dailySessionResetEnabled } : f
                        )
                      }
                      disabled={!canUpdate}
                      aria-label="Daily session reset"
                    />
                    <span className="text-sm text-muted-foreground">
                      {form.dailySessionResetEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                )} */}
              </Card>
            </div>
          </section>
          </div>
          {canUpdate && (
            <div className="flex items-center gap-4">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {formError && <span className="text-sm text-red-600">{formError}</span>}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
