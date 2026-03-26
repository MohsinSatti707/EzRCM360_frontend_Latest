# Developer Onboarding

Everything you need to go from zero to running locally.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ (LTS recommended) |
| npm | 9+ |
| Git | Any recent version |

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd EzRCM360_frontend_Latest
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
NEXT_PUBLIC_API_URL=https://localhost:5001     # Backend API base URL
NEXT_PUBLIC_APP_NAME=EzRCM360
NEXT_PUBLIC_AUTH_TOKEN_KEY=accessToken
NEXT_PUBLIC_REFRESH_TOKEN_KEY=refreshToken
```

**Notes:**
- `NEXT_PUBLIC_API_URL` must point to a running EzRCM360 backend instance
- There are separate env files: `.env.staging`, `.env.production` — do not commit secrets
- `NEXT_PUBLIC_APP_ENV=local` keeps development mode active even in production builds

---

## 4. Run Locally

```bash
npm run dev
```

Opens at `http://localhost:3000`.

The root `/` redirects to `/settings`. Use credentials from the backend team or seed data.

---

## 5. Login Flow

1. Navigate to `http://localhost:3000/login`
2. Enter credentials (provisioned by backend/seed data)
3. If MFA is enabled for the account, complete TOTP setup or verification
4. You will land on the Settings hub

---

## 6. Build for Production

```bash
npm run build
npm run start
```

The build generates a **standalone output** (`output: 'standalone'` in next.config.js), suitable for Docker deployment. The `scripts/package-standalone.js` script packages it after the build.

---

## 7. Linting

```bash
npm run lint
```

Uses Next.js built-in ESLint configuration. Fix all lint errors before committing.

---

## 8. Path Aliases

The project uses `@/` as an alias for the project root:

```typescript
import { Button } from '@/components/ui';
import { usersApi } from '@/lib/services';
import { usePermissions } from '@/lib/contexts/PermissionsContext';
```

This is configured in `tsconfig.json` under `compilerOptions.paths`.

---

## 9. Key Dev Notes

- **All data is client-side**: No SSR data fetching. Pages call APIs on mount.
- **Auth cookie required**: The Edge middleware checks for `AUTH_COOKIE`. Without a valid backend session, all protected routes redirect to `/login`.
- **Permissions load asynchronously**: Pages using `useModulePermission()` show nothing (fail-secure) until permissions load.
- **Fonts**: Aileron is loaded from an external CDN in `app/layout.tsx`. Internet access required for local dev, or swap to a local font.

---

## 10. Deployment Overview

| Environment | Config File | Notes |
|-------------|-------------|-------|
| Local | `.env.local` | `npm run dev` |
| Staging | `.env.staging` | Build with staging env |
| Production | `.env.production` | Standalone output, Docker |

The standalone build includes its own Node.js server. Deploy by:
1. Running `npm run build`
2. Copying the `.next/standalone` folder to the server
3. Running `node server.js` inside it

---

## 11. First PR Checklist

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` completes without TypeScript errors
- [ ] New pages use `PageShell` for layout consistency
- [ ] New API calls go through `apiRequest` (never bare `fetch`)
- [ ] New settings CRUD pages use `useCrudPage` hook
- [ ] Permission gates added for any new module pages
- [ ] `git pull origin main` before branching
