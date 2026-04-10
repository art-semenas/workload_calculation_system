# Frontend Flow for a Backend Engineer

This note explains how the current frontend is structured in terms that should feel familiar to a Java backend engineer.

The goal is not to explain all of React or TypeScript. The goal is to show:

- what each frontend layer is responsible for
- how data moves from a form to the backend and back
- how this maps to concepts like DTOs, validation, service calls, and session state

---

## 1. Mental Model

The frontend can be viewed as a few layers:

1. `src/types/*`
2. `src/api/*`
3. `src/hooks/*`
4. `src/components/*` and `src/pages/*`
5. `src/store/*`

Rough Java/Spring mapping:

| Frontend layer              | Closest backend analogy                              |
| --------------------------- | ---------------------------------------------------- |
| `types/*`                   | DTOs + Bean Validation rules                         |
| `api/*`                     | Typed REST client / integration client               |
| `hooks/*`                   | Service/facade layer with caching behavior           |
| `components/*`, `pages/*`   | Controller/view layer                                |
| `store/authStore.ts`        | Client-side session/security context                 |
| `api/axios.ts`              | Shared HTTP client with auth interceptor             |

---

## 2. Types and Validation

Files like:

- `frontend/src/types/auth.ts`
- `frontend/src/types/travel.ts`
- `frontend/src/types/division.ts`

define both:

- TypeScript types
- Zod schemas

Example from auth:

- `LoginRequestSchema`
- `LoginRequest`
- `LoginResponse`
- `User`

Think of a Zod schema as the frontend equivalent of:

- `@NotBlank`
- `@Email`
- `@Min`

The difference is that this validation runs in the browser before the HTTP request is sent.

Example:

- `LoginRequestSchema` validates email/password before login
- `TravelUpdateSchema` validates travel form values before update

This is the same idea as validating a request DTO, but earlier in the lifecycle.

---

## 3. API Layer

Files in `frontend/src/api/*` are thin wrappers around Axios.

Example:

- `frontend/src/api/auth.ts`
- `frontend/src/api/travel.ts`

These functions:

- call the backend endpoint
- unwrap `response.data.data`
- return typed data

This is similar to a small Java client using `RestTemplate` or `WebClient`.

Example:

```ts
export async function getTravel(objectId: string): Promise<Travel | null> {
  const response = await api.get(`/objects/${objectId}/travel`)
  return response.data.data
}
```

So the frontend page does not deal with raw HTTP details directly.

---

## 4. Hooks Layer

Files in `frontend/src/hooks/*` are wrappers around the API layer using TanStack Query.

Examples:

- `useTravel(objectId)`
- `useUpdateTravel(objectId)`
- `useDivisions()`
- `useCreateDivision()`

These hooks provide:

- loading state
- error state
- cached server data
- automatic refetch after updates

Think of this as a frontend service layer plus a built-in cache.

Without hooks, every page would have to manually do:

- call HTTP
- track loading state
- track errors
- refresh related data after mutations

With hooks, the page mainly says:

- "give me the current data"
- "save these changes"

---

## 5. Auth Store

File:

- `frontend/src/store/authStore.ts`

This stores:

- JWT token
- current user

You can think of it as the browser-side equivalent of session/auth context.

After login succeeds:

- token is stored in Zustand
- user info is stored in Zustand

Later, `frontend/src/api/axios.ts` reads the token and injects:

```http
Authorization: Bearer <token>
```

into every request.

That is similar to having a shared HTTP client configured with authentication.

---

## 6. Shared UI Components

Files:

- `frontend/src/components/common/ConfirmDialog.tsx`
- `frontend/src/components/common/FormTextField.tsx`

These are reusable UI building blocks.

`ConfirmDialog`:

- reusable "Are you sure?" modal
- used for delete and destructive actions

`FormTextField`:

- shared adapter between React Hook Form and MUI `TextField`
- automatically binds field state and error messages

