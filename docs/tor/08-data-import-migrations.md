## 11. Migrations & Data Import

### 11.1 Initial Data Import from XLSX

1. Parse `Нормативы` sheet → create `device_types` and `device_system_contexts` (seed data).
2. Parse repair normatives from `Нормативы` rows 23–24 → create `repair_types`.
3. Parse ОС, ПС, Видео, Записи, Ремонт, Дорога sheets. Match rows across sheets by `№` column.
4. For each row: create Division → Branch → Object (dedup divisions/branches by name).
5. For each non-zero equipment cell in ОС/ПС/Видео sheets:
   - Find `device_types` by column header name (create if not found, with warning).
   - Find `device_system_contexts` for (device, sheet's system type).
   - Create `object_devices` with `quantity_physical = cell_value`.
   - Create `object_system_assignments` with `quantity_maintained = cell_value`.
6. Populate `records_tasks` per object from Записи sheet.
7. Populate `object_repairs` per object from Ремонт sheet.
8. Populate `travel` per object from Дорога sheet.
9. Skip all "Расчет", `Лист1`, `Лист2` sheets.
10. Return validation report: objects created, warnings, skipped rows.
11. Queue full bulk recalculation.

> After import, `quantity_physical = quantity_maintained` for all records. Editors adjust `quantity_physical` manually if needed.

> **Engineer import:** The `Ответственные ТО` column contains plain name strings (e.g. "Александр Н Соловей"). The import attempts to match each name to an existing `users` record by `users.name` (case-insensitive). If a match is found, the engineer is assigned to the object. If no match is found, a **placeholder engineer account** is created with `role = 'engineer'`, `is_active = FALSE`, and a flag `requires_activation = TRUE`. A post-import report lists all placeholder accounts created, prompting admins to set passwords and activate them. Objects with unresolved engineers are not left unassigned — the placeholder account serves as the assignment holder until activated.

### 11.2 Import Validation Rules
- `№` must be numeric and unique.
- `Подразделение`, `Филиал`, `Значение` must not be empty.
- Equipment quantities must be non-negative or empty (treated as 0; zero values do not create assignment rows).
- If a column header doesn't match any `device_types` record: create a new device type, log a warning.
- If R1/R2 for a (device, system) pair already exists in DB and differs from XLSX: keep DB value, log a warning.
- Engineer name matching is case-insensitive and trims whitespace. Partial matches (e.g. "А. Соловей" vs "Александр Соловей") are not attempted — only exact full-name matches. Non-matching names create placeholder accounts.
- Import assigns all repairs and records to the **active period** at the time of import. If no period is active, import is blocked until an admin activates a period.

### 11.3 Database Migrations
Use **Liquibase** for all schema versioning. Changelogs live in `src/main/resources/db/changelog/`. Structure:

```
db/changelog/
  db.changelog-master.xml        ← root changelog, includes all others
  changes/
    v1.0.0-initial-schema.xml    ← PoC schema (divisions, objects, summaries, …)
    v1.1.0-periods.xml           ← MVP: planning periods
    v1.2.0-rbac.xml              ← MVP: roles, division scoping
    v1.3.0-physical-inventory.xml← MVP: object_devices table
    …
```

Liquibase runs automatically on application startup via Spring Boot auto-configuration. **Never alter production schema manually.** All changes go through versioned changesets with `author`, `id`, and rollback instructions where applicable.

Seed data (device types, system contexts, repair types) is loaded as a Liquibase changeset — not application-level code — so it runs exactly once and is versioned alongside schema changes.

---

