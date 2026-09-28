// Brings up the whole local stack: Docker, Postgres, schema, both dev servers,
// and the .env test user. Safe to re-run - anything already up is left alone.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logDir = path.join(root, ".local-dev");
const CONTAINER = "jobtrackr-db";
const APP_URL = "http://localhost:8888";
const VITE_URL = "http://localhost:5174";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const step = (msg) => console.log(`\n> ${msg}`);
const sh = (cmd, opts = {}) => spawnSync(cmd, { shell: true, cwd: root, encoding: "utf8", timeout: 60_000, ...opts });

async function waitFor(label, check, timeoutMs, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

// A half-started Docker Desktop can make `docker ps` block, so keep this short.
const dockerUp = () => sh("docker ps", { timeout: 15_000 }).status === 0;

async function isUp(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
}

async function ensureDocker() {
  if (dockerUp()) return console.log("Docker engine already running.");

  const exe = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
  if (process.platform === "win32" && existsSync(exe)) {
    spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    sh("open -a Docker");
  } else {
    throw new Error("Docker isn't running. Start it, then re-run this.");
  }
  console.log("Starting Docker Desktop (this can take a minute or two)...");
  await waitFor("the Docker engine", dockerUp, 4 * 60_000, 5000);
}

async function ensureDatabase() {
  const listed = sh(`docker ps -a --filter name=${CONTAINER} --format "{{.Names}}"`);
  if (listed.status !== 0) throw new Error("Couldn't list Docker containers - is Docker Desktop fully started?");
  const names = listed.stdout.split(/\r?\n/);
  if (!names.includes(CONTAINER)) {
    console.log("No database container yet - creating it.");
    const created = sh(`docker run --name ${CONTAINER} -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:16`, { timeout: 5 * 60_000 }); // first run pulls the image
    if (created.status !== 0) throw new Error(`Couldn't create the container:\n${created.stderr}`);
  } else {
    sh(`docker start ${CONTAINER}`);
  }
  await waitFor("Postgres", () => sh(`docker exec ${CONTAINER} pg_isready -U postgres`).status === 0, 60_000, 2000);
  console.log("Postgres is ready.");
}

function migrate() {
  const result = sh("npm run db:migrate", { stdio: "inherit", timeout: 2 * 60_000 });
  if (result.status !== 0) throw new Error("Schema migration failed.");
}

function startDetached(name, cmd) {
  mkdirSync(logDir, { recursive: true });
  const log = openSync(path.join(logDir, `${name}.log`), "a");
  spawn(cmd, { shell: true, cwd: root, detached: true, stdio: ["ignore", log, log], windowsHide: true }).unref();
}

async function ensureServer(name, url, cmd, timeoutMs) {
  if (await isUp(url)) return console.log(`${name} already running at ${url}`);
  startDetached(name, cmd);
  console.log(`Starting ${name} (log: .local-dev/${name}.log)...`);
  try {
    await waitFor(name, () => isUp(url), timeoutMs);
  } catch (err) {
    throw new Error(`${err.message} Check .local-dev/${name}.log for the reason.`);
  }
  console.log(`${name} is up at ${url}`);
}

async function ensureTestUser() {
  const { EMAIL, PASSWORD } = process.env;
  if (!EMAIL || !PASSWORD) return console.log("EMAIL/PASSWORD not in .env - skipping the test user check.");

  const post = (route, body) =>
    fetch(`${APP_URL}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

  if ((await post("/api/auth/login", { email: EMAIL, password: PASSWORD })).ok) {
    return console.log("The .env test user can log in.");
  }
  const registered = await post("/api/auth/register", { name: "QA Local", email: EMAIL, password: PASSWORD });
  console.log(registered.ok ? "Registered the .env test user in the local database." : `Couldn't register the test user (HTTP ${registered.status}).`);
}

try {
  step("Docker");
  await ensureDocker();
  step("Database");
  await ensureDatabase();
  step("Schema");
  migrate();
  step("App server (netlify dev)");
  await ensureServer("netlify", APP_URL, "npm run netlify:dev", 3 * 60_000);
  step("Frontend (vite)");
  await ensureServer("vite", VITE_URL, "npm run dev", 60_000);
  step("Test user");
  await ensureTestUser();

  console.log(`\nReady.\n  App:      ${APP_URL}\n  Frontend: ${VITE_URL}\n  Run tests: npm run e2e:local\n  Stop:      npm run local:down`);
} catch (err) {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
}
