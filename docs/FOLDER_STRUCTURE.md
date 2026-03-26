# Folder Structure

Every top-level folder and its responsibilities.

---

## Root

```
EzRCM360_frontend_Latest/
├── app/                   # Next.js App Router — all routes and pages
├── components/            # React components (layout, UI, auth, feature)
├── lib/                   # All non-UI logic: API, hooks, contexts, utils, types
├── public/                # Static assets (logo, favicon, images)
├── scripts/               # Build utilities (package-standalone.js)
├── docs/                  # This documentation folder
├── .claude/               # Git-tracked Claude Code memory files
├── .cursor/               # Cursor IDE settings and rules
├── .vscode/               # VS Code workspace settings
├── middleware.ts           # Next.js edge middleware (server-side auth check)
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS theme and design tokens
├── tsconfig.json           # TypeScript compiler configuration
├── package.json            # Project dependencies and scripts
├── .env.example            # Required environment variable template
└── .env.local              # Local dev environment variables (not committed)
```

---

## `app/` — Next.js App Router

All routes live here. Each `page.tsx` is a route endpoint.

```
app/
├── layout.tsx              # Root layout: fonts, providers, ConditionalLayout
├── page.tsx                # Root redirect → /settings
├── globals.css             # Tailwind base, CSS variables (color system)
│
├── login/                  # Public auth route
├── set-password/           # One-time password setup
├── authentication/
│   ├── setup/              # MFA QR setup
│   └── verify/             # MFA code verification
│
├── dashboard/              # Main dashboard page
├── patients/               # Patient listing (placeholder/coming soon)
├── claims/                 # Claims listing (placeholder/coming soon)
├── profile/
│   └── edit/               # User profile editor
│
├── modules/
│   └── [slug]/             # Dynamic route for operational modules gateway
│
├── rcm/
│   └── insurance-ar-analysis/
│       ├── page.tsx           # Session list + upload entry
│       ├── upload/            # Upload wizard step 1
│       └── [sessionId]/
│           ├── processing/    # Real-time pipeline status
│           └── report/        # Final analysis report
│
├── settings/
│   ├── page.tsx               # Settings hub (9 category cards)
│   ├── organization/          # Org name, logo, branding
│   ├── users/                 # User management
│   ├── roles-permissions/     # Role & permission editor
│   ├── security-access/       # Password policies, MFA requirements
│   ├── entities/              # Practice entities
│   ├── entity-locations/      # Entity location assignments
│   ├── entity-providers/      # Provider-entity links
│   ├── entity-fee-schedules/  # Fee schedule–entity links
│   ├── payers/                # Insurance payer management
│   ├── plans/                 # Insurance plan management
│   ├── facilities/            # Facility directory
│   ├── group-participation/   # Group NPI participation records
│   ├── rendering-participation/ # Rendering NPI participation records
│   ├── fee-schedules/         # Fee schedule definitions
│   ├── geography-resolution/  # ZIP/county/state geo data
│   ├── applicability-rules/   # Rules governing fee applicability
│   ├── icd-codes/             # ICD-10 diagnosis codes
│   ├── ndc-codes/             # National Drug Codes
│   ├── cpt-hcpcs-codes/       # CPT/HCPCS procedure codes
│   ├── modifiers/             # Claim modifiers
│   ├── financial-modifiers/   # Payment adjustment modifiers
│   ├── bundling-reduction-rules/  # CCI bundling logic
│   ├── procedure-grouping-rules/  # Grouping for fee calc
│   ├── nsa-eligibility/       # No Surprises Act eligibility
│   ├── nsa-federal/           # NSA federal rules
│   ├── nsa-state/             # NSA state rules
│   └── nsa-emergency/         # NSA emergency services rules
│
├── help/
│   ├── page.tsx               # Help hub
│   ├── resource-library/      # Documentation/guides
│   ├── contact/               # Contact form
│   └── feedback/              # Feedback submission
│
├── terms-of-service/          # Public legal page
├── privacy-policy/            # Public legal page
└── compliance-disclaimer/     # Public legal page
```

---

## `components/` — React Components

Organized by function, not by feature.

