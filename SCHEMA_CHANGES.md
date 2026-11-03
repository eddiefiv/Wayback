# WayBack Schema Changes: Security Staff

Apply this migration once to the database after creating the current tables with `backend/schema.sql`. It preserves existing claim and evidence records when a listing is removed: removal is a soft delete, not a cascading delete.

```sql
BEGIN;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users
SET role = 'security_staff'
WHERE role = 'admin';

ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('community', 'security_staff'));

ALTER TABLE items
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_claims_status_created_at
    ON claims (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_deleted_created_at
    ON items (deleted_at, created_at DESC);

COMMIT;
```

The existing `admin` role is migrated to `security_staff`. The database continues to default new accounts to `community`; public registration must not accept a role from the request. To provision a staff account, first register it normally, then run this statement using that account's actual email:

```sql
UPDATE users
SET role = 'security_staff'
WHERE email = 'staff@example.edu';
```

The migration intentionally does not create staff credentials or promote a particular account. Affected users should sign out and back in after promotion so the login response contains the new role. Backend role checks also read the current database role for protected operations.

`items.deleted_at` and `items.deleted_by` record staff removals while preserving item, claim, and evidence history. Removed items disappear from public item queries and cannot have claims approved, but remain visible on the staff dashboard.
