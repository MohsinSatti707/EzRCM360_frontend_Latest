"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DrawerFooter } from "@/components/ui/ModalFooter";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { rolesApi } from "@/lib/services/roles";
import { permissionsApi } from "@/lib/services/permissions";
import { lookupsApi } from "@/lib/services/lookups";
import { useToast } from "@/lib/contexts/ToastContext";
import type { RoleDto, RoleDetailDto, CreateRoleRequest, UpdateRoleRequest } from "@/lib/services/roles";
import type { PermissionDto, PermissionItemRequest } from "@/lib/services/permissions";
import type { ModuleLookupDto } from "@/lib/services/lookups";
import type { PaginatedList } from "@/lib/types";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  ArrowRight
} from "lucide-react";
import {
  DashboardIcon,
  PatientsIcon,
  ClaimsIcon,
  OperationalModulesIcon,
  RcmIntelligenceIcon,
  SettingsIcon,
  HelpSupportIcon,
} from "@/components/icons/SidebarIcons";


const defaultForm: CreateRoleRequest = { name: "", description: "" };
const VISIBILITY_LEVELS = ["Team", "Self"];

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
  const name = moduleName.toLowerCase();
  let Icon = null;
  
  if (depth === 0) {
    if (name.includes("dashboard")) Icon = DashboardIcon;
    else if (name.includes("patients")) Icon = PatientsIcon;
    else if (name.includes("claims")) Icon = ClaimsIcon;
    else if (name.includes("operational modules")) Icon = OperationalModulesIcon;
    else if (name.includes("rcm intelligence")) Icon = RcmIntelligenceIcon;
    else if (name.includes("settings") || name.includes("configurations")) Icon = SettingsIcon;
    else if (name.includes("help") || name.includes("support")) Icon = HelpSupportIcon;
    else Icon = OperationalModulesIcon; // fallback
  }

  const isRoot = depth === 0;
  
  let textStyle = "";
  if (isRoot && !hasChildren) {
    textStyle = "font-aileron font-normal text-[16px] leading-none text-[#2A2C33]";
  } else if (isRoot && hasChildren) {
    textStyle = "font-aileron font-bold text-[16px] leading-none text-[#2A2C33]";
  } else {
    textStyle = "font-aileron font-normal text-[16px] leading-none text-[#64748B]";
  }

  return (
    <div
      className={`flex items-center gap-2 ${textStyle}`}
      style={{ paddingLeft: depth * 24 }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggle?.(); }}
          className="flex shrink-0 items-center justify-center p-0.5 text-[#64748B] hover:text-[#1F2937]"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
        </button>
      ) : (
        depth > 0 ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" />
        ) : (
          <span className="w-5 shrink-0" />
        )
      )}
      {Icon && <Icon className="h-5 w-5 shrink-0 text-[#2A2C33]" />}
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

  const loadRoles = useCallback((preselectFirst = false) => {
    setError(null);
    setRolesLoading(true);
    rolesClient
      .getList({ pageNumber: 1, pageSize: 100 })
      .then((data: PaginatedList<RoleDto>) => {
        setRoles(data.items);
        if (preselectFirst && data.items.length > 0) {
          const first = data.items[0];
          setSelectedRole({ id: first.id, name: first.name, description: first.description ?? null, permissions: [] });
          setPermissionsLoading(true);
          permissionsClient
            .getByRoleId(first.id)
            .then((perms) => {
              setSelectedRole((prev) => (prev ? { ...prev, permissions: perms } : null));
              setPermissions(perms);
              setPermissionDirty(false);
            })
            .catch(() => setPermissions([]))
            .finally(() => setPermissionsLoading(false));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roles"))
      .finally(() => setRolesLoading(false));
  }, []);

  useEffect(() => {
    loadRoles(true);
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
      toast.success(editId ? "Role Updated" : "Role Added", <>The role <strong>{form.name}</strong> has been {editId ? "updated" : "added"} successfully.</>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteId) return;
    const deletedName = roles.find((r) => r.id === deleteId)?.name ?? "";
    setDeleteLoading(true);
    try {
      await rolesClient.delete(deleteId);
      if (selectedRole?.id === deleteId) {
        setSelectedRole(null);
        setPermissions([]);
      }
      setDeleteId(null);
      loadRoles();
      toast.success("Role Deleted", <>The role <strong>{deletedName}</strong> has been deleted successfully.</>);
    } catch (err) {
      toast.error("Delete Failed", err instanceof Error ? err.message : "Delete failed.");
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
      toast.success("Permissions Saved", "Role permissions have been saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save permissions";
      setError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSavePermissionsLoading(false);
    }
  };

  return (
    <PageShell
      breadcrumbs={[{ label: "Settings & Configurations", href: "/settings" }, { label: "Roles & Permissions" }]}
      title="Roles & Permissions"
      titleWrapperClassName="items-center px-6"
      actions={
        <Button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3]">
          Create New Role
          <Plus className="h-4 w-4" />
        </Button>
      }
    >
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-col xl:flex-row h-[calc(100vh-228px)] gap-2 bg-white mt-4 px-6">
        {/* Left: Roles list */}
        <div className="w-full xl:w-[220px] shrink-0 border border-[#E2E8F0] bg-[#FFFFFF] rounded-[5px] flex flex-col">
          <div className="border-b border-[#E2E8F0] px-6 py-4">
            <h2 className="font-aileron text-[16px] font-bold leading-none text-[#2A2C33]">Role(s)</h2>
          </div>
          {rolesLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : roles.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <Image
                src="/icons/svg/no-data-found.svg"
                alt="No Data Found"
                width={180}
                height={180}
              />
              <h3 className="mt-4 text-2xl font-bold font-['Aileron'] text-gray-800">No Data Found</h3>
              <p className="mt-1 text-[15px] font-['Aileron'] text-[#151529]">No data available yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
              {roles.map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRole(role)}
                    className={`flex w-full items-center rounded-[5px] px-4 py-3 text-left text-sm font-medium transition-colors ${
                      selectedRole?.id === role.id
                        ? " bg-[#F0F7FF] text-[#0066CC]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="truncate">{role.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: Permissions */}
        <div className="flex-1 shrink-0 rounded-[5px] border border-[#E2E8F0] bg-[#FFFFFF] ">
          <div className="border-b border-[#E2E8F0] px-6 py-4 ">
            <h2 className="font-aileron text-[16px] font-bold leading-none text-[#2A2C33]">Permissions</h2>
          </div>
          <div className="pt-4 pb-2">
            {!selectedRole ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 py-16">
              <p className="text-center text-sm font-medium text-muted-foreground">Select a role to view and edit permissions</p>
            </div>
          ) : permissionsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="mb-3 px-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold uppercase tracking-wide text-[#1F2937]">
                    {selectedRole.name}
                  </h3>
                  <button
                    type="button"
                    onClick={openEditRole}
                    className="text-[#64748B] hover:text-[#1F2937]"
                    title="Edit role"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(selectedRole.id)}
                    className="text-[#64748B] hover:text-red-600"
                    title="Delete role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {selectedRole.description && (
                  <p className="text-sm text-[#64748B]">{selectedRole.description}</p>
                )}
              </div>

              <div className="overflow-x-auto h-[calc(100vh-411px)] overflow-y-auto custom-scrollbar">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-auto max-w-[240px]" />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[160px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-[#F8FAFC] sticky top-0 z-10">
                      <th className="pl-[44px] py-3 text-left font-aileron text-[12px] font-bold uppercase leading-none text-[#2A2C33]">
                        Module(s)
                      </th>
                      <th className="px-2 py-3 text-left">
                        <label className="flex cursor-pointer items-center gap-2 font-aileron text-[12px] font-bold uppercase leading-none text-[#2A2C33]">
                          <input
                            type="checkbox"
                            ref={headerViewRef}
                            checked={allView}
                            onChange={(e) => selectAllInColumn("canView", e.target.checked)}
                            className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                          />
                          <span>View</span>
                        </label>
                      </th>
                      <th className="px-2 py-3 text-left">
                        <label className="flex cursor-pointer items-center gap-2 font-aileron text-[12px] font-bold uppercase leading-none text-[#2A2C33]">
                          <input
                            type="checkbox"
                            ref={headerCreateRef}
                            checked={allCreate}
                            onChange={(e) => selectAllInColumn("canCreate", e.target.checked)}
                            className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                          />
                          <span>Create</span>
                        </label>
                      </th>
                      <th className="px-2 py-3 text-left">
                        <label className="flex cursor-pointer items-center gap-2 font-aileron text-[12px] font-bold uppercase leading-none text-[#2A2C33]">
                          <input
                            type="checkbox"
                            ref={headerUpdateRef}
                            checked={allUpdate}
                            onChange={(e) => selectAllInColumn("canUpdate", e.target.checked)}
                            className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                          />
                          <span>Update</span>
                        </label>
                      </th>
                      <th className="px-2 py-3 text-left">
                        <label className="flex cursor-pointer items-center gap-2 font-aileron text-[12px] font-bold uppercase leading-none text-[#2A2C33]">
                          <input
                            type="checkbox"
                            ref={headerDeleteRef}
                            checked={allDelete}
                            onChange={(e) => selectAllInColumn("canDelete", e.target.checked)}
                            className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                          />
                          <span>Delete</span>
                        </label>
                      </th>
                      <th className="px-4 py-3 text-left font-aileron text-[12px] font-bold uppercase leading-none text-[#2A2C33]">
                        Visibility Level
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {rowsToRender.map(({ node, depth }) => {
                        const p = permissionByModuleId.get(node.id);
                        if (!p) return null;
                        const hasChildren = node.children.length > 0;
                        const isExpanded = expandedParentIds.has(node.id);
                        return (
                          <tr key={p.moduleId} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-sm">
                              <ModuleCell
                                moduleName={p.moduleName}
                                hasChildren={hasChildren}
                                isExpanded={isExpanded}
                                depth={depth}
                                onToggle={() => toggleExpand(node.id)}
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="checkbox"
                                checked={p.canView}
                                onChange={(e) => updatePermission(p.moduleId, { canView: e.target.checked })}
                                className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="checkbox"
                                checked={p.canCreate}
                                onChange={(e) => updatePermission(p.moduleId, { canCreate: e.target.checked })}
                                className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="checkbox"
                                checked={p.canUpdate}
                                onChange={(e) => updatePermission(p.moduleId, { canUpdate: e.target.checked })}
                                className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="checkbox"
                                checked={p.canDelete}
                                onChange={(e) => updatePermission(p.moduleId, { canDelete: e.target.checked })}
                                className="h-[24px] w-[24px] rounded-[6px] border border-[#E2E8F0] bg-white text-[#0066CC] focus:ring-[#0066CC] bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22%23CBD5E1%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] checked:bg-[#0066CC] checked:border-[#0066CC] checked:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2014%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%205L4.5%208.5L13%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat appearance-none"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={p.visibilityLevel || "Team"}
                                onChange={(e) =>
                                  updatePermission(p.moduleId, { visibilityLevel: e.target.value })
                                }
                                className="w-full rounded-md border border-[#CBD5E1] bg-white px-2 py-1.5 text-sm text-[#1F2937] focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
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

              <div className="mt-2 mx-6">
                <Button
                  onClick={handleSavePermissions}
                  disabled={!permissionDirty || savePermissionsLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3]"
                >
                  {savePermissionsLoading ? "Saving…" : "Save Permissions"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Create / Edit Role modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Role" : "Create Role"}
        size="md"
        position="right"
        footer={
          <DrawerFooter
            onCancel={() => setModalOpen(false)}
            submitLabel={
              <>
                {editId ? "Save Role" : "Save Role"}
                {/* <ArrowRight className="ml-1 h-4 w-4" aria-hidden /> */}
              </>
            }
            onSubmit={handleSubmitRole}
            loading={submitLoading}
            className="border-t border-[#E2E8F0] px-6 py-4"
          />
        }
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmitRole(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
              e.preventDefault();
              handleSubmitRole();
            }
          }}
        >
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#2A2C33]">
                Role Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., System Administrator"
                className="input-enterprise w-full rounded-lg border border-[#E2E8F0] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block font-['Aileron'] text-[14px] font-normal leading-[160%] tracking-normal text-[#2A2C33]">
                Description
              </label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Write description here..."
                rows={4}
                className="w-full rounded-lg border border-[#E2E8F0] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteRole}
        title="Delete role"
        message={<>Are you sure you want to delete the role <strong>{roles.find((r) => r.id === deleteId)?.name ?? ""}</strong>?</>}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </PageShell>
  );
}
