// SHAPES for the profiles module.
import { t } from "elysia";

export const ProfileModel = {
  updateBody: t.Object({
    // t.Nullable lets the client clear a field by sending null.
    bio: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
    phone: t.Optional(t.Nullable(t.String({ maxLength: 30 }))),
    avatarUrl: t.Optional(t.Nullable(t.String({ format: "uri" }))),
  }),
};

export type UpdateProfileInput = typeof ProfileModel.updateBody.static;
