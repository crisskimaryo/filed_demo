// ─────────────────────────────────────────────────────────────
// The database client. Every service imports `prisma` from here.
//
// Why one shared instance? Each PrismaClient opens its own
// connection to the database. Creating one per request would leak
// connections until the app fell over, so we create exactly one
// and reuse it everywhere.
// ─────────────────────────────────────────────────────────────
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

// Prisma 7 talks to the database through a "driver adapter".
// We use the libSQL adapter: it speaks plain SQLite files and is
// pure JavaScript, so it runs on Bun. (The more common
// better-sqlite3 adapter is a native Node module that Bun cannot
// load yet — see github.com/oven-sh/bun/issues/4290.)
const adapter = new PrismaLibSql({ url: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  // Logs every SQL query Prisma runs. Very useful while learning:
  // you can see exactly what your .findMany() turned into.
  log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});
