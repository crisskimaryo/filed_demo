// Tests for the profiles module.
import { describe, expect, it } from "bun:test";
import { call, makeUser } from "./helpers";

describe("GET /api/profiles/me", () => {
  it("returns a profile, created automatically at register time", async () => {
    const { token, user } = await makeUser();

    const { status, body } = await call("GET", "/api/profiles/me", { token });

    expect(status).toBe(200);
    expect(body.userId).toBe(user.id);
  });

  it("needs a token", async () => {
    const { status } = await call("GET", "/api/profiles/me");
    expect(status).toBe(401);
  });
});

describe("PATCH /api/profiles/me", () => {
  it("updates the fields you send", async () => {
    const { token } = await makeUser();

    const { status, body } = await call("PATCH", "/api/profiles/me", {
      token,
      body: { bio: "Learning backend", phone: "+255700000000" },
    });

    expect(status).toBe(200);
    expect(body.bio).toBe("Learning backend");
  });

  it("leaves out fields you did not send", async () => {
    const { token } = await makeUser();

    await call("PATCH", "/api/profiles/me", {
      token,
      body: { bio: "First bio", phone: "+255700000000" },
    });

    // Only bio is sent this time — phone should survive.
    const { body } = await call("PATCH", "/api/profiles/me", {
      token,
      body: { bio: "Second bio" },
    });

    expect(body.bio).toBe("Second bio");
    expect(body.phone).toBe("+255700000000");
  });

  it("rejects an avatarUrl that is not a URL", async () => {
    const { token } = await makeUser();

    const { status } = await call("PATCH", "/api/profiles/me", {
      token,
      body: { avatarUrl: "not-a-url" },
    });

    expect(status).toBe(422);
  });
});
