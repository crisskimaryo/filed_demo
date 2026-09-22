// ─────────────────────────────────────────────────────────────
// Seeding = filling the database with sample data to develop
// against, so you're not registering users by hand every time
// you reset.
//
// Run it with:  bun run db:seed
// ─────────────────────────────────────────────────────────────
import { password } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🌱 Seeding...");

  // Start clean. Loans go first because they point at users.
  await prisma.loan.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const hashed = await password.hash("password123");

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@zeni.test",
      password: hashed,
      role: "ADMIN",
      profile: { create: { bio: "I approve loans." } },
    },
  });

  const amina = await prisma.user.create({
    data: {
      name: "Amina Juma",
      email: "amina@zeni.test",
      password: hashed,
      profile: { create: { bio: "Learning backend development." } },
      // Nested create: make the user AND their loans in one go.
      loans: {
        create: [
          { amount: 500_000, purpose: "School fees", status: "ACTIVE" },
          { amount: 120_000, purpose: "Laptop", status: "PENDING" },
        ],
      },
    },
  });

  const juma = await prisma.user.create({
    data: {
      name: "Juma Ali",
      email: "juma@zeni.test",
      password: hashed,
      profile: { create: {} },
      loans: {
        create: [{ amount: 75_000, purpose: "Books", status: "PAID" }],
      },
    },
  });

  console.log(`✅ Created 3 users and 3 loans.`);
  console.log(`\n   Log in with any of these (password: password123):`);
  console.log(`   ${admin.email}  (ADMIN — sees every loan)`);
  console.log(`   ${amina.email}  (USER  — 2 loans)`);
  console.log(`   ${juma.email}   (USER  — 1 loan)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
