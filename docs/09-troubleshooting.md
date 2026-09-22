# 9. Troubleshooting

Real errors and what they mean. Several of these came up while building this project.

## How to read an error

Work from the **bottom** of a stack trace upward — the last lines are usually your code, the top is library internals. Find the first line mentioning a file in `src/` and start there.

---

## Setup and startup

### `Missing environment variable: JWT_SECRET`

You don't have a `.env` file, or it's missing a key.

```bash
cp .env.example .env
```

This message is deliberate. [src/lib/env.ts](../src/lib/env.ts) checks every variable at startup so you find out immediately rather than when the first user tries to log in.

### `Cannot find module '../generated/prisma/client'`

The Prisma client hasn't been generated. It's code created *from* your schema, and it isn't committed to git:

```bash
bun run db:generate
```

Needed after cloning the repo, and after any schema change (though `db:migrate` does it for you).

### `error: Cannot find module 'elysia'`

Dependencies aren't installed: `bun install`.

### `EADDRINUSE: address already in use`

Port 3300 is taken — usually an old server still running.

```bash
lsof -ti:3300 | xargs kill -9   # macOS / Linux
```

Or change `PORT` in `.env`.

### `'better-sqlite3' is not yet supported in Bun`

If you ever swap the database adapter, you may hit this. `better-sqlite3` is a native Node module Bun can't load ([bun#4290](https://github.com/oven-sh/bun/issues/4290)). That's exactly why this project uses `@prisma/adapter-libsql`, which is pure JavaScript and reads the same SQLite files.

### `Export named 'PrismaBetterSQLite3' not found`

A capitalisation mistake in an adapter import. Adapter class names are fussy — `PrismaLibSql`, not `PrismaLibSQL`. When unsure, check the package's own types:

```bash
grep -rhoE 'declare class Prisma[A-Za-z0-9]*' node_modules/@prisma/adapter-libsql/dist/*.d.ts
```

---

## Prisma

### `The datasource property 'url' is no longer supported in schema files`

A Prisma 7 change. The connection URL now lives in [prisma.config.ts](../prisma.config.ts), not `schema.prisma`. Most tutorials online still show the old way — if you're following one, expect this.

### `Could not find Prisma Schema`

You're running the command from the wrong directory. Prisma looks for `prisma/schema.prisma` relative to where you are, so run it from the project root.

### Prisma's CLI refuses a command and asks for your consent

Commands that wipe data (`db push --force-reset`, sometimes `migrate reset`) are blocked when an AI agent runs them, with a message demanding explicit user consent. That's a safety feature, not a bug. Read what it plans to destroy before agreeing — and never run it against a database with real users.

### `Unique constraint failed on the fields: (email)`

You're inserting a duplicate of a `@unique` field. The schema is doing its job. Handle it in code as a `409` — see how `register` in [auth.service.ts](../src/modules/auth/auth.service.ts) checks first.

### `Foreign key constraint failed`

You referenced a row that doesn't exist — e.g. a loan whose `userId` matches no user. Usually a stale id after reseeding.

### My schema change isn't showing up

Editing `schema.prisma` alone does nothing. Run `bun run db:migrate`, then restart your editor's TypeScript server if autocomplete still looks stale (VS Code: Cmd+Shift+P → "Restart TS Server").

### Migrations are in a mess and I just want to start over

```bash
bun run db:reset
```

Deletes everything, replays all migrations, reseeds. Fine while learning. **Never on real data.**

---

## Requests

### `401` when you think you're logged in

Check, in order:

1. Is the header exactly `Authorization: Bearer <token>`? The space matters.
2. Did you paste the whole token? They're ~225 characters.
3. Is it older than 7 days? They expire.
4. Did you restart the server after changing `JWT_SECRET`? That invalidates every existing token.

### `403` and you don't understand why

You're logged in but not allowed. Either the thing belongs to someone else, or the field is admin-only (like a loan's `status`). Log in as `admin@zeni.test` to confirm that's the cause.

### `422` with `"Some fields are invalid"`

Look at the `details` array in the response — it names the field. Common causes: a password under 8 characters, a malformed email, a non-integer amount, or a string where a number belongs (`"50000"` vs `50000`).

### `404` on a route you're sure exists

- Did you include the `/api` prefix?
- Right method? `GET /api/auth/login` is a `404`; it's a `POST`.
- **Route order.** `/loans/:id` declared before `/loans/stats` will swallow "stats" as an id. Specific routes must come first.

### `500` with "Something went wrong on our side"

That's a bug in the code. The real error is in your **terminal**, logged by the `onError` handler in [app.ts](../src/app.ts). The generic message is intentional — [doc 5](05-errors-validation.md) explains why.

### My request body seems to be ignored

Send the `Content-Type: application/json` header. Without it the body isn't parsed as JSON.

---

## Tests

### Tests create junk in my real database

They shouldn't — [tests/setup.ts](../tests/setup.ts) redirects them to `prisma/test.db`. If it's happening, check that [bunfig.toml](../bunfig.toml) has the `preload` line. The redirect must happen before anything imports `env.ts`.

(This is a real bug from building this project: the first test run put eleven "Test User" rows into `dev.db`. The fix was that setup file.)

### Tests fail with `401` everywhere

The test database has no tables — the migration step in `setup.ts` failed. Run `bun test` and look for Prisma errors in the output before the failures.

### A test passes alone but fails with the others

Shared state. Usually a hardcoded email colliding across tests — use `makeUser()`, which generates a unique one.

---

## TypeScript

### `'user' is possibly 'undefined'`

TypeScript can't always prove a guard ran before your handler. Either check explicitly (`if (!user) throw ...`) or make sure `.use(authGuard)` comes before the route.

### `Unused '@ts-expect-error' directive`

The error you were suppressing is gone, so the directive itself is now an error. Delete it. And prefer a real check over a suppression:

```ts
field: "path" in issue ? issue.path : undefined   // better than @ts-expect-error
```

### Autocomplete doesn't know my new Prisma field

Run `bun run db:generate`, then restart the TS server.

---

## Still stuck?

1. **Read the error properly.** It usually names the file and line.
2. **Check the SQL log** in your terminal — did the query even run?
3. **`bun run db:studio`** — is the data what you think it is?
4. **`bun run typecheck`** — often finds the cause faster than the runtime error.
5. **Isolate it.** Comment out code until it works, then add back one piece at a time.
6. **Rubber-duck it.** Explain aloud what you expected and what happened. You'll often catch it mid-sentence.

Useful references:

- [Elysia docs](https://elysiajs.com/)
- [Prisma docs](https://www.prisma.io/docs)
- [Bun docs](https://bun.sh/docs)
- [HTTP status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