This is comparable to extracting common boilerplate into reusable backend utilities instead of repeating it in every controller/service.

---

## 7. Concrete Flow: Login

This is implemented in:

- `frontend/src/pages/LoginPage.tsx`

Supporting files:

- `frontend/src/types/auth.ts`
- `frontend/src/api/auth.ts`
- `frontend/src/store/authStore.ts`
- `frontend/src/api/axios.ts`

### Step-by-step

1. The page renders a form with:
   - email
   - password
   - sign-in button

2. React Hook Form manages field values and submission state.

3. Zod validates the input using `LoginRequestSchema`.

4. If validation passes, the page calls:

```ts
await login({ email, password })
```

5. `frontend/src/api/auth.ts` sends:

```http
POST /api/v1/auth/login
```

with:

```json
{
  "email": "a@b.com",
  "password": "password"
}
```

6. Backend returns:

```json
{
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "1",
      "email": "a@b.com",
      "name": "Admin",
      "role": "admin"
    }
  },
  "meta": null,
  "error": null
}
```

7. The page stores `token` and `user` in `authStore`.

8. The page navigates to `/`.

9. From that point on, Axios automatically sends the token on future requests.

### Error handling

- `401` becomes: `Invalid email or password`
- other failures become: `Something went wrong. Please try again.`

This is similar to mapping backend exceptions/status codes to user-facing error messages.

---

## 8. Concrete Flow: Edit Travel Data

Supporting files:

- `frontend/src/types/travel.ts`
- `frontend/src/api/travel.ts`
- `frontend/src/hooks/useTravel.ts`

Future page/component:

- a `TravelTab` form for object travel data

### Step-by-step

1. The page calls:

```ts
useTravel(objectId)
```

2. That hook runs the query:

- query key: `['objects', objectId, 'travel']`
- query function: `getTravel(objectId)`

3. `getTravel(objectId)` calls:

```http
GET /api/v1/objects/{objectId}/travel
```

4. The backend returns travel data such as:

```json
{
  "id": "uuid",
  "objectId": "uuid",
  "transportType": "car",
  "distanceKm": 25,
  "oneWayTimeMin": 20,
  "roundTripMin": 40
}
```

5. The form is filled with:

- editable:
  - `transportType`
  - `distanceKm`
  - `oneWayTimeMin`
- read-only:
  - `roundTripMin`

6. User edits values and clicks save.

7. The payload is validated using `TravelUpdateSchema`.

Important rule:

- `roundTripMin` is not part of the update schema
- user never sends it
- backend computes it

8. The mutation calls:

```ts
updateTravel(objectId, {
  transportType,
  distanceKm,
  oneWayTimeMin,
})
```

9. `frontend/src/api/travel.ts` sends:

```http
PUT /api/v1/objects/{objectId}/travel
```

10. Backend updates data and returns fresh travel data including computed `roundTripMin`.

11. The hook invalidates:

```ts
['objects', objectId, 'travel']
```

12. TanStack Query refetches the travel data automatically.

13. The UI re-renders with the updated computed value.

This is similar to:

- update entity
- evict relevant cached entry
- reload from source of truth

---

## 9. Why This Structure Helps

This structure keeps responsibilities separated:

- `types/*` define data contracts and validation
- `api/*` handles HTTP
- `hooks/*` handle caching and orchestration
- `pages/*` focus on rendering and interaction

That separation makes frontend work feel much closer to backend layering.

Instead of one giant component containing:

- HTML
- validation
- request code
- loading state
- cache refresh logic

the responsibilities are split the same way you would normally split:

- DTOs
- service clients
- services
- controllers

---

## 10. Short Summary

If you remember only one thing, remember this:

1. User edits a form in a page.
2. Zod validates the input.
3. API module sends the request.
4. Hook manages caching/refetch.
5. Store keeps auth/session-like client state.
6. UI re-renders from fresh server data.

That is the main frontend flow in this project.
