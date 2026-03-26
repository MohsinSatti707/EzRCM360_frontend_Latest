# AI Context

A concise summary for AI assistants (Claude, Copilot, Cursor) before modifying this codebase.

---

## What This Project Is

**EzRCM360** is a Next.js 14 (App Router) enterprise healthcare Revenue Cycle Management portal. It is a **client-side SPA** — no server-side data fetching (no `getServerSideProps`, no Server Components with data). All data is fetched client-side via a REST API.

---

## Critical Architecture Decisions

### 1. No Redux/Zustand — React Context only
State is managed via three contexts (`PermissionsContext`, `SidebarContext`, `ToastContext`) plus `useState` in components. Do not add global state libraries.

### 2. All API calls go through `apiRequest()`
Located in `lib/api/index.ts`. Never use bare `fetch()` in components. The `HttpClient` handles auth headers, envelope unwrapping, and 401/403 handling automatically.

### 3. API response envelope is auto-unwrapped
Backend returns `{ success, message, data }`. `HttpClient` extracts `data` automatically. Components receive the unwrapped data directly.

### 4. RBAC is fail-secure
`useModulePermission()` returns `false` while loading. Never show protected content while permissions are loading — this is intentional security behavior.

### 5. `useCrudPage` is the standard CRUD pattern
Every settings CRUD page uses this hook. Do not write custom CRUD state logic — extend the hook or use it as-is.

### 6. Tailwind + CSS variables for all styling
Colors are HSL variables in `globals.css`, referenced by Tailwind tokens. Never hardcode colors. Always use `cn()` from `lib/utils.ts` for conditional classes.

---

## Before Modifying Any File

Read these files first:

| If changing... | Read first |
|---------------|-----------|
| Any settings page | `lib/hooks/useCrudPage.ts` |
| Any API service | `lib/api/httpClient.ts`, `lib/api/index.ts` |
| Navigation | `components/layout/Sidebar.tsx` |
| Authentication | `middleware.ts`, `components/auth/AuthGuard.tsx`, `components/providers/ApiAuthProvider.tsx` |
| Permissions | `lib/contexts/PermissionsContext.tsx` |
| AR Analysis | `lib/services/insuranceArAnalysis.ts`, `CLAUDE.md` |
| Styling | `tailwind.config.ts`, `app/globals.css` |

---

## Key File Locations

```
API layer:           lib/api/httpClient.ts, lib/api/index.ts
Service files:       lib/services/<domain>.ts (30+ files)
Contexts:            lib/contexts/PermissionsContext.tsx, SidebarContext.tsx, ToastContext.tsx
Core hooks:          lib/hooks/useCrudPage.ts, usePaginatedList.ts
Types:               lib/types.ts (PaginatedList, TokenResponse, LookupDto)
Utils:               lib/utils.ts (cn, resolveEnum, ENUMS)
Env vars:            lib/env.ts
Route→module map:    lib/constants/routeModuleMap.ts
Layout:              components/layout/MainLayout.tsx, Sidebar.tsx, PageShell.tsx
UI components:       components/ui/ (barrel: components/ui/index.ts)
Root layout:         app/layout.tsx (providers)
Middleware:          middleware.ts (edge auth)
AR Analysis types:   lib/services/insuranceArAnalysis.ts
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserFormModal.tsx` |
| Hooks | camelCase with `use` prefix | `useCrudPage.ts` |
| Services | camelCase with `Api` suffix | `usersApi()` |
| DTO interfaces | PascalCase with `Dto` suffix | `UserListItemDto` |
| Create DTOs | `Create<Name>Dto` | `CreateUserDto` |
| Update DTOs | `Update<Name>Dto` | `UpdateUserDto` |
| Form types | `<Name>FormDto` | `UserFormDto` |
| Pages | `page.tsx` (Next.js convention) | |
| Route dirs | `kebab-case` | `entity-locations/` |

---

## What NOT to Do

- Never use bare `fetch()` — always `apiRequest()`
- Never access `process.env` directly in components — use `lib/env.ts`
- Never hardcode colors — use Tailwind design tokens
- Never string-concatenate classes — use `cn()`
- Never show protected content while `permissions.loading` is true
- Never skip `<PageShell>` on new protected pages
- Never modify `middleware.ts` without testing all auth scenarios
- Never create a new global state library

---

## Common Tasks

### Add a settings CRUD page
See `docs/CHANGE_GUIDE.md` → "Adding a New Settings CRUD Page" for the complete 6-step process.

### Add a new API endpoint
1. Find/create service file in `lib/services/<domain>.ts`
2. Add method following existing patterns
3. Call `apiRequest<ReturnType>(path, options)`
4. Export from `lib/services/index.ts` if new file

### Fix a TypeScript error in a service
Check: DTO interface defined? Method return type matches `apiRequest<T>`'s generic? DTO exported?

### Add a new nav section
Edit `components/layout/Sidebar.tsx` — find the nav group array, add item with `{ label, href, icon, moduleName }`.

---

## Git Workflow (from CLAUDE.md)

1. Always `git pull origin main` before changes
2. After modifying `.claude/memory/` files: `git add .claude/ && git commit -m "Update Claude memory: <topic>" && git push origin main`
