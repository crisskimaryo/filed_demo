# 6. Testing

> **Where to run these commands:** every `bun` command in the backend docs runs from `apps/api/`. Do `cd apps/api` first.

```bash
cd apps/api
bun test
```

You should see `26 pass`. Bun has a test runner built in — nothing to install.

## Why bother

Clicking through Swagger proves a feature works *today*. Tests prove it still works after you change something else. That second thing is what actually saves you.

The most valuable tests here are the permission ones. If you refactor `loans.service.ts` and accidentally drop the ownership check, clicking around as a single user would look fine — every page loads. The test that logs in as *two* users and checks Juma gets a `403` catches it instantly.

A useful way to think about it: **tests describe the rules in a form the computer can check.** This test *is* the specification:

```ts
it("stops a normal user approving their own loan", async () => {
  const { token } = await makeUser();
  const loan = await makeLoan(token);

  const { status } = await call("PATCH", `/api/loans/${loan.id}`, {
    token, body: { status: "ACTIVE" },
  });

  expect(status).toBe(403);
});
```

## Testing without a server

The trick that makes these tests fast. From [tests/helpers.ts](../apps/api/tests/helpers.ts):

```ts
const response = await app.handle(
  new Request(`http://localhost${path}`, { method, headers, body }),
);
```

`app.handle()` takes a `Request` and returns a `Response` — the real routing, real guards, real validation, real database — but **no network, no port**. This is exactly why [src/app.ts](../apps/api/src/app.ts) doesn't call `.listen()`; that's `index.ts`'s job. Twenty-six tests run in about two seconds.

## The helpers

Two small functions remove almost all the repetition.

`call()` wraps a request:

```ts
const { status, body } = await call("POST", "/api/loans", {
  token,
  body: { amount: 50000 },
});
```

`makeUser()` registers a throwaway user and hands back a token:

```ts
const { token, user } = await makeUser();
```

Note the unique email:

```ts
const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
```

Emails are unique in the schema, so a fixed address would fail on the second test. And the randomness matters as much as the timestamp — tests can start inside the same millisecond.

## Keeping tests out of your real data

[tests/setup.ts](../apps/api/tests/setup.ts) runs before any test, wired up by [bunfig.toml](../apps/api/bunfig.toml):

```toml
[test]
preload = ["./tests/setup.ts"]
```

It points `DATABASE_URL` at a **separate** file:

```ts
process.env.DATABASE_URL = `file:./${TEST_DB}`;
process.env.NODE_ENV = "test";
```

Then it deletes any leftover test database, applies the migrations to a fresh one, and removes it again in `afterAll`.

**Why this matters:** without it, `bun test` would create dozens of "Test User" rows in the database you've been exploring in Studio. (That happened while building this project — the fix was exactly this file.) Setting `NODE_ENV = "test"` also silences the SQL query log so the test output stays readable.

The assignment has to happen **before** anything imports `src/lib/env.ts`, which reads the variable at import time. That's what `preload` guarantees.

## Anatomy of a test

```ts
import { describe, expect, it } from "bun:test";

describe("POST /api/loans", () => {           // a group
  it("creates a loan owned by the logged-in user", async () => {   // one case
    const { token, user } = await makeUser();          // arrange

    const { status, body } = await call("POST", "/api/loans", {    // act
      token, body: { amount: 25_000 },
    });

    expect(status).toBe(201);                          // assert
    expect(body.userId).toBe(user.id);
  });
});
```

**Arrange, act, assert.** Set up the world, do one thing, check the result.

Write the `it("...")` description as a sentence about behaviour — "stops a normal user approving their own loan", not "test patch 403". When it fails months later, that sentence tells you what broke.

Common assertions:

```ts
expect(x).toBe(201)          expect(x).toBeString()
expect(x).toEqual({ a: 1 })  expect(x).toBeUndefined()
expect(x).toBeNull()         expect(arr.length).toBe(2)
```

## What's worth testing

Look at [tests/loans.test.ts](../apps/api/tests/loans.test.ts) — notice the balance. Few tests for the happy path, many for the rules:

**High value:**
- permissions — Juma can't read Amina's loan
- boundaries — `amount: 0` is rejected
- security invariants — the password never comes back; a new loan is always `PENDING`
- anything you've broken before

**Low value:**
- that Prisma can insert a row (that's Prisma's test suite)
- exact wording of messages (they change; the status code is the contract)

One test deserves a second look:

```ts
it("gives the same message for a wrong email and a wrong password", async () => {
  ...
  expect(wrongPassword.body.message).toBe(noSuchUser.body.message);
});
```

That's not testing a feature, it's **locking in a security property**. Someone later trying to be helpful with "no account with that email" will be stopped by a failing test that explains why.

## Watch mode

```bash
bun test --watch                 # rerun on save
bun test tests/loans.test.ts     # one file
bun test --watch -t "ownership"  # only tests matching a name
```

## Do this now

1. Run `bun test`. Confirm `26 pass`.
2. Break something deliberately. In [loans.service.ts](../apps/api/src/modules/loans/loans.service.ts), comment out the ownership check in `findById`:
   ```ts
   // if (loan.userId !== requester.id && requester.role !== "ADMIN") {
   //   throw new ForbiddenError("This loan belongs to someone else");
   // }
   ```
   Run `bun test` again. Several tests should fail, naming the exact rule you broke. **Now put it back** and confirm they pass.
3. Write a test yourself. Add to `tests/loans.test.ts`: a loan with `amount: -5` should be rejected with `422`. (Hint: copy the "rejects an amount of zero" test.)
4. Write one that should pass but doesn't yet: deleting your own loan should return `200` and then `GET` on it should give `404`.

Step 2 is the important one. **A test you haven't seen fail isn't proven to work** — it might be passing for the wrong reason.

Next: [doc 7, the exercises](07-exercises.md).
