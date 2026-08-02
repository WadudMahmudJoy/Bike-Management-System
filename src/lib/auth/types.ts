import "server-only";
import type { AdminRole } from "@/generated/prisma/client";

/** Minimal session DTO returned to Server Components. Never includes passwordHash or sessionTokenHash. */
export interface AdminSessionDTO {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface SessionVerificationResult {
  admin: AdminSessionDTO;
  sessionId: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}
