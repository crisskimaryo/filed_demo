// ─────────────────────────────────────────────────────────────
// The "are you logged in?" guard.
//
// How it works: a route that needs a logged-in user does
//
//     .use(authGuard).get("/me", ({ user }) => user)
//
// and `user` is guaranteed to exist inside the handler. If the
// token is missing or invalid the request never reaches the
// handler at all.
// ─────────────────────────────────────────────────────────────
import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { env } from "./env";
import { ForbiddenError, UnauthorizedError } from "./errors";

/** What we put inside the token when someone logs in. */
export type TokenPayload = {
  sub: string; // the user's id ("subject" — standard JWT name)
  email: string;
  role: "USER" | "ADMIN";
};

/** Signs and verifies tokens. Used by the auth module to log people in. */
export const jwtPlugin = new Elysia({ name: "jwt" }).use(
  jwt({
    name: "jwt",
    secret: env.JWT_SECRET,
    exp: "7d", // tokens stop working after 7 days
  }),
);

/**
 * Requires a valid token. Adds `user` to the handler context.
 *
 * `derive` runs before the handler and adds fields to the context.
 * Throwing in here stops the request.
 */
export const authGuard = new Elysia({ name: "authGuard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }) => {
    // Expected header: `Authorization: Bearer <token>`
    const auth = headers.authorization;

    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing Authorization header");
    }

    const token = auth.slice("Bearer ".length);
    const payload = (await jwt.verify(token)) as TokenPayload | false;

    if (!payload) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    };
  });

/**
 * Requires the logged-in user to be an ADMIN.
 * Use it AFTER authGuard: .use(authGuard).use(adminGuard)
 */
export const adminGuard = new Elysia({ name: "adminGuard" })
  .use(authGuard)
  .onBeforeHandle({ as: "scoped" }, ({ user }) => {
    // `user` is set by authGuard above. TypeScript can't prove the
    // ordering, so we re-check it — which also protects us if
    // someone ever uses adminGuard without authGuard.
    if (!user || user.role !== "ADMIN") {
      throw new ForbiddenError("Admins only");
    }
  });
