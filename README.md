# CourseCraft

CourseCraft is a full-stack course generation platform that lets instructors describe the course they want and get AI-generated modules, lessons, and quizzes. The backend orchestrates a Creator/Reviewer LLM workflow via Celery tasks and streams real-time progress over WebSockets, while the React frontend offers a modern authoring experience with editing, publishing, and regeneration tools.

## Features

- AI-powered course, module, and quiz generation using a Creator/Reviewer pattern with optional revision passes
- Manual course management: CRUD for courses, modules, lessons, and quiz questions with draft/published workflows
- Real-time status updates over Django Channels WebSockets for long-running generation jobs
- Token-based authentication with protected routes on the frontend and Axios interceptors for automatic token handling
- Pagination, filtering, sorting, and search across the course catalog plus regeneration flows with user feedback

## Tech Stack

- **Backend**: Django 5, Django REST Framework, Celery, Django Channels, LangChain, PostgreSQL, Redis
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS, React Router, Axios
- **Tooling**: Poetry for Python dependency management, npm/vite for the frontend, Redis for Celery + Channels

## Repository Layout

```
CourseCraft/
├── backend/      # Django project (`config`, `courses`, `users`, `ai_generation` apps)
├── frontend/     # React SPA built with Vite and Tailwind CSS
├── README.md     # This file
├── .gitignore    # Git ignore rules
```

## Architecture Overview

```
            Browser (http://localhost:8080)
                       │
                       ▼
                ┌────────────┐
                │   Nginx    │ Reverse proxy
                └────┬───────┘
          static /    │    \  /api,/ws
        ┌─────────┐   │     ┌────────────┐
        │ Frontend│◄──┘     │  Backend   │ (ASGI + Celery)
        │ (Nginx) │         └────┬───────┘
        └─────────┘              │
                                  ▼
                         ┌────────────┐
                         │ PostgreSQL │
                         └────────────┘
                         ┌────────────┐
                         │   Redis    │ (Celery + Channels)
                         └────────────┘
```

- **backend**: Django ASGI app served by Gunicorn+Uvicorn, exposes REST + WebSockets.
- **celery**: Worker that executes generation tasks; shares the exact code volume with `backend` for hot reload.
- **frontend**: Static React bundle (Nginx) that Nginx proxies to; optional `frontend-dev` profile runs the Vite dev server.
- **nginx**: Edge proxy that exposes a single public port, forwards `/api` + `/ws` to backend, and all other paths to the SPA.
- **db / redis**: Stateful services with dedicated named volumes.

## Environment Variables

Copy `.env.example` to `.env` at the repo root and customize as needed:

```bash
cp .env.example .env
```

Key values (all of them ship with sensible defaults in the example file):

| Variable                 | Purpose                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SECRET_KEY`             | Django secret; change before deploying.                                                                                                           |
| `DEBUG`                  | Turns on Django debug features inside the container.                                                                                              |
| `DJANGO_DEV_SERVER`      | Forces `manage.py runserver` + hot reload when set to `1`. Leave `0` for production (Gunicorn).                                                   |
| `POSTGRES_*` + `DB_*`    | Database credentials shared by Django and Postgres.                                                                                               |
| `REDIS_URL` / `CELERY_*` | Broker/result URLs for Celery + Channels.                                                                                                         |
| `OPENAI_API_KEY`         | Used by the LangChain creator/reviewer agents.                                                                                                    |
| `VITE_API_BASE_URL`      | API base URL baked into the frontend during `npm run build` (use `/api` when running behind Nginx, or `http://localhost:8000/api` for local dev). |
| `VITE_WS_BASE_URL`       | WebSocket base URL (`ws://localhost:8080/ws` for Docker, `ws://localhost:8000/ws` locally).                                                       |

The backend-specific sample (`backend/.env.example`) is still available if you prefer running Django outside Docker.

## Quick Start (Docker Compose)

1. **Bootstrap environment**

   ```bash
   cp .env.example .env
   ```

   Adjust credentials/keys, then (optionally) set `DJANGO_DEV_SERVER=1` if you want Django's auto-reload instead of Gunicorn.

