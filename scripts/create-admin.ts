import "dotenv/config";
import { createInterface } from "readline";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { hashPassword, validatePasswordPolicy } from "../src/lib/auth/password";
import { validateAndNormalizeEmail } from "../src/lib/auth/email";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function createRl() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(
  rl: ReturnType<typeof createRl>,
  question: string,
): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

/**
 * Read password without echoing to terminal.
 * Falls back to visible input if TTY is not available.
 */
async function askPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = createRl();
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let password = "";
    const onData = (ch: string) => {
      const c = ch.toString();
      if (c === "\n" || c === "\r" || c === "\u0004") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(password);
      } else if (c === "\u0003") {
        // Ctrl+C
        process.stdout.write("\n");
        process.exit(1);
      } else if (c === "\u007F" || c === "\b") {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += c;
        process.stdout.write("*");
      }
    };

    process.stdin.on("data", onData);
  });
}

async function main() {
  // Require interactive TTY
  if (!process.stdin.isTTY) {
    console.error(
      "ERROR: This script requires an interactive terminal (TTY).",
    );
    console.error("       Do not pipe input or run non-interactively.");
    process.exit(1);
  }

  console.log("\n🔐 Create Admin Account — Sristy-Dristy Bike House\n");

  const rl = createRl();

  try {
    // Check if any admin exists
    const initialCount = await prisma.adminUser.count();
    const isFirstAdmin = initialCount === 0;

    if (isFirstAdmin) {
      console.log(
        "ℹ  No admin accounts exist. The first account will have the OWNER role.\n",
      );
    }

    // Prompt for name
    const name = await ask(rl, "Full name: ");
    if (!name.trim()) {
      console.error("\n❌ Name cannot be empty.");
      process.exit(1);
    }

    // Prompt for email
    const email = await ask(rl, "Email: ");
    const normalized = validateAndNormalizeEmail(email);
    if (!normalized) {
      console.error("\n❌ Invalid email address.");
      process.exit(1);
    }

    // Check for duplicate email
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { normalizedEmail: normalized },
    });
    if (existingAdmin) {
      console.error("\n❌ An admin with this email already exists.");
      process.exit(1);
    }

    rl.close();

    // Prompt for password (hidden input)
    const password = await askPassword("Password: ");
    const policyResult = validatePasswordPolicy(password);
    if (!policyResult.valid) {
      console.error(`\n❌ ${policyResult.error}`);
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await askPassword("Confirm password: ");
    if (password !== confirmPassword) {
      console.error("\n❌ Passwords do not match.");
      process.exit(1);
    }

    // Hash password (never print hash or password)
    console.log("\n⏳ Hashing password...");
    const passwordHash = await hashPassword(password);

    // Atomic transaction for bootstrap / creation with Serializable isolation level and bounded retries
    let admin = null;
    const MAX_BOOTSTRAP_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_BOOTSTRAP_RETRIES; attempt++) {
      try {
        admin = await prisma.$transaction(
          async (tx) => {
            const count = await tx.adminUser.count();
            const role = count === 0 ? "OWNER" : "ADMIN";

            const newAdmin = await tx.adminUser.create({
              data: {
                email: email.trim(),
                normalizedEmail: normalized,
                passwordHash,
                name: name.trim(),
                role,
              },
            });

            await tx.auditLog.create({
              data: {
                adminUserId: newAdmin.id,
                action: "ADMIN_BOOTSTRAP_CREATED",
                entityType: "AdminUser",
                entityId: newAdmin.id,
              },
            });

            return newAdmin;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
        break;
      } catch (retryErr: unknown) {
        const isSerializationConflict =
          retryErr instanceof Error &&
          (retryErr.message.includes("P2034") ||
            retryErr.message.includes("40001") ||
            retryErr.message.includes("could not serialize access"));

        if (isSerializationConflict && attempt < MAX_BOOTSTRAP_RETRIES) {
          await new Promise((res) => setTimeout(res, 50 * attempt));
          continue;
        }

        console.error(
          "\n❌ An error occurred while creating the admin account. Please try again.",
        );
        process.exit(1);
      }
    }

    if (!admin) {
      console.error(
        "\n❌ An error occurred while creating the admin account. Please try again.",
      );
      process.exit(1);
    }

    console.log(`\n✅ Admin account created successfully.`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`\n   You can now sign in at /admin/login\n`);
  } catch (error) {
    console.error(
      "\n❌ Failed to create admin:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
