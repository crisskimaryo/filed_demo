// HTTP for profiles.
import { Elysia } from "elysia";
import { authGuard } from "../../lib/auth.middleware";
import { ProfileModel } from "./profiles.model";
import { ProfileService } from "./profiles.service";

export const profileRoute = new Elysia({ prefix: "/profiles", tags: ["Profiles"] })
  .use(authGuard)

  // GET /api/profiles/me
  .get("/me", ({ user }) => ProfileService.findByUserId(user.id), {
    detail: { summary: "Get your profile" },
  })

  // PATCH /api/profiles/me
  .patch("/me", ({ user, body }) => ProfileService.update(user.id, body), {
    body: ProfileModel.updateBody,
    detail: { summary: "Update your profile" },
  });
