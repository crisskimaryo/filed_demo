// ─────────────────────────────────────────────────────────────
// LOGIC for loans.
//
// Every function that touches one specific loan takes the
// requesting user's id and role, so the ownership rule ("you can
// only touch your own loans, unless you're an admin") is enforced
// in ONE place. A new route cannot forget to check it.
// ─────────────────────────────────────────────────────────────
import { ForbiddenError, NotFoundError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import type { CreateLoanInput, LoanQuery, UpdateLoanInput } from "./loans.model";

/** The loan's owner, trimmed down for API responses. */
const withOwner = {
  user: { select: { id: true, name: true, email: true } },
} as const;

type Requester = { id: string; role: "USER" | "ADMIN" };

export const LoanService = {
  /** Admins see every loan; a normal user sees only their own. */
  async findAll(requester: Requester, query: LoanQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where = {
      ...(requester.role === "ADMIN" ? {} : { userId: requester.id }),
      ...(query.status ? { status: query.status } : {}),
    };

    // Run the page query and the total count together.
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: withOwner,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.loan.count({ where }),
    ]);

    return { items, total, take, skip };
  },

  async findById(id: string, requester: Requester) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: withOwner,
    });

    if (!loan) {
      throw new NotFoundError("Loan");
    }

    // 404 exists, 403 means "exists but not yours".
    if (loan.userId !== requester.id && requester.role !== "ADMIN") {
      throw new ForbiddenError("This loan belongs to someone else");
    }

    return loan;
  },

  create(userId: string, data: CreateLoanInput) {
    return prisma.loan.create({
      data: {
        userId,
        amount: data.amount,
        purpose: data.purpose,
        // status is left out on purpose — the schema defaults it
        // to PENDING. A user must not pick their own status.
      },
      include: withOwner,
    });
  },

  async update(id: string, data: UpdateLoanInput, requester: Requester) {
    // Reuse findById so the ownership check is not duplicated.
    await this.findById(id, requester);

    // Only an admin may change a loan's status.
    if (data.status && requester.role !== "ADMIN") {
      throw new ForbiddenError("Only an admin can change a loan's status");
    }

    return prisma.loan.update({
      where: { id },
      data,
      include: withOwner,
    });
  },

  async delete(id: string, requester: Requester) {
    await this.findById(id, requester);

    await prisma.loan.delete({ where: { id } });

    return { message: "Loan deleted", id };
  },
};