2. **Build and run the full stack**

   ```bash
   docker compose up --build
   ```

   The following endpoints become available:

   - App UI: `http://localhost:8080`
   - Direct Django API (if needed): `http://localhost:8000`
   - Postgres: `localhost:5435`
   - Redis: `localhost:6379`

3. **Create your first superuser** (only once)

   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

4. **Watch logs / tail workers**
   ```bash
   docker compose logs -f backend
   docker compose logs -f celery
   ```

### Hot Reload Profile

- Keep `backend` + `celery` services mounted to `./backend` for instant reloads when `DJANGO_DEV_SERVER=1`.
- For live React edits, launch the dev profile which runs `npm run dev` inside a lightweight Node container tied to your local source:
  ```bash
  docker compose --profile dev up frontend-dev
  ```
  Visit `http://localhost:5173`; API/websocket calls still proxy through the same backend.

Tear everything down with `docker compose down -v` when you're done.

## Prerequisites

Make sure the following are installed locally:

- Python **3.11**
- [Poetry](https://python-poetry.org/) **1.7+**
- Node.js **18+** (project developed with Node 20)
- npm **10+** (or pnpm/yarn if you prefer)
- PostgreSQL **14+** with a reachable database user
- Redis **6+** (used by Celery and Django Channels)
- An OpenAI (or other supported LLM) API key for AI generation

> Tip: On macOS you can install Postgres + Redis using Homebrew (`brew install postgresql@14 redis`). Remember to have both services running before you start the app.

## Backend Setup (Django + Celery)

1. **Install dependencies**

   ```bash
   cd backend
   poetry install
   ```

2. **Create the environment file** `backend/.env` (Poetry automatically reads it through `python-decouple`). Adjust values to match your local credentials:

   ```ini
   SECRET_KEY=django-insecure-dev-key
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1

   DB_NAME=coursecraft_db
   DB_USER=coursecraft_user
   DB_PASSWORD=coursecraft_pass
   DB_HOST=localhost
   DB_PORT=5432

   CORS_ALLOWED_ORIGINS=http://localhost:5173

   CELERY_BROKER_URL=redis://localhost:6379/0
   CELERY_RESULT_BACKEND=redis://localhost:6379/0
   REDIS_URL=redis://localhost:6379/0

   OPENAI_API_KEY=sk-your-key
   # Optional: other provider keys (ANTHROPIC_API_KEY, GOOGLE_API_KEY, etc.)
   ```

3. **Provision the Postgres database** (example using psql; replace credentials as needed):

   ```bash
   createuser coursecraft_user --pwprompt
   createdb coursecraft_db --owner coursecraft_user
   ```

4. **Apply migrations and create a superuser**

   ```bash
   poetry run python manage.py migrate
   poetry run python manage.py createsuperuser
   ```

5. **Run the Django API/Channels server (ASGI)**

   ```bash
   poetry run python manage.py runserver
   ```

   The API is available at `http://localhost:8000/api`, and WebSockets share the same origin at `/ws/...`.

6. **Start the Celery worker** (required for course generation jobs):
   ```bash
   poetry run celery -A config worker -l info
   ```
   Keep this process running alongside the Django server. Celery reads the same `.env` file so Redis/Postgres credentials stay in sync.

## Frontend Setup (React + Vite)

1. **Install dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Configure frontend environment variables** in `frontend/.env.local` (Vite automatically loads this file):

   ```ini
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_WS_BASE_URL=ws://localhost:8000/ws
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Vite serves the app at `http://localhost:5173`. The dev server proxies API calls to the backend base URL you configured.

## Running the Full Stack Locally

Open three terminal tabs/windows:

1. **Postgres + Redis** running locally (via services or Docker)
2. **Backend**
   ```bash
   cd backend
   poetry run python manage.py runserver
   ```
3. **Celery Worker**
   ```bash
   cd backend
   poetry run celery -A config worker -l info
   ```
4. **Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

Navigate to `http://localhost:5173` to log in (use the superuser you created) and start generating courses. The frontend automatically opens a WebSocket connection (`ws://localhost:8000/ws/generation/<course_id>/`) to stream task progress.

## Testing & Quality Checks

- **Backend unit tests**
  ```bash
  cd backend
  poetry run python manage.py test
  ```
- **Frontend linting**
  ```bash
  cd frontend
  npm run lint
  ```
- **Formatting (optional)**
  ```bash
  cd frontend
  npm run format
  ```

## Troubleshooting

- **Celery cannot connect to Redis**: make sure Redis is running and the `CELERY_BROKER_URL`/`REDIS_URL` values point to the correct host/DB.
- **CORS/CSRF errors**: ensure `CORS_ALLOWED_ORIGINS` in `backend/.env` includes the exact scheme + port used by Vite (e.g., `http://localhost:5173`).
- **WebSocket auth issues**: the frontend appends `?token=<auth_token>` automatically. Verify that your token is still valid and that the user is authenticated.
- **LLM errors or empty responses**: confirm the API key you supplied has access to the requested model. For development you can stub responses by adjusting the AI services in `backend/ai_generation/`.

## Next Steps

- Seed sample data via Django admin to explore the UI faster
- Configure additional LLM providers by adding keys to the environment and enabling them in the admin (`LLMConfig` model)
- Deploy the Docker Compose stack to a remote host (Fly.io, Render, ECS, etc.) and plug in production secrets

## API Reference

### Authentication

| Method | Endpoint            | Purpose               |
| ------ | ------------------- | --------------------- |
| `POST` | `/api/auth/login/`  | Obtain auth token.    |
| `POST` | `/api/auth/logout/` | Revoke current token. |
| `GET`  | `/api/auth/user/`   | Current user info.    |

### Courses & Publishing

| Method   | Endpoint                       | Notes                                       |
| -------- | ------------------------------ | ------------------------------------------- |
| `POST`   | `/api/courses/`                | Create a course and kick off AI generation. |
| `GET`    | `/api/courses/`                | List with search, pagination, filters.      |
| `GET`    | `/api/courses/{id}/`           | Course detail (nested modules/quiz).        |
| `PATCH`  | `/api/courses/{id}/`           | Update title/description/status fields.     |
| `DELETE` | `/api/courses/{id}/`           | Remove course + related content.            |
| `POST`   | `/api/courses/{id}/publish/`   | Draft → Published.                          |
| `POST`   | `/api/courses/{id}/unpublish/` | Published → Draft.                          |

### Regeneration

| Method | Endpoint                                            | Body                              |
| ------ | --------------------------------------------------- | --------------------------------- |
| `POST` | `/api/courses/{id}/modules/{module_id}/regenerate/` | `{ "feedback": "optional text" }` |
| `POST` | `/api/courses/{id}/quiz/regenerate/`                | `{ "feedback": "optional text" }` |

### Quiz & Questions

| Method   | Endpoint                            | Purpose                        |
| -------- | ----------------------------------- | ------------------------------ |
| `POST`   | `/api/courses/{id}/quiz/questions/` | Add question + answers.        |
| `GET`    | `/api/courses/{id}/quiz/questions/` | List questions for a course.   |
| `PATCH`  | `/api/questions/{id}/`              | Edit an existing question.     |
| `DELETE` | `/api/questions/{id}/`              | Remove a question and answers. |

### Generation Tasks

| Method | Endpoint                           | Purpose                                        |
| ------ | ---------------------------------- | ---------------------------------------------- |
| `GET`  | `/api/generation-tasks/{task_id}/` | Poll the status/progress of a background task. |

## WebSocket Messages

- Connect via `ws://localhost:8080/ws/generation/{course_id}/?token=<auth_token>` when running in Docker (or `ws://localhost:8000/...` locally).
- Message payload:

```json
{
	"type": "generation_status",
	"data": {
		"status": "running",
		"stage": "reviewing",
		"progress": 66,
		"message": "Reviewing content..."
	}
}
```

`stage` cycles through `creating`, `reviewing`, `refining`, and `completed`. When `status` becomes `completed` (or `failed`) the Celery task updates the database and the frontend refreshes automatically.
