// ─────────────────────────────────────────────────────────────
// HTTP for loans. Every route here needs a login, so authGuard
// is applied once at the top instead of per-route.
// ─────────────────────────────────────────────────────────────
import { Elysia } from "elysia";
import { authGuard } from "../../lib/auth.middleware";
import { LoanModel } from "./loans.model";
import { LoanService } from "./loans.service";

export const loanRoute = new Elysia({ prefix: "/loans", tags: ["Loans"] })
  .use(authGuard)

  // GET /api/loans?status=ACTIVE&take=10
  .get(
    "/",
    ({ user, query }) => LoanService.findAll(user, query),
    {
      query: LoanModel.query,
      detail: { summary: "List your loans (all loans if admin)" },
    },
  )

  // GET /api/loans/:id
  .get(
    "/:id",
    ({ params, user }) => LoanService.findById(params.id, user),
    {
      params: LoanModel.params,
      detail: { summary: "Get one loan" },
    },
  )

  // POST /api/loans
  .post(
    "/",
    async ({ body, user, status }) => {
      const loan = await LoanService.create(user.id, body);
      return status(201, loan);
    },
    {
      body: LoanModel.createBody,
      detail: { summary: "Apply for a loan" },
    },
  )

  // PATCH /api/loans/:id
  .patch(
    "/:id",
    ({ params, body, user }) => LoanService.update(params.id, body, user),
    {
      params: LoanModel.params,
      body: LoanModel.updateBody,
      detail: { summary: "Update a loan (status: admin only)" },
    },
  )

  // DELETE /api/loans/:id
  .delete(
    "/:id",
    ({ params, user }) => LoanService.delete(params.id, user),
    {
      params: LoanModel.params,
      detail: { summary: "Delete a loan" },
    },
  );
