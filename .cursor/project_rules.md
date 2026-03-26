# EzRCM360 — Cursor Project Rules

Rules for modifying this codebase. Follow these for every change.

---

## Git Workflow

- **Always** `git pull origin main` before starting any work
- Commit messages: use conventional format — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Do not force-push to `main`
- After modifying `.claude/memory/`: `git add .claude/ && git commit -m "Update Claude memory: <topic>" && git push origin main`

---

## Coding Standards

### TypeScript
- Strict mode is enabled — no `any` types
- All DTO interfaces must have explicit types (no inferred `any`)
- Use `interface` for object shapes, `type` for unions and aliases
- Export DTOs from their service files — never define them inline in components

### Imports
- Always use `@/` path alias — never `../../../`
- Import UI components from `@/components/ui` (barrel export)
- Import services from `@/lib/services` (barrel export)
- Import hooks from `@/lib/hooks` (barrel export)

### Components
- All interactive components must have `'use client'` at the top
- No default exports from utility/hook files — named exports only
- Pages use default exports (`export default function PageName()`)

---

## Folder Structure Rules

| New file type | Where to put it |
|--------------|----------------|
| New page | `app/<section>/<page-name>/page.tsx` |
| New settings page | `app/settings/<kebab-name>/page.tsx` |
| New feature component | `components/<feature-area>/<Name>.tsx` |
| New reusable UI primitive | `components/ui/<Name>.tsx` + export from `components/ui/index.ts` |
| New API service | `lib/services/<domain>.ts` + export from `lib/services/index.ts` |
| New hook | `lib/hooks/use<Name>.ts` + export from `lib/hooks/index.ts` |
| New context | `lib/contexts/<Name>Context.tsx` |
| New types (global) | `lib/types.ts` |
| New constants | `lib/constants/<name>.ts` |
| Icons | `components/icons/<Name>Icon.tsx` |

---

## Component Creation Guidelines

### Every new protected page must:
1. Start with `'use client'`
2. Check permissions: `const { canView } = useModulePermission('Module Name')`
3. Return `null` if loading, `<AccessDenied />` if denied
4. Wrap content in `<PageShell breadcrumbs={[...]} title="..." actions={...}>`
5. Use `useToast()` for success/error feedback

### Every new settings CRUD page must:
1. Define `DEFAULT_FORM` as a `const` outside the component
2. Use `useCrudPage({ api: domainApi(), ... })` for all CRUD state
3. Render `<OverlayLoader />` when `crud.submitLoading`
4. Use `<Modal>` + `<ModalFooter>` for create/edit form
5. Use `<TableActionsCell>` for edit/delete buttons in table rows
6. Use `<Pagination>` below the table

### Every new UI component must:
1. Accept a `className?: string` prop for override flexibility
2. Use `cn()` for class merging
3. Be exported from `components/ui/index.ts`

---

## API Integration Rules

- **Never** use bare `fetch()` — always `apiRequest<T>()` from `@/lib/api`
- **Never** access `process.env.NEXT_PUBLIC_*` directly — use `@/lib/env`
- **Never** manually set `Authorization` header — `HttpClient` does this
- **Never** unwrap `{ success, message, data }` — `HttpClient` does this
- File uploads: use `apiRequestForm()` from `@/lib/api`
- Error handling: let `HttpClient` handle 401/403; catch other errors with try/catch + `toast.error()`

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `UserFormModal` |
| Hook files/functions | camelCase, `use` prefix | `useWidgetList` |
| Service factory functions | camelCase, `Api` suffix | `widgetsApi()` |
| DTO interfaces | PascalCase + `Dto` | `UserListItemDto` |
| Create body interfaces | `Create<Name>Dto` | `CreateUserDto` |
| Update body interfaces | `Update<Name>Dto` | `UpdateUserDto` |
| Form state interfaces | `<Name>FormDto` | `UserFormDto` |
| Route directories | `kebab-case` | `entity-locations/` |
| Context files | PascalCase + `Context` | `WidgetContext.tsx` |
| Hook files | camelCase, `use` prefix | `useWidgets.ts` |
| Constant files | `camelCase` | `routeModuleMap.ts` |

---

## Tailwind Usage Rules

- Colors: always use design tokens (`text-primary`, `bg-muted`, `border-border`) — never hardcode
- Font: use `font-['Aileron']` for headings — never switch fonts
- Class merging: always use `cn()` from `@/lib/utils` — never string concat
- Responsive: use `sm:`, `md:`, `lg:` prefixes (mobile-first)
- Animations: use `animate-fade-in`, `animate-fade-in-up` for entrance animations
- Shadows: use `shadow-card`, `shadow-card-hover` — not generic `shadow-md`
- No `!important` overrides (`!` prefix in Tailwind) unless absolutely necessary

---

## State Management Rules

- No new global state libraries (no Redux, Zustand, Jotai, Recoil)
- Global state → use one of the three existing contexts, or add a new React Context
- Page state → use `useState` + `useCrudPage` / `usePaginatedList`
- Debounced search → use `useDebounce` hook
- Form state → use `useCrudPage`'s `form` / `setForm`

---

## Performance Guidelines

- Use `React.memo` for list row components rendering 50+ rows
- Use `useMemo` for expensive transformations on large data arrays
- Avoid calling lookup APIs more than once per page — cache in local state
- Do not make parallel API calls for the same data in sibling components
- Paginate all lists — never load all records at once

---

## Security Rules

- Never log `accessToken` or `refreshToken` to console
- Never store sensitive data in `sessionStorage` beyond what already exists
- Always gate protected routes with `useModulePermission()` at the page level
- Never bypass the `AuthGuard` or `MfaRouteGuard` components
- Validate all user inputs at the component level before sending to API

---

## Things That Must NEVER Be Changed Without Team Discussion

| File | Reason |
|------|--------|
| `middleware.ts` | Server-side auth — misconfiguration locks out all users |
| `lib/api/httpClient.ts` | Core of all API communication — changes affect every call |
| `lib/contexts/PermissionsContext.tsx` | RBAC core — bugs break all permission enforcement |
| `app/layout.tsx` (provider order) | Context provider order is load-bearing |
| `lib/env.ts` | Env var names referenced everywhere — rename breaks builds |
| `tailwind.config.ts` (CSS vars) | Token renames cascade to all components |
| `components/auth/AuthGuard.tsx` | Client-side auth gate |
| `components/providers/ApiAuthProvider.tsx` | 401/403 global handlers |

---

## Documentation Rules

- Update `docs/CHANGE_GUIDE.md` when adding new canonical patterns
- Update `docs/FOLDER_STRUCTURE.md` when adding new top-level directories
- Add new service files to the service list in `docs/API_LAYER.md`
- When adding a new page, add it to the route list in `docs/FOLDER_STRUCTURE.md`
- Never commit the `.env.local` file
- Keep `.env.example` up to date with any new env vars
