# 0. Start here

If you've only written frontend code before, this page is for you. It assumes nothing.

## What is a backend?

When you open a website, two computers are talking:

- The **frontend** runs on *your* phone or laptop. It draws buttons and text.
- The **backend** runs on *someone else's* computer (a "server"). It stores the data and decides the rules.

The frontend can't be trusted with rules. Anyone can open their browser's dev tools and change the code running on their own machine. So if a rule matters — "only admins may approve a loan" — it has to be enforced on the backend. That idea drives most of the design decisions in this project.

**This project is only the backend.** It has no buttons or pages. It answers questions asked over the network and replies with data (JSON). A frontend, a mobile app, or `curl` in your terminal can all ask it the same questions.

## What is an API?

An **API** is the list of questions a backend agrees to answer. Ours answers things like:

- "Create an account with this email" → `POST /api/auth/register`
- "What loans do I have?" → `GET /api/loans`

Each question has two parts:

**A method** — the kind of action:

| Method | Means | Example |
|---|---|---|
| `GET` | read something | fetch my loans |
| `POST` | create something | apply for a loan |
| `PATCH` | change part of something | update a loan's purpose |
| `PUT` | replace something entirely | (not used here) |
| `DELETE` | remove something | delete a loan |

**A path** — which thing: `/api/loans`, `/api/loans/abc123`.

## What is JSON?

JSON is the text format the two computers use to exchange data. It looks like a JavaScript object:

```json
{
  "amount": 50000,
  "purpose": "School fees",
  "status": "PENDING"
}
```

It only supports text, numbers, booleans, `null`, arrays and objects. Notably **no dates** — that's why dates travel as strings like `"2026-09-22T08:45:56.363Z"`.

## What is a status code?

Every reply carries a 3-digit number saying how it went. The first digit is the summary:

| Range | Means | Common ones |
|---|---|---|
| `2xx` | it worked | `200` OK, `201` Created |
| `4xx` | **you** sent something wrong | `401`, `403`, `404`, `409`, `422` |
| `5xx` | **the server** broke | `500` |

The difference between `4xx` and `5xx` matters: a `4xx` is the client's fault and the client can fix it. A `5xx` is your bug. You'll learn the specific codes in [doc 5](05-errors-validation.md).

## What is a database?

A place to store data that survives restarting the server. If you kept loans in a normal JavaScript array, they'd vanish the moment the server stopped.

Ours is **SQLite**, which is just a single file (`prisma/dev.db`). Nothing to install, nothing to run. Real production apps often use PostgreSQL instead — a separate program you connect to — but everything you learn here transfers, because we talk to the database through Prisma either way.

Data lives in **tables**, which are like spreadsheets. Our `User` table:

| id | email | name | role |
|---|---|---|---|
| `cmu…kt2` | amina@zeni.test | Amina Juma | USER |
| `cmu…9xq` | admin@zeni.test | Admin User | ADMIN |

Each row is one user. Each column is one fact about them.

## The tools we use

| Tool | What it is | Why |
|---|---|---|
| **Bun** | runs your TypeScript | fast, and runs `.ts` directly with no build step |
| **TypeScript** | JavaScript + types | catches mistakes before you run the code |
| **Elysia** | the web framework | turns incoming requests into function calls |
| **Prisma** | the database toolkit | write `prisma.loan.findMany()` instead of raw SQL |
| **SQLite** | the database | zero setup |

## Do this now

1. Follow the setup steps in the [README](../README.md).
2. Run `bun run dev`.
3. Open **http://localhost:3300/swagger**.
4. Find `POST /api/auth/login`, click **Try it out**, and log in with:
   ```json
   { "email": "amina@zeni.test", "password": "password123" }
   ```
5. Copy the `token` from the response.
6. Click the **Authorize** button at the top of the page, paste the token, and confirm.
7. Now try `GET /api/loans`. You should see Amina's two loans.
8. Log in as `admin@zeni.test` instead and try `GET /api/loans` again. You see *all* loans. **That difference is a rule enforced by the backend** — the same URL, a different answer, because of who's asking.

Once that clicks, go to [doc 1: architecture](01-architecture.md).
