# EzRCM360 Frontend — Project Overview

## What Is This Project?

EzRCM360 is an enterprise **Revenue Cycle Management (RCM)** portal for healthcare organizations. It provides:

- A configuration hub for managing payers, fee schedules, entities, providers, and clinical codes
- Role-based access control (RBAC) so different staff only see what they're allowed to
- RCM Intelligence features — starting with **Insurance AR Analysis** (bulk underpayment analysis)
- MFA-secured authentication with session management
- Real-time processing status via SignalR WebSockets

---

## Core Features

| Feature | Description |
|---------|-------------|
| Settings Hub | 30+ CRUD configuration pages (payers, entities, fee schedules, codes, etc.) |
| Insurance AR Analysis | Upload claims data, run underpayment analysis, view recovery projections |
| Role & Permission Management | Backend-driven RBAC (canView / canCreate / canUpdate / canDelete per module) |
| MFA Authentication | TOTP-based multi-factor authentication with QR code setup |
| Bulk Import | Excel-based bulk data import for most settings pages |
| Help & Support | Resource library, contact form, feedback submission |
| Real-time Updates | SignalR for processing pipeline status |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 3.4 + shadcn/ui + Radix UI primitives |
| Font | Aileron (via CDN) |
| Icons | Lucide React |
| State | React Context API (no Redux/Zustand) |
| HTTP Client | Custom abstraction over native `fetch` |
| Real-time | `@microsoft/signalr` (WebSockets) |
| MFA | `@otplib/preset-default` + `qrcode` |
| Excel I/O | `xlsx` |
| Build output | Standalone (Docker-ready) |

---

## Architecture Overview

```
Browser
  │
  ▼
middleware.ts            ← Edge authentication guard (cookie check)
  │
  ▼
app/ (Next.js App Router)
  │
  ├── ConditionalLayout  ← Auth vs. protected route layout
  │     ├── MfaRouteGuard
  │     └── MainLayout (Sidebar + Header + Footer)
  │
  ├── AuthGuard          ← Client-side token check
  │
  ├── PermissionsContext ← Loads /api/Permissions/me, exposes canView/etc.
  │
  └── Page components    ← Use useCrudPage / usePaginatedList hooks
        │
        └── lib/services/<domain>.ts  ← API endpoint methods
              │
              └── lib/api/index.ts    ← apiRequest → HttpClient → fetch
```

**Pattern:** Server-side middleware auth + client-side token check + backend RBAC. No SSR data fetching — all data is client-side via REST API.

---

## Project Complexity

- **Files:** ~150 TypeScript/TSX source files
- **Routes:** 40+ pages
- **Services:** 30+ domain service modules
- **Architecture:** Mid-large enterprise SPA patterns in Next.js App Router
- **Complexity rating:** Moderate–High (due to deep RBAC, many settings domains, AR pipeline)
