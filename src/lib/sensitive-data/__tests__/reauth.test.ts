import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  checkRevealThrottle,
  recordRevealFailure,
  clearRevealThrottle,
  getGlobalRevealKeyHash,
  getNetworkRevealKeyHash,
} from "../reauth";

describe("Password Re-Authentication & Dual Reveal Throttling", () => {
  const adminId = "a0000000-0000-4000-a000-000000000001";
  const clientIp = "192.168.1.100";
  const secret = "a".repeat(32);

  let globalHash: string;
  let networkHash: string;

  beforeEach(async () => {
    process.env.AUTH_RATE_LIMIT_SECRET = secret;
    globalHash = getGlobalRevealKeyHash(adminId);
    networkHash = getNetworkRevealKeyHash(adminId, clientIp);

    // Clear test reveal throttle records
    await prisma.adminLoginThrottle.deleteMany({
      where: { keyHash: { in: [globalHash, networkHash] } },
    });
  });

  afterEach(async () => {
    await prisma.adminLoginThrottle.deleteMany({
      where: { keyHash: { in: [globalHash, networkHash] } },
    });
  });

  it("hashes reveal keys using rate limit secret", () => {
    const expectedGlobal = crypto
      .createHmac("sha256", secret)
      .update(`sensitive-reveal:admin:${adminId}`, "utf8")
      .digest("hex")
      .toLowerCase();

    expect(globalHash).toBe(expectedGlobal);
    expect(globalHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("starts unblocked when no failure attempts recorded", async () => {
    const res = await checkRevealThrottle(adminId, clientIp);
    expect(res.isBlocked).toBe(false);
  });

  it("blocks after 5 failed attempts across single IP", async () => {
    for (let i = 1; i <= 4; i++) {
      await recordRevealFailure(adminId, clientIp);
      const status = await checkRevealThrottle(adminId, clientIp);
      expect(status.isBlocked).toBe(false);
    }

    // 5th failure blocks
    await recordRevealFailure(adminId, clientIp);
    const blockedStatus = await checkRevealThrottle(adminId, clientIp);
    expect(blockedStatus.isBlocked).toBe(true);
    expect(blockedStatus.blockedUntil).not.toBeNull();
  });

  it("blocks distributed IP attempts via primary global per-admin throttle", async () => {
    const ips = ["10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.4", "10.0.0.5"];

    for (let i = 0; i < 4; i++) {
      await recordRevealFailure(adminId, ips[i]);
      const status = await checkRevealThrottle(adminId, ips[i]);
      expect(status.isBlocked).toBe(false);
    }

    // 5th failure from a 5th distinct IP blocks global admin throttle
    await recordRevealFailure(adminId, ips[4]);

    // Check with a completely new 6th IP
    const distributedStatus = await checkRevealThrottle(adminId, "10.0.0.6");
    expect(distributedStatus.isBlocked).toBe(true);
  });

  it("clears both reveal throttle keys atomically on success", async () => {
    // Record 5 failures to block
    for (let i = 0; i < 5; i++) {
      await recordRevealFailure(adminId, clientIp);
    }
    expect((await checkRevealThrottle(adminId, clientIp)).isBlocked).toBe(true);

    // Clear reveal throttle
    await clearRevealThrottle(adminId, clientIp);
    expect((await checkRevealThrottle(adminId, clientIp)).isBlocked).toBe(false);
  });

  it("keeps reveal throttle isolated from normal login throttle", async () => {
    // Normal login throttle key hash format: hmacSha256Hex("admin-login:admin@example.com:192.168.1.100")
    const loginKeyHash = crypto
      .createHmac("sha256", secret)
      .update("admin-login:testadmin@example.com:192.168.1.100", "utf8")
      .digest("hex")
      .toLowerCase();

    // Record 5 reveal failures
    for (let i = 0; i < 5; i++) {
      await recordRevealFailure(adminId, clientIp);
    }

    // Verify login key record does NOT exist
    const loginRecord = await prisma.adminLoginThrottle.findUnique({
      where: { keyHash: loginKeyHash },
    });
    expect(loginRecord).toBeNull();
  });
});
