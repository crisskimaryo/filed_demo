// SHAPES for the loans module. See auth.model.ts for the idea.
import { t } from "elysia";

const LoanStatus = t.Union([
  t.Literal("PENDING"),
  t.Literal("ACTIVE"),
  t.Literal("PAID"),
  t.Literal("DEFAULTED"),
]);

export const LoanModel = {
  params: t.Object({
    id: t.String({ minLength: 1 }),
  }),

  createBody: t.Object({
    // Note: no userId here. We take the owner from the login
    // token, never from the body — otherwise anyone could create
    // a loan in someone else's name by editing the JSON.
    amount: t.Integer({ minimum: 1, description: "Amount in cents" }),
    purpose: t.Optional(t.String({ maxLength: 200 })),
  }),

  updateBody: t.Object({
    amount: t.Optional(t.Integer({ minimum: 1 })),
    status: t.Optional(LoanStatus),
    purpose: t.Optional(t.String({ maxLength: 200 })),
  }),

  // Pagination + filtering on the query string:
  //   GET /api/loans?status=ACTIVE&take=10&skip=0
  query: t.Object({
    status: t.Optional(LoanStatus),
    take: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
    skip: t.Optional(t.Integer({ minimum: 0, default: 0 })),
  }),
};

export type CreateLoanInput = typeof LoanModel.createBody.static;
export type UpdateLoanInput = typeof LoanModel.updateBody.static;
export type LoanQuery = typeof LoanModel.query.static;
