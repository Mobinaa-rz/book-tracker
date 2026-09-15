# Book Tracker

A full-stack web application for keeping track of your personal book collection.
Create an account, add the books you want to read, are reading or have finished,
rate them, keep notes, and see a summary of your library on the dashboard.
Every user only ever sees and manages their own books.

**Stack:** Node.js 22 · Express 5 · SQLite (better-sqlite3) · React 19 · Vite · plain CSS

---

## Table of contents

1. [Features](#features)
2. [Project structure](#project-structure)
3. [Getting started](#getting-started)
4. [Running the tests](#running-the-tests)
5. [Architecture](#architecture)
6. [Authentication & security](#authentication--security)
7. [Database](#database)
8. [API documentation](#api-documentation)
9. [Frontend & design system](#frontend--design-system)
10. [Scripts reference](#scripts-reference)

---

## Features

- **Accounts** – register, log in, log out; passwords hashed with bcrypt
- **Books** – add, view, edit and delete books with title, author, status,
  1–5 star rating, personal notes and date added
- **Statuses** – *Want to Read*, *Reading*, *Finished*
- **Dashboard** – totals per status and the most recently added books
- **Search & filter** – search by title or author, filter by status
  (only ever within your own books)
- **Ownership** – the API scopes every query to the logged-in user; another
  user's books simply do not exist from your point of view (404)
- **Polished UI** – responsive layout for phone, tablet and desktop, clear
  loading / empty / error states, keyboard accessible components

---

## Project structure

```
book-tracker/
├── backend/                 REST API (Express + SQLite)
│   ├── src/
│   │   ├── app.js           builds the Express app (used by server + tests)
│   │   ├── server.js        starts the HTTP server
│   │   ├── config.js        environment configuration
│   │   ├── db/              database connection + schema.sql
│   │   ├── models/          SQL queries for users and books
│   │   ├── middleware/      requireAuth, validate, errorHandler
│   │   ├── routes/          auth.routes.js, books.routes.js
│   │   ├── validators/      zod schemas for request bodies / queries
│   │   └── utils/           HttpError, JWT + cookie helpers
│   ├── tests/               Vitest + Supertest API tests
│   ├── data/                SQLite database file (git-ignored)
│   └── .env.example
├── frontend/                React single-page app (Vite)
│   └── src/
│       ├── api/             fetch wrapper + auth/books API modules
│       ├── components/
│       │   ├── ui/          Button, Field, ChoiceChips, StatusBadge, StarRating, …
│       │   ├── books/       BookCard, BookCover, BookForm, BookListItem
│       │   └── layout/      Navbar, AppLayout, AuthLayout, ProtectedRoute
│       ├── context/         AuthContext, ToastContext
│       ├── lib/             status metadata, formatting, cover colours, hooks
│       ├── pages/           Login, Register, Dashboard, Books, AddBook, EditBook, BookDetails
│       ├── styles/          tokens, base, components, layout, pages (plain CSS)
│       └── __tests__/       Vitest + React Testing Library tests
├── e2e/                     Playwright end-to-end tests (real browser, real stack)
│   ├── auth.spec.js         register, login, logout, session, route guards
│   ├── books.spec.js        add / edit / delete, search, status filters, details
│   ├── dashboard.spec.js    summary stat cards and "Recently added"
│   ├── navigation.spec.js   navbar, client-side routing, 404 page
│   ├── ownership.spec.js    per-user data isolation
│   ├── fixtures.js          `test` (logged out) and `authedTest` (signed in)
│   ├── helpers.js           API seeding, UI helpers, form locators
│   ├── paths.js             ports, URLs and the e2e database location
│   ├── browser-source.js    picks the Chromium binary to drive
│   └── reset-db.js          wipes the e2e database before a run
├── playwright.config.js     Playwright config (starts both servers itself)
├── package.json             convenience scripts that run both apps
├── .gitignore
└── README.md
```

---

## Getting started

### Prerequisites

- **Node.js 22** or newer (uses the built-in `--env-file` and `--watch` flags)
- npm 10+

### 1. Install dependencies

```bash
npm run install:all        # installs backend/ and frontend/ dependencies
npm install                # (optional) installs `concurrently` for `npm run dev`
```

To run the end-to-end suite as well, add the browser once:

```bash
npx playwright install chromium
```

(`npm install` already pulls in `@playwright/test`; only the browser download
is separate. See [Restricted networks](#running-the-tests) if that download is
blocked.)

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set a real `JWT_SECRET` (any long random string, e.g.
`openssl rand -hex 32`). The other values have sensible defaults:

| Variable     | Default          | Description                                        |
|--------------|------------------|----------------------------------------------------|
| `PORT`       | `4000`           | Port the API listens on                            |
| `JWT_SECRET` | *(required)*     | Secret used to sign session cookies                |
| `DB_PATH`    | `data/books.db`  | SQLite file (relative to `backend/`) or `:memory:` |
| `NODE_ENV`   | `development`    | `production` marks the cookie as `Secure`          |

The database file and tables are created automatically on first start.

### 3. Run the app

```bash
npm run dev
```

This starts both servers:

- API: <http://localhost:4000>
- Web app: <http://localhost:5173> ← open this one

The Vite dev server proxies every `/api/*` request to the backend, so the
browser only ever talks to one origin and no CORS setup is needed.

To run them separately: `npm run dev:backend` and `npm run dev:frontend`.

### Production build (optional)

```bash
npm run build     # builds frontend/dist
npm start         # the API also serves frontend/dist when it exists
```

Then open <http://localhost:4000>.

---

## Running the tests

```bash
npm test                 # backend + frontend unit/integration tests
npm run test:backend     # API tests (Vitest + Supertest, in-memory SQLite)
npm run test:frontend    # component/page tests (Vitest + React Testing Library)
npm run test:e2e         # end-to-end tests (Playwright, real browser)
npm run test:all         # everything above, in that order
```

**Backend (41 tests)** cover registration, login, logout, `/me`, auth
protection of every book endpoint, book create/read/update/delete, validation
errors, search & status filtering, dashboard stats and — most importantly —
that a user gets `404` when trying to read, update or delete another user's book.

**Frontend (46 tests)** cover the login and register flows (validation,
success, server errors), route guards, the My Books page (loading skeleton,
URL-synced search/filter, empty / no-results / error states), the add and edit
forms (payloads, server field errors), the details page (delete only after
confirmation), the dashboard, the navbar and the reusable UI components.

### End-to-end tests (Playwright)

**E2E (62 tests)** run a real Chromium against the real stack — the actual
Express + SQLite API and the actual Vite dev server — with nothing mocked.
`playwright.config.js` starts both servers itself, waits for them to be ready
and shuts them down afterwards, so one command is enough.

They cover the journeys the other suites can only approximate:

| Spec                 | What it covers                                                                 |
|----------------------|--------------------------------------------------------------------------------|
| `auth.spec.js`       | Registering and logging in through the real forms, client- and server-side validation errors, logout, the session surviving a reload (httpOnly cookie), and both route guards including the redirect back to the page a guest originally asked for |
| `books.spec.js`      | Adding a book end to end, required-field validation, status chips and the star rating picker, the My Books grid, debounced search by title and author, clearing search, status filtering, search + filter combined, the no-results state, URL state surviving a reload, editing (prefill, save, persistence), cancelling an edit, and deleting with — and cancelling — the confirmation dialog |
| `dashboard.spec.js`  | Per-status counts, stat cards deep-linking to filtered views, the "Recently added" list and its five-book cap, and the empty-library state |
| `navigation.spec.js` | The navbar, client-side routing between pages, the active-link state, the brand link, and the 404 page |
| `ownership.spec.js`  | Per-user isolation as a real user experiences it: another account's books are absent from the list, and opening, editing, updating or deleting one by id yields a `404` |

Useful variations:

```bash
npm run test:e2e:headed   # watch the browser
npm run test:e2e:ui       # Playwright's interactive UI mode
npm run test:e2e:debug    # step through with the inspector
npm run test:e2e:report   # open the last HTML report
npx playwright test e2e/books.spec.js -g "deleting"   # one file / one test
```

#### Before the first e2e run

```bash
npm install                        # installs @playwright/test
npx playwright install chromium    # downloads the browser (one-off)
```

The suite uses its own database at `backend/data/e2e.db`, wiped before every
run, and never touches `backend/data/books.db`. Each test also registers its
own unique account, so tests are fully isolated from one another and can run in
parallel.

<details>
<summary><strong>Restricted networks</strong> (when <code>npx playwright install</code> cannot reach the browser CDN)</summary>

Playwright downloads browsers from a CDN that some sandboxes and corporate
networks block. When that happens, install a Chromium build published to the
npm registry instead — the npm registry is usually still reachable:

```bash
npm install --no-save @sparticuz/chromium
```

`e2e/browser-source.js` then picks it up automatically; the run prints which
browser it chose:

```
[playwright] chromium source: @sparticuz/chromium (npm fallback)
```

The fallback is **optional and not a project dependency** — normal installs
should just use `npx playwright install chromium`. Resolution order is:

1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` (an explicit browser path), then
2. Playwright's own downloaded browser, then
3. `@sparticuz/chromium`, if it happens to be installed.

On slim Linux images that build may also need the NSS/NSPR libraries. The
fallback unpacks the copies bundled with that package into
`node_modules/.cache/book-tracker-e2e/` and points `LD_LIBRARY_PATH` at them
for the browser process only — no system file is modified.

Video recording is deliberately left off: it needs a separate `ffmpeg`
download. Traces (enabled on failure) give more useful debugging detail and
need nothing extra — inspect one with
`npx playwright show-trace test-results/<test>/trace.zip`.
</details>

---

## Architecture

```
Browser ──► Vite dev server (5173) ──/api/*──► Express API (4000) ──► SQLite
             React SPA                          JWT cookie auth        books.db
```

- **Frontend and backend are fully separated.** They only communicate over
  the JSON REST API described below.
- **Backend layering is deliberately shallow:** `routes/` handle HTTP
  (validation, status codes) and call `models/`, which contain plain,
  parameterised SQL. There is no ORM, so every query is visible.
- **Every book query takes the user id** (`WHERE id = ? AND user_id = ?`).
  Ownership is therefore enforced in one place and cannot be forgotten in a
  route.
- **Validation** is done with `zod` schemas; a failed validation returns
  `400` with one message per field, which the frontend shows inline.
- **The frontend keeps state simple:** an `AuthContext` for the logged-in
  user, a `ToastContext` for confirmations, and a small `useApi` hook for
  loading / error / refreshing state on each page. Search and filter live in
  the URL (`/books?search=…&status=…`) so links, refresh and the back button
  all work.

---

## Authentication & security

- Passwords are hashed with **bcrypt** (cost 10) and never returned by the API.
  User objects are built from an explicit column list (`id, username, email,
  created_at`).
- On register/login the API issues a **JWT** (payload: the user id, 7-day
  expiry) in an **`httpOnly`, `SameSite=Lax`** cookie (plus `Secure` in
  production). JavaScript in the browser can't read it, and it is sent
  automatically with every request.
- `requireAuth` middleware verifies the cookie and loads the user; every
  `/api/books` route and `/api/auth/me` require it and answer `401` otherwise.
- Login errors are deliberately generic ("Invalid email or password") so the
  API doesn't reveal which emails are registered.
- Search input is passed as a bound parameter with `LIKE` wildcards escaped;
  no SQL is ever built from user input.
- Secrets live in `backend/.env`, which is git-ignored; `.env.example`
  documents the variables.

---

## Database

SQLite, created from [`backend/src/db/schema.sql`](backend/src/db/schema.sql)
on start-up. Timestamps are ISO-8601 UTC strings.

**users**

| column          | type    | notes                          |
|-----------------|---------|--------------------------------|
| `id`            | INTEGER | primary key                    |
| `username`      | TEXT    | unique, case-insensitive       |
| `email`         | TEXT    | unique, case-insensitive       |
| `password_hash` | TEXT    | bcrypt hash                    |
| `created_at`    | TEXT    | default: now                   |

**books**

| column       | type    | notes                                              |
|--------------|---------|----------------------------------------------------|
| `id`         | INTEGER | primary key                                        |
| `user_id`    | INTEGER | FK → users.id, `ON DELETE CASCADE`, indexed        |
| `title`      | TEXT    | required                                           |
| `author`     | TEXT    | required                                           |
| `status`     | TEXT    | `want_to_read` (default) · `reading` · `finished`  |
| `rating`     | INTEGER | `NULL` or 1–5                                      |
| `notes`      | TEXT    | default `''`                                       |
| `created_at` | TEXT    | default: now                                       |
| `updated_at` | TEXT    | set on every update                                |

A book belongs to exactly one user.

---

## API documentation

Base URL: `/api`. All request and response bodies are JSON.
Authenticated endpoints (🔒) require the session cookie set by register/login.

### Error format

```json
{ "error": "Validation failed", "details": { "title": "Title is required" } }
```

`details` is only present for validation errors (`400`) and conflicts (`409`).

| Status | Meaning                                              |
|--------|------------------------------------------------------|
| 400    | Invalid input (see `details`) or malformed JSON      |
| 401    | Not logged in / session expired                      |
| 404    | Resource not found (including another user's book)   |
| 409    | Email or username already taken                      |
| 500    | Unexpected server error                              |

### Authentication

#### `POST /api/auth/register`

Creates an account and logs the user in (sets the cookie).

```json
// request
{ "username": "mobina", "email": "mobina@example.com", "password": "password123" }

// 201 response
{ "user": { "id": 1, "username": "mobina", "email": "mobina@example.com", "created_at": "2026-03-10T10:00:00.000Z" } }
```

Rules: username 3–30 characters (`a-z A-Z 0-9 _`), valid email (stored
lowercase), password 8–72 characters. Errors: `400`, `409`.

#### `POST /api/auth/login`

```json
// request
{ "email": "mobina@example.com", "password": "password123" }

// 200 response
{ "user": { "id": 1, "username": "mobina", "email": "mobina@example.com", "created_at": "…" } }
```

Errors: `400`, `401 { "error": "Invalid email or password" }`.

#### `POST /api/auth/logout`

Clears the session cookie. Response: `204 No Content`.

#### `GET /api/auth/me` 🔒

Returns the logged-in user: `200 { "user": { … } }`, or `401`.

### Books

A book object looks like:

```json
{
  "id": 1,
  "user_id": 1,
  "title": "Dune",
  "author": "Frank Herbert",
  "status": "reading",
  "rating": 4,
  "notes": "Slow start, great world-building.",
  "created_at": "2026-03-10T10:00:00.000Z",
  "updated_at": "2026-03-10T10:00:00.000Z"
}
```

Body rules for create/update: `title` and `author` required (1–200 chars,
trimmed); `status` one of `want_to_read | reading | finished` (default
`want_to_read`); `rating` integer 1–5 or `null` (default `null`); `notes` up to
2000 characters (default `""`). `user_id` is always taken from the session and
cannot be set by the client.

#### `GET /api/books` 🔒

Lists the current user's books, newest first.

| query param | description                                                   |
|-------------|---------------------------------------------------------------|
| `search`    | case-insensitive "contains" match on **title or author**      |
| `status`    | `want_to_read`, `reading` or `finished`                       |

Example: `GET /api/books?search=tolkien&status=finished`

```json
// 200 response
{ "books": [ { … }, { … } ] }
```

Errors: `400` for an unknown status.

#### `GET /api/books/stats` 🔒

Dashboard summary for the current user.

```json
{
  "total": 8,
  "wantToRead": 2,
  "reading": 2,
  "finished": 4,
  "recent": [ { …up to 5 most recently added books… } ]
}
```

#### `POST /api/books` 🔒

```json
// request
{ "title": "Dune", "author": "Frank Herbert", "status": "reading", "rating": 4, "notes": "…" }

// 201 response
{ "book": { … } }
```

#### `GET /api/books/:id` 🔒

`200 { "book": { … } }` or `404` if the book does not exist **or belongs to another user**.

#### `PUT /api/books/:id` 🔒

Full update; same body as create. Sets `updated_at`.
`200 { "book": { … } }`, `400`, or `404`.

#### `DELETE /api/books/:id` 🔒

`204 No Content`, or `404`.

### Health

`GET /api/health` → `200 { "status": "ok" }`

---

## Frontend & design system

The interface follows a small, consistent design system ("Paper & Ink"):
warm neutral surfaces, an ink-black primary action, a restrained teal accent,
and colour used *semantically* for status and rating.

- **Tokens** – every colour, size, radius and shadow is a CSS custom property
  in [`frontend/src/styles/tokens.css`](frontend/src/styles/tokens.css).
  Changing the look of the whole app means editing this one file.
- **Typography** – [Inter](https://rsms.me/inter/) for UI text and
  [Literata](https://fonts.google.com/specimen/Literata) for page and book
  titles, both self-hosted through `@fontsource-variable` (no external
  requests).
- **Components** (`components/ui/`) – `Button` (primary / secondary / ghost /
  danger, with loading state), `Field` + inputs with inline errors,
  `ChoiceChips` (status selection and filtering), `StatusBadge`,
  `StarRating` / `StarRatingInput` (mouse + keyboard), `PageHeader`,
  `EmptyState`, `Alert` (with retry), `Skeleton`, `ConfirmDialog` (native
  `<dialog>`), and toasts.
- **Status colours** – Want to Read = amber, Reading = blue, Finished = green,
  always paired with a text label (never colour alone).
- **Book covers** – generated placeholders: the title's initial on one of eight
  muted tones chosen by hashing the title, so every book looks distinct without
  storing images.
- **States** – every data-driven page has a designed loading skeleton, an
  error state with "Try again", and an empty state with a next step
  ("Add your first book", "Clear filters").
- **Responsive** – mobile-first CSS with breakpoints at 640 / 768 / 900 /
  1024 px: stat cards go 2×2 → 4 across, the book grid 1 → 2 → 3 columns, the
  navbar wraps to two rows on small screens, and the login/register page gains
  a side panel on large screens.
- **Accessibility** – semantic landmarks, visible focus rings, labelled form
  fields with `aria-invalid`/`aria-describedby`, a `radiogroup` for chips, a
  `slider` for the rating input, `aria-current` on the active nav link and
  `prefers-reduced-motion` support.

Pages: `/login`, `/register`, `/` (dashboard), `/books`, `/books/new`,
`/books/:id`, `/books/:id/edit`. Logged-out visitors are redirected to
`/login` (and returned to the page they wanted after logging in); logged-in
users visiting `/login` or `/register` are sent to the dashboard.

---

## Scripts reference

Run from the repository root:

| Script                  | What it does                                        |
|-------------------------|-----------------------------------------------------|
| `npm run install:all`   | Install backend and frontend dependencies           |
| `npm run dev`           | Start API (4000) and web app (5173) together        |
| `npm run dev:backend`   | Start only the API (with file watching)             |
| `npm run dev:frontend`  | Start only the Vite dev server                      |
| `npm test`              | Run backend and frontend tests                      |
| `npm run test:backend`  | Backend tests only                                  |
| `npm run test:frontend` | Frontend tests only                                 |
| `npm run test:e2e`      | Playwright end-to-end tests (starts both servers)   |
| `npm run test:e2e:headed` | End-to-end tests with a visible browser           |
| `npm run test:e2e:ui`   | End-to-end tests in Playwright's UI mode            |
| `npm run test:e2e:debug`| End-to-end tests with the step-through inspector    |
| `npm run test:e2e:report` | Open the last HTML report                         |
| `npm run test:all`      | Unit/integration tests, then end-to-end tests       |
| `npm run build`         | Production build of the frontend into `frontend/dist` |
| `npm start`             | Start the API in production mode (serves `dist/`)   |
