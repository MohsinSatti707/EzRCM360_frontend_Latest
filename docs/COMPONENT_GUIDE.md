# Component Guide

Key components, their props, and how to use them.

---

## Layout Components

### `PageShell`

**Path:** `components/layout/PageShell.tsx`

The standard page wrapper. Use it for every protected page that needs a title and breadcrumbs.

```typescript
interface PageShellProps {
  breadcrumbs?: { label: string; href?: string }[];
  title: string;
  description?: ReactNode;
  actions?: ReactNode;          // Rendered top-right (e.g., "Add" button)
  className?: string;
  titleWrapperClassName?: string;
  children: ReactNode;
}
```

**Usage:**
```tsx
<PageShell
  breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Users' }]}
  title="Users"
  description="Manage system users and their roles."
  actions={<Button onClick={openCreate}>Add User</Button>}
>
  <Table ... />
</PageShell>
```

**Behavior:**
- Breadcrumb bar: light gray background, uppercase, text-xs
- Title: font-bold, 24px, dark (#202830)
- Entrance animation: `animate-fade-in`

---

### `MainLayout`

**Path:** `components/layout/MainLayout.tsx`

App shell. Renders Sidebar + Header + footer around `{children}`. You never use this directly — `ConditionalLayout` applies it automatically.

---

### `Sidebar`

**Path:** `components/layout/Sidebar.tsx`

The left navigation. Reads from `SidebarContext` (collapsed state) and `PermissionsContext` (visible items). Do not pass props — it is fully context-driven.

**Collapse behavior:**
- Expanded: `w-64`, shows labels
- Collapsed: `w-12`, shows icons only

**Adding a new nav item:**
- Find the relevant nav group array inside `Sidebar.tsx`
- Add `{ label, href, icon, moduleName }` to the array
- Make sure `moduleName` matches a backend permission module name

---

### `ConditionalLayout`

**Path:** `components/layout/ConditionalLayout.tsx`

Decides which layout to render based on the current path:
- Auth paths (`/login`, `/set-password`, `/authentication/*`) → no layout
- Everything else → `MfaRouteGuard` + `MainLayout`

You don't use this directly. It wraps `{children}` in `app/layout.tsx`.

---

## UI Components

All exported from `components/ui/index.ts`. Import from `@/components/ui`.

---

### `Button`

Standard button. Wraps Radix or native button with variants.

```tsx
<Button variant="default">Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost" size="icon"><TrashIcon /></Button>
<Button disabled={loading}>
  {loading ? <Loader className="mr-2" /> : null}
  Submit
</Button>
```

---

### `Modal`

A dialog overlay. Built on Radix Dialog.

```tsx
<Modal open={isOpen} onOpenChange={setIsOpen} title="Edit User">
  <form onSubmit={handleSubmit}>
    <Input ... />
    <ModalFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button type="submit">Save</Button>
    </ModalFooter>
  </form>
</Modal>
```

---

### `DrawerForm`

Full-height right-side slide-in drawer. Use for complex forms.

```tsx
<DrawerForm open={isOpen} onOpenChange={setIsOpen} title="Add Entity">
  {/* form content */}
</DrawerForm>
```

---

### `ConfirmDialog`

Confirmation prompt before destructive actions.

```tsx
<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete User"
  description="This action cannot be undone."
  onConfirm={handleDelete}
  loading={deleteLoading}
/>
```

---

### `Table`

Standard HTML table with consistent styling.

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead className="w-[80px]">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.email}</TableCell>
        <TableCell>
          <TableActionsCell
            onEdit={() => openEdit(item)}
            onDelete={() => openDelete(item.id)}
          />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### `TableActionsCell`

Edit + Delete icon buttons in one cell. Accepts `onEdit` and `onDelete` callbacks.

```tsx
<TableActionsCell onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
```

---

### `Pagination`

Standard pagination controls.

```tsx
<Pagination
  pageNumber={page}
  totalPages={data?.totalPages ?? 1}
  onPageChange={setPage}
/>
```

---

### `OverlayLoader`

Full-page dimmed loading overlay. Use during form submissions.

```tsx
{submitLoading && <OverlayLoader />}
```

---

### `TruncatedWithTooltip`

Shows text truncated with `...`, reveals full text on hover tooltip.

```tsx
<TruncatedWithTooltip text={longDescription} maxLength={60} />
```

---

### `ContentCard`

A titled card section.

```tsx
<ContentCard title="Claim Breakdown">
  {/* card body */}
</ContentCard>
```

---

### `Badge`

Colored label for status values.

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="outline">Draft</Badge>
```

---

## Auth Components

### `AuthGuard`

Wrap any page that needs client-side auth protection:

```tsx
export default function ProtectedPage() {
  return (
    <AuthGuard>
      <PageContent />
    </AuthGuard>
  );
}
```

---

### `AccessRestrictedContent`

Show/hide content based on a permission:

```tsx
<AccessRestrictedContent allowed={canCreate}>
  <Button onClick={openCreate}>Add User</Button>
</AccessRestrictedContent>
```

---

## Settings Components

### `SettingsCard`

Used on the `/settings` hub page — a clickable card linking to a sub-section.

```tsx
<SettingsCard
  icon={<UsersIcon />}
  title="Users"
  description="Manage users and their access."
  href="/settings/users"
/>
```

---

### `BulkImportActions`

Download template + upload Excel file controls. Standard in all CRUD settings pages.

```tsx
<BulkImportActions
  onDownloadTemplate={handleDownload}
  onImport={handleImport}
  importing={importLoading}
/>
```

---

## RCM Components

### `FileUploadZone`

Drag-and-drop or click-to-select file input.

```tsx
<FileUploadZone
  accept=".xlsx,.xls"
  onFileSelect={(file) => setSelectedFile(file)}
  label="Drop your AR intake file here"
/>
```

### `Stepper`

Multi-step wizard header.

```tsx
<Stepper
  steps={['Upload Intake', 'Upload PM Report', 'Processing']}
  currentStep={1}
/>
```
