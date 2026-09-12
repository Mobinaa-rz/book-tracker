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
npm test                 # backend + frontend
npm run test:backend     # API tests (Vitest + Supertest, in-memory SQLite)
npm run test:frontend    # component/page tests (Vitest + React Testing Library)
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
| `npm run build`         | Production build of the frontend into `frontend/dist` |
| `npm start`             | Start the API in production mode (serves `dist/`)   |
