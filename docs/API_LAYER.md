# API Layer

How the frontend communicates with the backend.

---

## Overview

```
Component → Service function → apiRequest() → HttpClient → fetch() → Backend
```

There are three layers:

| Layer | File | Responsibility |
|-------|------|---------------|
| HTTP transport | `lib/api/httpClient.ts` | Auth headers, error handling, envelope unwrapping |
| Request function | `lib/api/index.ts` | Entry point for all API calls (`apiRequest`) |
| Domain services | `lib/services/<domain>.ts` | Typed endpoint methods per API domain |

---

## API Base URL

Configured via environment variable:

```env
NEXT_PUBLIC_API_URL=https://localhost:5001
```

Accessed via `lib/env.ts`:

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://localhost:5001';
```

---

## Response Envelope

**Every** backend response is wrapped in:

```json
{
  "success": true,
  "message": null,
  "data": { ...actual response... }
}
```

The `HttpClient` automatically unwraps this. Your service functions and components receive `data` directly — never the envelope.

---

## `apiRequest<T>()` — The Main Fetch Function

**File:** `lib/api/index.ts`

```typescript
apiRequest<T>(path: string, options?: RequestInit): Promise<T>
```

**Usage:**
```typescript
// GET
const users = await apiRequest<PaginatedList<UserListItemDto>>('/api/Users?pageNumber=1&pageSize=10');

// POST
const newId = await apiRequest<string>('/api/Users', {
  method: 'POST',
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
});

// PUT
await apiRequest<void>(`/api/Users/${id}`, {
  method: 'PUT',
  body: JSON.stringify(updateBody),
});

// DELETE
await apiRequest<void>(`/api/Users/${id}`, { method: 'DELETE' });
```

**What HttpClient does automatically:**
- Sets `Authorization: Bearer <token>` header
- Sets `Content-Type: application/json` header
- Unwraps `{ success, message, data }` envelope
- Returns the raw `data` value
- On 401: clears session, redirects to login
- On 403: shows access denied toast
- On other errors: throws `Error` with the backend's error message

---

## `apiRequestForm()` — File Uploads

**File:** `lib/api.ts`

```typescript
apiRequestForm(path: string, formData: FormData, method?: string): Promise<void>
```

Use for multipart file uploads. Do **not** set `Content-Type` manually — the browser sets it with the correct boundary.

```typescript
const form = new FormData();
form.append('file', selectedFile);
await apiRequestForm(`/api/RcmIntelligence/InsuranceArAnalysis/${sessionId}/intake`, form, 'POST');
```

---

## Service Pattern

Each domain has its own service file in `lib/services/`. Services are **factory functions** that return typed API method objects.

### Creating a service call (example)

```typescript
// lib/services/widgets.ts
import { apiRequest } from '@/lib/api';
import { PaginatedList } from '@/lib/types';

export interface WidgetDto {
  id: string;
  name: string;
  color: string;
}

export interface CreateWidgetDto {
  name: string;
  color: string;
}

export function widgetsApi() {
  return {
    getList: (params?: { pageNumber?: number; pageSize?: number }) =>
      apiRequest<PaginatedList<WidgetDto>>(
        `/api/Widgets?${new URLSearchParams(params as Record<string, string>)}`
      ),

    getById: (id: string) =>
      apiRequest<WidgetDto>(`/api/Widgets/${id}`),

    create: (body: CreateWidgetDto) =>
      apiRequest<string>('/api/Widgets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    update: (id: string, body: Partial<CreateWidgetDto>) =>
      apiRequest<void>(`/api/Widgets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      apiRequest<void>(`/api/Widgets/${id}`, { method: 'DELETE' }),
  };
}
```

Then export from `lib/services/index.ts`:
```typescript
export * from './widgets';
```

---

## Error Handling

### Automatic (HttpClient)

| Status | Handler |
|--------|---------|
| 401 | Clears session + redirects to `/login` |
| 403 | Shows "Access denied" toast |
| 4xx/5xx | Throws `Error` with backend message |

### In components

Errors thrown from `apiRequest` propagate up. The `useCrudPage` hook catches them and exposes an `error` state. For manual API calls, use try/catch:

```typescript
try {
  await api.create(form);
  toast.success('Widget created successfully');
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Something went wrong');
}
```

---

## Lookup Endpoints

Many dropdowns use shared lookup endpoints. These return `LookupDto[]`:

```typescript
interface LookupDto {
  id: string;
  title: string;
}
```

The `lookupsApi()` service (`lib/services/lookups.ts`) provides these:

```typescript
const { getEntityLookup, getPayerLookup, getPlanLookup } = lookupsApi();
const entities = await getEntityLookup();  // LookupDto[]
```

Use in a `<Select>` by mapping to `{ value: item.id, label: item.title }`.

---

## Authentication Headers

The `HttpClient` reads `localStorage[AUTH_TOKEN_KEY]` for every request. The token key is:

```env
NEXT_PUBLIC_AUTH_TOKEN_KEY=accessToken
```

**Never manually add auth headers** — the client handles this automatically.

---

## Registering 401/403 Handlers

`ApiAuthProvider` (`components/providers/ApiAuthProvider.tsx`) registers handlers once on mount. This is already set up in `app/layout.tsx`. Do not duplicate this setup.

---

## API Conventions

| Convention | Detail |
|-----------|--------|
| Base URL | `NEXT_PUBLIC_API_URL` (env var) |
| Auth | Bearer token, auto-injected |
| Content-Type | `application/json` (auto, except file uploads) |
| Response envelope | `{ success, message, data }` — auto-unwrapped |
| Pagination params | `pageNumber` (1-indexed), `pageSize` |
| Error format | `{ success: false, message: "..." }` |
| ID type | `string` (UUID) throughout |
