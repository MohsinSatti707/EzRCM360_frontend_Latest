# Project Flow

Visual maps of user journeys, component interactions, API calls, and data lifecycle.

---

## User Flow

### Authentication Flow

```
Browser hits any protected URL
        │
        ▼
middleware.ts (Edge, before page loads)
  AUTH_COOKIE present?
  ├── No  → redirect /login?redirect={originalPath}
  └── Yes → render page
              │
              ▼
          AuthGuard (client component)
            localStorage[accessToken] present?
            ├── No  → redirect /login
            └── Yes → render page
                        │
                        ▼
                    MfaRouteGuard
                      MFA required + not verified?
                      ├── Yes → redirect /authentication/verify
                      └── No  → render protected content
```

### Login Journey

```
User → /login
  Enters email + password
  POST /api/Auth/login
  ├── requiresMfa: true → /authentication/setup or /authentication/verify
  │     TOTP code entry → POST /api/Auth/verify-mfa
  │     sessionStorage[MFA_VERIFIED_KEY] = true
  │     → /settings (or originally requested path)
  │
  └── requiresMfa: false → store tokens in localStorage + set AUTH_COOKIE
        → /settings (default landing page)
```

### Logout Journey

```
User clicks Logout button (Sidebar)
  Clear localStorage[accessToken, refreshToken]
  Clear sessionStorage[MFA_VERIFIED_KEY]
  Delete AUTH_COOKIE
  → /login
```

### Session Expiry (Auto-logout)

```
Any API call returns 401
  ApiAuthProvider.handle401()
  Clear all auth state (tokens + cookie + MFA session)
  toast.error("Your session has expired. Please log in again.")
  router.push('/login')
```

---

## Settings Page Flow

### CRUD Page Lifecycle

```
User navigates to /settings/widgets
        │
        ▼
Permission check (useModulePermission)
  loading? → render null (blank)
  !canView → render <AccessDenied />
  canView  → render page
        │
        ▼
useCrudPage initializes
  → usePaginatedList auto-fetches GET /api/Widgets?pageNumber=1&pageSize=10
  → Renders table with data
        │
     ┌──┴───────────────────────┐
     │                          │
  User clicks               User clicks
  "Add Widget"               row Edit icon
     │                          │
  openCreate()               openEdit(item)
  form = defaultForm         form = toForm(item)
  modalOpen = true           isEditing = true
     │                          │
     └──────────┬───────────────┘
                │
           Modal opens with form
                │
           User edits fields
           setForm(prev => {...prev, field: value})
                │
           User clicks Save
           handleSubmit(validate)
                │
           validate() → false? → stop, show error
           validate() → true?
                │
           isEditing?
           ├── Yes → PUT /api/Widgets/{id}
           └── No  → POST /api/Widgets
                │
           success → closeModal() + reload() + toast.success()
           error   → toast.error(message)
```

---

## AR Analysis Pipeline Flow

```
User navigates to /rcm/insurance-ar-analysis
        │
        ▼
Session list page (GET /api/RcmIntelligence/InsuranceArAnalysis)
  Shows existing sessions with status badges
        │
  User clicks "New Analysis"
        │
        ▼
/rcm/insurance-ar-analysis/upload (Step 1)
  FileUploadZone (AR intake Excel)
  → POST /api/.../intake (validation)
  ← ArIntakeValidationResult
  validation errors? → show column/row errors
  validation passes? → proceed
        │
        ▼
Step 2: Upload PM Report files
  MultiFileUploadZone
  → POST /api/.../pm-report
        │
        ▼
/rcm/insurance-ar-analysis/{sessionId}/processing
  usePipelineSignalR connects to SignalR hub
  Real-time status updates:
    IntakeUploaded → ValidationInProgress → ValidationCompleted
    → PmUploaded → Processing → EnrichmentPending
    → EnrichmentCompleted → Completed
        │
  Status = "Completed"
        │
        ▼
/rcm/insurance-ar-analysis/{sessionId}/report
  GET /api/.../report
  Renders:
    1. Analysis Summary (practice, dates, source files)
    2. Key Metrics (total claims, underpayment, recovery)
    3. Claim Categorization (3 layers)
    4. Underpayment by Priority
    5. Recovery Projection
    6. Contingency Fee by Claim Age
```

---

## Component Interaction Map

```
app/layout.tsx
  ├── ToastProviderWithToaster
  │     └── ToastContext (useToast)
  ├── PermissionsContext.Provider
  │     └── loads /api/Permissions/me once
  ├── SidebarContext.Provider
  │     └── collapsed state
  ├── ApiAuthProvider
  │     └── registers 401/403 handlers on HttpClient
  └── ConditionalLayout
        ├── [auth paths] → renders children directly
        └── [protected paths] →
              MfaRouteGuard
                └── MainLayout
                      ├── Sidebar
                      │     ├── reads SidebarContext (collapsed?)
                      │     ├── reads PermissionsContext (canView per module)
                      │     └── renders filtered nav items
                      ├── Header
                      │     └── notification bell
                      ├── {children} (page content)
                      │     └── each page:
                      │           ├── useModulePermission → PermissionsContext
                      │           ├── useToast → ToastContext
                      │           ├── useCrudPage → usePaginatedList → apiRequest → HttpClient
                      │           └── renders PageShell + Table + Modal
                      └── AppFooter
```

---

## API Data Lifecycle

```
1. Component mounts
   └── usePaginatedList triggers fetch

2. apiRequest<T>('/api/Resource')
   └── HttpClient.request()
         ├── reads localStorage[accessToken]
         ├── builds headers: { Authorization, Content-Type }
         └── fetch(`${API_URL}/api/Resource`, headers)

3. Backend responds with:
   { "success": true, "message": null, "data": [...] }

4. HttpClient unwraps:
   returns data (the [...] array or object)

5. usePaginatedList sets state:
   { data: PaginatedList<T>, loading: false, error: null }

6. Component re-renders with new data
   └── Table displays rows

7. User submits form
   └── HttpClient sends POST/PUT with JSON body
   └── Backend responds: { success: true, data: "new-id" }
   └── useCrudPage: closeModal() + reload() + toast.success()

8. Error path:
   └── Backend: { success: false, message: "Validation failed" }
   └── HttpClient throws Error("Validation failed")
   └── useCrudPage catches: toast.error("Validation failed")
```

---

## Real-time Data Flow (SignalR)

```
Processing page mounts
        │
        ▼
usePipelineSignalR(sessionId)
  Creates HubConnection to /hubs/pipeline?sessionId={id}
  connection.start()
        │
        ▼
Backend pipeline processes AR data
  Sends hub messages: connection.on('StatusUpdate', handler)
        │
        ▼
Component state updates in real-time
  → Progress bar advances
  → Status badge changes
  → On "Completed": show "View Report" button
  → On "Failed": show error + retry option
```
