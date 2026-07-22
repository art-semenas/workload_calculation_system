---
name: boundary-enforcement
description: Use when reviewing API controllers or frontend API/form code — enforces boundary rules to prevent entity leakage, mixing of concerns, and framework misuse. Apply before any PR touching controllers, API integration, or form components.
---

# Boundary Enforcement — DTO, Entity, and API Boundaries

## Overview

The codebase enforces strict boundaries:

1. **Backend:** Entities never leak into API responses — controllers always use DTOs (TOR AD-14)
2. **Frontend:** Calculations never happen in TypeScript — frontend reads only from server (`summaries` tables)
3. **Frontend:** All HTTP is through a shared Axios instance; all form state through RHF+Zod; all server data through TanStack Query

Violations of these boundaries cause data consistency issues, security holes, and test/prod divergence.

**Core principle:** Controllers talk to clients through DTOs. TypeScript talks to API through one Axios. Forms talk to components through React Hook Form.

---

## Backend Checklist — DTO & Entity Boundaries

Apply to any code in `backend/src/main/java/com/workload/controller/`:

### ✓ Controllers Return DTOs, Not Entities

**What:** `@RestController` methods **never** expose `@Entity` types directly. Every response is wrapped in `ResponseEntity<ApiResponse<XxxDto>>`.

**Grep to verify:**
```bash
grep -rn "ResponseEntity<.*Entity>" backend/src/main/java/com/workload/controller/
```

**If found:** Any match is a failure. Create a corresponding DTO and use MapStruct mapper.

**Correct pattern:**
```java
@GetMapping("/{id}")
public ResponseEntity<ApiResponse<DivisionDto>> getDivision(@PathVariable UUID id) {
  DivisionDto entityDto = service.getById(id); // Service should already return DTO, not entity
  return ResponseEntity.ok(ApiResponse.success(entityDto));
}

// WRONG — entity exposed
public ResponseEntity<Division> getDivision(@PathVariable UUID id) {
  return ResponseEntity.ok(service.getById(id));
}
```

---

### ✓ MapStruct Mapper Exists for Every Entity

**What:** Every JPA entity that appears in an API response must have a corresponding MapStruct mapper interface.

**Grep to verify:**
```bash
# Find all entities
grep -rn "@Entity" backend/src/main/java/com/workload/entity/ | sed 's/.*class //' | sed 's/ .*//' > /tmp/entities.txt

# Find all mappers
grep -rn "@Mapper" backend/src/main/java/com/workload/mapper/ | sed 's/.*interface //' | sed 's/ .*//' > /tmp/mappers.txt

# Check for unmapped entities
comm -23 /tmp/entities.txt /tmp/mappers.txt
```

**If found:** Create a MapStruct interface in `com.workload.mapper`:
```java
@Mapper(componentModel = "spring")
public interface DivisionMapper {
  DivisionDto toDto(Division entity);
  Division toEntity(DivisionDto dto);
}
```

---

### ✓ No Business Logic in Entities

**What:** `@Entity` classes are data containers only. No calculation methods, no service calls, no validation logic beyond simple `@Column` constraints.

**Grep to verify:**
```bash
grep -rn "public.*(" backend/src/main/java/com/workload/entity/ | grep -v "get\|set\|toString\|equals\|hashCode" | head -20
```

**If found:** Move the logic to a service class.

---

## Frontend Checklist — API & Form Boundaries

Apply to any code in `frontend/src/`:

### ✓ No Calculation Logic in TypeScript

**What:** The frontend **never** computes workload values, FTE, kvo, repair travel, or any other formula. The frontend reads only from `summaries` and `engineer_summaries` tables (pre-computed server-side, TOR AD-07).

**Grep to verify:**
```bash
# Search for suspicious calculation patterns
grep -rn "multiply\|divide\|workload\|FTE\|formula\|kvo\|repair" frontend/src/components/ frontend/src/hooks/ | grep -v "summaries\|fetch\|label\|title"
```

**If found:** Remove the logic. If the frontend needs a computed value, add it to the server's `SELECT` statement instead.

