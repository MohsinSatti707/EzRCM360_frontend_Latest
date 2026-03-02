"use client";

import Link from "next/link";
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
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
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
        ${checked ? "bg-primary-600" : "bg-slate-200"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
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
      toast.success("Security settings saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async (userId: string) => {
    setMfaDisablingId(userId);
    try {
      await api.disableUserMfa(userId);
      loadUsers();
      toast.success("MFA disabled for user.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disable MFA.");
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
      description="Manage how users authenticate and how long sessions remain active. These controls help protect your organization while maintaining usability."
    >
      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {form && (
        <div className="space-y-8">
          {/* Multi-Factor Authentication (MFA) section - two-column grid */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Multi-Factor Authentication (MFA)
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left column: MFA for Account Administrator + MFA Frequency */}
              <div className="flex flex-col gap-6">
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-slate-900">
                    MFA for Account Administrator
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-primary-600">
                    Multi-Factor Authentication is mandatory for all Account Administrators and
                    cannot be disabled.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Account Administrators have elevated permissions that affect system security,
                    user access, and configuration. MFA is always required for these roles to reduce
                    the risk of unauthorized access.
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-base font-semibold text-slate-900">MFA Frequency</h3>
                  <p className="mt-2 text-sm font-semibold text-primary-600">
                    Define how often users must re-confirm their identity using MFA
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
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
                        <span className="text-sm text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right column: MFA for Users */}
              <Card className="p-6">
                <h3 className="text-base font-semibold text-slate-900">MFA for Users</h3>
                <p className="mt-2 text-sm font-semibold text-primary-600">
                  Control whether Multi-Factor Authentication is required for non-administrator
                  users.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  You may enable MFA for all users or selectively enforce it for specific users
                  based on your organization&apos;s security needs. Account Administrators are
                  always protected by MFA and are not affected by this setting.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Enable MFA for all users</span>
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
                </div>
                <div className="mt-4">
                  <div className="relative max-w-xs">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search user"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell className="font-semibold text-primary-600">
                          User(s)
                        </TableHeaderCell>
                        <TableHeaderCell align="right" className="font-semibold text-primary-600">
                          MFA Status
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-sm text-slate-500">
                            No users found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-primary-600">{u.userName}</div>
                                {u.roleName && (
                                  <div className="text-xs text-slate-500">{u.roleName}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
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
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Session Management</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="text-base font-semibold text-slate-900">Inactivity Timeout</h3>
                <p className="mt-2 text-sm font-semibold text-primary-600">
                  Automatically log users out after a period of inactivity.
                </p>
                <p className="mt-2 text-sm text-slate-600">
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
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-base font-semibold text-slate-900">Daily Session Reset</h3>
                <p className="mt-2 text-sm font-semibold text-primary-600">
                  Require all users to log in again once per day.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  All active sessions are automatically ended at midnight based on your
                  organization&apos;s time zone. Users must sign in again the next time they access
                  the system.
                </p>
                {canUpdate && (
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
                    <span className="text-sm text-slate-600">
                      {form.dailySessionResetEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          </section>

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
