# Tech Debt and Improvement Opportunities

---

## Potential Bugs

### 1. No token refresh mechanism
**Severity: High**

The app stores access tokens in `localStorage` and attaches them to every request. When a token expires, the 401 handler clears the session and forces re-login. There is no token refresh flow (no refresh token rotation, no silent re-auth). Users will get logged out unexpectedly during long sessions.

**Fix:** Implement a refresh token interceptor in `HttpClient.request()` — on 401, attempt `POST /api/Auth/refresh` with the stored refresh token before clearing the session.

---

### 2. `usePaginatedList` stale data on fast param changes
**Severity: Low**

`usePaginatedList` serializes `extraParams` via `JSON.stringify` for dependency comparison. If two rapid changes produce the same JSON string in different orders, a re-fetch won't trigger. More importantly, there's no request cancellation — a slow response from page 1 can overwrite a faster response from page 2.

**Fix:** Use `AbortController` to cancel in-flight requests when params change.

---

### 3. `font-['Aileron']` CDN dependency
**Severity: Medium**

Aileron is loaded from `fonts.cdnfonts.com`. If that CDN is down or blocked (corporate networks, offline environments), the app renders in the browser's default font.

**Fix:** Bundle the Aileron font locally in `public/fonts/` and reference it via `@font-face` in `globals.css`.

---

### 4. Auth cookie vs. localStorage out of sync
**Severity: Medium**

`middleware.ts` checks for `AUTH_COOKIE`. The login page sets this cookie. However, if the cookie expires while `localStorage` tokens are still present, or vice versa, the user may see inconsistent behavior (middleware passes but client-side guard fails, or vice versa).

**Fix:** Synchronize both on login and logout. On logout or 401, explicitly delete both. Consider using `HttpOnly` cookies for tokens instead of `localStorage`.

---

### 5. MFA session key in `sessionStorage`
**Severity: Low**

MFA verification state (`MFA_VERIFIED_KEY`) is stored in `sessionStorage`. This is cleared on tab close. Users who open the app in a new tab after MFA verification in another tab will need to re-verify.

**Fix:** Store MFA status in the access token (JWT claim) or in a short-lived server-side session.

---

## Performance Improvements

### 1. Permissions loaded on every app mount
`PermissionsContext` calls `GET /api/Permissions/me` on every page load. With aggressive navigation, this fires frequently.

**Fix:** Cache the permissions response in `sessionStorage` with a short TTL (5 minutes). Reload only on logout/login.

---

### 2. No React.memo or useMemo on expensive list renders
Large tables (200+ rows) re-render all cells when any parent state changes. Settings pages with many table rows may stutter.

**Fix:** Wrap `TableRow` components with `React.memo`. Memoize list items with `useMemo` where pagination data doesn't change between renders.

---

### 3. All lookup dropdowns fetch independently
Many pages call `lookupsApi().getEntityLookup()`, `getPayerLookup()`, etc. independently. In pages with 4–5 lookups, this results in 4–5 parallel API calls on mount.

**Fix:** Add a simple React Query or SWR layer (or a manual cache map in a LookupContext) so repeated lookups are served from cache.

---

### 4. No bundle analysis
There's no `@next/bundle-analyzer` configured. We can't see what's contributing to bundle size.

**Fix:** Add `ANALYZE=true npm run build` support via `@next/bundle-analyzer`.

---

## Code Duplication

### 1. Duplicate `icons/` folder
Icons exist in both `components/icons/` and `lib/icons/`. Some icons appear in both places.

**Fix:** Consolidate all icons into `components/icons/` (UI concern), remove `lib/icons/`.

---

### 2. `lib/api.ts` and `lib/api/index.ts`
`lib/api.ts` at the root exports `apiRequest` and `apiRequestForm`. `lib/api/index.ts` is the actual implementation. This double-layer is confusing.

**Fix:** Export everything directly from `lib/api/index.ts`. Remove `lib/api.ts` or repurpose it clearly.

---

### 3. Inline enum maps on pages
Some pages define enum-to-label maps inline (e.g., `{ 0: 'Commercial', 1: 'Medicaid' }`) rather than using the `ENUMS` object in `lib/utils.ts`.

**Fix:** Centralize all enum display labels in `lib/utils.ts` as `ENUM_LABELS` alongside `ENUMS`.

---

## Refactoring Suggestions

### 1. Validation lives in pages
Form validation logic (`if (!form.name) return false`) is copy-pasted into each page.

**Opportunity:** A lightweight `validateFields(rules, form)` utility in `lib/utils.ts` would reduce duplication without adding a form library dependency.

---

### 2. Service files follow identical patterns but are hand-written
All 30+ service files are near-identical: factory function, 4–5 standard CRUD methods, typed DTOs. Any change to the pattern (e.g., adding a new standard param) requires touching 30 files.

**Opportunity:** A `createCrudService<TItem, TCreate, TUpdate>(basePath)` factory could generate standard CRUD methods, with individual files only adding domain-specific endpoints.

---

### 3. `useCrudPage` doesn't support server-side delete confirmation
The delete flow in `useCrudPage` immediately calls the API. Some domains need a confirm dialog before deletion.

**Fix:** Already partially addressed with `confirmDelete` state in the hook — ensure all CRUD pages wire it to a `<ConfirmDialog>`.

---

## Security Concerns

### 1. Tokens in `localStorage` (XSS risk)
Access and refresh tokens in `localStorage` are accessible to any JavaScript on the page, making them vulnerable to XSS attacks.

**Recommendation:** Consider migrating to `HttpOnly` cookies managed by the backend. This removes token access from JavaScript entirely.

---

### 2. No CSP headers
There are no Content Security Policy headers configured in `next.config.js` or middleware.

**Fix:** Add CSP headers via `next.config.js` `headers()` configuration to restrict script/style sources.

---

### 3. External CDN font loading
Loading Aileron from `fonts.cdnfonts.com` creates a dependency on a third-party CDN. If that CDN is compromised, it could inject malicious CSS.

**Fix:** Bundle fonts locally (see bug #3 above) — this also addresses the security concern.

---

### 4. Client-side permission checks only
Permission checks (`canView`, `canCreate`, etc.) are enforced on the client by hiding UI. The backend should independently enforce the same permissions on every API call. Confirm backend does this — the frontend guards are UX-only.

---

## Minor Issues

- No `loading.tsx` files in most route folders (only in `settings/` and `profile/`) — adding them improves Suspense loading UX
- No 404 `not-found.tsx` at the root — Next.js defaults are used
- `ar-test-files/` directory at root appears to be dev artifacts — should not be committed to production branch
- README.md appears to be a default Next.js README — should be updated with project-specific information
