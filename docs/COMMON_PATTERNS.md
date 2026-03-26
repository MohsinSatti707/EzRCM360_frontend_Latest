# Common Patterns

Reusable patterns used throughout the codebase.

---

## 1. Standard CRUD Page

Every settings management page follows the same structure. Here is the complete pattern:

```tsx
'use client';

import { useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
         TableActionsCell, Pagination, OverlayLoader, Modal, ModalFooter,
         Input, Label, ConfirmDialog } from '@/components/ui';
import { BulkImportActions } from '@/components/settings/BulkImportActions';
import { useCrudPage } from '@/lib/hooks';
import { useToast } from '@/lib/contexts/ToastContext';
import { useModulePermission } from '@/lib/contexts/PermissionsContext';
import { widgetsApi, type WidgetDto, type WidgetFormDto } from '@/lib/services';

const DEFAULT_FORM: WidgetFormDto = { name: '', color: '' };

export default function WidgetsPage() {
  const [page, setPage] = useState(1);
  const { success } = useToast();
  const { canView, canCreate, canUpdate, canDelete } = useModulePermission('Widgets');

  const crud = useCrudPage({
    api: widgetsApi(),
    pageNumber: page,
    defaultForm: DEFAULT_FORM,
    toForm: (w: WidgetDto) => ({ name: w.name, color: w.color }),
    onPageChange: setPage,
  });

  function validate(): boolean {
    if (!crud.form.name.trim()) { /* show error */ return false; }
    return true;
  }

  if (!canView) return <AccessDenied />;

  return (
    <PageShell
      breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Widgets' }]}
      title="Widgets"
      actions={canCreate ? <Button onClick={crud.openCreate}>Add Widget</Button> : null}
    >
      {crud.submitLoading && <OverlayLoader />}

      <BulkImportActions onDownloadTemplate={...} onImport={...} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {crud.data?.items.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.color}</TableCell>
              <TableCell>
                <TableActionsCell
                  onEdit={canUpdate ? () => crud.openEdit(item) : undefined}
                  onDelete={canDelete ? () => crud.handleDelete(item.id) : undefined}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        pageNumber={page}
        totalPages={crud.data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      <Modal
        open={crud.modalOpen}
        onOpenChange={crud.closeModal}
        title={crud.isEditing ? 'Edit Widget' : 'Add Widget'}
      >
        <form onSubmit={e => { e.preventDefault(); crud.handleSubmit(validate); }}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={crud.form.name}
                onChange={e => crud.setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={crud.closeModal}>Cancel</Button>
            <Button type="submit" disabled={crud.submitLoading}>Save</Button>
          </ModalFooter>
        </form>
      </Modal>
    </PageShell>
  );
}
```

---

## 2. Permission Gate Pattern

### Page-level gate

```tsx
const { canView, loading } = useModulePermission('Module Name');
if (loading) return null;
if (!canView) return <AccessDenied />;
```

### Inline gate (show/hide elements)

```tsx
{canCreate && <Button onClick={openCreate}>Add</Button>}
{canDelete && <TableActionsCell onDelete={...} />}
```

### Using `AccessRestrictedContent`

```tsx
<AccessRestrictedContent allowed={canCreate}>
  <Button>Add New</Button>
</AccessRestrictedContent>
```

---

## 3. Enum Resolution Pattern

Many backend fields return numeric enums. Use `resolveEnum()` to convert form values:

```typescript
import { ENUMS, resolveEnum, resolveEnumNullable } from '@/lib/utils';

// In a create/update body:
const body = {
  planCategory: resolveEnum(form.planCategory, ENUMS.PlanCategory),  // 'Commercial' → 0
  participationStatus: resolveEnumNullable(form.status, ENUMS.ParticipationStatus),
};
```

Available enums in `ENUMS`:
- `PlanCategory`, `PayerEntityType`, `ParticipationStatus`, `NetworkType`
- `BillingType`, `GeographyType`, `RuleType`, `FeeScheduleType`

---

## 4. Lookup Dropdown Pattern

```tsx
const [options, setOptions] = useState<LookupDto[]>([]);

useEffect(() => {
  lookupsApi().getEntityLookup().then(setOptions);
}, []);

// In JSX:
<Select
  value={form.entityId}
  onValueChange={val => setForm(p => ({ ...p, entityId: val }))}
  options={options.map(o => ({ value: o.id, label: o.title }))}
/>
```

---

## 5. Toast Notification Pattern

```typescript
const { success, error } = useToast();

// After a successful action:
success('User has been deleted.');

// After an error:
error('Failed to load data. Please try again.');

// In catch blocks:
catch (err) {
  error(err instanceof Error ? err.message : 'An unexpected error occurred.');
}
```

---

## 6. Debounced Search Pattern

```typescript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 400);

// usePaginatedList re-fetches when extraParams changes:
const { data } = usePaginatedList({
  pageNumber: page,
  fetch: (params) => usersApi().getList(params),
  extraParams: { search: debouncedSearch },
});
```

---

## 7. File Upload Pattern

```typescript
const [file, setFile] = useState<File | null>(null);
const [uploading, setUploading] = useState(false);

async function handleUpload() {
  if (!file) return;
  setUploading(true);
  try {
    const form = new FormData();
    form.append('file', file);
    await apiRequestForm(`/api/Domain/${id}/upload`, form, 'POST');
    success('File uploaded successfully.');
  } catch (err) {
    error(err instanceof Error ? err.message : 'Upload failed.');
  } finally {
    setUploading(false);
  }
}

// In JSX:
<FileUploadZone accept=".xlsx" onFileSelect={setFile} />
<Button onClick={handleUpload} disabled={!file || uploading}>Upload</Button>
```

---

## 8. Conditional Layout Pattern

For pages that should NOT use the main layout (e.g., a new onboarding flow):

Add the route path to the exclusion list in `ConditionalLayout.tsx`:

```typescript
const AUTH_PATHS = ['/login', '/set-password', '/your-new-path'];
```

---

## 9. Dynamic Route Parameter Pattern

```tsx
// app/rcm/insurance-ar-analysis/[sessionId]/report/page.tsx
'use client';

interface PageProps {
  params: { sessionId: string };
}

export default function ReportPage({ params }: PageProps) {
  const { sessionId } = params;
  // use sessionId to fetch data
}
```

---

## 10. Loading / Empty State Pattern

```tsx
{loading ? (
  <div className="flex items-center justify-center py-12">
    <Loader className="h-6 w-6 animate-spin text-primary" />
  </div>
) : data?.items.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground text-sm">
    No records found.
  </div>
) : (
  <Table>...</Table>
)}
```

---

## 11. SignalR Real-time Pattern

```typescript
import { usePipelineSignalR } from '@/lib/hooks';

const { status, connected } = usePipelineSignalR(sessionId);

// Render based on status updates from backend
```
