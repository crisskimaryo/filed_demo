# Zeni Loans — a full-stack learning project

A loan-management system built to **learn backend development and how an app talks to it**.

```
zeni-bk/
├─ apps/
│  ├─ api/        Bun + Elysia + Prisma 7 + SQLite   (the backend)
│  └─ mobile/     Flutter + Dart                     (the app)
└─ docs/          the curriculum for both
```

---

## Run it

You need **two terminals**. The app does nothing without the API.

**Terminal 1 — the API**

```bash
cd apps/api
bun install
cp .env.example .env
bun run setup         # generate the client, create the tables, add sample data
bun run dev
```

Open **http://localhost:3300/swagger** to try the API without any app.

**Terminal 2 — the app**

```bash
cd apps/mobile
flutter pub get
flutter run
```

Log in with `amina@zeni.test` / `password123` (prefilled).

> The first Android build takes several minutes. After that, saving a file hot-reloads in about a second.

### Sample accounts

All use the password `password123`:

| Email | Role | Sees |
|---|---|---|
| `admin@zeni.test` | ADMIN | every loan, and can approve them |
| `amina@zeni.test` | USER | only her 2 loans |
| `juma@zeni.test` | USER | only his 1 loan |

Log in as amina, then as admin, and watch the same screen show different data. The app code doesn't change — **the backend decides.** That's the central idea of the whole project.

---

## 📚 Learning path

Start with the backend. The app half assumes you know what a token is.

### Part 1 — the backend (`docs/`)

| # | Document | You'll learn |
|---|---|---|
| 0 | [start here](docs/00-start-here.md) | how the web works, what a backend is |
| 1 | [architecture](docs/01-architecture.md) | why the code is split into layers |
| 2 | [request lifecycle](docs/02-request-lifecycle.md) | trace one request end to end |
| 3 | [database & Prisma](docs/03-database-prisma.md) | tables, relations, migrations, queries |
| 4 | [authentication](docs/04-authentication.md) | hashing, tokens, guards, permissions |
| 5 | [errors & validation](docs/05-errors-validation.md) | status codes, rejecting bad input |
| 6 | [testing](docs/06-testing.md) | tests that catch real bugs |
| 7 | [**exercises**](docs/07-exercises.md) | 12 exercises, easy → hard |
| 8 | [glossary](docs/08-glossary.md) | every unfamiliar word |
| 9 | [troubleshooting](docs/09-troubleshooting.md) | fixes for common errors |

### Part 2 — the app (`docs/mobile/`)

| # | Document | You'll learn |
|---|---|---|
| 0 | [start here](docs/mobile/00-start-here.md) | Flutter basics, running both halves |
| 1 | [**how they connect**](docs/mobile/01-connecting.md) | one tap traced through both codebases |
| 2 | [exercises](docs/mobile/02-exercises.md) | 10 exercises, incl. full-stack ones |

**Suggested pace:** backend docs 0–2 on day one. Doc 3 and the first exercises on day two. Come to the app only once you can trace a request through the API's layers — then mobile doc 1 will click instead of confuse.

---

## Commands

**API** (`cd apps/api`)

| Command | Does |
|---|---|
| `bun run setup` | first-time setup: generate client, create tables, seed |
| `bun run dev` | start the server, restart on save |
| `bun test` | run 26 tests (separate database) |
| `bun run typecheck` | check types without running |
| `bun run db:migrate` | apply schema changes |
| `bun run db:seed` | wipe and refill sample data |
| `bun run db:studio` | visual database browser |
| `bun run db:reset` | delete everything and rebuild |

**App** (`cd apps/mobile`)

| Command | Does |
|---|---|
| `flutter run` | build and run on a device |
| `flutter test` | run the tests |
| `flutter analyze` | lint and type-check |
| `flutter devices` | list available devices |

---

## Level branches

Each `level-*` branch is a working checkpoint showing how the backend was built up. `main` has everything.

| Branch | State |
|---|---|
| `level-1-hello` | one file, a few routes, no database |
| `level-2-database` | Prisma + SQLite, loans CRUD, no auth |
| `level-3-modules` | split into model/service/route, validation |
| `level-4-auth` | passwords, JWT, guards, permissions |
| `main` | everything, plus tests, the Flutter app, and these docs |

```bash
git checkout level-1-hello    # jump to a level
git checkout main             # back to the full version
```

Each level has its own database schema, and `.env`, `dev.db` and `src/generated/` are ignored by git — so they don't follow a branch switch. **After switching to any level from 2 onward:**

```bash
cd apps/api
cp .env.example .env
rm -rf src/generated dev.db
bun install
bun run db:migrate    # levels have their own migrations, so use migrate, not setup
bun run db:seed
```

> Note: the level branches contain the API at the repo root (not under `apps/api/`), because they predate the app. Their own READMEs have the right paths.

A good way to use them: check out `level-2-database`, try to split it into layers yourself, then `git diff level-3-modules` to compare with one solution. Yours being different isn't wrong.

---

## The idea behind the project

The same rule appears on both sides of the network, and only one of them counts.

The app hides the "Approve" button from non-admins. That's good manners — but it isn't security, because anyone can ignore the app and call the API directly. The API refuses with `403` regardless. [Mobile doc 1](docs/mobile/01-connecting.md) has a `curl` command that proves it in one line, and it's worth running.

Learn that distinction and most security mistakes stop being tempting.
