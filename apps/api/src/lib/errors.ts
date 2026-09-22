// ─────────────────────────────────────────────────────────────
// Custom error types.
//
// The idea: a service says WHAT went wrong by throwing one of
// these. It does not know or care about HTTP. The error handler
// in src/app.ts turns the error into the right status code.
//
// This is why loans.service.ts has no status codes in it.
// ─────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 404 — the thing you asked for does not exist. */
export class NotFoundError extends AppError {
  constructor(what = "Resource") {
    super(`${what} not found`, 404);
  }
}

/** 400 — the request itself was wrong. */
export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

/** 401 — we don't know who you are (bad/missing login). */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

/** 403 — we know who you are, you're just not allowed. */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

/** 409 — conflicts with something that already exists. */
export class ConflictError extends AppError {
  constructor(message = "Already exists") {
    super(message, 409);
  }
}
