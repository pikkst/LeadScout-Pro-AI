// Seed script: creates the initial Unitel Global admin user.
// Run with: npm run db:seed
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@unitelglobal.com").toLowerCase();
  const name = process.env.SEED_ADMIN_NAME || "Unitel Global Admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Admin user already exists: ${email} — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: "ADMIN" },
  });

  console.log("[seed] Created admin user:");
  console.log(`  email:    ${user.email}`);
  console.log("[seed] IMPORTANT: change this password after first login.");
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
