# CONTRACT.md: QuickTix Core Technical Contracts & Invariants

This document is the authoritative contract for the QuickTix application. All backend routes, frontend components, and Playwright tests must strictly adhere to these specifications.

---

## 1. System Architecture & Process Model

- **Backend**: Node.js + Express 5 + Mongoose / MongoDB.
- **Frontend**: Angular (standalone components, plain CSS).
- **Single Process Production Model**:
  In test and production environments, the Express server serves both `/api` endpoints and the compiled Angular frontend (`client/dist/browser`). Playwright's `webServer` only needs to start one process: `npm start --prefix server`.
- **Parallelism**: `workers: 1`, `fullyParallel: false` to ensure deterministic state wipes.

---

## 2. Seed Data Specification

The test reset endpoint (`POST /api/test/reset`) wipes the collections and inserts fixed entities with deterministic IDs and timestamps.

### Users & Worker Scoping
| Entity | Email Pattern | Password (Plain) | _id Pattern | Role |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator (Admin)** | `admin@quicktix.test` | `Passw0rd!test` | `0000000000000000000000a0` | `admin` |
| **Developer / QA (Baseline)** | `qa.user@quicktix.test` | `Passw0rd!test` | `000000000000000000000001` | `user` |
| **Playwright Bot (Workers 0..3)** | `playwright.bot@quicktix.test` (w0)<br>`bot.worker{W}@quicktix.test` | `Passw0rd!test` | `000000000000000000000099` (w0)<br>`00000000000000000000009{W}` | `user` |
| **Foreign User (Workers 0..3)** | `other.user@quicktix.test` (w0)<br>`other.user.{W}@quicktix.test` | `Passw0rd!test` | `000000000000000000000002` (w0)<br>`00000000000000000000002{W}` | `user` |

*Password Hashing Rule*: Bcrypt hash is computed **once** at module load with cost factor 4 (`bcrypt.hashSync('Passw0rd!test', 4)`), ensuring `/api/test/reset` executes in < 20ms.

*Hermetic State & Dynamic User Cleanup Rule*: The reset endpoint (`POST /api/test/reset`) enforces strict test isolation while preserving existing seed user documents:
- Any ad-hoc, dynamically registered, or orphan users created during test execution (e.g. `api_registered_*`, `qa_test_*`, or rogue registrations whose `_id` is not in the seed set) are completely **purged on reset**.
- **CRITICAL — Seed User Non-Overwrite Invariant**: Once a seed user (`qa.user@quicktix.test`, `admin@quicktix.test`, `bot.worker1..5@quicktix.test`, `other.user.1..5@quicktix.test`) exists in MongoDB, `/api/test/reset` must **NEVER** overwrite or update it with `$set` or `updateOne`. It must **ONLY insert missing seed users** whose `_id` does not yet exist in `quicktix_test.users`.
  - **Why**: If a developer/tester edits a user in **MongoDB Compass** (such as altering `qa.user@quicktix.test` for the autologin prefill button or modifying worker credentials), `/api/test/reset` must not silently revert the edit back to hardcoded defaults (which would cause tests to falsely pass instead of failing against the broken DB state) and must not modify the document in the background (which causes MongoDB Compass to display `"Document was modified in the background or it no longer exists"`).

