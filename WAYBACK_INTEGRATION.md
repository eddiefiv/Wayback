# WayBack Login and Backend Integration

## What changed

- The login page sends credentials to the backend and keeps the returned user and JWT in browser `sessionStorage` for the current tab session. Logging out removes that session.
- The registration page creates an account through `POST /api/auth/register`, validates matching passwords, and provides a link to log in after successful registration.
- Item listings and item creation use the backend API. Item data is no longer saved in browser `localStorage`.
- Creating an item now requires a valid login. The backend records the authenticated user's ID instead of attributing every post to a hard-coded development account.
- The frontend API URL defaults to `http://localhost:3000/api`; set `VITE_API_URL` in the frontend environment to use another API base URL.

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

### `GET /api/health`

Checks backend availability and its PostgreSQL connection.

## Local setup

1. Configure the backend `.env` values documented in [backend/README.md](./backend/README.md), including `JWT_SECRET`.
2. Create the PostgreSQL tables using `backend/schema.sql`.
3. Start the API from `backend` with `npm run dev`.
4. Start the frontend from `frontend` with `npm run dev`.
5. Register at the frontend's `/register` page (or call `POST /api/auth/register`), then log in at `/login`.

For a deployed frontend, configure the backend CORS origin in `backend/server.js` to match that frontend's origin.
