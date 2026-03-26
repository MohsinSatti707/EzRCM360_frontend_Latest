# State Management

How state is managed across the application.

---

## Philosophy

**No global state library (no Redux, no Zustand, no Jotai).**

State is managed in three tiers:

| Tier | Mechanism | Examples |
|------|-----------|---------|
| Global shared | React Context | Permissions, Sidebar, Toasts |
| Page/feature | `useState` + custom hooks | CRUD state, form values, modal open |
| Transient | Component `useState` | Hover, dropdown open, input focus |

---

## Global Contexts

All three contexts are provided in `app/layout.tsx` and available throughout the app.

---

### 1. `PermissionsContext`

**File:** `lib/contexts/PermissionsContext.tsx`

**Purpose:** Stores the current user's RBAC permissions. Fetches once on app load.

**State shape:**
```typescript
interface PermissionsContextValue {
  permissions: PermissionDto[] | null;
  loading: boolean;
  error: string | null;
  canView:   (moduleName: string) => boolean;
  canCreate: (moduleName: string) => boolean;
  canUpdate: (moduleName: string) => boolean;
  canDelete: (moduleName: string) => boolean;
}
```

**How it works:**
1. On mount, calls `GET /api/Permissions/me`
2. Stores the result as `PermissionDto[]`
3. `canView(name)` searches the array for a matching module and returns the boolean

**Hooks:**
```typescript
// Throws if used outside provider (should always be inside):
const { canView, canCreate } = usePermissions();

// Returns null if no provider (safe for optional contexts):
const ctx = usePermissionsOptional();

// Fail-secure: returns false while loading, throws if no provider:
const { canView, loading } = useModulePermission('Users');
```

**Fail-secure pattern:**
```typescript
// While permissions are loading → deny access (returns false)
// No matching permission → deny access (returns false)
// Only grant if explicitly permitted
```

**Example usage:**
```typescript
const { canView, loading } = useModulePermission('Insurance AR Analysis');

if (loading) return null;   // Don't show anything while loading
if (!canView) return <AccessDenied />;
```

---

### 2. `SidebarContext`

**File:** `lib/contexts/SidebarContext.tsx`

**Purpose:** Controls the sidebar collapsed/expanded state.

**State shape:**
```typescript
interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggle: () => void;
}
```

**Hooks:**
```typescript
const { collapsed, toggle } = useSidebar();
```

**Used by:**
- `Sidebar.tsx` — to know when to hide labels
- `MainLayout.tsx` — to adjust `padding-left` of the main content area

---

### 3. `ToastContext`

**File:** `lib/contexts/ToastContext.tsx`

**Purpose:** Manages a queue of toast notification messages.

**State shape:**
```typescript
interface ToastItem {
  id: string;
  message: string;
  variant: 'success' | 'error';
}

interface ToastContextValue {
  toasts: ToastItem[];
  success: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: string) => void;
}
```

**Hooks:**
```typescript
const { success, error } = useToast();

// Show toasts:
success('User created successfully.');
error('Failed to save changes.');
```

**Behaviors:**
- Auto-dismiss after 5000ms
- Deduplication: identical message+variant pairs are skipped
- Long error messages get extended display time

---

## Page-Level State: `useCrudPage`

**File:** `lib/hooks/useCrudPage.ts`

This is the most important hook in the codebase. It encapsulates the full state machine for a CRUD management page.

**Input:**
```typescript
interface UseCrudPageOptions<TItem, TForm, TCreate, TUpdate> {
  api: {
    getList: (params?) => Promise<PaginatedList<TItem>>;
    create:  (body: TCreate) => Promise<string | void>;
    update:  (id: string, body: TUpdate) => Promise<void>;
    delete:  (id: string) => Promise<void>;
  };
  pageNumber: number;
  pageSize?: number;
  defaultForm: TForm;
  toForm: (item: TItem) => TForm;
  fetchParams?: Record<string, unknown>;
  onPageChange?: (page: number) => void;
}
```

**Returns:**
```typescript
{
  // List state
  data: PaginatedList<TItem> | null;
  loading: boolean;
  error: string | null;
  reload: () => void;

  // Modal state
  modalOpen: boolean;
  isEditing: boolean;
  editingId: string | null;
  openCreate: () => void;
  openEdit: (item: TItem) => void;
  closeModal: () => void;

  // Form state
  form: TForm;
  setForm: Dispatch<SetStateAction<TForm>>;

  // Submit state
  submitLoading: boolean;
  handleSubmit: (validate?: () => boolean) => Promise<void>;

  // Delete state
  deleteLoading: boolean;
  handleDelete: (id: string) => Promise<void>;
  confirmDelete: boolean;
  setConfirmDelete: ...;
  deleteTargetId: string | null;
}
```

**Example:**
```typescript
const [page, setPage] = useState(1);

const crud = useCrudPage({
  api: usersApi(),
  pageNumber: page,
  defaultForm: { name: '', email: '', roleId: '' },
  toForm: (user) => ({ name: user.name, email: user.email, roleId: user.roleId }),
  onPageChange: setPage,
});

// In JSX:
// crud.data?.items, crud.loading, crud.openCreate(), crud.openEdit(user)
// crud.form, crud.setForm, crud.handleSubmit, crud.modalOpen
```

---

## Pagination State: `usePaginatedList`

**File:** `lib/hooks/usePaginatedList.ts`

Lower-level hook used inside `useCrudPage`. Use directly for read-only paginated lists.

```typescript
const { data, loading, error, reload } = usePaginatedList({
  pageNumber: page,
  pageSize: 10,
  fetch: (params) => widgetsApi().getList(params),
  extraParams: { organizationId: orgId },
});
```

Re-fetches automatically when `pageNumber`, `pageSize`, or `extraParams` change.

---

## Form State

Forms are managed with plain `useState` via `useCrudPage`'s `form` and `setForm`:

```typescript
// Update a single field:
crud.setForm(prev => ({ ...prev, name: e.target.value }));

// Or bind directly:
<Input
  value={crud.form.name}
  onChange={e => crud.setForm(prev => ({ ...prev, name: e.target.value }))}
/>
```

No form library (no react-hook-form, no Formik). Validation is manual:
```typescript
crud.handleSubmit(() => {
  if (!crud.form.name) { toast.error('Name is required'); return false; }
  return true;
});
```

---

## State Flow Diagram

```
User action (click "Add User")
        │
        ▼
crud.openCreate()
  → sets modalOpen = true
  → sets form = defaultForm
  → sets isEditing = false
        │
        ▼
User fills form → crud.setForm(...)
        │
        ▼
User clicks Save → crud.handleSubmit(validate)
  → calls validate() → if false, stop
  → sets submitLoading = true
  → calls api.create(form) or api.update(editingId, form)
  → on success: closeModal(), reload(), toast.success()
  → on error: toast.error(message)
  → sets submitLoading = false
```
