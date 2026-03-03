"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { rolesApi } from "@/lib/services/roles";
import { permissionsApi } from "@/lib/services/permissions";
import { lookupsApi } from "@/lib/services/lookups";
import { useToast } from "@/lib/contexts/ToastContext";
import type { RoleDto, RoleDetailDto, CreateRoleRequest, UpdateRoleRequest } from "@/lib/services/roles";
import type { PermissionDto, PermissionItemRequest } from "@/lib/services/permissions";
import type { ModuleLookupDto } from "@/lib/services/lookups";
import type { PaginatedList } from "@/lib/types";

const defaultForm: CreateRoleRequest = { name: "", description: "" };
const VISIBILITY_LEVELS = ["Team", "Individual", "Organization"];

/** Root order from Permission.xlsx: Dashboard, Patients, Claims, Operational Modules, RCM Intelligence, Settings & Configurations, Help & Support, then others */
const ROOT_ORDER = [
  "Dashboard",
  "Patients",
  "Claims",
  "Operational Modules",
  "RCM Intelligence",
  "Settings & Configurations",
  "Help & Support",
];

/** All module names that must appear under Settings & Configurations (enforced in UI even if API returns parentId null) */
const SETTINGS_CHILDREN_ORDER = [
  "Applicability Rules",
  "Bundling/Reduction Rules",
  "CPT/HCPCS Codes",
  "Fee Schedules",
  "Financial Modifiers",
  "ICD Codes",
  "Modifiers",
  "NDC Codes",
  "Procedure Grouping Rules",
  "Zip Geo Mappings",
  "Entities",
  "Entity Locations",
  "Entity Providers",
  "Group Provider Plan Participations",
  "Organizations",
  "Payers",
  "Plans",
  "Rendering Provider Plan Participations",
  "Roles",
  "Users",
  "Security Access",
];

const SETTINGS_CHILDREN_NAMES = new Set(SETTINGS_CHILDREN_ORDER);

export type ModuleNode = { id: string; name: string; parentId: string | null; children: ModuleNode[] };

function buildModuleTree(modules: ModuleLookupDto[]): ModuleNode[] {
  const byId = new Map<string, ModuleNode>();
  modules.forEach((m) => byId.set(m.id, { id: m.id, name: m.name, parentId: m.parentId ?? null, children: [] }));
  const roots: ModuleNode[] = [];
  byId.forEach((node) => {
    if (!node.parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });

  // Force all Settings & Configurations modules under that parent (in case API still returns parentId null)
  const settingsNode = roots.find((r) => r.name === "Settings & Configurations");
  if (settingsNode) {
    const toMove = roots.filter((r) => r !== settingsNode && SETTINGS_CHILDREN_NAMES.has(r.name));
    toMove.forEach((node) => {
      roots.splice(roots.indexOf(node), 1);
      settingsNode.children.push(node);
    });
  }

  const orderIdx = (name: string) => {
    const i = ROOT_ORDER.indexOf(name);
    return i >= 0 ? i : ROOT_ORDER.length;
  };
  roots.sort((a, b) => orderIdx(a.name) - orderIdx(b.name));
  const settingsOrderIdx = (name: string) => {
    const i = SETTINGS_CHILDREN_ORDER.indexOf(name);
    return i >= 0 ? i : SETTINGS_CHILDREN_ORDER.length;
  };
  roots.forEach((r) => {
    if (r.name === "Settings & Configurations") {
      r.children.sort((a, b) => settingsOrderIdx(a.name) - settingsOrderIdx(b.name));
    } else {
      r.children.sort((a, b) => a.name.localeCompare(b.name));
    }
  });
  return roots;
}

function flattenForDisplay(nodes: ModuleNode[], expandedIds: Set<string>, depth: number): { node: ModuleNode; depth: number }[] {
  const out: { node: ModuleNode; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      out.push(...flattenForDisplay(node.children, expandedIds, depth + 1));
    }
  }
  return out;
}

