# WayBack Login and Backend Integration

## What changed

- The login page sends credentials to the backend and keeps the returned user and JWT in browser `sessionStorage` for the current tab session. Logging out removes that session.
- The registration page creates an account through `POST /api/auth/register`, validates matching passwords, and provides a link to log in after successful registration.
- Item listings and item creation use the backend API. Item data is no longer saved in browser `localStorage`.
- Creating an item now requires a valid login. The backend records the authenticated user's ID instead of attributing every post to a hard-coded development account.
- Signed-in users can submit ownership claims on open found items, with an explanation and HTTPS cloud-file evidence links for supported multimedia/document types.
- Signed-in users can view their submitted claims, current status, review notes, and evidence links from the My Claims page.
- Community users can view all items they have posted, including current status and listings removed from public browse, from the My Submissions page.
- Security staff use a separate `security_staff` role and dashboard to review/approve/deny claims and edit or remove any listing. Public account registration always creates a community account.
- The frontend API URL defaults to `http://localhost:3000/api`; set `VITE_API_URL` in the frontend environment to use another API base URL.

Security staff require the database migration and manual account provisioning described in [SCHEMA_CHANGES.md](./SCHEMA_CHANGES.md). Item removal is a soft delete to preserve claim and evidence history.

## API

Successful responses and handled API errors use JSON. Error responses have the shape `{ "error": "Description" }`. The frontend runs at `http://localhost:5173` by default, and the backend at `http://localhost:3000`.

### `POST /api/auth/register`

Creates an account. No authentication is required.

Request:

```json
{
  "name": "Alex User",
  "email": "alex@example.edu",
  "password": "at-least-8-characters"
}
```

Returns `201 Created` with a success message and the new user's `id`, `name`, `email`, `role`, and `created_at`. Names and emails must be non-empty, the email must be valid, and passwords must contain 8-128 characters. Returns `400` for invalid input and `409` if the email is already registered.

### `POST /api/auth/login`

Authenticates an account.

Request:

```json
{
  "email": "alex@example.edu",
  "password": "at-least-8-characters"
}
```

Returns `200 OK` with `token` and the authenticated user's `id`, `name`, `email`, and `role`. The signed JWT expires after two hours. Returns `400` if the email or password is missing or not a string, and `401` if the email/password pair is incorrect.

### `GET /api/items`

Returns all listings, newest first. Authentication is not required. Each listing includes database fields such as `id`, `item_type`, `event_date`, and `location_text`.

### `GET /api/items/mine`

Returns the authenticated community user's own submissions, newest first, including status and soft-deleted listings. Requires a community bearer token. The user ID is taken from the verified token; clients cannot query another user's submissions. Returns `401` without valid authentication, `403` for non-community accounts, and `500` if submissions cannot be retrieved.

### `GET /api/items/:id`

Returns one listing. Authentication is not required. Returns `400` for a non-positive or invalid ID and `404` when no listing exists.

### `POST /api/items`

Creates a listing for the logged-in user. Send the JWT from login in the `Authorization` header:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "title": "Blue water bottle",
  "description": "Reusable bottle left near the library.",
  "type": "Found",
  "date": "2026-10-30",
  "location": "Library"
}
```

`type` must be `Lost` or `Found`; the other fields are required. Returns `201 Created` with the stored listing. Returns `400` for invalid item details, `401` if the bearer token is missing, invalid, or expired, and `500` if storage or authentication configuration fails.

Only community users may create listings.

### `GET /api/items/staff`

Returns all listings, including removed listings and poster details. Requires a `security_staff` bearer token.

### `PATCH /api/items/:id`

Edits one active listing. Requires a `security_staff` bearer token. Supply one or more of `title`, `description`, `item_type`, `category`, `color`, `brand`, `location_text`, `event_date`, or `status`. Nullable descriptive fields and `event_date` may be set to `null`; status must be `open`, `claimed`, `returned`, or `closed`. Returns the updated item, `400` for invalid fields, `401` without valid authentication, `403` for non-staff accounts, and `404` if no active item exists.

### `DELETE /api/items/:id`

Removes an active listing from public browse and claim approval without deleting its record or claim/evidence history. Stores removal time and staff account ID. Requires a `security_staff` bearer token. Returns `404` if no active listing exists, `401` without valid authentication, and `403` for non-staff accounts.

### `GET /api/health`

Checks backend availability and its PostgreSQL connection.

### `POST /api/claims/:itemId`

Submits an ownership claim for an open found item. Requires `Authorization: Bearer <token>` from `POST /api/auth/login`.

Request:

```json
{
  "explanation": "The item has my initials and matches the identifying details.",
  "evidence": [
    {
      "file_path": "https://cloud.example.com/shared/photo",
      "description": "Photo of my matching item"
    },
    {
      "file_path": "https://cloud.example.com/shared/receipt",
      "description": "Purchase receipt"
    }
  ]
}
```

`explanation` is required and limited to 2,000 characters. Provide 1-10 evidence entries; each needs an HTTPS `file_path` (up to 2,048 characters), and may include a `description` of up to 500 characters. Links can point to multimedia or document files; the service stores the link and optional description without uploading or inspecting the file. Only community users can submit claims. Returns `201 Created` with the claim and evidence link details. Returns `400` for invalid input, `401` for missing/invalid/expired authentication, `403` if the claimant posted the item or is not a community user, `404` if the item does not exist, and `409` if the item is not an active open found listing or the user already has a pending claim for it. Claims and evidence are inserted in one database transaction.

### `GET /api/claims/mine`

Returns the authenticated user's claims, newest first. Requires `Authorization: Bearer <token>`. Each claim includes its status, explanation, submission/review dates, review notes, item title/type/location, and evidence links. The claimant identity comes only from the verified token, so users cannot request another user's claims. Returns `401` for missing/invalid/expired authentication and `500` if claims cannot be retrieved.

### `GET /api/claims/review`

Returns all claims, pending claims first, with claimant details, listing details, review state, and evidence links. Requires a `security_staff` bearer token.

### `PATCH /api/claims/:claimId/review`

Approves or denies a pending claim. Requires a `security_staff` bearer token.

```json
{
  "status": "approved",
  "admin_notes": "Evidence matches the identifying details."
}
```

`status` must be `approved` or `rejected`; `admin_notes` is optional and limited to 2,000 characters. Approval is only allowed for an active, open found item, changes the item status to `claimed`, and rejects any other pending claims for that item with an explanatory review note. Denial updates only the selected claim. Both outcomes record the reviewing staff account and time. Returns `409` if the claim has already been reviewed or the item cannot be approved, `404` for an unknown claim, `400` for invalid input, and `403` for non-staff accounts.

## Local setup

1. Configure the backend `.env` values documented in [backend/README.md](./backend/README.md), including `JWT_SECRET`.
2. Create the PostgreSQL tables using `backend/schema.sql`.
3. Start the API from `backend` with `npm run dev`.
4. Start the frontend from `frontend` with `npm run dev`.
5. Register at the frontend's `/register` page (or call `POST /api/auth/register`), then log in at `/login`.
6. To enable security staff, apply `SCHEMA_CHANGES.md`, register the staff account as usual, promote it with the SQL statement in that file, then sign in again. Staff accounts see the Staff Dashboard link.

For a deployed frontend, configure the backend CORS origin in `backend/server.js` to match that frontend's origin.
