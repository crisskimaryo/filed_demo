// ─────────────────────────────────────────────────────────────
// HTTP. Maps URLs to service calls.
//
// Each route is: validate input -> call the service -> shape the
// reply. If a route grows past ~10 lines, the extra logic almost
// always belongs in the service instead.
// ─────────────────────────────────────────────────────────────
import { Elysia } from "elysia";
import { authGuard, jwtPlugin } from "../../lib/auth.middleware";
import { NotFoundError } from "../../lib/errors";
import { AuthModel } from "./auth.model";
import { AuthService } from "./auth.service";

export const authRoute = new Elysia({ prefix: "/auth", tags: ["Auth"] })
  .use(jwtPlugin)

  // POST /api/auth/register — make a new account
  .post(
    "/register",
    async ({ body, jwt, status }) => {
      const user = await AuthService.register(body);

      // Log them straight in so the client doesn't have to
      // immediately POST to /login as well.
      const token = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return status(201, { user, token });
    },
    {
      body: AuthModel.registerBody,
      detail: { summary: "Create an account" },
    },
  )

  // POST /api/auth/login — exchange email+password for a token
  .post(
    "/login",
    async ({ body, jwt }) => {
      const user = await AuthService.verifyCredentials(body);

      const token = await jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      };
    },
    {
      body: AuthModel.loginBody,
      detail: { summary: "Log in and get a token" },
    },
  )

  // GET /api/auth/me — who am I? (needs a token)
  .use(authGuard)
  .get(
    "/me",
    async ({ user }) => {
      const found = await AuthService.findById(user.id);

      if (!found) {
        throw new NotFoundError("User");
      }

      return found;
    },
    { detail: { summary: "Get the logged-in user" } },
  );
