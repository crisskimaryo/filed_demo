# 7. Exercises

Twelve exercises, easy to hard. Do them in order — later ones build on earlier ones.

**How to work:**

1. Make a branch: `git checkout -b my-exercise-1`
2. Write the code.
3. Test it in Swagger **and** write a test for it.
4. Run `bun test` and `bun run typecheck` before you call it done.

If you're stuck for more than 20 minutes, open the hint. Being stuck is normal; staying stuck isn't useful.

---

## Level 1 — reading and small changes

### Exercise 1: A statistics endpoint
`GET /api/loans/stats` returning the logged-in user's totals:

```json
{ "totalLoans": 3, "totalAmount": 695000, "byStatus": { "PENDING": 1, "ACTIVE": 1, "PAID": 1 } }
```

<details><summary>Hints</summary>

- Add `getStats(requester)` to `loans.service.ts`, then a route.
- `prisma.loan.groupBy({ by: ["status"], where, _count: true, _sum: { amount: true } })`
- **Route order matters.** Put `/stats` *before* `/:id`, or `:id` will match the word "stats".
- Respect the admin rule: admins see everyone's stats, users only their own.
</details>

### Exercise 2: Sorting
Make `GET /api/loans` accept `?sortBy=amount&order=asc` (allowed: `amount`, `createdAt`, `status`; default `createdAt` desc).

<details><summary>Hints</summary>

- Add to `LoanModel.query` with `t.Optional(t.Union([t.Literal("amount"), ...]))`.
- Using a union rather than `t.String()` is the security point here: it stops arbitrary column names reaching Prisma.
- `orderBy: { [sortBy]: order }`
</details>

### Exercise 3: Searching
Add `?search=school` to filter by `purpose`.

<details><summary>Hints</summary>

- `where: { purpose: { contains: search } }`
- SQLite's `contains` is case-sensitive by default. Try searching `School` vs `school` and see. Storing a lowercased copy of the field is one fix — think about what you'd do with a million rows.
</details>

---

## Level 2 — new fields and endpoints

### Exercise 4: Due dates
Add `dueDate` (optional `DateTime`) to loans. Accept it when creating, return it, and add `GET /api/loans/overdue` for `ACTIVE` loans with a `dueDate` in the past.

<details><summary>Hints</summary>

- Schema: `dueDate DateTime?`, then `bun run db:migrate`.
- Validate with `t.Optional(t.String({ format: "date-time" }))` and convert: `new Date(data.dueDate)`.
- `where: { status: "ACTIVE", dueDate: { lt: new Date() } }`
- Again: `/overdue` before `/:id`.
</details>

### Exercise 5: Repayments
A new `Repayment` model: `id`, `amount`, `loanId`, `createdAt`. Endpoints to add one and list a loan's repayments. A loan's repayments must never exceed its amount.

<details><summary>Hints</summary>

- This is your first full module built from scratch — `repayments.model.ts`, `.service.ts`, `.route.ts`.
- Relation: `Repayment.loanId` → `Loan.repayments Repayment[]`, plus `@@index([loanId])`.
- Reuse `LoanService.findById(loanId, requester)` for the ownership check — don't rewrite it.
- Sum first: `prisma.repayment.aggregate({ where: { loanId }, _sum: { amount: true } })`, then throw `BadRequestError` if the new total would exceed. Note `_sum.amount` is `null` when there are no rows.
- Nice extra: auto-set the loan to `PAID` when fully repaid.
</details>

### Exercise 6: Change your password
`PATCH /api/auth/password` taking `currentPassword` and `newPassword`.

<details><summary>Hints</summary>

- Verify the current one first — always. Without that, a stolen token becomes a permanent account takeover.
- Reuse `password.verify` and `password.hash`.
- Wrong current password → `401`. Same as the new one → `400`.
</details>

---

## Level 3 — permissions and admin

### Exercise 7: Admin user management
`GET /api/users` (list, admin only) and `PATCH /api/users/:id/role`. An admin must not be able to demote themselves.

<details><summary>Hints</summary>

