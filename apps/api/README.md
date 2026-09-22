# Zeni Loans API

The backend: **Bun** + **Elysia** + **Prisma 7** + **SQLite**.

See the [workspace README](../../README.md) for running this together with the app.

## Setup

```bash
bun install
cp .env.example .env
bun run db:migrate    # create the database file and tables
bun run db:seed       # add sample users and loans
bun run dev
```

Then open **http://localhost:3300/swagger** — a clickable page for every endpoint. Start there.

### Sample accounts

Password `password123` for all:

| Email | Role | Sees |
|---|---|---|
| `admin@zeni.test` | ADMIN | every loan, can approve |
| `amina@zeni.test` | USER | her 2 loans |
| `juma@zeni.test` | USER | his 1 loan |

## Commands

| Command | Does |
|---|---|
| `bun run dev` | start the server, restart on save |
| `bun test` | run the tests (separate database) |
| `bun run typecheck` | check types without running |
| `bun run db:migrate` | apply schema changes |
| `bun run db:seed` | wipe and refill sample data |
| `bun run db:studio` | visual database browser |
| `bun run db:reset` | delete everything and rebuild |

## Endpoints

🔒 = needs a token in the `Authorization` header.

### Auth
| Method | Path | Does |
|---|---|---|
| POST | `/api/auth/register` | create an account, returns a token |
| POST | `/api/auth/login` | swap email+password for a token |
| GET | `/api/auth/me` 🔒 | who am I? |

### Loans
| Method | Path | Does |
|---|---|---|
| GET | `/api/loans` 🔒 | list your loans (all if admin) |
| GET | `/api/loans/:id` 🔒 | get one loan |
| POST | `/api/loans` 🔒 | apply for a loan |
| PATCH | `/api/loans/:id` 🔒 | edit (only admins may change `status`) |
| DELETE | `/api/loans/:id` 🔒 | delete a loan |

### Profiles
| Method | Path | Does |
|---|---|---|
| GET | `/api/profiles/me` 🔒 | your profile |
| PATCH | `/api/profiles/me` 🔒 | update your profile |

### From the terminal

```bash
TOKEN=$(curl -s -X POST localhost:3300/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"amina@zeni.test","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl localhost:3300/api/loans -H "Authorization: Bearer $TOKEN"
```

## Structure

```
src/
├─ index.ts          starts the server (3 lines)
├─ app.ts            plugins, error handling, routes
├─ lib/              shared: env, prisma, password, errors, auth guard
└─ modules/          one folder per feature
   ├─ auth/
   ├─ loans/
   └─ profiles/
```

Every module has the same three files:

| File | Job | Rule |
|---|---|---|
| `*.model.ts` | shape — valid input | no logic |
| `*.service.ts` | logic — database work | never mentions HTTP |
| `*.route.ts` | HTTP — URL → service call | stays thin |

## Docs

The full curriculum is in [`docs/`](../../docs/) at the repo root — start with [doc 0](../../docs/00-start-here.md).
