# WayBack database migration

For a new database, create the tables from [`backend/schema.sql`](./backend/schema.sql). For a database that already contains the earlier WayBack schema, apply [`backend/migrations/002_system_administrator_permissions.sql`](./backend/migrations/002_system_administrator_permissions.sql) once.

The migration adds the `system_administrator` role and per-account `can_post` / `can_claim` permissions. Existing `admin` accounts remain security staff, matching the prior role migration. It also brings the soft-delete columns and supporting indexes used by the current item and claim routes into existing databases.

Public registration always creates a community account and never accepts a requested role or permission. To provision a system administrator, first register the account normally, then promote that account using its actual email:

```sql
UPDATE users
SET role = 'system_administrator'
WHERE email = 'admin@example.edu';
```

Security staff accounts can likewise be provisioned without exposing staff privileges through public registration:

```sql
UPDATE users
SET role = 'security_staff'
WHERE email = 'staff@example.edu';
```

At least one system administrator must remain; the administration API rejects demotion of the last one and prevents an administrator from removing their own system administrator role. User IDs, roles, and posting/claiming permissions are checked against PostgreSQL for each protected operation. Users should sign out and back in after deployment so the frontend receives the new permission fields in the login response.

`items.deleted_at` and `items.deleted_by` record staff removals without deleting listing, claim, or evidence history. Removed items stay visible to staff and their owners, but not in public browse results or generated reports.
