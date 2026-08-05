import crypto from "node:crypto";
import type { NidStatus } from "@/generated/prisma/client";
import { getHmacLookupKey } from "./config";
import { SENSITIVE_ERRORS } from "./errors";

export function normalizeBangladeshNid(rawNid: string): string {
  if (typeof rawNid !== "string" || !rawNid) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }

  // Strip harmless whitespace and hyphens
  const cleaned = rawNid.replace(/[\s-]/g, "");

  // Must consist solely of ASCII digits
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }

  // Bangladesh NID standard lengths: 10 digits (Smart NID), 13 digits (Legacy 13-digit), 17 digits (Legacy 17-digit with birth year prefix)
  if (cleaned.length !== 10 && cleaned.length !== 13 && cleaned.length !== 17) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }

  return cleaned;
}

export function validateBangladeshNid(rawNid: string): boolean {
  try {
    normalizeBangladeshNid(rawNid);
    return true;
  } catch {
    return false;
  }
}

export function maskNid(normalizedNid: string): string {
  const norm = normalizeBangladeshNid(normalizedNid);
  const lastFour = norm.slice(-4);
  return `******${lastFour}`;
}

export function getNidLastFour(normalizedNid: string): string {
  const norm = normalizeBangladeshNid(normalizedNid);
  return norm.slice(-4);
}

export function computeNidLookupHmac(normalizedNid: string): string {
  const norm = normalizeBangladeshNid(normalizedNid);
  const hmacKey = getHmacLookupKey();

  const canonicalMessage = `bike-management-system|nid-lookup:v1|${norm}`;
  const hmacHex = crypto
    .createHmac("sha256", hmacKey)
    .update(canonicalMessage, "utf8")
    .digest("hex")
    .toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(hmacHex)) {
    throw new Error(SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR);
  }

  return hmacHex;
}

export function isValidNidStatusTransition(
  currentStatus: NidStatus,
  targetStatus: NidStatus
): boolean {
  if (currentStatus === targetStatus) return true;

  // Cannot return to PENDING once identity is created/submitted
  if (targetStatus === "PENDING") return false;

  switch (currentStatus) {
    case "PENDING":
      return targetStatus === "SUBMITTED";
    case "SUBMITTED":
      return targetStatus === "VERIFIED" || targetStatus === "NEEDS_CORRECTION";
    case "VERIFIED":
      return targetStatus === "NEEDS_CORRECTION" || targetStatus === "SUBMITTED"; // replacement resets to SUBMITTED
    case "NEEDS_CORRECTION":
      return targetStatus === "SUBMITTED"; // replacement resets to SUBMITTED
    default:
      return false;
  }
}
