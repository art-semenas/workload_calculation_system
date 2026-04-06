# Postman Collection

This repo now includes a portable Postman setup that can be imported on any machine without relying on a synced paid Postman workspace.

## Source Of Truth

The canonical Postman artifacts are:

- `postman/collection/Workload Calculation System API.postman_collection.json`
- `postman/environments/local.postman_environment.json`

The older YAML tree under `postman/collections/` is retained temporarily as a legacy source from the previous file-based workspace setup. If you update the collection going forward, update the portable JSON artifacts first.

## Files

Portable files:

- `postman/collection/Workload Calculation System API.postman_collection.json`
- `postman/environments/local.postman_environment.json`

Legacy workspace files:

- `postman/collections/Workload Calculation System API/`
- `postman/globals/`

Optional helper:

- `postman/scripts/convert_to_portable.py`

## Import On A New Machine

1. Start the app locally with Docker Compose so the API is reachable at `http://localhost`.
2. In Postman, import `postman/collection/Workload Calculation System API.postman_collection.json`.
3. Import `postman/environments/local.postman_environment.json`.
4. Select the `Workload Calculation System Local` environment.
5. Run requests individually or execute the smoke flow in order.

## Default Local Environment Values

The local environment file contains:

- `baseUrl = http://localhost`
- `authEmail = admin@workload.local`
- `authPassword = password`

These values are intended for the local PoC stack only.

## Collection Variables And Runtime State

The collection keeps workflow state in collection variables, including:

- `authToken`
- `divisionId`
- `branchId`
- `objectId`
- `deviceTypeId`
- `repairTypeId`
- `assignmentId`
- `catalogDeviceTypeId`
- `catalogContextId`
- `catalogRepairTypeId`

The login request stores `authToken`, and later requests reuse collection variables populated by response scripts. If an earlier request fails, later requests may not have the IDs they expect.

## Happy-Path Smoke Flow

Run these requests in order:

1. `01 Login`
2. `02 Create Division`
3. `03 Create Branch in Division`
4. `04 Create Object`
5. `05 Get All Device Types`
6. `06 Add Device to Object`
7. `07 Create Assignment`
8. `08 Get All Repair Types`
9. `09 Update Object Records`
10. `10 Update Repair`
11. `11 Update Object Travel`
12. `12 Get Object Summary`
13. `13 Delete Assignment`
14. `14 Delete Object Device`
15. `15 Delete Object`

## Catalog Coverage

The `Catalog` folder contains requests for:

- list, get, create, update, delete device types
- list, create, update, delete repair types
- list, create, update, delete device contexts

These requests target:

- `/api/v1/catalog/devices`
- `/api/v1/catalog/devices/{id}/contexts`
- `/api/v1/catalog/repairs`

## Cleanup Limitation

The backend currently supports cleanup only for:

- object assignments
- object devices
- objects

The backend does not expose delete endpoints for branches or divisions. The smoke flow can delete the created object tree, but not the parent branch or division.

## Regenerating The Portable Files

If you need to regenerate the portable JSON artifacts from the legacy YAML tree, run:

```powershell
python postman/scripts/convert_to_portable.py
```

## Validation Status

The current portable files were generated from the legacy YAML tree and validated for:

- valid JSON structure
- matching request count between YAML and JSON exports
- preserved login script and collection-variable flow

Manual Postman import and end-to-end smoke execution are still the recommended final validation after future collection edits.
