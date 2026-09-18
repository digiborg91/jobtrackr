# JobTrackr

A personal job-application tracker (Kanban board: Wishlist → Applied → Interviewing → Offer → Rejected), built as a practice project for automation testing: a real REST API to write Playwright API tests against, and a real UI to write Playwright UI tests against, wired into a GitHub Actions CI/CD pipeline that runs on every push and pull request.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind + Radix-based UI components, TanStack Query, React Hook Form + Zod, `@dnd-kit` (keyboard-operable drag-and-drop).
- **Backend:** Express app wrapped as a single Netlify Function (`netlify/functions/api.ts`), exposed at `/api/*`.
- **Database:** Postgres (Neon free tier in production; any local/Docker Postgres for development), plain SQL via `pg` — no ORM.
- **Auth:** email/password, JWT in an httpOnly cookie.
- **Tests:** Playwright — API tests (`tests/api`) and UI tests (`tests/ui`).

## Local setup

1. **Get a Postgres database.** Either:
   - Run one locally/in Docker: `docker run --name jobtrackr-db -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:16`, then use `postgres://postgres:postgres@localhost:5433/postgres` (port 5433 avoids clashing with a native Postgres install already using 5432), or
   - Create a free [Neon](https://neon.tech) project and copy its connection string.
2. **Configure environment variables:**
   ```
   cp .env.example .env
   ```
   Fill in `DATABASE_URL` and a random `JWT_SECRET`.
3. **Install dependencies:**
   ```
   npm install
   ```
4. **Apply the database schema:**
   ```
   npm run db:migrate
   ```
5. **Run the full stack** (frontend + API functions together, via Netlify Dev):
   ```
   npm run netlify:dev
   ```
   The app is served at `http://localhost:8888`.

## Running tests

```
npm test              # everything (api + ui)
npm run test:api      # API tests only
npm run test:ui       # UI tests only
npm run test:report   # open the HTML report from the last run
```

Playwright's `webServer` config starts `netlify dev` automatically, so `npm test` works standalone as long as `.env` is configured.

## Deployment

Netlify's GitHub integration handles deploys: connect this repo in the Netlify dashboard, set `DATABASE_URL` and `JWT_SECRET` as site environment variables (pointing at your production Neon database), and every push to `main` deploys automatically, with a Deploy Preview generated for every pull request.

GitHub Actions (`.github/workflows/ci.yml`) runs the full Playwright suite against a throwaway Postgres service container on every push and pull request, independent of the production database.
