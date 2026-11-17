BEGIN;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ALTER COLUMN role TYPE VARCHAR(32);

UPDATE users
SET role = 'security_staff'
WHERE role = 'admin';

ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('community', 'security_staff', 'system_administrator'));

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS can_post BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS can_claim BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE items
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_claims_status_created_at
    ON claims (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_deleted_created_at
    ON items (deleted_at, created_at DESC);

COMMIT;
