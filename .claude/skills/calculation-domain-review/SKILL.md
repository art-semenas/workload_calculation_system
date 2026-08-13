---
name: calculation-domain-review
description: Use when reviewing workload calculation code — verifies the 7 critical business rules from CONTRIBUTING.md to prevent FTE computation errors. Apply before any PR touching service/calculation/*, after changes to calculation formulas, or when calculation results seem incorrect.
---

# Workload Calculation — Domain Review

## Overview

The calculation engine is the financial heart of the system. A single floating-point error, hardcoded constant, or missed domain rule produces wrong FTE numbers that cascade into payroll and staffing decisions. This skill enforces the 7 non-negotiable rules from CONTRIBUTING.md.

**Core principle:** All calculation values are `BigDecimal`, all constants come from `WorkloadConfig`, all domain logic matches the TOR exactly.

## Checklist — 7 Critical Rules

Apply these checks to any changed code in `backend/src/main/java/com/workload/service/calculation/`:

### ✓ Rule 1: Numeric Precision — BigDecimal Only

**What:** All monetary/FTE/coefficient/ratio calculations use `BigDecimal` — never `double` or `float`.

**Grep to verify:**
```bash
grep -rn "\bdouble\b" backend/src/main/java/com/workload/service/calculation/
grep -rn "\bfloat\b" backend/src/main/java/com/workload/service/calculation/
```

**If found:** Any match is a failure. Rewrite using `BigDecimal.multiply()`, `add()`, `divide(divisor, scale, RoundingMode.HALF_UP)`.

---

### ✓ Rule 2: Configuration Constants — WorkloadConfig Only

**What:** No hardcoded normative values. All constants (visit frequencies, PZV minutes, repair thresholds, ratios) come from `config.get*()` methods.

**Grep to verify:**
```bash
# Find numeric literals that look like constants (not loop counters or obvious transient values)
grep -rn "[0-9]\+\.[0-9]\+" backend/src/main/java/com/workload/service/calculation/ | grep -v "test"
```

**If found:** Check context. If it's a hardcoded normative value (visit frequency, repair band, PZV minutes), move it to `WorkloadConfig`. Transient values like `kvo == 0` checks are OK.

---

### ✓ Rule 3: R1 and R2 Are Additive

**What:** Both R1 and R2 contribute to monthly workload. Neither replaces the other. The Excel model sums both.

**Grep to verify:**
```bash
grep -rn "R1\|R2" backend/src/main/java/com/workload/service/calculation/ | head -20
```

**If found:** Check that the formula does `r1Contrib.add(r2Contrib)`, not `r2Contrib > 0 ? r2Contrib : r1Contrib`.

---

### ✓ Rule 4: `kvo` = Count of Distinct Repair Types (Not Sum)

**What:** `kvo` (К-во ремонтов) is the **COUNT** of distinct repair types with `count > 0`. Never the sum of quantities.

**Grep to verify:**
```bash
grep -rn "kvo\|repair.*count" backend/src/main/java/com/workload/service/calculation/
```

**If found:** Check that the logic uses `.distinct()` or `.stream().filter(count > 0).count()`, not `.sumOf(count)`.

---

### ✓ Rule 5: Repair Travel — 3-Band Threshold

**What:** Travel calculation has three bands:
- `kvo ≤ ZERO_THRESHOLD` → result = 0
- `ZERO_THRESHOLD < kvo ≤ CAP` → result = kvo
- `kvo > CAP` → result = CAP

Both boundaries are **inclusive** on the lower side: at exactly `ZERO_THRESHOLD`, result is 0; at exactly `CAP`, result is `CAP`.

**Grep to verify:**
```bash
grep -rn "ZERO_THRESHOLD\|CAP\|travel" backend/src/main/java/com/workload/service/calculation/ | head -20
```

**If found:** Check the condition:
```java
// CORRECT
if (kvo.compareTo(config.getRepairTravelZeroThreshold()) <= 0) {
  return BigDecimal.ZERO;
} else if (kvo.compareTo(config.getRepairTravelCap()) <= 0) {
  return kvo;
} else {
  return config.getRepairTravelCap();
}

// WRONG — boundaries are exclusive
if (kvo < ZERO_THRESHOLD) { ... }  // fails at exactly ZERO_THRESHOLD
```

---

### ✓ Rule 6: Zero Guard on ИТОГО (C-39)

**What:** If all work components are zero, `itogo_chislo = 0`. PZV and travel alone do NOT generate a phantom FTE.

**Grep to verify:**
```bash
grep -rn "itogo\|zero.*guard" backend/src/main/java/com/workload/service/calculation/
```

**If found:** Check that the code does:
```java
BigDecimal total = r1.add(r2).add(pzv).add(travel);
if (total.compareTo(BigDecimal.ZERO) == 0) {
  return BigDecimal.ZERO;  // C-39 guard: don't allow phantom FTE from PZV/travel alone
}
```

---

### ✓ Rule 7: `round_trip_min` Is Server-Side Only

**What:** `round_trip_min` is always `one_way_time × 2`, computed server-side. It is **never user-editable**. The API rejects any attempt to set it directly (HTTP 422).

**Grep to verify:**
```bash
grep -rn "round_trip\|one_way" backend/src/main/java/com/workload/service/
```

**If found:** Check that:
1. The DTO input has NO `round_trip_min` field
2. The controller computes it as `one_way_time.multiply(TWO)` before persisting
3. A PUT/PATCH endpoint rejects any attempt to override it with a 422 Unprocessable Entity response

---

## Reference Test — PAC-01

After changes, verify the reference object still produces the expected value:

**Object:** "Архив г.Брест, ул.Московская, 202Д" (with correct equipment assigned)

**Expected:** `itogo_chislo_with_travel = 0.032448 ±0.000001`

**Test:** Run `CalculationServiceTest` and verify the PAC-01 assertion passes.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `double r1 = ...` instead of `BigDecimal` | Rewrite all calculation variables as `BigDecimal`. Use `.multiply()`, `.add()`, `.divide(..., RoundingMode.HALF_UP)`. |
| Hardcoding `int months = 6;` instead of `config.getPlanningPeriodMonths()` | Extract ALL normative values to `WorkloadConfig`. Read at call time, never cache. |
| `kvo = repairs.stream().mapToInt(r -> r.count).sum()` | Rewrite to `kvo = repairs.stream().filter(r -> r.count > 0).count()` — count distinct types, not sum quantities. |
| `if (kvo < ZERO_THRESHOLD)` — boundary condition is exclusive | Change to `if (kvo.compareTo(ZERO_THRESHOLD) <= 0)` — boundary must be inclusive. |
| Computing `itogo` without zero-guard: `r1 + r2 + pzv + travel` | Add guard: `if (total.equals(ZERO)) return ZERO;` before returning (C-39). |
| R2 replaces R1: `r2 > 0 ? r2 : r1` | Change to additive: `r1.add(r2)` — both contribute per Excel model. |
| Client sends `round_trip_min` in POST/PUT body | Add validation in mapper/controller: reject any non-null `round_trip_min` input with 422 error. |
