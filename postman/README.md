# Postman Collection Notes

This workspace contains a file-based Postman collection under:

- `postman/collections/Workload Calculation System API`

The collection is configured for the local PoC stack exposed through nginx:

- `baseUrl = http://localhost`
- seeded login: `admin@workload.local` / `password`

## Happy-path smoke flow

Run the requests in this order:

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

The flow relies on Postman collection variables populated by response scripts.
If a request fails, the next request may not have the IDs it expects.

## Catalog coverage

The `Catalog` folder contains requests for:

- list, get, create, update, delete device types
- list, create, update, delete repair types
- list, create, update, delete device contexts

These requests target the current backend controller paths:

- `/api/v1/catalog/devices`
- `/api/v1/catalog/devices/{id}/contexts`
- `/api/v1/catalog/repairs`

## Cleanup limitation

The backend currently supports cleanup only for:

- object assignments
- object devices
- objects

The backend does **not** expose delete endpoints for branches or divisions.
That means the smoke flow can delete the created object tree, but not the parent branch or division.

## Why Catalog may not appear in Postman

If you can see the collection but not the `Catalog` folder or some newly added requests, the usual cause is that Postman has not refreshed the file-based collection tree after external edits.

Try this sequence:

1. Close and reopen the collection in Postman.
2. Trigger a workspace refresh or reload the Postman window.
3. If you are using the VS Code Postman extension, reload VS Code or reconnect the Postman workspace.
4. Re-import the `postman` folder if the collection was imported before these files existed.

The files exist on disk and validate as YAML. If Postman still does not show them after a refresh, the issue is in the client cache or sync state rather than the repository contents.
