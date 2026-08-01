import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required for seeding.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding ShopSetting foundation...");

  // Idempotent upsert of non-sensitive ShopSetting entries
  await prisma.shopSetting.upsert({
    where: { key: "business_name" },
    update: { value: "Sristy-Dristy Bike House" },
    create: {
      key: "business_name",
      value: "Sristy-Dristy Bike House",
    },
  });

  await prisma.shopSetting.upsert({
    where: { key: "legal_name" },
    update: { value: "Sristy-Dristy Enterprise" },
    create: {
      key: "legal_name",
      value: "Sristy-Dristy Enterprise",
    },
  });

  console.log("ShopSetting foundation seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
