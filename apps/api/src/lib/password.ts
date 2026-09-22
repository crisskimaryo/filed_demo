// ─────────────────────────────────────────────────────────────
// Password hashing.
//
// RULE: never store a password you can read back. We store a
// one-way hash. To check a login we hash the attempt and compare
// hashes — we never decrypt the stored one, because we can't.
//
// Bun has bcrypt/argon2 built in, so there is no library to add.
// ─────────────────────────────────────────────────────────────

export const password = {
  hash(plain: string) {
    return Bun.password.hash(plain, {
      algorithm: "bcrypt",
      cost: 10, // higher = slower = harder to brute force
    });
  },

  verify(plain: string, hash: string) {
    return Bun.password.verify(plain, hash);
  },
};
