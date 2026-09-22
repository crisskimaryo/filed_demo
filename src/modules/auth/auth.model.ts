// ─────────────────────────────────────────────────────────────
// SHAPES. What a valid request body looks like.
//
// `t` is Elysia's validator. Because the rules live here as data,
// Elysia can both (a) reject bad requests before your code runs
// and (b) generate the Swagger docs automatically.
// ─────────────────────────────────────────────────────────────
import { t } from "elysia";

export const AuthModel = {
  registerBody: t.Object({
    name: t.String({ minLength: 2, maxLength: 60 }),
    email: t.String({ format: "email" }),
    // 8 chars minimum. Try POSTing a 3-char password and watch
    // Elysia reject it with a 422 before auth.service.ts is reached.
    password: t.String({ minLength: 8, maxLength: 100 }),
  }),

  loginBody: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 1 }),
  }),
};

// `typeof X.static` converts an Elysia validator into a TS type,
// so the shape is written once and used for both checks and types.
export type RegisterInput = typeof AuthModel.registerBody.static;
export type LoginInput = typeof AuthModel.loginBody.static;