- A new `users` module. Use `adminGuard` from `lib/auth.middleware.ts` — already written and unused so far.
- Never return password hashes; reuse the `publicUser` select pattern.
- Self-demotion guard: `if (params.id === user.id) throw new BadRequestError(...)`. Think about why this matters — the last admin locking themselves out is unrecoverable.
</details>

### Exercise 8: A loan approval flow
Replace ad-hoc status edits with `POST /api/loans/:id/approve` and `POST /api/loans/:id/reject` (admin only). Only a `PENDING` loan can be approved or rejected.

<details><summary>Hints</summary>

- Add `REJECTED` to the `LoanStatus` enum (schema *and* the model union), then migrate.
- Guard the transition: `if (loan.status !== "PENDING") throw new BadRequestError("Only pending loans can be approved")`.
- This is a **state machine** — think about which transitions are legal. Should `PAID` ever go back to `ACTIVE`?
- Consider recording `approvedById` and `approvedAt`. Real systems need an audit trail.
</details>

---

## Level 4 — production concerns

### Exercise 9: Rate limiting
Limit login attempts to 5 per minute per IP, replying `429 Too Many Requests`.

<details><summary>Hints</summary>

- A `Map<string, number[]>` of timestamps is fine to start.
- Use Elysia's `onBeforeHandle`, and add a `TooManyRequestsError` to `errors.ts`.
- Then consider: what breaks when you run two copies of the server? (In-memory state isn't shared — production uses Redis.) Also, is IP the right key? Think about shared office networks and what that means for legitimate users.
</details>

### Exercise 10: Structured logging
Log every request as one line: method, path, status, duration, user id.

<details><summary>Hints</summary>

- `onRequest` to record `Date.now()`, `onAfterResponse` to log the difference.
- Emit JSON rather than text — log tools can then filter by field.
- **Never log tokens, passwords, or full request bodies.** Logs get shipped elsewhere and kept for years.
</details>

### Exercise 11: Refresh tokens
Short-lived access tokens (15 min) plus a long-lived refresh token, with `POST /api/auth/refresh`.

<details><summary>Hints</summary>

- This solves the revocation problem from [doc 4](04-authentication.md): a stolen access token expires in minutes.
- Needs a `RefreshToken` table — storing them is what makes revocation possible.
- Store a *hash* of the refresh token, not the token. It's a credential, exactly like a password.
- Look up "refresh token rotation": issue a new one on each use and invalidate the old, so a replayed token is detectable.
</details>

### Exercise 12: Soft deletes
Don't really delete loans — mark them deleted and hide them from queries.

<details><summary>Hints</summary>

- Add `deletedAt DateTime?`. "Deleting" sets it; every read filters `where: { deletedAt: null }`.
- The hard part is *not forgetting* that filter anywhere. Where's the single best place to put it so a new query can't miss it? (Look up Prisma client extensions.) This is the same "enforce it once" idea as the auth guard.
- Consider: should an admin be able to see deleted loans? Restore them?
</details>

---

## Level branches

Each branch is a working checkpoint you can return to:

```bash
git branch -a                     # list them
git checkout level-1-hello        # go to one
git checkout main                 # back to the finished version
```

| Branch | State |
|---|---|
| `level-1-hello` | one file, a few routes, no database — where this project started |
| `level-2-database` | Prisma + SQLite, loans CRUD, no auth |
| `level-3-modules` | split into model/service/route |
| `level-4-auth` | passwords, JWT, guards |
| `main` | everything, plus tests and docs |

A good way to use them: `git checkout level-2-database`, try to build the module split yourself, then `git diff level-3-modules` to compare with one solution. Yours being different isn't wrong.

---

## When you're done

Ideas for going further:

- **Deploy it.** Free tiers on Fly.io or Railway. You'll hit real problems: environment variables, running migrations on a live database, and SQLite's limits (it's a file — what happens with two server instances?).
- **Swap SQLite for PostgreSQL.** Change the `provider`, install the right adapter, re-run migrations. Little app code changes — that's the point of an ORM.
- **Build a frontend against it.** The API is already CORS-enabled and documented.
- **Add file uploads** for profile pictures. Where do the files live? Not in the database.

Stuck? [doc 9, troubleshooting](09-troubleshooting.md). Unfamiliar word? [doc 8, glossary](08-glossary.md).
