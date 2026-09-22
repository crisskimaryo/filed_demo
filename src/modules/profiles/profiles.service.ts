// ─────────────────────────────────────────────────────────────
// LOGIC for profiles.
//
// A profile always belongs to exactly one user, so there is no id
// in these functions — the logged-in user IS the address.
// ─────────────────────────────────────────────────────────────
import { NotFoundError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import type { UpdateProfileInput } from "./profiles.model";

export const ProfileService = {
  async findByUserId(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!profile) {
      throw new NotFoundError("Profile");
    }

    return profile;
  },

  /**
   * `upsert` = update if it exists, otherwise create it. This means
   * the route works even for a user whose profile row is missing,
   * without us writing an if/else.
   */
  update(userId: string, data: UpdateProfileInput) {
    return prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  },
};
