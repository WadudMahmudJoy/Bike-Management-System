import "dotenv/config";
import { execFile } from "child_process";
import { resolve } from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runCliSmokeTest() {
  console.log(
    "\n🧪 Running Owner Bootstrap CLI Non-Interactive Smoke Test...\n",
  );

  const initialAdminCount = await prisma.adminUser.count();

  const scriptPath = resolve(__dirname, "create-admin.ts");
  const preloadPath = resolve(__dirname, "register-server-only-mock.cjs");

  const tsxBin = resolve(
    __dirname,
    "../node_modules/.bin/tsx" + (process.platform === "win32" ? ".cmd" : ""),
  );

  return new Promise<void>((resolvePromise, rejectPromise) => {
    execFile(
      tsxBin,
      ["-r", preloadPath, scriptPath],
      {
        env: { ...process.env },
        shell: process.platform === "win32",
      },
      async (error: Error | null, stdout: string, stderr: string) => {
        try {
          const combinedOutput = `${stdout}\n${stderr}`;

          // 1. Process must exit non-zero
          if (!error) {
            console.error(
              "  ✗ FAILED: CLI exited with status 0 in non-interactive mode.",
            );
            return rejectPromise(
              new Error("CLI should fail non-interactively."),
            );
          }
          console.log("  ✓ Test 1: CLI exited non-zero as expected.");

          // 2. Output must contain expected TTY requirement message
          const hasTtyError = combinedOutput.includes(
            "ERROR: This script requires an interactive terminal (TTY)",
          );
          if (!hasTtyError) {
            console.error("  ✗ FAILED: Output missing TTY error message.");
            console.error("    Combined output:", combinedOutput);
            return rejectPromise(new Error("Missing TTY error message."));
          }
          console.log(
            "  ✓ Test 2: Output contains TTY-required protection message.",
          );

          // 3. Output must NOT contain server-only import failure
          const hasServerOnlyFailure =
            combinedOutput.includes("MODULE_NOT_FOUND") ||
            combinedOutput.includes("server-only");
          if (hasServerOnlyFailure) {
            console.error(
              "  ✗ FAILED: Output contains server-only import failure.",
            );
            console.error("    Combined output:", combinedOutput);
            return rejectPromise(
              new Error("Server-only import failure detected."),
            );
          }
          console.log(
            "  ✓ Test 3: Output does not contain server-only import failure.",
          );

          // 4. Verify no new admin user row was created
          const finalAdminCount = await prisma.adminUser.count();
          if (finalAdminCount !== initialAdminCount) {
            console.error("  ✗ FAILED: Admin row was unexpectedly created.");
            return rejectPromise(
              new Error("Admin row created during non-interactive run."),
            );
          }
          console.log(
            "  ✓ Test 4: Database confirmed no admin row was created.",
          );

          console.log(
            "\n✅ All Owner Bootstrap CLI Smoke Tests PASSED CLEANLY!\n",
          );
          resolvePromise();
        } catch (err) {
          rejectPromise(err);
        } finally {
          await prisma.$disconnect();
          await pool.end();
        }
      },
    );
  });
}

runCliSmokeTest().catch((err) => {
  console.error("Smoke test failure:", err);
  process.exit(1);
});
