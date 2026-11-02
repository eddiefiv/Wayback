--  Put this into query to make the tables


CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'community'
        CHECK (role IN ('community', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posted_by INTEGER NOT NULL REFERENCES users(id),
    item_type VARCHAR(10) NOT NULL
        CHECK (item_type IN ('lost', 'found')),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(80),
    color VARCHAR(60),
    brand VARCHAR(100),
    location_text VARCHAR(255),
    event_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'claimed', 'returned', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE item_images (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE claims (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id),
    claimant_id INTEGER NOT NULL REFERENCES users(id),
    explanation TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE TABLE claim_evidence (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
