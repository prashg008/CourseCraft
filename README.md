# CourseCraft

CourseCraft is an AI-assisted course authoring platform. The backend is built with NestJS, TypeORM, LangChain, and PostgreSQL; the frontend is a React + Vite SPA styled with Tailwind. This repository now ships with production-ready Docker images plus a `docker-compose.yml` that ties the stack together.

## Highlights

- AI-powered creator/reviewer pipeline for generating modules, lessons, and quizzes
- Manual editing workflows with pagination, filtering, and publishing states
- JWT authentication with Axios interceptors and guarded NestJS routes
- Real-time websocket updates for long-running generation tasks
- Single command Docker workflow for local development or demos

## Tech Stack

- **Backend**: NestJS 11, TypeORM, PostgreSQL, LangChain, Passport JWT, Socket.IO
- **Frontend**: React 19, Vite 7, TypeScript, Tailwind CSS, React Router
- **Infra**: Node 20, Docker, Docker Compose, Postgres 16

## Project Layout

```
CourseCraft/
├── backend/        # NestJS API, WebSockets, AI orchestration
├── frontend/       # React SPA (Vite)
├── docs/           # Reference material
├── docker-compose.yml
└── README.md
```

## Run with Docker Compose

1. Copy the example environment file (this single `.env` powers both Docker Compose and the backend container) and adjust credentials/API keys as needed:

   ```bash
   cp .env.example .env
   ```

2. Build the images and start every service (Postgres, backend, frontend). Add `-d` if you prefer detached mode:

   ```bash
   docker compose up --build
   ```

   - Frontend UI: `http://localhost:4173`
   - Backend REST + Swagger: `http://localhost:3000/api` and `/api/docs`
   - PostgreSQL: `localhost:${DATABASE_HOST_PORT:-5435}`

3. Confirm the stack is healthy and inspect logs as needed:

   ```bash
   docker compose ps
   docker compose logs -f backend   # follow API logs
   docker compose logs -f frontend  # follow nginx logs
   docker compose logs -f db        # optional: database startup/seed info
   ```

4. Stop or clean up when you're done:

   ```bash
   docker compose down              # stop containers
   docker compose down -v           # stop + remove the Postgres volume
   docker compose down -v --rmi all # full reset (images + data)
   ```

5. Need to restart just one service after code changes? Rebuild that image and let Compose recreate it automatically:

   ```bash
   docker compose build backend
   docker compose up backend
   ```

### Services

| Service    | Ports (host → container)             | Description                                       |
| ---------- | ------------------------------------ | ------------------------------------------------- |
| `db`       | `${DATABASE_HOST_PORT:-5435} → 5432` | PostgreSQL 16 with a named `postgres_data` volume |
| `backend`  | `${BACKEND_PORT:-3000} → 3000`       | NestJS API built from `backend/Dockerfile`        |
| `frontend` | `${FRONTEND_PORT:-4173} → 80`        | Nginx container serving the Vite build            |

The frontend build arguments `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` default to `http://backend:3000/api` and `ws://backend:3000`, so containers can talk over the Compose network without extra configuration.

## Environment Variables

- The root `.env` (based on `.env.example`) feeds both Docker Compose and the backend container.
- `DATABASE_*` values configure the Postgres container and are reused by TypeORM.
- `BACKEND_DATABASE_HOST` / `BACKEND_DATABASE_PORT` override the in-container connection target (defaults to `db:5432`).
- `FRONTEND_ALLOW_ORIGIN` defines the `Access-Control-Allow-Origin` header served by nginx (defaults to `*`).
- Update `OPENAI_API_KEY` (and optionally `GEMINI_API_KEY`) with a real key before using AI generation.
- `CORS_ORIGIN` / `SOCKET_IO_CORS_ORIGIN` should match the URL you open in the browser (defaults to `http://localhost:4173`).
- `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` are compile-time values consumed by Vite during `npm run build`.

For local-only experiments, you can still use `backend/.env.example` and `frontend/.env.example` separately, but keeping everything in the root `.env` simplifies Docker usage.

## Local (non-Docker) Development

### Backend

```bash
cd backend
npm install
cp .env.example .env  # if you have not already
npm run start:dev
```

- API base URL: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/api/docs`
- Runs with file watching via `ts-node` and Nest CLI.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # sets VITE_* defaults
npm run dev
```

- Dev server: `http://localhost:5173`
- Update `VITE_API_BASE_URL` to match however you run the backend locally.

### Run the entire stack locally

If you want to run both apps without Docker, keep the backend and frontend processes in separate terminals (or use a process manager like `npm-run-all`). From the repo root you can launch each side without changing directories:

```bash
# Terminal 1: start the API + websockets
npm --prefix backend install
cp backend/.env.example backend/.env  # required once
npm --prefix backend run start:dev

# Terminal 2: start the Vite dev server
npm --prefix frontend install
cp frontend/.env.example frontend/.env  # required once
npm --prefix frontend run dev
```

Keep both terminals open while developing; changes in either app hot-reload automatically. Point the frontend to `http://localhost:3000/api` (default) so UI requests hit the local backend.

## Useful Docker Commands

- `docker compose build backend` – rebuild only the backend image after code changes
- `docker compose up frontend --build` – rebuild and start just the frontend
- `docker compose exec backend npm run migration:run` – run TypeORM migrations inside the container
- `docker compose logs -f db` – inspect Postgres output/healthcheck state

## Troubleshooting

- **Backend exits immediately**: confirm `DATABASE_HOST`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD` match the Postgres container values.
- **Frontend cannot reach the API**: ensure `VITE_API_BASE_URL` was set to `http://backend:3000/api` at build time (clean `frontend/dist` and rebuild the image if you change it).
- **Migrations fail on first run**: delete the `postgres_data` volume (`docker compose down -v`), then spin the stack up again so the schema is recreated from scratch.
- **AI provider errors**: double-check that the relevant API key env var is non-empty; most providers reject the default placeholder key immediately.

## Development Status

- Branch: `node-implementation`
- Containers: `frontend`, `backend`, `db`
- Compose file: `docker-compose.yml`

Feel free to extend the stack (e.g., add Redis, workers, or a reverse proxy) by creating additional services in the same Compose file.
