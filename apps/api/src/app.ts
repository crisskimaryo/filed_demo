// ─────────────────────────────────────────────────────────────
// Builds the app: plugins, error handling, and all the routes.
//
// This is kept separate from index.ts (which just calls .listen)
// so that tests can import `app` and make fake requests against
// it without ever opening a real port.
// ─────────────────────────────────────────────────────────────
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { AppError } from "./lib/errors";
import { authRoute } from "./modules/auth/auth.route";
import { loanRoute } from "./modules/loans/loans.route";
import { profileRoute } from "./modules/profiles/profiles.route";

export const app = new Elysia()
  // Lets a browser frontend on another port call this API.
  .use(cors())

  // Interactive docs, generated from your models. Visit /swagger.
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: { title: "Zeni Loans API", version: "1.0.0" },
        tags: [
          { name: "Auth", description: "Register, login, current user" },
          { name: "Loans", description: "Loan applications" },
          { name: "Profiles", description: "User profile details" },
        ],
      },
    }),
  )

  // ── One error handler for the whole app ──
  // Every thrown error lands here and becomes a clean JSON reply,
  // which is why no route needs its own try/catch.
  .onError(({ code, error, status }) => {
    // Our own errors already know their status code.
    if (error instanceof AppError) {
      return status(error.status, {
        error: error.name,
        message: error.message,
      });
    }

    // Elysia found the request body/params invalid.
    if (code === "VALIDATION") {
      return status(422, {
        error: "ValidationError",
        message: "Some fields are invalid",
        details: error.all.map((issue) => ({
          // `path` only exists on some kinds of validation issue.
          field: "path" in issue ? issue.path : undefined,
          message: "summary" in issue ? issue.summary : issue.message,
        })),
      });
    }

    if (code === "NOT_FOUND") {
      return status(404, {
        error: "NotFound",
        message: "That route does not exist",
      });
    }

    // The body wasn't valid JSON at all (a stray comma, a missing
    // quote). That's the client's mistake, so it's a 400 — not the
    // 500 you'd get if this branch were missing.
    if (code === "PARSE") {
      return status(400, {
        error: "BadRequest",
        message: "Could not parse the request body as JSON",
      });
    }

    // Anything else is a bug in our code. Log the real error for
    // the developer, but never leak internals to the client.
    console.error("[unhandled]", error);

    return status(500, {
      error: "InternalServerError",
      message: "Something went wrong on our side",
    });
  })

  // ── Routes ──
  .get("/", () => ({
    name: "Zeni Loans API",
    docs: "/swagger",
    health: "/api/health",
  }))

  .group("/api", (api) =>
    api
      .get("/health", () => ({ status: "ok", time: new Date().toISOString() }))
      .use(authRoute)
      .use(loanRoute)
      .use(profileRoute),
  );

// Handy for tests: `typeof app` describes every route.
export type App = typeof app;
