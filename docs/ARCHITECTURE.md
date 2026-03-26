# Architecture

---

## Architecture Pattern

**Client-side SPA inside Next.js App Router.**

Despite using Next.js, this project does **not** use Server Components for data fetching. All pages are client components (`"use client"`) that:
1. Render a loading state
2. Fetch data from the REST API on mount
3. Render the result

Next.js is used for:
- File-based routing (App Router)
- Edge Middleware (auth cookie check)
- Standalone build output (Docker)
- Built-in image optimization and font handling

---

## Request Lifecycle

```
User navigates to /settings/users
        │
        ▼
middleware.ts (Edge)
  Checks: AUTH_COOKIE present?
  No → redirect /login
  Yes → continue
        │
        ▼
ConditionalLayout (client)
  Is this an auth route? No
  → MfaRouteGuard (check sessionStorage MFA_VERIFIED)
  → MainLayout (Sidebar + Header)
        │
        ▼
AuthGuard (client)
  Checks: localStorage[accessToken] present?
  No → redirect /login
  Yes → render children
        │
        ▼
PermissionsContext
  Calls GET /api/Permissions/me
  Populates canView/canCreate/canUpdate/canDelete per module
        │
        ▼
Page Component (e.g., app/settings/users/page.tsx)
  useModulePermission("Users") → loading? → null  denied? → <AccessDenied />
  useCrudPage({ api: usersApi(), ... })
  → usePaginatedList → GET /api/Users → renders table
```

---

## Component Communication

```
PermissionsContext ──────────────────────────────────────────┐
SidebarContext ──────────────────────────────────────────┐   │
ToastContext ─────────────────────────────────────────┐  │   │
                                                      │  │   │
app/layout.tsx (Providers)                            │  │   │
  └── ConditionalLayout                               │  │   │
        └── MainLayout                                │  │   │
              ├── Sidebar ────────── reads ───────────┤  │   │
              ├── Header                              │  │   │
              └── {children}                         │  │   │
                    └── Page Components               │  │   │
                          ├── useToast() ─────────────┘  │   │
                          ├── useSidebar() ──────────────┘   │
                          └── usePermissions() ──────────────┘
```

**Data flows down via context; events (toast, navigation) flow up via context methods.**

---

## API Architecture

### Layered design

```
Page Component
  └── calls service method
        └── lib/services/<domain>.ts
              └── apiRequest<T>(path, options)
                    └── lib/api/index.ts (HttpClient.request)
                          └── fetch(NEXT_PUBLIC_API_URL + path, headers)
                                └── Backend REST API
```

### HttpClient responsibilities

1. **Injects Bearer token** from `localStorage[accessToken]`
2. **Unwraps API envelope** `{ success, message, data }` → returns `data`
3. **Handles 401** → calls registered handler (clear session, redirect to login)
4. **Handles 403** → calls registered handler (show access denied toast)
5. **Handles errors** → throws `Error` with backend message

### Service pattern

Every service is a **factory function** returning an object:

```typescript
// lib/services/users.ts
export function usersApi() {
  return {
    getList: (params?) => apiRequest<PaginatedList<UserListItemDto>>(
      `/api/Users?${new URLSearchParams(params)}`
    ),
    getById:  (id: string) => apiRequest<UserDetailDto>(`/api/Users/${id}`),
    create:   (body) => apiRequest<string>('/api/Users', { method: 'POST', body: JSON.stringify(body) }),
    update:   (id, body) => apiRequest<void>(`/api/Users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete:   (id: string) => apiRequest<void>(`/api/Users/${id}`, { method: 'DELETE' }),
  };
}
```

Call it inside a component/hook: `const api = usersApi();`

---

## State Architecture

**No Redux. No Zustand.** Three React Contexts cover all shared state:

| Context | What it stores | Where used |
|---------|---------------|-----------|
| `PermissionsContext` | User's RBAC permissions | All protected pages, Sidebar |
| `SidebarContext` | Collapsed / expanded state | Sidebar, MainLayout |
| `ToastContext` | Toast notification queue | Any component needing feedback |

**Local state** (`useState`, `useCrudPage`) handles everything else:
- Form values
- Modal open/close
- Loading flags
- Pagination page number

---

## Authentication Architecture

### Two-layer guard

| Layer | Where | Mechanism |
|-------|-------|-----------|
| Edge | `middleware.ts` | Checks `AUTH_COOKIE` (set on login) |
| Client | `AuthGuard.tsx` | Checks `localStorage[accessToken]` |

Both layers redirect to `/login` if auth is missing. The cookie check prevents the Next.js server from even serving the page JS. The client check handles token expiry after page load.

### Session expiry flow

```
API returns 401
  → HttpClient calls handle401()
  → ApiAuthProvider registered handler:
      1. Clear localStorage (accessToken, refreshToken)
      2. Clear sessionStorage (MFA_VERIFIED_KEY)
      3. Delete AUTH_COOKIE
      4. toast.error("Your session has expired. Please log in again.")
      5. router.push('/login')
```

---

## Routing Architecture

File-based routing via Next.js App Router. Key conventions:

- `page.tsx` = a route
- `layout.tsx` = shared wrapper for child routes
- `loading.tsx` = Suspense loading UI
- `[param]/` = dynamic segment
- No `(group)/` route groups currently used

**Protected routes**: All routes except `/login`, `/set-password`, `/authentication/*`, and legal pages.

**Dynamic routes**:
- `/modules/[slug]` — operational module gateway (reads `slug` from URL)
- `/rcm/insurance-ar-analysis/[sessionId]/processing` — real-time pipeline page
- `/rcm/insurance-ar-analysis/[sessionId]/report` — analysis report page

---

## Real-time Architecture

`usePipelineSignalR` hook connects to a SignalR hub on the backend:

```typescript
// Simplified
const connection = new HubConnectionBuilder()
  .withUrl(`${API_URL}/hubs/pipeline?sessionId=${sessionId}`)
  .withAutomaticReconnect()
  .build();

connection.on('StatusUpdate', (status) => setStatus(status));
connection.start();
```

Used in the AR Analysis processing page to show live pipeline progress without polling.

---

## Build Architecture

```
npm run build
  └── next build              → .next/standalone/ (Node server)
  └── node scripts/package-standalone.js  → packages for deployment

Output: standalone Next.js server (no external Node modules needed)
Deploy: Docker container or bare Node.js on server
```
