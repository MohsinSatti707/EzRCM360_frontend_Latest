# Change Guide

Where and how to safely add new code.

---

## Before Any Change

```bash
git pull origin main
```

Always pull first. This is a team project.

---

## Adding a New Settings CRUD Page

### 1. Create the service file

`lib/services/widgets.ts`

```typescript
import { apiRequest } from '@/lib/api';
import { PaginatedList } from '@/lib/types';

export interface WidgetDto {
  id: string;
  name: string;
}
export interface CreateWidgetDto { name: string; }
export interface UpdateWidgetDto { name: string; }

export function widgetsApi() {
  return {
    getList: (p?) => apiRequest<PaginatedList<WidgetDto>>(`/api/Widgets?${new URLSearchParams(p)}`),
    getById: (id: string) => apiRequest<WidgetDto>(`/api/Widgets/${id}`),
    create:  (b: CreateWidgetDto) => apiRequest<string>('/api/Widgets', { method: 'POST', body: JSON.stringify(b) }),
    update:  (id: string, b: UpdateWidgetDto) => apiRequest<void>(`/api/Widgets/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
    delete:  (id: string) => apiRequest<void>(`/api/Widgets/${id}`, { method: 'DELETE' }),
  };
}
```

### 2. Export from barrel

`lib/services/index.ts` — add:
```typescript
export * from './widgets';
```

### 3. Create the page

`app/settings/widgets/page.tsx` — use the CRUD page pattern from `COMMON_PATTERNS.md`

### 4. Add a route→module mapping

`lib/constants/routeModuleMap.ts` — add:
```typescript
'/settings/widgets': 'Widgets',
```

### 5. Add to sidebar navigation

`components/layout/Sidebar.tsx` — add to the appropriate nav group:
```typescript
{ label: 'Widgets', href: '/settings/widgets', icon: <WidgetIcon />, moduleName: 'Widgets' }
```

### 6. Add a card to the Settings hub (if applicable)

`app/settings/page.tsx` — add a `<SettingsCard>` in the right category group.

---

## Adding a New Feature Page (Non-CRUD)

### 1. Create the route

`app/rcm/my-feature/page.tsx`

### 2. Create the service (if it needs an API)

`lib/services/myFeature.ts` — same pattern as above

### 3. Create feature-specific components (if needed)

`components/rcm/MyFeatureWidget.tsx` (or `components/<feature-area>/`)

### 4. Add to sidebar

`components/layout/Sidebar.tsx` in the relevant nav group

### 5. Add permission guard

```typescript
const { canView } = useModulePermission('My Feature Module Name');
if (!canView) return <AccessDenied />;
```

---

## Adding a New API Service Method

Find the correct service file in `lib/services/` and add a method:

```typescript
// In lib/services/users.ts
export function usersApi() {
  return {
    // ...existing methods...
    resendInvite: (id: string) =>
      apiRequest<void>(`/api/Users/${id}/resend-invite`, { method: 'POST' }),
  };
}
```

No need to register it anywhere else — call it directly.

---

## Adding a New Context

Only add a new context if:
- State is needed by 3+ unrelated components
- The state doesn't belong in Permissions, Sidebar, or Toast contexts

### Steps:

1. Create `lib/contexts/MyContext.tsx` following the pattern in `SidebarContext.tsx`
2. Export `useMyContext()` hook from the file
3. Add the provider to `app/layout.tsx` inside the existing provider stack

---

## Adding a New UI Component

1. Create `components/ui/MyComponent.tsx`
2. Export it from `components/ui/index.ts`
3. Follow Tailwind + shadcn/ui conventions (see `STYLING_GUIDE.md`)
4. Use `cn()` for conditional classes

---

## Adding a New Hook

1. Create `lib/hooks/useMyHook.ts`
2. Export it from `lib/hooks/index.ts`
3. Keep hooks pure — no side effects at module scope, only inside `useEffect`

---

## Modifying the Sidebar

`components/layout/Sidebar.tsx` — find the nav group array and add/modify the item object:

```typescript
{
  label: 'My New Item',
  href: '/settings/my-new-item',
  icon: <SomeIcon className="h-4 w-4" />,
  moduleName: 'My New Item',   // Must match backend permission module name exactly
}
```

If the module requires no permission check, omit `moduleName`.

---

## Modifying Authentication

- **Login logic:** `app/login/page.tsx`
- **Session expiry handling:** `components/providers/ApiAuthProvider.tsx`
- **Route protection (server):** `middleware.ts`
- **Route protection (client):** `components/auth/AuthGuard.tsx`
- **MFA verification:** `components/auth/MfaRouteGuard.tsx`, `app/authentication/`

Be very careful modifying these files. Always test: login, logout, session expiry (401), and MFA flows.

---

## Adding a New Environment Variable

1. Add to `.env.example` with a comment explaining it
2. Add to `lib/env.ts` with a fallback:
   ```typescript
   export const MY_VAR = process.env.NEXT_PUBLIC_MY_VAR ?? 'default';
   ```
3. Update all env files (`.env.local`, `.env.staging`, `.env.production`)
4. Use `MY_VAR` from `lib/env.ts` everywhere — never access `process.env` directly in components

---

## Modifying the Tailwind Theme

`tailwind.config.ts` — add to:
- `theme.extend.colors` for new color tokens
- `theme.extend.keyframes` + `theme.extend.animation` for new animations
- `theme.extend.spacing` for new spacing values

---

## What NOT to Change Without Discussion

| File | Why |
|------|-----|
| `lib/api/httpClient.ts` | Core auth + error handling — changes affect every API call |
| `middleware.ts` | Server-side auth — misconfiguration locks out all users |
| `lib/contexts/PermissionsContext.tsx` | RBAC core — bugs break all permission checks |
| `app/layout.tsx` | Provider order matters — wrong order breaks context |
| `lib/env.ts` | Env var names are referenced everywhere |
| `tailwind.config.ts` | CSS variable changes cascade to all components |
