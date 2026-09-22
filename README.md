# Zeni Loans API

A small loan-management backend, built to **learn backend development**.

Built with **Bun** (runtime), **Elysia** (web framework), **Prisma 7** (database toolkit) and **SQLite** (the database — just a file, nothing to install).

---

## 1. Set it up (once)

```bash
bun install          # download the libraries
cp .env.example .env # create your local settings file
bun run db:migrate   # create the database file + tables
bun run db:seed      # add sample users and loans
```

> **Windows note:** if `cp` is not recognised, use `copy .env.example .env`.

## 2. Run it

```bash
bun run dev
```

Then open **http://localhost:3300/swagger** — that's a clickable page listing every endpoint, where you can try requests without writing any code. Start there.

## 3. Log in with the sample data

All three seeded accounts use the password `password123`:

| Email | Role | What they can see |
|---|---|---|
| `admin@zeni.test` | ADMIN | every loan, and can approve them |
| `amina@zeni.test` | USER | only her 2 loans |
| `juma@zeni.test` | USER | only his 1 loan |

## 4. Every command

| Command | What it does |
|---|---|
| `bun run dev` | start the server, restarting on save |
| `bun test` | run the tests (uses a separate database) |
| `bun run typecheck` | check for type errors without running |
| `bun run db:migrate` | apply schema changes to the database |
| `bun run db:seed` | wipe and refill with sample data |
| `bun run db:studio` | open a visual database browser |
| `bun run db:reset` | delete everything and rebuild from scratch |

---

## The endpoints

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
| GET | `/api/loans` 🔒 | list your loans (all of them if admin) |
| GET | `/api/loans/:id` 🔒 | get one loan |
| POST | `/api/loans` 🔒 | apply for a loan |
| PATCH | `/api/loans/:id` 🔒 | edit a loan (only admins may change `status`) |
| DELETE | `/api/loans/:id` 🔒 | delete a loan |

### Profiles
| Method | Path | Does |
|---|---|---|
| GET | `/api/profiles/me` 🔒 | your profile |
| PATCH | `/api/profiles/me` 🔒 | update your profile |

### Try it from the terminal

```bash
# log in and save the token to a variable
TOKEN=$(curl -s -X POST localhost:3300/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"amina@zeni.test","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# use it
curl localhost:3300/api/loans -H "Authorization: Bearer $TOKEN"
```

---

## How the code is organised

```
src/
├─ index.ts          ← starts the server (3 lines)
├─ app.ts            ← assembles plugins, error handling, routes
│
├─ lib/                        the shared toolbox
│  ├─ env.ts         ← reads .env, fails loudly if something's missing
│  ├─ prisma.ts      ← the one database connection
│  ├─ password.ts    ← hashing & checking passwords
│  ├─ errors.ts      ← NotFoundError, ForbiddenError, ...
│  └─ auth.middleware.ts ← the "are you logged in?" guard
│
└─ modules/                    one folder per feature
   ├─ auth/
   ├─ loans/
   └─ profiles/
```

### Every module has the same three files

This is the single most important pattern in the project:

| File | Job | Rule of thumb |
|---|---|---|
| `*.model.ts` | **shape** — what a valid request looks like | no logic |
| `*.service.ts` | **logic** — talks to the database | never mentions HTTP |
| `*.route.ts` | **HTTP** — maps a URL to a service call | stays thin |

Why split it up? Because each file then has one reason to change. When a rule about loans changes you edit the service; when a URL changes you edit the route. And because the service knows nothing about HTTP, you can call it from a test or a script — which is exactly what the tests in `tests/` do.

---

## 📚 Learning path

Read these in order. They assume no backend experience.

| # | Document | You'll learn |
|---|---|---|
| 0 | **[docs/00-start-here.md](docs/00-start-here.md)** | how the web works, what a backend even is |
| 1 | **[docs/01-architecture.md](docs/01-architecture.md)** | why the code is split into model/service/route |
| 2 | **[docs/02-request-lifecycle.md](docs/02-request-lifecycle.md)** | trace one request end to end |
| 3 | **[docs/03-database-prisma.md](docs/03-database-prisma.md)** | tables, relations, migrations, queries |
| 4 | **[docs/04-authentication.md](docs/04-authentication.md)** | hashing, tokens, guards, permissions |
| 5 | **[docs/05-errors-validation.md](docs/05-errors-validation.md)** | status codes and rejecting bad input |
| 6 | **[docs/06-testing.md](docs/06-testing.md)** | writing tests that catch real bugs |
| 7 | **[docs/07-exercises.md](docs/07-exercises.md)** | **12 exercises, easy → hard** |
| 8 | **[docs/08-glossary.md](docs/08-glossary.md)** | every unfamiliar word, defined |
| 9 | **[docs/09-troubleshooting.md](docs/09-troubleshooting.md)** | fixes for common errors |

**Suggested pace:** docs 0–2 on day one (read, run the server, click around Swagger). Doc 3 and the first exercises on day two. Don't rush to the exercises — being able to trace one request through the layers matters more than finishing quickly.

---

## Branches per level

Each `level-*` branch is a working checkpoint. `main` has everything.

```bash
git branch -a          # see all levels
git checkout level-1-hello    # jump to a level
git checkout main             # come back to the full version
```

See [docs/07-exercises.md](docs/07-exercises.md) for what each level contains.
