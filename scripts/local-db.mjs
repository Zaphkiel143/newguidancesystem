// Runs a private PostgreSQL for local review of this copy, so it never touches
// the hosted (Supabase) database.
//
//   node scripts/local-db.mjs start     start in the background and create the database
//   node scripts/local-db.mjs stop      stop it
//
// Data lives in %LOCALAPPDATA%\egabay-review-db\data (outside the repo). Two
// Windows quirks shape this script:
//   - initdb can't set permissions on folders created directly under C:\Users,
//     so the data folder lives under LocalAppData instead.
//   - postgres.exe refuses to run from an account with admin rights; pg_ctl
//     starts it with a restricted token, so we always go through pg_ctl.
//
// Matching .env values:
//   DATABASE_URL="postgresql://egabay:egabay@localhost:54329/egabay"
//   DIRECT_URL="postgresql://egabay:egabay@localhost:54329/egabay"
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import pg from "pg";

// The package doesn't export its package.json, so locate it relative to this script.
const binDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "@embedded-postgres", "windows-x64", "native", "bin");
const exe = (name) => path.join(binDir, `${name}.exe`);

const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".local", "share");
const root = path.join(base, "egabay-review-db");
const dataDir = path.join(root, "data");
const logFile = path.join(root, "postgres.log");
const PORT = 54329;

const command = process.argv[2] ?? "start";

if (command === "stop") {
  execFileSync(exe("pg_ctl"), ["stop", "-D", dataDir, "-m", "fast"], { stdio: "inherit" });
  process.exit(0);
}

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  mkdirSync(root, { recursive: true });
  const pwFile = path.join(root, "pw.txt");
  writeFileSync(pwFile, "egabay");
  try {
    execFileSync(exe("initdb"), ["-D", dataDir, "-U", "egabay", `--pwfile=${pwFile}`, "--encoding=UTF8", "--locale=C", "--auth=scram-sha-256"], {
      stdio: "inherit",
    });
  } finally {
    rmSync(pwFile, { force: true });
  }
}

try {
  execFileSync(exe("pg_ctl"), ["status", "-D", dataDir], { stdio: "ignore" });
  console.log("Local PostgreSQL is already running.");
} catch {
  execFileSync(exe("pg_ctl"), ["start", "-D", dataDir, "-l", logFile, "-w", "-o", `-p ${PORT} -c listen_addresses=localhost`], {
    // The server inherits our handles; "inherit" would keep this script attached to it.
    stdio: "ignore",
  });
}

// Create the app database on first run.
const admin = new pg.Client({ host: "localhost", port: PORT, user: "egabay", password: "egabay", database: "postgres" });
await admin.connect();
const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'egabay'");
if (!rowCount) await admin.query("CREATE DATABASE egabay");
await admin.end();

console.log(`Local PostgreSQL ready on localhost:${PORT} (database: egabay, data: ${dataDir})`);
