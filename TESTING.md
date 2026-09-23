# Running tests locally

Quick reference for getting the app and its Playwright suite running on `localhost`, without touching production.

## 1. Local database (one-time setup, then reused)

```
docker run --name jobtrackr-db -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:16
```

Already created before? Just start it:

```
docker start jobtrackr-db
```

Docker Desktop has to actually be running first (`docker ps` should not error).

## 2. Apply the schema

```
npm run db:migrate
```

Reads `DATABASE_URL` from `.env` (already pointed at `localhost:5433` for local dev). Safe to re-run any time the schema changes — `server/schema.sql` is idempotent.

## 3. Register a local test user (one-time per fresh database)

This local Postgres is a **separate database** from production — the `EMAIL`/`PASSWORD` in `.env` don't exist here until you create them. Either:

- Go to `/register` in the browser and sign up with those exact values, or
- `POST /api/auth/register` with `{ name, email: process.env.EMAIL, password: process.env.PASSWORD }`.

If you skip this, everything that logs in (UI tests via `LoginPage`, API tests via the `apiContext` fixture) will fail with `401`, which cascades into confusing failures everywhere downstream — see the "reading the error" notes below.

## 4. Start the app

```
npm run netlify:dev
```

Serves the full app (frontend + API function) on `http://localhost:8888`.

If you instead run `npm run dev` (bare Vite, usually lands on `5173` or `5174` if `5173`'s taken), it still needs `netlify:dev` running separately in another terminal — Vite's dev server proxies `/api/*` to `:8888` (see `vite.config.ts`), it doesn't serve the API itself.

## 5. Run the tests

```
npm run e2e:local
```

Runs the full suite (`api` + `ui` projects) against `http://localhost:5174` (see the `BASE_URL` env var in `playwright.config.ts` and the `e2e:local` script in `package.json`). Other useful variants:

```
npm run e2e:local -- --project=api                  # API only
npm run e2e:local -- --project=ui -g "test name"     # one test by name
```

**Default `npm run e2e` / `e2e:api` / `e2e:browser` (no `e2e:local`) hit production**, not localhost — `playwright.config.ts`'s `baseURL` falls back to the live site when `BASE_URL` isn't set. Easy to do by accident; worth double-checking which one you meant to run.

**Don't trust a single green run** for anything timing-sensitive (drag-and-drop) or involving random test data (faker-generated enum values) — run it 3-5 times before calling something fixed. A single pass isn't proof; this suite has real history of intermittent failures that only show up over repeated runs.

## 6. Pushing to Netlify / production

- Merging to `main` auto-deploys via Netlify's GitHub integration.
- `.github/workflows/ci.yml` runs on every push/PR to `main`, but **against the live production site** — not a preview, not this branch's actual deployed code. A PR introducing a real feature (new field, new endpoint) will likely fail CI until it's merged, deployed, and (if there's a schema change) migrated — that's expected, not a sign the code is wrong. See `.github/workflows/ci.yml`'s `workflow_dispatch` trigger ("Run workflow" button on the Actions tab) to re-run CI on demand once you believe production is caught up.

## 7. If the feature needs a schema migration

Production's database is **Supabase** (not Neon — README used to say otherwise, fixed). Nothing automates running `server/schema.sql` against it; it has to be done deliberately, once, after the code is deployed:

1. `npx netlify login` (browser auth, one-time) then `npx netlify link --id df76a60d-2073-41b1-b1c1-87bbe8bc66ea` (one-time per machine).
2. Pull the real `DATABASE_URL` into a temp file, never displayed: `npx netlify env:get DATABASE_URL > .env.migrate.tmp`.
3. That file needs to be in `KEY=value` format (`netlify env:get` prints just the bare value) — prepend `DATABASE_URL=` to it before use.
4. Run `node --env-file=.env.migrate.tmp scripts/migrate.mjs` — look for `Applied schema.sql to the database.`
5. **Delete `.env.migrate.tmp` immediately after**, every time. Never commit it, never paste a raw connection string or password into chat.
6. Verify directly against the live API afterward (e.g. create something through `/api/...` and confirm the new field round-trips) rather than assuming it worked.

This is real production data — treat it with more care than the local Docker database, migration or not.

## Git workflow

- Never push new commits to a branch whose PR has already merged — cut a fresh branch off the latest `main` instead, even for a one-line fix.
- `deleteBranchOnMerge` is enabled on this repo — merged branches clean themselves up automatically.