**Correct pattern:**
```typescript
// Server has already computed this
const summaries = useSummaryQuery();
return summaries.data?.map(s => <div>{s.itogo_chislo}</div>);  // ✓ Just display

// WRONG — computing on client
const kvo = repairs.length;  // ✗ Never
const workload = equipmentValue * rate * kvo;  // ✗ Never
```

---

### ✓ All HTTP Calls via `src/api/axios.ts`

**What:** Every HTTP request goes through the shared Axios instance at `src/api/axios.ts`. Never use raw `fetch()`, never create a second Axios instance.

The shared instance handles:
- JWT token injection
- 401 → `/login` redirect
- Base URL & headers
- Error envelope parsing

**Grep to verify:**
```bash
grep -rn "fetch(" frontend/src/
grep -rn "from 'axios'" frontend/src/ | grep -v "src/api/"
grep -rn "new Axios\|new axios" frontend/src/
```

**If found:** Replace with the shared instance:
```typescript
// CORRECT
import axios from '@/api/axios';
axios.get('/api/divisions');

// WRONG
fetch('/api/divisions');  // No JWT injection, no error handling
const newAxios = axios.create();  // Bypasses centralized config
```

---

### ✓ Forms Use React Hook Form + Zod

**What:** Form state is managed by React Hook Form + Zod validators. Never use raw `useState` for form fields.

**Grep to verify:**
```bash
grep -rn "useState.*string\|useState.*number" frontend/src/components/ | grep -v "UI state\|theme\|visibility" | head -20
```

**If found:** Refactor to RHF:
```typescript
// CORRECT
const schema = z.object({ name: z.string().min(1) });
const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

// WRONG
const [name, setName] = useState('');
const [errors, setErrors] = useState({});
```

---

### ✓ Server Data Managed by TanStack Query

**What:** API responses are managed by TanStack Query hooks (`useQuery`, `useMutation`). Server data **never** lives in Zustand or component state.

Zustand is **only** for client-only state:
- Auth token
- UI preferences (theme, sidebar collapse)
- Transient UI state

**Grep to verify:**
```bash
# Check Zustand store — should only have auth/UI state
grep -rn "zustand\|useStore" frontend/src/

# Check for API response data in useState
grep -rn "useState.*data\|useState.*engineers\|useState.*divisions" frontend/src/components/
```

**If found:** Replace with TanStack Query:
```typescript
// CORRECT
const { data: engineers } = useQuery({ queryKey: ['engineers'], queryFn: fetchEngineers });

// WRONG
const [engineers, setEngineers] = useState(null);
useEffect(() => {
  fetch('/api/engineers').then(r => r.json()).then(setEngineers);
}, []);
```

---

## API Contract Rules (TOR §10)

All responses follow the standard envelope:

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": 404, // numeric HTTP status (404, 422, 500), no custom string codes
    "message": "Human-readable message"
  }
}
```

`error.code` is always the numeric HTTP status mirroring the response status line (see `docs/impl/epics/unified-error-handling.md`) — never a semantic string; messages are user-facing, no stack traces or internals.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `public ResponseEntity<Engineer> getEngineer()` in controller | Create `EngineerDto`, use `EngineerMapper`, return `ResponseEntity<ApiResponse<EngineerDto>>`. |
| An entity with `public BigDecimal calculateWorkload()` method | Move logic to a service. Entities are data only. |
| No mapper for a new `Division` entity | Create `DivisionMapper` in `com.workload.mapper` with `toDto()` and `toEntity()` methods. |
| TypeScript: `const kvo = repairs.length;` | Remove. `kvo` is pre-computed by the server in `summaries`. |
| Frontend: `const data = fetch('/api/divisions').then(r => r.json())` | Use the shared `axios`: `const { data } = useQuery({...})`. |
| Form with `const [name, setName] = useState('')` | Refactor to React Hook Form + Zod. |
| Zustand store contains: `engineers: useQuery(...)` | Move to a TanStack Query hook. Zustand is for auth/UI only. |
| POST endpoint that accepts `{ ..., round_trip_min: 120 }` | Reject requests that include `round_trip_min` with 422 error. |
