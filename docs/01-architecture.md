# 1. Architecture — why the files are split up

## The problem with one big file

The project started like this:

```ts
const app = new Elysia({ prefix: "/api" })
  .get("/loans", () => "About Elysia")
  .get("/loans/:id", ({ params }) => `Loan ID: ${params.id}`)
  .listen(3300);
```

That's a perfectly good way to start. But imagine it grown to fifty routes, each one fetching from the database, checking permissions and validating input — all inline in one file. Every problem becomes hard:

- To find the loan rules you scroll through unrelated code.
- The permission check is copy-pasted into every route, so one day you forget it in one place and users can read each other's loans.
- You can't test the loan logic without starting a web server.
- Two people can't edit different features without colliding.

## The fix: three jobs, three files

Every feature folder in `src/modules/` has the same three files:

```
src/modules/loans/
├─ loans.model.ts    ← SHAPE:  what a valid request looks like
├─ loans.service.ts  ← LOGIC:  what we do about it
└─ loans.route.ts    ← HTTP:   which URL triggers it
```

### `*.model.ts` — the shape

Describes valid input. No logic, no database.

```ts
export const LoanModel = {
  createBody: t.Object({
    amount: t.Integer({ minimum: 1 }),
    purpose: t.Optional(t.String({ maxLength: 200 })),
  }),
};
```

Because this is *data* rather than hand-written `if` statements, Elysia can use it twice: to reject bad requests automatically, and to generate the Swagger page. You write the rule once.

### `*.service.ts` — the logic

Talks to the database. **Never mentions HTTP.** Look at [src/modules/loans/loans.service.ts](../src/modules/loans/loans.service.ts) — no status codes, no `request`, no `response`. When something is wrong it *throws*:

```ts
if (!loan) {
  throw new NotFoundError("Loan");
}
```

This is the key move. The service says *what* is wrong ("not found"); something else decides that "not found" means HTTP `404`. That's why the same function works from a test, a command-line script, or a scheduled job — none of which have an HTTP response to write to.

### `*.route.ts` — the HTTP

Maps a URL to a service call and stays thin:

```ts
.get("/:id", ({ params, user }) => LoanService.findById(params.id, user), {
  params: LoanModel.params,
})
```

**Rule of thumb:** if a route handler grows past about ten lines, the extra logic belongs in the service.

## How a module gets wired in

[src/app.ts](../src/app.ts) collects everything:

```ts
.group("/api", (api) =>
  api
    .get("/health", () => ({ status: "ok" }))
    .use(authRoute)
    .use(loanRoute)
    .use(profileRoute),
)
```

And each route file declares its own prefix, so `loanRoute` has `prefix: "/loans"` and lands at `/api/loans`. Adding a feature means creating a folder and adding one `.use()` line.

## Why `app.ts` and `index.ts` are separate

[src/index.ts](../src/index.ts) is three lines: import the app, call `.listen()`.

That separation exists for testing. `app.ts` exports a fully assembled app that hasn't claimed a network port. So a test can do:

```ts
const response = await app.handle(new Request("http://localhost/api/loans"));
```

No server, no port, no cleanup — and fast. That's exactly what [tests/helpers.ts](../tests/helpers.ts) does. If the `.listen()` call lived in `app.ts`, every test run would try to occupy port 3300.

## What goes in `lib/`

`lib/` is for code more than one module needs:

| File | Why it's shared |
|---|---|
| [env.ts](../src/lib/env.ts) | every module reads settings |
| [prisma.ts](../src/lib/prisma.ts) | there must be exactly **one** database connection |
| [password.ts](../src/lib/password.ts) | auth hashes, and a future "reset password" will too |
| [errors.ts](../src/lib/errors.ts) | every service throws these |
| [auth.middleware.ts](../src/lib/auth.middleware.ts) | loans and profiles both need the login check |

That last one is the payoff. The ownership rule lives in **one** place, so a new route can't forget it.

### Why only one Prisma client?

Each `new PrismaClient()` opens its own connection to the database. Create one per request and you leak connections until the app falls over. So `prisma.ts` creates exactly one and everything imports *that*:

```ts
export const prisma = new PrismaClient({ adapter });
```

## The dependency direction

Arrows show "imports from":

```
route  →  service  →  prisma
  ↓         ↓
model     errors
```

Notice what's **missing**: no arrow from `service` back to `route`. The logic layer never reaches back up into the HTTP layer. Keep the arrows pointing one way and the code stays easy to follow; add a backwards arrow and you get circular imports and tangles.

## Exercise

Open [src/modules/profiles/](../src/modules/profiles/) and identify which file you'd edit for each change. Answers at the bottom.

1. Allow a bio of 1000 characters instead of 500.
2. Add a `city` field to profiles.
3. Change the URL from `/profiles/me` to `/me/profile`.
4. Stop returning the user's email with the profile.

<details>
<summary>Answers</summary>

1. `profiles.model.ts` — it's an input-shape rule.
2. All three, plus `prisma/schema.prisma`: add the column to the schema, run `bun run db:migrate`, allow it in the model, and it flows through the service.
3. `profiles.route.ts` only. The service doesn't know about URLs.
4. `profiles.service.ts` — the `select` clause decides what comes back.
</details>

Next: [doc 2, one request end to end](02-request-lifecycle.md).
