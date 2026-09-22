// Tests for the loans module — especially the ownership rules,
// which are the easiest thing to break by accident.
import { describe, expect, it } from "bun:test";
import { call, makeUser } from "./helpers";

async function makeLoan(token: string, amount = 10_000) {
  const { body } = await call("POST", "/api/loans", {
    token,
    body: { amount, purpose: "Test loan" },
  });

  return body;
}

describe("POST /api/loans", () => {
  it("creates a loan owned by the logged-in user", async () => {
    const { token, user } = await makeUser();

    const { status, body } = await call("POST", "/api/loans", {
      token,
      body: { amount: 25_000, purpose: "School fees" },
    });

    expect(status).toBe(201);
    expect(body.userId).toBe(user.id);
  });

  it("always starts a new loan as PENDING", async () => {
    const { token } = await makeUser();
    const loan = await makeLoan(token);

    // A user must not be able to create an already-approved loan.
    expect(loan.status).toBe("PENDING");
  });

  it("rejects an amount of zero", async () => {
    const { token } = await makeUser();

    const { status } = await call("POST", "/api/loans", {
      token,
      body: { amount: 0 },
    });

    expect(status).toBe(422);
  });

  it("refuses to create a loan without a token", async () => {
    const { status } = await call("POST", "/api/loans", {
      body: { amount: 5_000 },
    });

    expect(status).toBe(401);
  });
});

describe("GET /api/loans", () => {
  it("shows only your own loans", async () => {
    const amina = await makeUser();
    const juma = await makeUser();

    await makeLoan(amina.token);
    await makeLoan(juma.token);

    const { body } = await call("GET", "/api/loans", { token: amina.token });

    expect(body.items.length).toBe(1);
    expect(body.items[0].userId).toBe(amina.user.id);
  });

  it("supports paging", async () => {
    const { token } = await makeUser();

    await makeLoan(token, 1_000);
    await makeLoan(token, 2_000);
    await makeLoan(token, 3_000);

    const { body } = await call("GET", "/api/loans?take=2", { token });

    expect(body.items.length).toBe(2);
    expect(body.total).toBe(3); // total ignores the page size
  });
});

describe("loan ownership", () => {
  it("hides someone else's loan with a 403", async () => {
    const amina = await makeUser();
    const juma = await makeUser();

    const loan = await makeLoan(amina.token);

    const { status } = await call("GET", `/api/loans/${loan.id}`, {
      token: juma.token,
    });

    expect(status).toBe(403);
  });

  it("stops you deleting someone else's loan", async () => {
    const amina = await makeUser();
    const juma = await makeUser();

    const loan = await makeLoan(amina.token);

    const { status } = await call("DELETE", `/api/loans/${loan.id}`, {
      token: juma.token,
    });

    expect(status).toBe(403);
  });

  it("returns 404 for a loan that does not exist", async () => {
    const { token } = await makeUser();

    const { status } = await call("GET", "/api/loans/does-not-exist", { token });

    expect(status).toBe(404);
  });

  it("stops a normal user approving their own loan", async () => {
    const { token } = await makeUser();
    const loan = await makeLoan(token);

    const { status } = await call("PATCH", `/api/loans/${loan.id}`, {
      token,
      body: { status: "ACTIVE" },
    });

    expect(status).toBe(403);
  });

  it("lets you edit your own loan's purpose", async () => {
    const { token } = await makeUser();
    const loan = await makeLoan(token);

    const { status, body } = await call("PATCH", `/api/loans/${loan.id}`, {
      token,
      body: { purpose: "Updated purpose" },
    });

    expect(status).toBe(200);
    expect(body.purpose).toBe("Updated purpose");
  });
});
