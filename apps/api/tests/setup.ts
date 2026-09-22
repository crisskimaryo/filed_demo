// ─────────────────────────────────────────────────────────────
// Runs once before any test file, via bunfig.toml.
//
// It points DATABASE_URL at a SEPARATE test database, so running
// tests never touches the dev.db you've been clicking around in.
// ─────────────────────────────────────────────────────────────
import { afterAll } from "bun:test";
import { unlinkSync } from "node:fs";

const TEST_DB = "prisma/test.db";

// Must happen before anything imports src/lib/env.ts.
process.env.DATABASE_URL = `file:./${TEST_DB}`;
process.env.NODE_ENV = "test"; // also silences the SQL query log

// Start from a clean file, then build the schema by applying the
// same migrations that built your dev database.
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  try {
    unlinkSync(`${TEST_DB}${suffix}`);
  } catch {
    // not there — fine
  }
}

// Prisma's CLI reads DATABASE_URL from prisma.config.ts, so we pass
// the test path through the environment rather than a flag.
Bun.spawnSync({
  cmd: ["bunx", "prisma", "migrate", "deploy"],
  env: { ...process.env, DATABASE_URL: `file:./${TEST_DB}` },
  stdout: "ignore",
  stderr: "inherit",
});

afterAll(() => {
  // Clean up so the next run starts fresh.
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      unlinkSync(`${TEST_DB}${suffix}`);
    } catch {
      // not there — fine
    }
  }
});
