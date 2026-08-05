import { describe, it, expect } from "vitest";
import { generateRandomCodeSegment } from "../customer-code";

describe("Customer Code Generation Utility", () => {
  it("generates an 8-character Crockford Base32 segment", () => {
    const segment = generateRandomCodeSegment();
    expect(segment).toHaveLength(8);
    // Unambiguous Crockford Base32 alphabet: 0-9, A-Z excluding I, L, O, U
    expect(segment).toMatch(/^[0-9A-HJKMNPQRSTVWXYZ]{8}$/);
  });

  it("generates distinct codes across calls", () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRandomCodeSegment());
    }
    expect(codes.size).toBe(100);
  });
});
