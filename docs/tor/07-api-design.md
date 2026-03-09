## 10. API Design

### 10.1 Base URL
```
/api/v1
```

### 10.2 Endpoints

#### Objects
```
GET    /objects                        List (paginated, filterable)
POST   /objects                        Create
GET    /objects/:id                    Get metadata
PUT    /objects/:id                    Update metadata
DELETE /objects/:id                    Delete
GET    /objects/:id/summary            Get computed summary
```

#### Physical Inventory
```
GET    /objects/:id/devices            List physical devices
POST   /objects/:id/devices            Add device {device_type_id, quantity_physical}
PUT    /objects/:id/devices/:dtid      Update physical quantity
DELETE /objects/:id/devices/:dtid      Remove (cascades system assignments)
```

#### System Assignments
```
GET    /objects/:id/assignments              List all assignments
POST   /objects/:id/assignments             Create {device_type_id, system_type, quantity_maintained}
PUT    /objects/:id/assignments/:aid         Update quantity_maintained
DELETE /objects/:id/assignments/:aid         Remove assignment
```

#### Records, Repairs, Travel
```
GET    /objects/:id/records            Get records task quantities
PUT    /objects/:id/records            Update (triggers recalc)
GET    /objects/:id/repairs            List repair counts per type
PUT    /objects/:id/repairs/:rtid      Set count for one repair type (triggers recalc)
GET    /objects/:id/travel             Get travel data
PUT    /objects/:id/travel             Update (triggers recalc)
```

#### Device Catalog
```
GET    /catalog/devices                List all device types
POST   /catalog/devices                Create device type
GET    /catalog/devices/:id            Get with all system contexts
PUT    /catalog/devices/:id            Update name/description
DELETE /catalog/devices/:id            Delete (blocked if object_devices rows exist)

GET    /catalog/devices/:id/contexts   List system contexts
POST   /catalog/devices/:id/contexts   Add context {system_type, r1_minutes, r2_minutes}
PUT    /catalog/devices/:id/contexts/:cid  Update r1/r2 (triggers bulk recalc for affected objects)
DELETE /catalog/devices/:id/contexts/:cid  Delete (blocked if active assignments; returns 409)
```

#### Repair Type Catalog
```
GET    /catalog/repairs                List all repair types
POST   /catalog/repairs                Create {name, time_minutes}
PUT    /catalog/repairs/:id            Update (triggers bulk recalc for affected objects)
DELETE /catalog/repairs/:id            Delete (blocked if active object_repairs; returns 409)
```

#### СВОД & Summary
```
GET    /svod                           All summaries (paginated, filterable)
GET    /svod/export/xlsx               Export to XLSX (active period by default; ?period_id= for historical)
GET    /svod/export/pdf                Export to PDF (active period by default; ?period_id= for historical)
```

#### App Configuration
```
GET    /admin/config                   List all config keys/values
PUT    /admin/config/:key              Update value (marks all summaries stale; logged to audit_log)
GET    /admin/audit                    Audit log (admin only)
```

#### Planning Periods
```
GET    /admin/periods                  List all periods
POST   /admin/periods                  Create period {name, start_date, end_date}
GET    /admin/periods/:id              Get period details
PUT    /admin/periods/:id/activate     Set as active period (deactivates current active)
GET    /admin/periods/active           Get the currently active period
```

#### Recalculation (on-demand)
```
POST   /svod/recalculate               Trigger full recalculation of all stale summaries (admin only)
POST   /svod/recalculate/:object_id    Trigger recalculation for one object (admin only)
GET    /svod/recalculate/status        Check background job status {total_stale, processed, remaining}
```

#### Engineers
```
GET    /engineers                         List all engineers (paginated, filterable)
POST   /engineers                         Create engineer (admin only)
GET    /engineers/:id                     Get engineer with summary
PUT    /engineers/:id                     Update name, capacity_fte, home_division (admin only)
DELETE /engineers/:id                     Deactivate (blocked if active assignments) (admin only)

GET    /engineers/:id/summary             Get engineer_summaries row
GET    /engineers/:id/objects             List all assigned objects with per-object shares
POST   /engineers/:id/objects             Assign object {object_id} to this engineer
DELETE /engineers/:id/objects/:oid        Remove object assignment
```

#### Object-Engineer Assignments (alternative entry point from object side)
```
GET    /objects/:id/engineers             List engineers assigned to this object
POST   /objects/:id/engineers             Assign engineer {engineer_id} to this object
DELETE /objects/:id/engineers/:eid        Remove engineer assignment
```

#### Coverage
```
GET    /coverage/gaps                     List all objects with zero assigned engineers
GET    /coverage/gaps?division_id=:did    Filtered by division
```

#### Aggregations (on-the-fly, no cache)
```
GET    /aggregations/company              Company-wide required FTE and breakdown
GET    /aggregations/divisions            All divisions summary list
GET    /aggregations/divisions/:id        Single division detail (§16.7 response shape)
GET    /aggregations/branches             All branches summary list
GET    /aggregations/branches/:id         Single branch detail
```

#### Import / Export / Auth
```
POST   /import/xlsx                    Upload XLSX; returns preview + validation report
POST   /import/xlsx/confirm            Execute confirmed import
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

### 10.3 Response Format
```json
{ "data": { ... }, "meta": { "page": 1, "total": 2935, "per_page": 100 }, "error": null }
```
On error:
```json
{
  "data": null,
  "error": {
    "code": "CONTEXT_IN_USE",
    "message": "Cannot delete: 42 objects have active assignments using this context",
    "affected_count": 42
  }
}
```

---