function ModuleCell({
  moduleName,
  hasChildren,
  isExpanded,
  depth,
  onToggle,
}: {
  moduleName: string;
  hasChildren: boolean;
  isExpanded: boolean;
  depth: number;
  onToggle?: () => void;
}) {
  const iconClass = "h-5 w-5 shrink-0 text-muted-foreground";
  const Chevron = () => (
    <svg
      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
  const Clock = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const Users = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
  const Document = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
  const ChartBar = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
  const Database = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
  const Gear = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const Info = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const Folder = () => (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );

  const name = moduleName.toLowerCase();
  let Icon = Folder;
  if (name.includes("dashboard")) Icon = Clock;
  else if (name.includes("patients")) Icon = Users;
  else if (name.includes("claims")) Icon = Document;
  else if (name.includes("operational modules")) Icon = ChartBar;
  else if (name.includes("rcm intelligence")) Icon = Database;
  else if (name.includes("settings") || name.includes("configurations")) Icon = Gear;
  else if (name.includes("help") || name.includes("support")) Icon = Info;

  return (
    <div
      className="flex items-center gap-2"
      style={{ paddingLeft: depth * 16 }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggle?.(); }}
          className="flex shrink-0 rounded p-0.5 hover:bg-muted"
          aria-expanded={isExpanded}
        >
          <Chevron />
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <Icon />
      <span className="truncate">{moduleName}</span>
    </div>
  );
}

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleDetailDto | null>(null);
  const [modules, setModules] = useState<ModuleLookupDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set());
  const [permissionDirty, setPermissionDirty] = useState(false);
  const [savePermissionsLoading, setSavePermissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateRoleRequest>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const headerViewRef = useRef<HTMLInputElement>(null);
  const headerCreateRef = useRef<HTMLInputElement>(null);
  const headerUpdateRef = useRef<HTMLInputElement>(null);
  const headerDeleteRef = useRef<HTMLInputElement>(null);

  const rolesClient = rolesApi();
  const permissionsClient = permissionsApi();
  const toast = useToast();

  const loadRoles = useCallback(() => {
    setError(null);
    setRolesLoading(true);
    rolesClient
      .getList({ pageNumber: 1, pageSize: 100 })
      .then((data: PaginatedList<RoleDto>) => setRoles(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roles"))
      .finally(() => setRolesLoading(false));
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    lookupsApi()
      .getModules()
      .then(setModules)
      .catch(() => setModules([]));
  }, []);

  const onSelectRole = (role: RoleDto) => {
    if (permissionDirty && selectedRole) {
      if (!confirm("You have unsaved permission changes. Discard?")) return;
    }
    setSelectedRole({ id: role.id, name: role.name, description: role.description ?? null, permissions: [] });
    setExpandedParentIds(new Set());
    setPermissionsLoading(true);
    setError(null);
    permissionsClient
      .getByRoleId(role.id)
      .then((perms) => {
        setSelectedRole((prev) => (prev ? { ...prev, permissions: perms } : null));
        setPermissions(perms);
        setPermissionDirty(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load permissions");
        setPermissions([]);
      })
      .finally(() => setPermissionsLoading(false));
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditRole = () => {
    if (!selectedRole) return;
    setEditId(selectedRole.id);
    setForm({ name: selectedRole.name, description: selectedRole.description ?? "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitRole = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Role name is required.");
      return;
    }
    setSubmitLoading(true);
    try {
      if (editId) {
        await rolesClient.update(editId, form as UpdateRoleRequest);
        if (selectedRole?.id === editId) {
          setSelectedRole((prev) => (prev ? { ...prev, name: form.name, description: form.description ?? null } : null));
        }
      } else {
        await rolesClient.create(form);
      }
      setModalOpen(false);
      loadRoles();
      toast.success("Saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await rolesClient.delete(deleteId);
      if (selectedRole?.id === deleteId) {
        setSelectedRole(null);
        setPermissions([]);
      }
      setDeleteId(null);
      loadRoles();
      toast.success("Deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const updatePermission = (moduleId: string, patch: Partial<PermissionDto>) => {
    setPermissions((prev) =>
      prev.map((p) => (p.moduleId === moduleId ? { ...p, ...patch } : p))
    );
    setPermissionDirty(true);
  };

  const selectAllInColumn = (field: "canView" | "canCreate" | "canUpdate" | "canDelete", checked: boolean) => {
    setPermissions((prev) => prev.map((p) => ({ ...p, [field]: checked })));
    setPermissionDirty(true);
  };

  const allView = permissions.length > 0 && permissions.every((p) => p.canView);
  const allCreate = permissions.length > 0 && permissions.every((p) => p.canCreate);
  const allUpdate = permissions.length > 0 && permissions.every((p) => p.canUpdate);
  const allDelete = permissions.length > 0 && permissions.every((p) => p.canDelete);
  const someView = permissions.some((p) => p.canView);
  const someCreate = permissions.some((p) => p.canCreate);
  const someUpdate = permissions.some((p) => p.canUpdate);
  const someDelete = permissions.some((p) => p.canDelete);

  const permissionByModuleId = useMemo(() => {
    const map = new Map<string, PermissionDto>();
    permissions.forEach((p) => map.set(p.moduleId, p));
    return map;
  }, [permissions]);

  const moduleTree = useMemo(() => buildModuleTree(modules), [modules]);
  const flattenedRows = useMemo(
    () => flattenForDisplay(moduleTree, expandedParentIds, 0),
    [moduleTree, expandedParentIds]
  );

  // Expand "Settings & Configurations" by default so its children (Entities, Organizations, etc.) are visible
  useEffect(() => {
    const settings = moduleTree.find((r) => r.name === "Settings & Configurations");
    if (settings?.id) {
      setExpandedParentIds((prev) => (prev.has(settings.id) ? prev : new Set(prev).add(settings.id)));
    }
  }, [moduleTree]);

  const useTree = moduleTree.length > 0;
  const rowsToRender = useTree
    ? flattenedRows.filter(({ node }) => permissionByModuleId.has(node.id))
    : permissions.map((p) => ({ node: { id: p.moduleId, name: p.moduleName, parentId: null, children: [] }, depth: 0 }));

  const toggleExpand = (moduleId: string) => {
    setExpandedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  useEffect(() => {
    if (headerViewRef.current) headerViewRef.current.indeterminate = someView && !allView;
    if (headerCreateRef.current) headerCreateRef.current.indeterminate = someCreate && !allCreate;
    if (headerUpdateRef.current) headerUpdateRef.current.indeterminate = someUpdate && !allUpdate;
    if (headerDeleteRef.current) headerDeleteRef.current.indeterminate = someDelete && !allDelete;
  }, [allView, allCreate, allUpdate, allDelete, someView, someCreate, someUpdate, someDelete]);

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavePermissionsLoading(true);
    try {
      const payload: PermissionItemRequest[] = permissions.map((p) => ({
        moduleId: p.moduleId,
        canView: p.canView,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
        visibilityLevel: p.visibilityLevel || "Team",
      }));
      await permissionsClient.updateByRoleId(selectedRole.id, { permissions: payload });
      setPermissionDirty(false);
      toast.success("Permissions saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save permissions";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavePermissionsLoading(false);
    }
  };

  return (
    <PageShell
      breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Roles & Permissions" }]}
      title="Roles & Permissions"
      description="Manage roles and assign module-level permissions."
      actions={
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          Create New Role
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      }
    >
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(280px,360px)_1fr]">
        {/* Left: Roles list */}
        <Card className="p-6" elevated>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-foreground">Roles</h2>
          </div>
          {rolesLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ul className="space-y-1.5">
              {roles.map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRole(role)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ${
                      selectedRole?.id === role.id
                        ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                      {role.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{role.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Right: Permissions */}
        <Card className="min-h-[420px] p-6" elevated>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-foreground">Permissions</h2>
          </div>
          {!selectedRole ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-center text-sm font-medium text-muted-foreground">Select a role to view and edit permissions</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">Choose a role from the list on the left</p>
            </div>
          ) : permissionsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">
                      {selectedRole.name.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={openEditRole}
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Edit role"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(selectedRole.id)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      title="Delete role"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {selectedRole.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{selectedRole.description}</p>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full table-fixed divide-y divide-border">
                  <colgroup>
                    <col className="min-w-[200px]" />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-[140px]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-primary-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-900">
                        Module(s)
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-900">
                        <label className="flex cursor-pointer items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            ref={headerViewRef}
                            checked={allView}
                            onChange={(e) => selectAllInColumn("canView", e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                          />
                          <span>View</span>
                        </label>
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-900">
                        <label className="flex cursor-pointer items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            ref={headerCreateRef}
                            checked={allCreate}
                            onChange={(e) => selectAllInColumn("canCreate", e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                          />
                          <span>Create</span>
                        </label>
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-900">
                        <label className="flex cursor-pointer items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            ref={headerUpdateRef}
                            checked={allUpdate}
                            onChange={(e) => selectAllInColumn("canUpdate", e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                          />
                          <span>Update</span>
                        </label>
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-900">
                        <label className="flex cursor-pointer items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            ref={headerDeleteRef}
                            checked={allDelete}
                            onChange={(e) => selectAllInColumn("canDelete", e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                          />
                          <span>Delete</span>
                        </label>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-900">
                        Visibility Level
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {rowsToRender.map(({ node, depth }) => {
                        const p = permissionByModuleId.get(node.id);
                        if (!p) return null;
                        const hasChildren = node.children.length > 0;
                        const isExpanded = expandedParentIds.has(node.id);
                        return (
                          <tr key={p.moduleId} className="hover:bg-muted">
                            <td className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                              <ModuleCell
                                moduleName={p.moduleName}
                                hasChildren={hasChildren}
                                isExpanded={isExpanded}
                                depth={depth}
                                onToggle={() => toggleExpand(node.id)}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={p.canView}
                                onChange={(e) => updatePermission(p.moduleId, { canView: e.target.checked })}
                                className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={p.canCreate}
                                onChange={(e) => updatePermission(p.moduleId, { canCreate: e.target.checked })}
                                className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={p.canUpdate}
                                onChange={(e) => updatePermission(p.moduleId, { canUpdate: e.target.checked })}
                                className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={p.canDelete}
                                onChange={(e) => updatePermission(p.moduleId, { canDelete: e.target.checked })}
                                className="h-4 w-4 rounded border-input text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <select
                                value={p.visibilityLevel || "Team"}
                                onChange={(e) =>
                                  updatePermission(p.moduleId, { visibilityLevel: e.target.value })
                                }
                                className="w-full min-w-0 rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                {VISIBILITY_LEVELS.map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSavePermissions}
                  disabled={!permissionDirty || savePermissionsLoading}
                  className="inline-flex items-center gap-2"
                >
                  {savePermissionsLoading ? "Saving…" : "Save Permissions"}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create / Edit Role modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Role" : "Create Role"}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitRole(); }}>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Role Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., System Administrator"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Write description here..."
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                Save Role
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            }
            onSubmit={handleSubmitRole}
            loading={submitLoading}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteRole}
        title="Delete role"
        message="Are you sure you want to delete this role?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </PageShell>
  );
}
