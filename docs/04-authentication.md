# 4. Authentication and permissions

Two different questions, often confused:

- **Authentication** — *who are you?* (login)
- **Authorization** — *are you allowed to do this?* (permissions)

You need both. Being logged in doesn't mean you may delete someone else's loan.

## Passwords

### The rule

**Never store a password you can read back.** Not encrypted — *hashed*.

A hash is one-way. `password123` always produces the same long string, but there's no way to go from the string back to `password123`. So to check a login we hash the attempt and compare hashes. We never "decrypt" the stored one, because we can't.

Why it matters: databases get leaked. If yours holds plain passwords, every user who reused that password elsewhere is now in danger. If it holds hashes, the attacker has near-useless strings.

### How we do it

[src/lib/password.ts](../src/lib/password.ts):

```ts
export const password = {
  hash(plain: string) {
    return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 });
  },
  verify(plain: string, hash: string) {
    return Bun.password.verify(plain, hash);
  },
};
```

Bun has bcrypt built in, so there's no library to install.

**What `cost: 10` means.** bcrypt is *deliberately slow*. Cost 10 means 2¹⁰ rounds of work — a few hundred milliseconds. You barely notice it on one login, but it makes brute-forcing millions of guesses impractical. Raising the number doubles the work each time.

**Salting is automatic.** bcrypt mixes a random "salt" into each hash, so two users with the same password get different hashes. Without salts, an attacker could hash `password123` once and instantly find every user who chose it.

### Never log a password

Not in a `console.log` while debugging, not in an error message. Logs get shipped to other systems and kept for years.

## Tokens (JWT)

### The problem

HTTP is *stateless* — the server doesn't remember you between requests. So how does request #2 know you logged in on request #1?

You could send your email and password every time. But then the client has to store your password, and every request risks exposing it.

### The answer

When you log in successfully, the server gives you a **token**: a string that proves you already logged in. You send it with each later request.

A **JWT** (JSON Web Token) has three parts, separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjbXVjZmoxMSJ9.fo58DGk-B4th72dV62
└─── header ───────┘ └─── payload ────────┘ └─── signature ──┘
```

The critical thing to understand: **the payload is not secret.** It's just base64 — anyone holding the token can read it. Paste one into [jwt.io](https://jwt.io) and you'll see your own user id and email.

What stops tampering is the **signature**, made with our `JWT_SECRET`. Change one character of the payload and the signature no longer matches, so `jwt.verify()` rejects it. An attacker can't change their role to `ADMIN` without the secret.

So: **never put anything secret in a JWT payload.** Ours holds only an id, an email and a role.

### Signing one

From [auth.route.ts](../src/modules/auth/auth.route.ts):

```ts
const token = await jwt.sign({
  sub: user.id,      // "subject" — the standard name for "who this is about"
  email: user.email,
  role: user.role,
});
```

And the setup in [auth.middleware.ts](../src/lib/auth.middleware.ts) sets `exp: "7d"` — tokens stop working after seven days, which limits the damage if one is stolen.

> **A real trade-off to know about:** because the server doesn't store tokens, it can't easily *revoke* one. Change a user's role to `USER` and their existing ADMIN token keeps working until it expires. Production systems handle this with short-lived access tokens plus refresh tokens — that's exercise 11.

## The guard

Rather than checking the token in every route, we check it once in a reusable guard. [auth.middleware.ts](../src/lib/auth.middleware.ts):

```ts
export const authGuard = new Elysia({ name: "authGuard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }) => {
    const auth = headers.authorization;

    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedError("Missing Authorization header");

    const payload = await jwt.verify(auth.slice("Bearer ".length));

    if (!payload) throw new UnauthorizedError("Invalid or expired token");

    return { user: { id: payload.sub, email: payload.email, role: payload.role } };
  });
