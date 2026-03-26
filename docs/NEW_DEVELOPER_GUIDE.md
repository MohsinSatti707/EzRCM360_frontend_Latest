# New Developer Guide

How to get productive in this codebase as fast as possible.

---

## Start Here — Reading Order

Read these files in order:

1. `docs/PROJECT_OVERVIEW.md` — what the app does (5 min)
2. `docs/DEVELOPER_ONBOARDING.md` — get it running locally (10 min)
3. `docs/FOLDER_STRUCTURE.md` — understand where everything lives (5 min)
4. `docs/ARCHITECTURE.md` — understand how the pieces fit (10 min)
5. Pick a task and read `docs/CHANGE_GUIDE.md` when needed

---

## Most Important Files to Know

### 1. `app/layout.tsx`
The root of everything. Sets up all providers (permissions, sidebar, toast, auth). If something is "missing" everywhere, check if its provider is here.

### 2. `lib/api/httpClient.ts`
Every API call flows through here. Understand this to understand authentication, error handling, and the response envelope.

### 3. `lib/hooks/useCrudPage.ts`
Used by ~30 settings pages. Understanding this hook means understanding 80% of the settings pages.

### 4. `lib/contexts/PermissionsContext.tsx`
Every nav item and page is gated by this. If something doesn't show up, this is usually why.

### 5. `components/layout/Sidebar.tsx`
Navigation structure. If you need to add something to the nav, start here.

### 6. `components/layout/PageShell.tsx`
The standard page wrapper. Every new page should use this.

---

## Understanding a Random Page

Pick any settings page (e.g., `app/settings/users/page.tsx`) and trace it:

1. **Permission check** at the top: `useModulePermission('Users')`
2. **CRUD setup**: `useCrudPage({ api: usersApi(), ... })`
3. **Rendering**: `<PageShell>` → `<Table>` → `crud.data?.items.map(...)`
4. **Modal**: `<Modal open={crud.modalOpen}>` → form fields → `<ModalFooter>`
5. **Submit**: `crud.handleSubmit(validate)` → calls `usersApi().create()` or `.update()`

This pattern is identical in all settings pages. Once you understand one, you understand all of them.

---

## How Permissions Work

1. On app load, `GET /api/Permissions/me` returns the user's permissions
2. Stored in `PermissionsContext`
3. Every module has: `{ canView, canCreate, canUpdate, canDelete }`
4. **Sidebar**: filters out nav items the user can't view
5. **Pages**: `useModulePermission(name)` gates the entire page
6. **Buttons**: `canCreate && <AddButton>` gates individual actions

The module names (like `"Users"`, `"Insurance AR Analysis"`) must match what the backend returns exactly.

---

## Common Pitfalls

### "Why is my new page blank?"
1. Did you add the route→module mapping in `lib/constants/routeModuleMap.ts`?
2. Does the module name match what the backend returns for permissions?
3. Is the user account you're testing with actually granted the permission?

### "Why is my API call failing with 401?"
1. Is `localStorage[accessToken]` present? Check in browser DevTools.
2. Has the token expired? Check the `expiration` field when you log in.
3. Is the backend running and reachable?

### "Why isn't my toast showing?"
1. Did you call `useToast()` inside a component that's inside `ToastProviderWithToaster`?
2. All components inside `app/layout.tsx`'s provider tree have access — make sure you haven't created a component outside this tree.

### "My new sidebar item doesn't appear"
1. Check that `moduleName` in the nav item matches the backend permission module name exactly (case-sensitive).
2. Check the user's permissions — they may not have `canView` for that module.
3. Is `moduleName` omitted? Then the item shows for everyone — this is intentional only for public items.

### "The form modal won't open"
1. Is `crud.modalOpen` wired to the `<Modal open={...}>` prop?
2. Is `crud.openCreate()` called in the button's `onClick`?
3. Are you using the `ConfirmDialog` or `Modal` component from `components/ui`?

### "TypeScript is complaining about my service types"
1. Check that your DTO interfaces are exported from the service file
2. Make sure the service file is exported from `lib/services/index.ts`
3. Import with: `import { myApi, type MyDto } from '@/lib/services'`

---

## Debugging Tips

### Inspect API calls
Open DevTools → Network tab → filter by `/api/` → look for failed requests.

### Inspect permissions
```javascript
// In browser console while logged in:
JSON.parse(localStorage.getItem('accessToken'))  // JWT token
```

Or look at the Network tab for `GET /api/Permissions/me` — the response shows exactly what permissions the current user has.

### Inspect context state
Use React DevTools extension → find the Provider component → inspect its value.

### Check SignalR connection
In DevTools → Network → filter by "WebSocket" — you should see a `ws://` connection when on the processing page.

### Debug `useCrudPage`
Add a `console.log(crud)` in your page component to see the full state object.

---

## Project Conventions at a Glance

| Convention | Rule |
|-----------|------|
| Imports | Always use `@/` path alias, never relative `../../../` |
| API calls | Always via `apiRequest()` — never bare `fetch()` |
| Colors | Always via Tailwind tokens — never hardcoded hex |
| Classes | Always via `cn()` — never string concatenation |
| New pages | Always use `<PageShell>` wrapper |
| New CRUD pages | Always use `useCrudPage` hook |
| Permission check | Always call `useModulePermission()` at top of protected page |
| Toast feedback | Always show success/error toast after create/update/delete |
| Form state | Always via `useCrudPage`'s `form` / `setForm` |

---

## Quick Reference: "I need to..."

| Task | Where to go |
|------|-------------|
| Add a settings page | `CHANGE_GUIDE.md` → "Adding a New Settings CRUD Page" |
| Add an API endpoint | `API_LAYER.md` → "Creating a service call" |
| Understand a hook | `STATE_MANAGEMENT.md` |
| Add a nav item | `components/layout/Sidebar.tsx` |
| Change styling | `STYLING_GUIDE.md` |
| Debug permissions | `STATE_MANAGEMENT.md` → PermissionsContext section |
| Understand AR Analysis | `CLAUDE.md` → AR Analysis section |
| Find a component | `COMPONENT_GUIDE.md` |
| Understand the auth flow | `ARCHITECTURE.md` → Authentication section |
