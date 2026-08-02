-- CreateTable
CREATE TABLE "AdminLoginThrottle" (
    "id" UUID NOT NULL,
    "keyHash" VARCHAR(64) NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedUntil" TIMESTAMPTZ(3),
    "lastAttemptAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AdminLoginThrottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminLoginThrottle_keyHash_key" ON "AdminLoginThrottle"("keyHash");

-- CreateIndex
CREATE INDEX "AdminLoginThrottle_blockedUntil_idx" ON "AdminLoginThrottle"("blockedUntil");

-- CreateIndex
CREATE INDEX "AdminLoginThrottle_lastAttemptAt_idx" ON "AdminLoginThrottle"("lastAttemptAt");

-- Phase 2: Defensible CHECK constraints for AdminLoginThrottle
ALTER TABLE "AdminLoginThrottle"
  ADD CONSTRAINT "chk_throttle_failure_count_nonneg"
  CHECK ("failureCount" >= 0);

ALTER TABLE "AdminLoginThrottle"
  ADD CONSTRAINT "chk_throttle_key_hash_hex64"
  CHECK ("keyHash" ~ '^[a-f0-9]{64}$');

ALTER TABLE "AdminLoginThrottle"
  ADD CONSTRAINT "chk_throttle_blocked_after_window"
  CHECK ("blockedUntil" IS NULL OR "blockedUntil" >= "windowStartedAt");