```
components/
├── auth/
│   ├── AuthGuard.tsx           # Client-side token guard (wraps protected pages)
│   ├── AccessDenied.tsx        # "You don't have permission" UI
│   ├── AccessRestrictedContent.tsx  # Inline permission check wrapper
│   ├── LogoutButton.tsx        # Triggers logout (clear tokens + redirect)
│   └── MfaRouteGuard.tsx       # Enforces MFA verification before route access
│
├── layout/
│   ├── ConditionalLayout.tsx   # Decides: auth layout vs. main layout
│   ├── MainLayout.tsx          # App shell: Sidebar + Header + main + Footer
│   ├── Sidebar.tsx             # Left nav with collapsible groups + user section
│   ├── Header.tsx              # Top bar with notifications
│   ├── AppFooter.tsx           # Bottom bar with legal links
│   ├── NavigationProgress.tsx  # Route change progress bar
│   └── PageShell.tsx           # Page wrapper: breadcrumbs, title, description, actions
│
├── providers/
│   ├── ApiAuthProvider.tsx     # Registers 401/403 global error handlers
│   └── ToastProviderWithToaster.tsx  # Toast container
│
├── ui/                         # shadcn/ui-style primitive components
│   ├── Button.tsx, Input.tsx, Select.tsx, Checkbox.tsx, Label.tsx
│   ├── Card.tsx, Badge.tsx, Avatar.tsx, Alert.tsx, Separator.tsx
│   ├── Table.tsx, Pagination.tsx, ScrollArea.tsx, Tooltip.tsx
│   ├── Modal.tsx, AlertDialog.tsx, ConfirmDialog.tsx, Sheet.tsx
│   ├── Loader.tsx, OverlayLoader.tsx
│   ├── DrawerForm.tsx          # Full-screen right-side drawer form
│   ├── ModalFooter.tsx         # Standardized modal cancel/save row
│   ├── TableActionsCell.tsx    # Edit/Delete icon cell for tables
│   ├── TruncatedWithTooltip.tsx # Long-text truncation + tooltip
│   ├── ContentCard.tsx         # Titled card wrapper for page sections
│   ├── ComingSoonCard.tsx      # Placeholder for unreleased features
│   └── index.ts                # Barrel export of all UI components
│
├── settings/
│   ├── SettingsCard.tsx        # Hub card (icon, title, description, link)
│   ├── PageHeader.tsx          # Inline page header variant (for settings subpages)
│   └── BulkImportActions.tsx   # Download template + upload Excel buttons
│
├── rcm/
│   ├── FileUploadZone.tsx      # Drag-and-drop file input
│   ├── Stepper.tsx             # Multi-step wizard progress indicator
│   └── ValidationAnalysisIcon.tsx  # Status icon for AR validation steps
│
└── icons/
    ├── SidebarIcons.tsx        # All sidebar nav icons
    ├── LogoIcon.tsx            # App logo SVG
    ├── RightArrow.tsx          # Arrow icon
    ├── PhoneIcon.tsx           # Phone icon
    └── OrganizationIcon.tsx    # Organization icon
```

---

## `lib/` — Logic Layer

All non-UI code lives here.

```
lib/
├── api/
│   ├── index.ts            # apiRequest() — main fetch wrapper (used everywhere)
│   ├── httpClient.ts       # HttpClient class: auth headers, envelope unwrapping
│   ├── interfaces.ts       # IHttpClient interface (for testability/DI)
│   ├── authCallbacks.ts    # 401/403 handler registry
│   └── url.ts              # API base URL helper
│
├── services/               # One file per backend API domain
│   ├── index.ts            # Barrel export of all services
│   ├── users.ts            # /api/Users endpoints
│   ├── roles.ts            # /api/Roles endpoints
│   ├── permissions.ts      # /api/Permissions endpoints
│   ├── organizations.ts    # /api/Organizations endpoints
│   ├── entities.ts         # /api/Entities endpoints
│   ├── payers.ts           # /api/Payers endpoints
│   ├── plans.ts            # /api/Plans endpoints
│   ├── entityLocations.ts  # ...and so on for every settings domain
│   ├── entityProviders.ts
│   ├── facilities.ts
│   ├── feeSchedules.ts
│   ├── groupParticipations.ts
│   ├── renderingParticipations.ts
│   ├── icdCodes.ts
│   ├── ndcCodes.ts
│   ├── cptHcpcsCodes.ts
│   ├── modifiers.ts
│   ├── financialModifiers.ts
│   ├── bundlingReductionRules.ts
│   ├── procedureGroupingRules.ts
│   ├── applicabilityRules.ts
│   ├── geography.ts
│   ├── lookups.ts
│   ├── profile.ts
│   ├── securityAccess.ts
│   ├── settingsBulkImport.ts
│   └── insuranceArAnalysis.ts  # AR Analysis types + endpoints
│
├── contexts/
│   ├── PermissionsContext.tsx  # RBAC context: canView/canCreate/canUpdate/canDelete
│   ├── SidebarContext.tsx      # Sidebar collapsed/expanded state
│   └── ToastContext.tsx        # Toast notification queue
│
├── hooks/
│   ├── index.ts                # Barrel export
│   ├── useDebounce.ts          # Delay value propagation
│   ├── usePaginatedList.ts     # Fetch + paginate a list endpoint
│   ├── useCrudPage.ts          # Full CRUD state (list + modal + form + submit)
│   └── usePipelineSignalR.ts   # SignalR WebSocket connection hook
│
├── icons/                      # Duplicate of components/icons (consider consolidating)
├── constants/
│   └── routeModuleMap.ts       # Route path → backend module name map
│
├── api.ts                      # Re-exports from ./api/ + apiRequestForm for file uploads
├── types.ts                    # Core DTOs: PaginatedList<T>, TokenResponse, LookupDto
├── utils.ts                    # cn(), resolveEnum(), date formatting helpers
└── env.ts                      # NEXT_PUBLIC_* env var access with defaults
```

---

## `public/` — Static Assets

Images, favicon, and any files served as-is.

---

## `.claude/` — AI Memory

Git-tracked memory files for Claude Code. See `.claude/MEMORY.md` for index.

---

## `docs/` — Documentation

This folder. All project documentation lives here.
