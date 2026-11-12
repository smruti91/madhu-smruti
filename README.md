# MADHU SMRUTI (ମଧୁ ସ୍ମୃତି)

A memorial web application for **MDRAFM**.

Full-stack monorepo: **React + TypeScript + Vite** frontend, **Node.js + Express + TypeScript** backend, **Neon PostgreSQL** with **Drizzle ORM**, **Tiptap** rich text editing, and **Cloudinary** image storage.

> Status: project scaffold only — business functionality is not implemented yet.

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
| Backend   | Node.js, Express, TypeScript, Zod (validation)                     |
| Database  | Neon PostgreSQL via Drizzle ORM (`@neondatabase/serverless`)       |
| Images    | Cloudinary                                                        |
| Quality   | ESLint (typescript-eslint), Prettier                               |
| Deploy    | Vercel (frontend), Render (backend), GitHub (source control)       |

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A [Neon](https://neon.tech) PostgreSQL connection string (optional during scaffold)
- A [Cloudinary](https://cloudinary.com) account (optional during scaffold)

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
| `npm run typecheck`   | Type-check without emitting                |
| `npm run lint`        | ESLint                                     |
| `npm run format`      | Prettier write                             |
| `npm run db:generate` | Drizzle: generate migrations               |
| `npm run db:push`     | Drizzle: push schema to Neon               |
| `npm run db:studio`   | Drizzle Studio                             |

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
Browser ── Axios ──▶ Express API (/api/v1)
                     ├── routes/         URL → controller wiring
                     ├── controllers/    request/response handling
                     ├── services/       business logic
                     ├── middleware/     errors, validation, logging
                     ├── validators/     Zod schemas
                     ├── config/         env, Drizzle (Neon), Cloudinary
                     └── db/schema/      Drizzle table definitions
```

The API responds with a consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "..." }
```

### Endpoints

| Method | Path                | Description                              |
| ------ | ------------------- | ---------------------------------------- |
| GET    | `/api/v1/health`    | Health check (service, env, uptime, DB)  |

## Environment Variables

### Backend (`backend/.env`)

| Variable                 | Required | Description                                |
| ------------------------ | -------- | ------------------------------------------ |
| `NODE_ENV`               | Yes      | `development` \| `test` \| `production`     |
| `PORT`                   | Yes      | Server port (default 5000)                 |
| `CORS_ORIGIN`            | Yes      | Comma-separated allowed origins            |
| `DATABASE_URL`           | Later    | Neon PostgreSQL connection string          |
| `CLOUDINARY_CLOUD_NAME`  | Later    | Cloudinary cloud name                      |
| `CLOUDINARY_API_KEY`     | Later    | Cloudinary API key                         |
| `CLOUDINARY_API_SECRET`  | Later    | Cloudinary API secret                      |

### Frontend (`frontend/.env`)

| Variable            | Description                              |
| ------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL` | Backend base URL, e.g. `http://localhost:5000/api/v1` |

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
