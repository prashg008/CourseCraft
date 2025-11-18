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
- Containerize the stack with Docker Compose for a production-like setup (Redis, Postgres, backend, frontend, Nginx)
