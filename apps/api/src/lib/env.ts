// ─────────────────────────────────────────────────────────────
// Reads and validates environment variables ONCE, at startup.
//
// Why bother? If JWT_SECRET is missing you want to find out the
// moment you start the server — not at 2am when the first user
// tries to log in and gets a 500.
// ─────────────────────────────────────────────────────────────

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}\n` +
        `Copy .env.example to .env and fill it in.`,
    );
  }

  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  PORT: Number(process.env.PORT ?? 3300),
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
