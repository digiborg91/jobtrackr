// Stops the local dev servers and the database container. Docker Desktop itself
// is left running, and the database's data is kept for next time.
import { spawnSync } from "node:child_process";

const PORTS = [8888, 5173, 5174];
const CONTAINER = "jobtrackr-db";
const isWindows = process.platform === "win32";

const sh = (cmd) => spawnSync(cmd, { shell: true, encoding: "utf8" });

function pidsOnPort(port) {
  if (isWindows) {
    // No -p filter: `-p tcp` hides IPv6 listeners, and Vite binds to [::1].
    const lines = (sh("netstat -ano").stdout || "").split(/\r?\n/);
    const listening = lines.filter((line) => line.includes("LISTENING") && new RegExp(`:${port}\\s`).test(line));
    return [...new Set(listening.map((line) => line.trim().split(/\s+/).pop()))];
  }
  return (sh(`lsof -ti tcp:${port} -sTCP:LISTEN`).stdout || "").split(/\s+/).filter(Boolean);
}

function kill(pid) {
  return isWindows ? sh(`taskkill /PID ${pid} /T /F`).status === 0 : sh(`kill ${pid}`).status === 0;
}

let stoppedAny = false;
for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    console.log(kill(pid) ? `Stopped process ${pid} on port ${port}.` : `Couldn't stop process ${pid} on port ${port}.`);
    stoppedAny = true;
  }
}
if (!stoppedAny) console.log("No dev servers were running.");

if (sh("docker ps").status === 0) {
  const stopped = sh(`docker stop ${CONTAINER}`);
  console.log(stopped.status === 0 ? `Stopped the ${CONTAINER} container (data is kept).` : `${CONTAINER} wasn't running.`);
} else {
  console.log("Docker isn't running, so there's no container to stop.");
}
