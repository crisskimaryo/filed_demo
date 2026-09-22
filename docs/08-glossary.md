# 8. Glossary

Every term used in these docs, defined plainly. Alphabetical.

**API** — the list of questions a backend agrees to answer. Ours: `GET /api/loans`, `POST /api/auth/login`, etc.

**Argon2 / bcrypt** — algorithms for hashing passwords. Deliberately slow, to make brute-force guessing impractical. We use bcrypt with `cost: 10`.

**Authentication** — *who are you?* Logging in. Compare **authorization**.

**Authorization** — *are you allowed to do this?* Permissions. Being logged in (authenticated) doesn't mean you may delete someone else's loan.

**`Bearer`** — the convention in `Authorization: Bearer <token>`, meaning "whoever bears this token is authorised".

**Bun** — the runtime that executes our TypeScript. An alternative to Node.js; runs `.ts` files directly with no build step, and includes a test runner, a bundler and password hashing.

**CORS** (Cross-Origin Resource Sharing) — browser rules about which websites may call your API. Without the `cors()` plugin, a frontend on a different port would be blocked by the browser.

**CRUD** — Create, Read, Update, Delete. The four basic data operations; most endpoints are one of them.

**cuid** — a collision-resistant unique id, like `cmucfj11n0000fc9khdlvxkt2`. Our `@default(cuid())` generates them. Unlike a counting number (1, 2, 3…), it doesn't reveal how many records you have or let someone guess the next one.

**Driver adapter** — in Prisma 7, the piece that actually talks to a specific database. We use `@prisma/adapter-libsql` for SQLite. (The more common `better-sqlite3` adapter is a native Node module Bun can't load — see [doc 9](09-troubleshooting.md).)

**Elysia** — our web framework. Turns incoming HTTP requests into function calls, and handles routing, validation and plugins.

**Endpoint** — one method-and-path combination the API answers, like `POST /api/loans`.

**Enum** — a field that may only hold one of a fixed list of values. `LoanStatus` is `PENDING | ACTIVE | PAID | DEFAULTED`.

**Environment variable** — a setting passed in from outside the code, kept in `.env`. Used for anything that differs between your laptop and a real server, and for secrets that must never be committed.

**Foreign key** — a column pointing at another table's row. `Loan.userId` holds the id of the owning user.

**Guard** — reusable code that runs before handlers and can reject a request. Our `authGuard` rejects anything without a valid token.

**Handler** — the function that runs for a matched route.

**Hash** — a one-way transformation. The same input always gives the same output, but there's no way back. Passwords are stored hashed so a database leak doesn't expose them.

**Header** — metadata attached to a request or response. `Authorization` carries the token; `Content-Type` says the body is JSON.

**HTTP** — the protocol browsers and servers use to talk. Also **stateless**: the server doesn't remember you between requests, which is why tokens exist.

**Index** — a database structure that makes lookups on a column fast. Without `@@index([userId])`, finding a user's loans means scanning every row.

**JSON** — the text format for exchanging data. Supports strings, numbers, booleans, `null`, arrays and objects — but not dates, which is why dates travel as strings.

**JWT** (JSON Web Token) — a signed token proving you logged in. Three dot-separated parts: header, payload, signature. **The payload is readable by anyone** — it's only base64, not encryption. The signature is what prevents tampering.

**Method** — the kind of action: `GET` (read), `POST` (create), `PATCH` (partially change), `PUT` (replace), `DELETE` (remove).

**Middleware** — code that runs between the request arriving and the handler, often to check or add something. Our `authGuard` is middleware.

**Migration** — one recorded change to your database structure, saved as SQL in `prisma/migrations/`. Keeping the history lets the same change be replayed on another database — which is how you update production without losing data.

**N+1 problem** — fetching a list (1 query) then looping to fetch each item's relation (N queries). Fixed with `include`, which fetches everything together. Spot it in the query log: the same query repeating.

**ORM** (Object-Relational Mapper) — a library letting you use database rows as objects instead of writing SQL. Prisma is ours.

**Payload** — the data inside something. A JWT's payload holds the user id, email and role.

**Primary key** — the column uniquely identifying a row. Marked `@id`.

**Prisma** — our database toolkit: schema, migrations, and a typed client.

**Query parameter** — the part of a URL after `?`. In `/api/loans?status=ACTIVE&take=10`, there are two.

**Rate limiting** — capping how many requests someone may make in a period, replying `429`. Stops brute-force password guessing (exercise 9).

**Relation** — a link between tables. **One-to-many**: a user has many loans. **One-to-one**: a user has one profile (enforced with `@unique` on the foreign key).

**Route** — a method plus path, mapped to a handler.

**Salt** — random data mixed into a hash so identical passwords produce different hashes. bcrypt does this automatically. Without salts, an attacker could hash `password123` once and find everyone who used it.

**Schema** — the description of your database structure. Ours is `prisma/schema.prisma`.

**Seed** — sample data loaded into a development database so you're not creating test records by hand. Ours is `prisma/seed.ts`, run with `bun run db:seed`.

**Select vs include** — `select` lists exactly the fields you want (use it to *exclude* passwords); `include` gives all normal fields plus a relation.

**Service** — the layer holding business logic and database calls, knowing nothing about HTTP. The `*.service.ts` files.

**Soft delete** — marking a row deleted (`deletedAt`) instead of removing it, so it can be audited or restored (exercise 12).

**SQL** — the language databases understand. Prisma writes it for you; the dev server logs it so you can see what your queries become.

**SQL injection** — an attack where user input is treated as SQL commands. Prisma prevents it by sending values as **parameters**, separate from the query text — those `?` marks in the log.

**SQLite** — our database. A single file (`prisma/dev.db`) with no server to run. Great for learning and small apps; its limits show when several servers need to write at once.

**Status code** — the 3-digit number on every response. `2xx` worked, `4xx` the client's fault, `5xx` the server's. See [doc 5](05-errors-validation.md).

**Stateless** — keeping no memory between requests. HTTP is stateless, which is why each request must carry its own token.

**Swagger / OpenAPI** — a standard for describing an API, and the clickable page generated from it. Ours is at `/swagger`, built automatically from the `*.model.ts` validators.

**Token** — a string proving you already logged in, sent with later requests so you don't resend your password. See **JWT**.

**Transaction** — a group of database operations that all succeed or all fail. Prisma's nested writes are transactional, which is why registering a user can't leave you with a user but no profile.

**TypeScript** — JavaScript plus types. Catches mistakes (a typo'd field, a possibly-null value) before the code runs.

**Upsert** — update if the row exists, otherwise create it. Used in `profiles.service.ts`.

**Validation** — checking incoming data is well-formed *before* your logic runs. Declared in `*.model.ts`; Elysia enforces it. Not the same as authorization: `{"status":"ACTIVE"}` is valid input, but whether you may send it depends on your role.
