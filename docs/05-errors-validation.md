# 5. Errors and validation

## Two kinds of "wrong"

| Kind | Who's at fault | Example | Code |
|---|---|---|---|
| expected | the client | asked for a loan that doesn't exist | `4xx` |
| unexpected | **you** | typo, database down, null where you didn't expect one | `500` |

Expected problems get a clear, specific message. Unexpected ones get a generic message and a full log entry for you — because the detail of *your* bug is nobody else's business.

## Status codes we use

| Code | Name | When |
|---|---|---|
| 200 | OK | it worked |
| 201 | Created | it worked and made something new |
| 400 | Bad Request | malformed request |
| 401 | Unauthorized | not logged in |
| 403 | Forbidden | logged in, not allowed |
| 404 | Not Found | doesn't exist |
| 409 | Conflict | clashes with something existing (duplicate email) |
| 422 | Unprocessable Entity | well-formed, but the values are invalid |
| 500 | Internal Server Error | our bug |

Getting these right isn't pedantry. Clients *act* on them: a `401` should trigger a redirect to login, a `403` shouldn't. Retry a `500`, never retry a `422`.

## Throwing, not returning

[src/lib/errors.ts](../apps/api/src/lib/errors.ts) defines one class per situation:

```ts
export class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(what = "Resource") { super(`${what} not found`, 404); }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") { super(message, 403); }
}
```

Each one carries its own status code. So a service can say what's wrong without knowing anything about HTTP:

```ts
if (!loan) throw new NotFoundError("Loan");
```

### Why throw instead of returning `null`?

Compare. Returning null:

```ts
const loan = await LoanService.findById(id);
if (!loan) return status(404, { message: "Not found" });   // every caller must remember
```

Throwing:

```ts
const loan = await LoanService.findById(id, user);   // if it returns, it exists
```

The second can't be got wrong. Forget the null check in the first and you get a confusing `500` (or worse, leak data). With throwing, the error handles itself and TypeScript knows `loan` is non-null afterwards.

## One handler for everything

[src/app.ts](../apps/api/src/app.ts):

```ts
.onError(({ code, error, status }) => {
  if (error instanceof AppError) {
    return status(error.status, { error: error.name, message: error.message });
  }

  if (code === "VALIDATION") {
    return status(422, {
      error: "ValidationError",
      message: "Some fields are invalid",
      details: error.all.map((issue) => ({ ... })),
    });
  }

  if (code === "NOT_FOUND") {
    return status(404, { error: "NotFound", message: "That route does not exist" });
  }

  console.error("[unhandled]", error);
  return status(500, { error: "InternalServerError", message: "Something went wrong on our side" });
})
```

Read the order carefully — it goes from most specific to most general, and the final branch is the safety net.

**This is why there is no `try/catch` in any route in this project.** Scattered try/catch blocks produce inconsistent error shapes; one handler means every error looks the same to the client.

### The `500` branch, in detail

```ts
console.error("[unhandled]", error);   // everything, for you
return status(500, { message: "Something went wrong on our side" });   // nothing, for them
```

A raw database error can contain table names, column names, even fragments of data. Sent to the client, that's a free map of your system for an attacker. Log it; don't ship it.

If you're ever debugging and want the detail in the response, add it *temporarily* and behind a check like `env.NODE_ENV === "development"` — never unconditionally.

## Validation

### Declare it, don't write it

Instead of hand-written checks:

```ts
// don't
if (!body.amount) return status(400, { message: "amount required" });
if (typeof body.amount !== "number") return status(400, { message: "amount must be a number" });
if (body.amount < 1) return status(400, { message: "amount must be positive" });
```

Declare the shape:

```ts
createBody: t.Object({
  amount: t.Integer({ minimum: 1 }),
  purpose: t.Optional(t.String({ maxLength: 200 })),
})
```

Elysia enforces it before your handler runs, and generates the Swagger docs from it. One declaration, three jobs.

### The building blocks

```ts
t.String()                       t.Number()          t.Boolean()
t.String({ minLength: 2 })       t.Integer()         t.Optional(x)
t.String({ maxLength: 60 })      t.Array(x)          t.Nullable(x)
t.String({ format: "email" })    t.Object({ ... })
t.String({ format: "uri" })      t.Union([...])      t.Literal("PENDING")
```

An enum is a union of literals:

```ts
const LoanStatus = t.Union([
  t.Literal("PENDING"), t.Literal("ACTIVE"),
  t.Literal("PAID"), t.Literal("DEFAULTED"),
]);
```

### `Optional` vs `Nullable`

A distinction that trips people up:

- `t.Optional(t.String())` — you may leave the field out.
- `t.Nullable(t.String())` — the field may be `null`.
- `t.Optional(t.Nullable(t.String()))` — either. [profiles.model.ts](../apps/api/src/modules/profiles/profiles.model.ts) uses this so a client can *clear* a bio by sending `null`, which is different from not mentioning it.

### Where to validate

Three places:

```ts
.patch("/:id", handler, {
  params: LoanModel.params,      // from the URL:  /loans/abc123
  query:  LoanModel.query,       // after the ?:   ?status=ACTIVE&take=10
  body:   LoanModel.updateBody,  // the JSON body
})
```

### One source of truth for types

```ts
export type CreateLoanInput = typeof LoanModel.createBody.static;
```

`.static` converts the validator into a TypeScript type. So the shape is written **once** and used for both runtime checks and compile-time types — they can't drift apart. Add a field to the validator and the type updates itself.

## Validation is not the same as authorization

Validation asks *is this well-formed?* Authorization asks *are you allowed?*

`{"status": "ACTIVE"}` is perfectly valid input. Whether *you* may send it depends on your role — which is why that check lives in the service, not the model. Don't try to express permissions in a validator.

## Do this now

Fire these at the API and predict each status before you look:

```bash
# 1. missing required field
curl -X POST localhost:3300/api/auth/register \
  -H 'Content-Type: application/json' -d '{"name":"No Email"}'

# 2. password too short
curl -X POST localhost:3300/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ann","email":"a@b.com","password":"123"}'

# 3. not an email
curl -X POST localhost:3300/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ann","email":"not-an-email","password":"password123"}'

# 4. route that doesn't exist
curl localhost:3300/api/nope
```

<details>
<summary>Answers</summary>

1. `422` — `email` and `password` are required.
2. `422` — `minLength: 8`.
3. `422` — fails `format: "email"`.
4. `404` — the `NOT_FOUND` branch.

All four are handled without a single line of checking code in any route.
</details>

Now break something on purpose. Add this to [src/modules/loans/loans.route.ts](../apps/api/src/modules/loans/loans.route.ts):

```ts
.get("/boom", () => {
  throw new Error("Something I did not plan for");
})
```

Call `GET /api/loans/boom` with a token. You get a generic `500` — and the real message appears in your terminal. That's the split between what the client sees and what you see. **Remember to delete the route afterwards.**

Next: [doc 6, testing](06-testing.md).
