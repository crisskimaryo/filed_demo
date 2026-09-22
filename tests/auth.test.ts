// Tests for the auth module.
//
// Each `expect` here is a rule from the code written as something
// the computer can check. Run them with: bun test
import { describe, expect, it } from "bun:test";
import { call, makeUser } from "./helpers";

describe("POST /api/auth/register", () => {
  it("creates a user and returns a token", async () => {
    const email = `new-${Date.now()}@test.com`;

    const { status, body } = await call("POST", "/api/auth/register", {
      body: { name: "New User", email, password: "password123" },
    });

    expect(status).toBe(201);
    expect(body.user.email).toBe(email);
    expect(body.token).toBeString();
  });

  it("never returns the password", async () => {
    const { user } = await makeUser();
    expect(user.password).toBeUndefined();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const { status } = await call("POST", "/api/auth/register", {
      body: { name: "Short", email: `s-${Date.now()}@test.com`, password: "123" },
    });

    expect(status).toBe(422);
  });

  it("rejects an email that is already registered", async () => {
    const { user } = await makeUser();

    const { status, body } = await call("POST", "/api/auth/register", {
      body: { name: "Copycat", email: user.email, password: "password123" },
    });

    expect(status).toBe(409);
    expect(body.message).toBe("Email already registered");
  });
});

describe("POST /api/auth/login", () => {
  it("returns a token for the right password", async () => {
    const { user } = await makeUser();

    const { status, body } = await call("POST", "/api/auth/login", {
      body: { email: user.email, password: "password123" },
    });

    expect(status).toBe(200);
    expect(body.token).toBeString();
  });

  it("rejects the wrong password", async () => {
    const { user } = await makeUser();

    const { status } = await call("POST", "/api/auth/login", {
      body: { email: user.email, password: "totally-wrong" },
    });

    expect(status).toBe(401);
  });

  it("gives the same message for a wrong email and a wrong password", async () => {
    const { user } = await makeUser();

    const wrongPassword = await call("POST", "/api/auth/login", {
      body: { email: user.email, password: "totally-wrong" },
    });

    const noSuchUser = await call("POST", "/api/auth/login", {
      body: { email: "nobody@test.com", password: "password123" },
    });

    // Identical on purpose: revealing which one was wrong tells an
    // attacker whether an email has an account.
    expect(wrongPassword.body.message).toBe(noSuchUser.body.message);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the logged-in user", async () => {
    const { token, user } = await makeUser();

    const { status, body } = await call("GET", "/api/auth/me", { token });

    expect(status).toBe(200);
    expect(body.id).toBe(user.id);
  });

  it("refuses a request with no token", async () => {
    const { status } = await call("GET", "/api/auth/me");
    expect(status).toBe(401);
  });

  it("refuses a made-up token", async () => {
    const { status } = await call("GET", "/api/auth/me", {
      token: "not.a.real.token",
    });

    expect(status).toBe(401);
  });
});