```

Any route file that does `.use(authGuard)` gets a guaranteed `user`:

```ts
export const loanRoute = new Elysia({ prefix: "/loans" })
  .use(authGuard)
  .get("/", ({ user }) => LoanService.findAll(user, query))
```

**Why this matters:** the check exists in one place. A new route added below inherits it automatically — there's no way to forget it. Compare that with copy-pasting an `if (!token)` into twelve handlers, where you only have to slip once.

`{ as: "scoped" }` controls how far the guard applies. Without it, Elysia would keep the behaviour local to the file that defined it.

### `Bearer` — what is that?

A convention. The header format is `Authorization: Bearer <token>`, meaning "the bearer of this token is authorised". The guard strips the `"Bearer "` prefix before verifying.

## Permissions

Now the second question: you're logged in, but *may* you do this?

Our rules:

| Who | May do |
|---|---|
| any logged-in user | create a loan; read/edit/delete **their own** |
| ADMIN | read/edit/delete **anyone's**; change a loan's `status` |

### Ownership, enforced once

From [loans.service.ts](../src/modules/loans/loans.service.ts):

```ts
async findById(id: string, requester: Requester) {
  const loan = await prisma.loan.findUnique({ where: { id }, include: withOwner });

  if (!loan) throw new NotFoundError("Loan");

  if (loan.userId !== requester.id && requester.role !== "ADMIN") {
    throw new ForbiddenError("This loan belongs to someone else");
  }

  return loan;
}
```

Then `update` and `delete` **reuse it**:

```ts
async update(id, data, requester) {
  await this.findById(id, requester);   // ← the ownership check, not repeated
  ...
}
```

One implementation, three routes protected. This is the same idea as the guard, one layer down.

### Filtering lists

For a list there's nothing to reject — you just show less:

```ts
const where = {
  ...(requester.role === "ADMIN" ? {} : { userId: requester.id }),
  ...(query.status ? { status: query.status } : {}),
};
```

An admin gets `{}` (no restriction); everyone else is pinned to their own id. Same URL, different results.

### Field-level rules

Some fields need more than row-level ownership:

```ts
if (data.status && requester.role !== "ADMIN") {
  throw new ForbiddenError("Only an admin can change a loan's status");
}
```

You own your loan, so you may edit its `purpose` — but approving your own loan application is obviously not allowed.

## `401` vs `403`

Confused constantly. The distinction:

| Code | Means | Fix |
|---|---|---|
| **401** Unauthorized | we don't know who you are | log in |
| **403** Forbidden | we know who you are, you're not allowed | nothing — it's not yours |

Logging in again will never fix a `403`.

## Not revealing too much

Two subtle choices in this codebase.

**Login gives one message for both failures.** From [auth.service.ts](../src/modules/auth/auth.service.ts):

```ts
if (!user || !(await pw.verify(data.password, user.password))) {
  throw new UnauthorizedError("Invalid email or password");
}
```

Wrong email and wrong password produce the *identical* message. Saying "no account with that email" would let someone test a list of addresses to learn who has an account here. There's a test locking this behaviour in.

**Registration's `409` is a deliberate exception.** `POST /register` *does* reveal that an email is taken — it has to, or you couldn't tell the user why signup failed. The mitigation is elsewhere: rate limiting (exercise 9).

Recognising that tension — usability versus information disclosure — is a real part of backend work.

## Do this now

1. Log in via Swagger, copy the token, paste it into [jwt.io](https://jwt.io). Find your user id and role. Confirm for yourself the payload isn't encrypted.
2. Change one character in the token and try `GET /api/auth/me`. You get `401` — the signature no longer matches.
3. Log in as Amina, note a loan id, then log in as Juma and try `GET /api/loans/<amina's id>`. You get `403`, not `404` — it exists, it's just not yours.
4. Try `PATCH /api/loans/<your own loan>` with `{"status": "ACTIVE"}` as a normal user → `403`. Now do it as `admin@zeni.test` → it works.

Next: [doc 5, errors and validation](05-errors-validation.md).
