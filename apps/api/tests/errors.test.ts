// Tests for the central error handler in src/app.ts.
//
// These check the SHAPE of failure, which is easy to break by
// accident: a missing branch in onError turns a clear 4xx into a
// confusing 500, and the client can no longer tell whose fault it is.
import { describe, expect, it } from "bun:test";
import { app } from "../src/app";
import { call } from "./helpers";

/** Sends a raw body, bypassing JSON.stringify, to send invalid JSON. */
async function rawPost(path: string, body: string) {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );

  return { status: response.status, body: await response.json() };
}

describe("malformed JSON", () => {
  it("is a 400, not a 500 — the client sent it wrong", async () => {
    const { status, body } = await rawPost(
      "/api/auth/register",
      '{"name":"A","email":"a@b.com",}', // trailing comma
    );

    expect(status).toBe(400);
    expect(body.error).toBe("BadRequest");
  });

  it("handles a body that is not JSON at all", async () => {
    const { status } = await rawPost("/api/auth/login", "{garbage}");

    expect(status).toBe(400);
  });
});

describe("unknown routes", () => {
  it("returns 404 with a helpful message", async () => {
    const { status, body } = await call("GET", "/api/does-not-exist");

    expect(status).toBe(404);
    expect(body.error).toBe("NotFound");
  });

  it("returns 404 for the right path with the wrong method", async () => {
    // /api/auth/login exists, but only as a POST.
    const { status } = await call("GET", "/api/auth/login");

    expect(status).toBe(404);
  });
});

describe("error responses never leak internals", () => {
  it("uses a consistent { error, message } shape", async () => {
    const { body } = await call("GET", "/api/auth/me"); // 401

    expect(body.error).toBeString();
    expect(body.message).toBeString();
    // A stack trace would hand an attacker a map of the codebase.
    expect(body.stack).toBeUndefined();
  });
});
