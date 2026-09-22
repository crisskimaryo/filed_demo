# 2. One request, end to end

Let's follow a single request through every line of code it touches. This is the most useful mental model you can build.

The request:

```bash
curl -X POST localhost:3300/api/loans \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "purpose": "School fees"}'
```

## The path it takes

```
   HTTP request arrives
          ↓
1  Bun's server hands it to Elysia
          ↓
2  app.ts — CORS, then route matching
          ↓
3  authGuard — is there a valid token?        ← rejects with 401
          ↓
4  LoanModel.createBody — is the body valid?  ← rejects with 422
          ↓
5  loans.route.ts — the handler runs
          ↓
6  LoanService.create — the logic
          ↓
7  Prisma turns it into SQL
          ↓
8  SQLite writes the row
          ↓
   ← reply travels back up, becomes JSON, status 201
```

Steps 3 and 4 are the interesting ones: **a bad request never reaches your handler.** You don't write those checks; you declare them, and Elysia enforces them.

## Step by step

### 1–2. Matching the route

[src/app.ts](../src/app.ts) groups everything under `/api`, and `loanRoute` adds `/loans`, so `POST /api/loans` matches the `.post("/")` handler in [loans.route.ts](../src/modules/loans/loans.route.ts).

### 3. The login check

`loanRoute` starts with `.use(authGuard)`, so this runs before any loan handler. From [auth.middleware.ts](../src/lib/auth.middleware.ts):

```ts
.derive({ as: "scoped" }, async ({ jwt, headers }) => {
  const auth = headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing Authorization header");
  }

  const token = auth.slice("Bearer ".length);
  const payload = await jwt.verify(token);

  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return { user: { id: payload.sub, email: payload.email, role: payload.role } };
})
```

`derive` adds fields to the request context. Whatever it returns is available in every handler below it — that's where the `user` in `({ user })` comes from. And because it *throws* when the token is bad, the handler simply never runs. Inside the handler, `user` is guaranteed to exist.

Try it: drop the `Authorization` header and you get `401` without a single line of your loan code executing.

### 4. Validating the body

The route declares `body: LoanModel.createBody`:

```ts
createBody: t.Object({
  amount: t.Integer({ minimum: 1 }),
  purpose: t.Optional(t.String({ maxLength: 200 })),
})
```

Send `{"amount": 0}` and you get `422` — again before your code runs.

Notice what's **not** in that shape: `userId` and `status`.

- No `userId`, because we take the owner from the verified token. If we trusted the body, anyone could create loans in someone else's name by editing the JSON.
- No `status`, because a user must not be able to apply for an already-approved loan.

**This is a security pattern worth remembering: never accept from the client anything the client shouldn't control.**

### 5. The handler

```ts
async ({ body, user, status }) => {
  const loan = await LoanService.create(user.id, body);
  return status(201, loan);
}
```

Four lines: take the trusted `user.id`, take the validated `body`, call the service, reply `201 Created` (not plain `200`, because we made something new).

### 6. The service

```ts
create(userId: string, data: CreateLoanInput) {
  return prisma.loan.create({
    data: { userId, amount: data.amount, purpose: data.purpose },
    include: withOwner,
  });
}
```

No HTTP anywhere. Give it a user id and some data and it works — from a route, a test, or a script.

### 7–8. Into the database

Prisma turns that into SQL. You can *see* it: the dev server logs every query, because [prisma.ts](../src/lib/prisma.ts) enables `log: ["query"]` in development. In your terminal you'll find:

```sql
INSERT INTO `main`.`Loan` (`id`, `amount`, `status`, `purpose`, ...)
VALUES (?,?,?,?,...) RETURNING `id`
```

Watching that log while you click around Swagger is one of the fastest ways to understand what Prisma is doing. Those `?` marks are **parameters** — values sent separately from the query text, which is what makes SQL injection impossible here.

## When it goes wrong

Every error — thrown from a guard, a service, or the validator — lands in the single `.onError` handler in [app.ts](../src/app.ts):

```ts
.onError(({ code, error, status }) => {
  if (error instanceof AppError) {
    return status(error.status, { error: error.name, message: error.message });
  }
  if (code === "VALIDATION") { /* → 422 */ }
  if (code === "NOT_FOUND")  { /* → 404 */ }

  console.error("[unhandled]", error);
  return status(500, { error: "InternalServerError", message: "Something went wrong on our side" });
})
```

This is why **no route in this project has a `try/catch`**. Throwing is the way to report a problem, and one place decides how problems become HTTP.

That last branch matters for security: an unexpected error gets logged in full for you, but the client is told only "something went wrong". Leaking a raw database error to the internet hands an attacker your schema.

## Do this now

With `bun run dev` running, watch the terminal while you make each of these requests, and notice **how far** each one gets:

| Request | Status | Where it stops |
|---|---|---|
| no `Authorization` header | 401 | step 3 — no SQL logged |
| token, `{"amount": 0}` | 422 | step 4 — no SQL logged |
| token, `{"amount": 50000}` | 201 | all the way — you see the INSERT |
| `GET /api/loans/nope` | 404 | reaches the service, which throws |

The fact that the first two log **no SQL at all** is the point of declaring validation.

Next: [doc 3, the database](03-database-prisma.md).
