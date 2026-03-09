## 12. Roles & Permissions

| Permission | Admin | Editor | Viewer | Engineer |
|---|---|---|---|---|
| View all objects / СВОД | ✅ | ✅ | ✅ | Own objects only |
| Edit object metadata | ✅ | ✅ (own div) | ❌ | ❌ |
| Edit equipment / assignments | ✅ | ✅ (own div) | ❌ | ❌ |
| Edit records / repairs (active period) | ✅ | ✅ (own div) | ❌ | ✅ (own objects) |
| Edit travel data | ✅ | ✅ (own div) | ❌ | ❌ |
| Create / delete objects | ✅ | ❌ | ❌ | ❌ |
| Manage device catalog | ✅ | ❌ | ❌ | ❌ |
| Manage repair type catalog | ✅ | ❌ | ❌ | ❌ |
| Edit app configuration constants | ✅ | ❌ | ❌ | ❌ |
| Import XLSX | ✅ | ❌ | ❌ | ❌ |
| Export XLSX / PDF | ✅ | ✅ | ✅ | ✅ (own objects) |
| Trigger bulk recalculation | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ |
| Manage users / engineers | ✅ | ❌ | ❌ | ❌ |
| View own workload dashboard | ✅ | ✅ | ✅ | ✅ |
| Assign / remove engineers to objects | ✅ | ✅ (own div) | ❌ | ❌ |
| View engineer list and load ratios | ✅ | ✅ | ✅ | ✅ (own data only) |

**Editor scope:** `division_id` restricts all write operations to objects in their assigned division. Enforced at the API level.  
**Engineer scope:** Engineers can only view their own `engineer_summaries` and the objects they are assigned to. They cannot view other engineers' dashboards or unassigned objects.  
**Period lock:** Записи and Ремонт data is read-only for all roles once a period is deactivated. Only admin can create and activate a new period to enable data entry again.

---