### Tickets (Seeded Deterministically per Worker)
| Ticket Index | Title | Status | Priority | Owner | CreatedAt |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ticket1` | "Fix login button styling" | `Open` | `High` | Active Worker Bot | T - 3 days |
| `ticket2` | "Update documentation footer" | `Open` | `Low` | Active Worker Bot | T - 2 days |
| `ticket3` | "Investigate memory leak" | `In Progress` | `Medium` | Active Worker Bot | T - 1 day |
| `ticket4` | "Setup automated backups" | `Resolved` | `Low` | Active Worker Bot | T |
| `foreignTicket5` | "Foreign user secret issue" | `Open` | `Urgent` | Worker Foreign User | T |

*Owner Scoping & Isolation Rule*: Worker bots must **never** see Ticket 5. Accessing Ticket 5 with a worker bot token must return `404 Not Found`.

*Admin RBAC Rule*: Users with `role === 'admin'` possess full oversight:
- `GET /api/tickets`: Returns all tickets across all tenants/owners without filtering.
- `GET /api/tickets/:id`, `PUT /api/tickets/:id`, `DELETE /api/tickets/:id`: Permitted across any ticket ID regardless of owner.
Standard users (`role === 'user'`) remain strictly restricted to tickets they own.

*Empty State Contract*: The developer/QA user (`qa.user@quicktix.test`) starts with 0 seeded tickets. Tests validating the QA/demo login flow must expect the authenticated view with empty state indicator (`data-testid="ticket-empty"`), or check dashboard routing and header identity (`qa.user@quicktix.test`), rather than relying on lingering tickets.

---

## 3. Authentication & Storage Contract

- **Token Type**: HMAC SHA-256 JWT signed with `JWT_SECRET`. Expiration: `24h`.
- **Payload**: `{ id: user._id, email: user.email, role: user.role }`.
- **Client Storage**: `localStorage.setItem('token', token)` (under key `token`).
  * `sessionStorage` must NOT be used because Playwright's `storageState` only persists cookies and `localStorage`.
- **Angular Interceptor**: Attaches `Authorization: Bearer <token>` to all HTTP requests targeting `/api`.
- **Auth Guard**: Unauthenticated access to `/tickets` immediately redirects to `/login`.
- **Logged-Out Test State**: Logged-out tests explicitly clear auth state using `test.use({ storageState: { cookies: [], origins: [] } })`.

---

## 4. REST API & Validation Contract

Base URL: `/api`

### Health & Reset Endpoints
- `GET /api/health`
  - Returns `200 { status: "ok", mongo: "connected" }` ONLY when `mainDbConnection.readyState === 1`.
  - Returns `503` if disconnected.
- `POST /api/test/reset`
  - Mounted **only** when `NODE_ENV === 'test'`. Returns `404` in production or development.
  - Refuses to run if active database name does not end in `_test`.
  - Returns `200` with seeded user and ticket IDs.

### Auth Endpoints
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Success: `200 { token: "..." }`
  - Failure: `401 { error: "Unauthorized", message: "Invalid email or password" }`
- `POST /api/auth/register`
  - Body: `{ email, password }`
  - Validation: Email must match standard format, password must be >= 6 characters.
  - Success: `201 { token: "...", message: "Account created successfully" }`
  - Conflict: `409 { error: "Conflict", message: "An account with this email already exists" }`
  - Failure: `400 { error: "ValidationError", message: "..." }`

### Ticket CRUD Endpoints
- `GET /api/tickets?status=`
  - Returns only current user's tickets (`owner === req.user.id`).
  - Supports optional query param `status` (`Open`, `In Progress`, `Resolved`, `Closed`).
  - Sorted by `createdAt: -1` (descending). No pagination.
  - Success: `200 [ { _id, title, description, priority, status, owner, createdAt, updatedAt } ]`
- `POST /api/tickets`
  - Body: `{ title, description?, priority?, status? }`
  - Success: `201 { ...ticket }`
- `PUT /api/tickets/:id`
  - Updates specified fields.
  - Success: `200 { ...updatedTicket }`
  - Not found or foreign ticket: `404 { error: "NotFound", message: "Ticket not found" }`
- `DELETE /api/tickets/:id`
  - Deletes ticket.
  - Success: `204 No Content`
  - Not found or foreign ticket: `404 { error: "NotFound", message: "Ticket not found" }`

### Validation Rules
- **Title**: Required, trimmed string, 3 to 100 characters.
- **Description**: Optional string, maximum 500 characters.
- **Priority**: Enum `Low` | `Medium` | `High` | `Urgent` (Default: `Medium`).
- **Status**: Enum `Open` | `In Progress` | `Resolved` | `Closed` (Default: `Open`).

### Error Response Shapes
- `400 Bad Request`: `{ error: "ValidationError", message: "..." }`
- `401 Unauthorized`: `{ error: "Unauthorized", message: "Valid token required" }`
- `404 Not Found`: `{ error: "NotFound", message: "Ticket not found" }`

---

## 5. UI Component Contract & data-testid Dictionary

All selectors must follow flat kebab-case (`<area>-<element>`). No dynamic suffixes.

| Area | data-testid | Role / Element |
| :--- | :--- | :--- |
| **Header** | `user-role-badge` | Visual role chip (e.g., `ADMIN`) |
| **Login** | `login-email` | `<input type="email">` |
| | `login-password` | `<input type="password">` |
| | `login-submit` | `<button type="submit">` |
| | `login-error` | Container with `role="alert"` |
| **Ticket List** | `ticket-list` | Container wrapper |
| | `ticket-row` | Row element with attribute `data-ticket-id="<id>"` |
| | `ticket-title` | Ticket title text |
| | `ticket-status` | Ticket status badge |
| | `ticket-edit` | Edit button within row |
| | `ticket-delete` | Delete button within row |
| | `ticket-new` | "Create Ticket" action button |
| | `status-filter` | Native `<select>` filter |
| | `ticket-empty` | Empty state indicator |
| | `list-loading` | Loading spinner |
| **Ticket Form** | `ticket-form` | `<form>` wrapper |
| | `ticket-title-input` | Title `<input>` |
| | `ticket-description-input` | Description `<textarea>` |
| | `ticket-priority-select` | Native `<select>` for priority |
| | `ticket-status-select` | Native `<select>` for status |
| | `ticket-submit` | Submit button |
| | `ticket-title-error` | Inline error container with `role="alert"` |
| **Confirm Modal** | `confirm-dialog` | Modal container (custom modal, not `window.confirm`) |
| | `confirm-accept` | "Delete" confirm button |
| | `confirm-cancel` | "Cancel" button |

---

## 6. Express 5 Static Serving & SPA Fallback Contract

- Static files served from `CLIENT_DIST` (default: `path.resolve(__dirname, '../../client/dist/browser')`).
- Boot-time guard: Server exits immediately if `index.html` is not found at startup.
- Express 5 compatible middleware (never `app.get('*')`):
  ```typescript
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  ```
