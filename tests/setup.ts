import "dotenv/config";
import { vi } from "vitest";

// Ensure fallback AUTH_RATE_LIMIT_SECRET for testing if not set
if (!process.env.AUTH_RATE_LIMIT_SECRET) {
  process.env.AUTH_RATE_LIMIT_SECRET = "test_rate_limit_secret_at_least_32_bytes_long_123456";
}

// Mock server-only package for Node.js test environment
vi.mock("server-only", () => ({}));
