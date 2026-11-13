# MADHU SMRUTI (ମଧୁ ସ୍ମୃତି)

A memorial web application for **MDRAFM**.

Full-stack monorepo: **React + TypeScript + Vite** frontend, **Node.js + Express + TypeScript** backend, **Neon PostgreSQL** with **Drizzle ORM**, **Tiptap** rich text editing, and **ImageKit** image storage.

> Status: backend API complete (all public + admin endpoints, tested); frontend submission flow wired.

---

## Repository Layout

```
.
├── frontend/     React SPA (deployed to Vercel)
├── backend/      Express REST API (deployed to Render)
└── README.md
```

## Tech Stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Lucide |
| Editor    | Tiptap (`@tiptap/react` + `@tiptap/starter-kit`)                   |
| Backend   | Node.js, Express 5, TypeScript, Zod (validation), JWT + bcrypt (auth) |
| Database  | Neon PostgreSQL via Drizzle ORM (`@neondatabase/serverless`, WebSocket driver) |
| Images    | ImageKit (`@imagekit/nodejs`)                                      |
| Security  | Helmet, CORS allow-list, rate limiting, HTTP-only cookies + CSRF    |
| Testing   | Vitest + Supertest (28 integration tests against Neon)              |
| Quality   | ESLint (typescript-eslint), Prettier                               |
| Deploy    | Vercel (frontend), Render (backend), GitHub (source control)       |

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A [Neon](https://neon.tech) PostgreSQL connection string (optional during scaffold)
- An [ImageKit](https://imagekit.io) account (optional until image uploads are used)

## Getting Started

```bash
# 1. Install dependencies
cd backend  && npm install
cd frontend && npm install

# 2. Configure environment
cp backend/.env.example  backend/.env    # fill in values as available
cp frontend/.env.example frontend/.env

# 3. Run development servers (in separate terminals)
cd backend  && npm run dev    # http://localhost:5000
cd frontend && npm run dev    # http://localhost:5173

# 4. Verify
curl http://localhost:5000/api/v1/health
```

## Scripts

### Backend (`backend/`)

| Script                | Description                                |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Dev server with auto-reload (tsx watch)    |
| `npm run build`       | Compile TypeScript to `dist/`              |
| `npm start`           | Run compiled server (`node dist/index.js`) |
| `npm test`            | Vitest integration tests (needs `DATABASE_URL`; skipped without it) |
| `npm run typecheck`   | Type-check without emitting                |
| `npm run lint`        | ESLint                                     |
| `npm run format`      | Prettier write                             |
| `npm run db:generate` | Drizzle: generate migrations               |
| `npm run db:migrate`  | Drizzle: apply migrations to Neon          |
| `npm run db:push`     | Drizzle: push schema directly to Neon      |
| `npm run db:studio`   | Drizzle Studio                             |
| `npm run db:seed`     | Seed first admin (see Database section)    |

### Frontend (`frontend/`)

| Script               | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Vite dev server (port 5173)     |
| `npm run build`      | Type-check + production build   |
| `npm run preview`    | Preview production build        |
| `npm run typecheck`  | TypeScript check                |
| `npm run lint`       | ESLint                          |
| `npm run format`     | Prettier write                  |

## Architecture

```
Browser ── Axios ──▶ Express API (/api and /api/v1)
                      ├── modules/        feature modules (routes/controller/service/validator)
                      │   ├── auth/         JWT sessions, edit tokens, CSRF, ImageKit signing
                      │   ├── contributors/ contributor registration (upsert on phone)
                      │   ├── submissions/  draft lifecycle, edit-token access, finalize
                      │   ├── writeups/     Tiptap content (JSONB + HTML snapshot)
                      │   ├── paintings/    image references (ImageKit URL + fileId)
                      │   ├── uploads/      /image (server-side) + /sign (client-side auth)
                      │   ├── admin/        login, dashboard, list, detail, status, CSV export
                      │   └── health/       service + DB health
                      ├── middleware/     errors, Zod validation, rate limiting, logging
                      ├── config/         env, Drizzle (Neon WebSocket), ImageKit
                      └── db/schema/      Drizzle table definitions
```

The API responds with a consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "..." }
```

### Endpoints

Every route is mounted at both `/api/...` (canonical) and `/api/v1/...`.
Full request/response documentation: **[backend/docs/API.md](backend/docs/API.md)**.

| Method | Path                              | Auth              | Description                                        |
| ------ | --------------------------------- | ----------------- | -------------------------------------------------- |
| GET    | `/api/health`                     | —                 | Health check (service, DB, ImageKit, uptime)       |
| POST   | `/api/contributors`               | —                 | Register contributor (upsert on phone)             |
| POST   | `/api/submissions`                | —                 | Create draft (returns one-time edit token)         |
| GET    | `/api/submissions/:id`            | Edit token 🔒     | Submission detail (private)                        |
| PUT    | `/api/submissions/:id`            | Edit token 🔒     | Update draft (drafts only)                         |
| POST   | `/api/submissions/:id/finalize`   | Edit token 🔒     | Draft → submitted (transactional)                  |
| POST   | `/api/submissions/:id/resume`     | Edit token 🔒     | Issue 15-min edit session                          |
| POST   | `/api/uploads/sign`               | —                 | ImageKit client-side upload authorization          |
| POST   | `/api/uploads/image`              | —                 | Server-side image upload (multipart, 5 MB max)     |
| POST   | `/api/admin/login`                | —                 | Admin login (sets HTTP-only + CSRF cookies)        |
| POST   | `/api/admin/logout`               | Session + CSRF 🔐 | Clear session cookies                              |
| GET    | `/api/admin/dashboard`            | Session 🔐        | Dashboard statistics                               |
| GET    | `/api/admin/submissions`          | Session 🔐        | Paginated, filterable list                         |
| GET    | `/api/admin/submissions/:id`      | Session 🔐        | Submission detail incl. history                    |
| PATCH  | `/api/admin/submissions/:id/status`| Session + CSRF 🔐| Approve / reject / under review / reopen as draft  |
| GET    | `/api/admin/export`               | Session 🔐        | CSV export                                         |

## Database

Schema lives in `backend/src/db/schema/` (one file per table + relations). Migrations live in `backend/drizzle/`.

```
contributors ──< submissions ─── 1 │ writeup_contents   (Tiptap JSONB + HTML snapshot)
               │            ├──< submission_images  (ImageKit URL + fileId only)
               │            └──< submission_history (audit trail)
admins
```

All tables use UUID primary keys. Enums enforce submission type / language / status.
`reference_number` and admin `email` are unique. Image binaries live in ImageKit, never in PostgreSQL.

### Applying migrations to Neon

```bash
# 1. Put your Neon connection string in backend/.env (never commit it)
#    DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/madhu_smruti?sslmode=require

# 2. Apply migrations
npm run db:migrate

# 3. Seed the first admin (values come from backend/.env)
#    ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:seed
```

## Environment Variables

### Backend (`backend/.env`)

| Variable                 | Required | Description                                          |
| ------------------------ | -------- | ---------------------------------------------------- |
| `NODE_ENV`               | Yes      | `development` \| `test` \| `production`               |
| `PORT`                   | Yes      | Server port (default 5000)                           |
| `CORS_ORIGIN`            | Yes      | Comma-separated allowed origins                      |
| `DATABASE_URL`           | Yes      | Neon PostgreSQL connection string (WebSocket driver) |
| `ADMIN_JWT_SECRET`       | Prod     | ≥ 32 chars; signs admin sessions + edit sessions (dev fallback used in development) |
| `IMAGEKIT_PRIVATE_KEY`   | Uploads  | Server-side uploads + `/uploads/sign` (uploads disabled → 503 without it) |
| `IMAGEKIT_PUBLIC_KEY`    | Uploads  | Returned to clients by `/uploads/sign`               |
| `IMAGEKIT_URL_ENDPOINT`  | Uploads  | Returned to clients by `/uploads/sign`               |
| `ADMIN_NAME`             | Seeding  | First admin name (`db:seed`)                         |
| `ADMIN_EMAIL`            | Seeding  | First admin email (unique)                           |
| `ADMIN_PASSWORD`         | Seeding  | First admin password (min 8 chars)                   |

### Frontend (`frontend/.env`)

| Variable            | Description                              |
| ------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL` | Backend base URL, e.g. `http://localhost:5000/api/v1` |

## Security Model

- **Edit tokens**: 256-bit random tokens issued once at draft creation; only their SHA-256 hash is stored, compared timing-safely. Access via `X-Edit-Token` header or `?token=`. A contributor's **phone number alone never grants access** to a private submission.
- **Edit sessions**: `POST /resume` exchanges a raw token for a 15-minute JWT bound to a single submission.
- **Final submissions** are immutable to contributors; an admin must reopen them (`PATCH .../status` → `draft`).
- **Admin auth**: bcrypt (cost 12), JWT session in an HTTP-only `admin_session` cookie (SameSite=Strict, 8 h) + double-submit CSRF (`admin_csrf` cookie echoed in `X-CSRF-Token` on mutations). Login rate-limited 30/15 min.
- **Global hardening**: Helmet headers, CORS allow-list with credentials, Zod validation on all inputs, rate limiting (global 600/15 min), centralized error handler (no stack traces in production), 5 MB upload cap, images by reference only (no binaries in the DB).
- **Transactions**: finalize and admin status changes update state + write the audit entry atomically.

## Deployment

### Frontend → Vercel

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build`, Output: `dist`.
4. Add env var `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api/v1`.

### Backend → Render

1. Create a **Web Service** from the GitHub repository.
2. Set **Root Directory** to `backend`.
3. Build command: `npm install && npm run build`, Start command: `npm start`.
4. Add all backend environment variables (including `CORS_ORIGIN` pointing at the Vercel domain).

## Source Control

```bash
git init
git add .
git commit -m "chore: project scaffold for MADHU SMRUTI (MDRAFM)"
# create a GitHub repository, then:
git remote add origin git@github.com:<org>/madhu-smruti.git
git push -u origin main
```
