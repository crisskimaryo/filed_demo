// ─────────────────────────────────────────────────────────────
// LOGIC. Talks to the database. Knows nothing about HTTP.
//
// Notice there is no `status(404)` anywhere in this file — it
// throws errors instead. That is what lets you reuse these
// functions from a script, a test, or a queue worker.
// ─────────────────────────────────────────────────────────────
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { password as pw } from "../../lib/password";
import { prisma } from "../../lib/prisma";
import type { LoginInput, RegisterInput } from "./auth.model";

/** Fields we are willing to send back. Note: no password. */
const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export const AuthService = {
  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError("Email already registered");
    }

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        // Hash before storing. The plain password is never saved.
        password: await pw.hash(data.password),
        // Create the empty profile at the same time.
        profile: { create: {} },
      },
      select: publicUser,
    });
  },

  /** Checks email + password. Returns the user, or throws. */
  async verifyCredentials(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Deliberately the SAME message for "no such email" and "wrong
    // password". Saying which one was wrong tells an attacker
    // whether an email is registered.
    if (!user || !(await pw.verify(data.password, user.password))) {
      throw new UnauthorizedError("Invalid email or password");
    }

    return user;
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { ...publicUser, profile: true },
    });
  },
};
