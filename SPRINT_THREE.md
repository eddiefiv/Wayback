# Sprint Three: administration, listing edits, and reports

## Delivered

### System administration and permissions

- Added the `system_administrator` account role and `can_post` / `can_claim` permission flags to the PostgreSQL schema.
- Added an existing-database migration at [`backend/migrations/002_system_administrator_permissions.sql`](./backend/migrations/002_system_administrator_permissions.sql), with account provisioning instructions in [`SCHEMA_CHANGES.md`](./SCHEMA_CHANGES.md).
- Added administrator-only APIs to list and retrieve users and update roles and permissions. Role checks read the current database state; users cannot change their own administrator role or demote the last system administrator.
- Added the System Administration Console at `/admin`, including user selection, an Edit Permissions flow, role selection, and posting/claiming controls.
- Added an administrator-only reports view at `/admin/reports`. It requires a report type, summarizes active listings by type, status, and location, displays the result, and exports it as CSV. The API also rejects missing or unsupported report types.

### Community listing edits and access handling

- Added owner-scoped edits for active listings through `PATCH /api/items/:id`. Community members can edit their own listing details but cannot change listing status; security staff retain their existing ability to edit any active listing.
- Added the listing detail/edit flow under My Activity (`/submissions/:itemId`) with an Edit Listing action.
- Enforced `can_post` for creating and editing listings and `can_claim` for submitting claims. The frontend hides unavailable navigation actions and explains disabled capabilities.
- Added a dedicated 401 Unauthorized page. System administrators and other signed-in non-community users who navigate to My Activity are redirected there. Unknown administrator user IDs display a 404 not-found state.
- Public registration still creates community accounts only. To establish the first system administrator, register an account and promote it using the SQL in [`SCHEMA_CHANGES.md`](./SCHEMA_CHANGES.md).

### UI refresh and documentation

- Updated the global typography, colors, focus treatment, controls, navigation, home page, browse cards, forms, and administration screens with a responsive blue-and-white design that preserves WayBack's existing visual character.
- Updated [`WAYBACK_INTEGRATION.md`](./WAYBACK_INTEGRATION.md) with the added API contracts, authorization rules, and setup steps.

## Database rollout

- For a new database, create the tables from [`backend/schema.sql`](./backend/schema.sql).
- For an existing database, apply [`backend/migrations/002_system_administrator_permissions.sql`](./backend/migrations/002_system_administrator_permissions.sql) before starting the updated backend.
- Provision a system administrator using the account-promotion SQL in [`SCHEMA_CHANGES.md`](./SCHEMA_CHANGES.md), then sign in again to refresh the session's role and permissions.

## Verification

- `npm.cmd run build` in `frontend`: passed.
- `npm.cmd run lint` in `frontend`: passed.
- `node --check` across backend JavaScript files: passed.
- `git diff --check`: passed.
- Vite development server returned HTTP 200 for `/`.
- Runtime probes for `/api/admin/users`, `/api/admin/reports`, and `/api/items/mine` returned the expected 401 without authentication.
- Browser-driven smoke testing could not run because the machine does not have the Playwright Chromium executable installed. The PostgreSQL-backed API flows were not exercised against a live database in this check.
