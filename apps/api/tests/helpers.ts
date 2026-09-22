// Shared helpers for tests.
import { app } from "../src/app";

/**
 * Makes a fake request straight to the app — no server, no port.
 * This is why app.ts and index.ts are separate files.
 */
export async function call(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
  );

  // Some replies (like 404s) may not be JSON, so guard the parse.
  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return { status: response.status, body: json };
}

/** Registers a throwaway user and returns their token. */
export async function makeUser(overrides: Record<string, string> = {}) {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;

  const { body } = await call("POST", "/api/auth/register", {
    body: {
      name: "Test User",
      email,
      password: "password123",
      ...overrides,
    },
  });

  return { token: body.token as string, user: body.user };
}
