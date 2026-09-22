# 3. The database and Prisma

## What Prisma is

Writing raw SQL by hand is error-prone and gives you no type safety. Prisma lets you describe your tables once, then generates a typed client:

```ts
const loans = await prisma.loan.findMany({ where: { status: "ACTIVE" } });
```

Your editor autocompletes `status`, and if you typo `staus` TypeScript catches it before you run.

Three pieces:

| Piece | What it is |
|---|---|
| `prisma/schema.prisma` | your tables, written once — the source of truth |
| `prisma/migrations/` | the history of every change, as SQL |
| `src/generated/prisma/` | the typed client, generated from your schema. **Never edit this** |

## Reading the schema

Open [prisma/schema.prisma](../prisma/schema.prisma). Here's the `Loan` model:

```prisma
model Loan {
  id        String     @id @default(cuid())
  amount    Int
  status    LoanStatus @default(PENDING)
  purpose   String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Line by line:

| Bit | Means |
|---|---|
| `@id` | the primary key — uniquely identifies a row |
| `@default(cuid())` | auto-generate a collision-resistant id |
| `String?` | the `?` means **optional** (may be `null`) |
| `@default(now())` | set to the current time on insert |
| `@updatedAt` | Prisma rewrites this on every update, automatically |
| `@relation(...)` | links to another table |
| `onDelete: Cascade` | delete a user → their loans go too |
| `@@index([userId])` | makes "find loans for this user" fast |

### Two things worth copying into your own projects

**Money as an integer.** `amount Int` stores *cents*, not dollars. Floating-point numbers can't represent decimals exactly — in JavaScript, `0.1 + 0.2` is `0.30000000000000004`. Storing 50000 (cents) instead of 500.00 means the arithmetic is always exact. Format it for display in the frontend.

**An index on the foreign key.** Without it, "find all loans for user X" scans every row. With it, the database jumps straight there. It matters once you have real data.

## Relations

We have two kinds.

### One-to-many: a user has many loans

```prisma
model User { loans Loan[] }              // many
model Loan { userId String
             user   User @relation(...) } // one
```

The **many** side holds the actual column (`userId`). `loans Loan[]` on `User` is a virtual convenience so you can write `include: { loans: true }`.

### One-to-one: a user has one profile

```prisma
model User    { profile Profile? }
model Profile { userId String @unique   // ← the @unique makes it one-to-one
                user   User   @relation(...) }
```

The only difference from one-to-many is `@unique` on `userId`. It stops a user having two profiles — the database itself refuses.

## Migrations

A migration is one recorded change to your tables. The workflow whenever you edit the schema:

```bash
# 1. edit prisma/schema.prisma
# 2. then:
bun run db:migrate
```

That command does three things: works out what changed, writes the SQL into `prisma/migrations/`, applies it, and regenerates the typed client so your editor immediately knows about the new fields.

**Why record the SQL in git?** So the change can be replayed. When you deploy, the server runs the same migrations in the same order and arrives at the same schema. Without that history you'd have no reliable way to update a database that already holds real data.

If you get stuck, `bun run db:reset` deletes everything, replays all migrations and reseeds. Fine while learning — **never** on a database with real users.

## Querying

### Reading

```ts
// many
prisma.loan.findMany()

// one, by a unique field — returns null if missing
prisma.loan.findUnique({ where: { id } })

// filter
prisma.loan.findMany({ where: { status: "ACTIVE" } })

// how many
prisma.loan.count({ where: { userId } })
```

### `select` vs `include`

This distinction matters, and it's a security control as much as a convenience.

**`select`** — list exactly the fields you want:

```ts
prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },  // no password
});
```

**`include`** — all normal fields, plus a relation:

```ts
prisma.loan.findMany({
  include: { user: true },   // careful: the whole user, password included
});
```

Look at how [auth.service.ts](../src/modules/auth/auth.service.ts) handles this:

```ts
const publicUser = { id: true, name: true, email: true, role: true, createdAt: true } as const;
```

One object, reused everywhere a user is returned. **Password not listed, so it can never leak.** Defining the safe shape once and reusing it beats remembering to exclude a field at every call site — that's the kind of thing you forget exactly once, in production.

### Writing

```ts
// create
prisma.loan.create({ data: { userId, amount: 50000 } })

// update
prisma.loan.update({ where: { id }, data: { status: "ACTIVE" } })

// update if it exists, otherwise create — see profiles.service.ts
prisma.profile.upsert({ where: { userId }, update: data, create: { userId, ...data } })

// delete
prisma.loan.delete({ where: { id } })
```

### Nested writes

You can create related rows in one call, and it's a single transaction — either all of it happens or none does:

```ts
prisma.user.create({
  data: {
    name: "Amina",
    email: "amina@test.com",
    password: hashed,
    profile: { create: { bio: "Learning backend." } },
    loans: { create: [{ amount: 500_000, purpose: "School fees" }] },
  },
});
```

[prisma/seed.ts](../prisma/seed.ts) uses this. It's also how registration creates the empty profile — so there's never a user without one.

### Running queries in parallel

In [loans.service.ts](../src/modules/loans/loans.service.ts):

```ts
const [items, total] = await Promise.all([
  prisma.loan.findMany({ where, take, skip }),
  prisma.loan.count({ where }),
]);
```

The two queries don't depend on each other, so `Promise.all` runs them at the same time. Awaiting them one after the other would take roughly twice as long for no reason.

> **Watch out for the N+1 problem.** Fetching 100 loans and then looping to fetch each owner is 101 queries. Use `include` instead and Prisma fetches the lot efficiently. The query log makes this obvious — if you see the same query repeating, that's the bug.

## Seeing your data

```bash
bun run db:studio
```

Opens a spreadsheet-like browser at http://localhost:5555 where you can click through tables and edit rows. Genuinely the fastest way to check whether your code did what you thought.

## Do this now

1. Run `bun run db:studio` and look at all three tables. Find Amina, then find her two loans and notice their `userId` matches her `id`.
2. With `bun run dev` running, make a request in Swagger and watch the SQL in your terminal.
3. Try this in `bun repl`, or add it temporarily to `prisma/seed.ts`:

```ts
const users = await prisma.user.findMany({
  include: { loans: true, profile: true },
});
console.log(JSON.stringify(users, null, 2));
```

Notice the `password` field is right there in the output. Now change `include` to a `select` that leaves it out. **That's the difference between a safe and an unsafe endpoint.**

Next: [doc 4, authentication](04-authentication.md).
