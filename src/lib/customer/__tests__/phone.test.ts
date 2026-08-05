import { describe, it, expect } from "vitest";
import { normalizeBangladeshPhone, maskPhone } from "../phone";

describe("Bangladesh Phone Normalization", () => {
  it("normalizes valid 11-digit mobile numbers starting with 013-019", () => {
    expect(normalizeBangladeshPhone("01712345678")).toBe("+8801712345678");
    expect(normalizeBangladeshPhone("01812345678")).toBe("+8801812345678");
    expect(normalizeBangladeshPhone("01312345678")).toBe("+8801312345678");
    expect(normalizeBangladeshPhone("01912345678")).toBe("+8801912345678");
  });

  it("normalizes numbers with 880 prefix", () => {
    expect(normalizeBangladeshPhone("8801712345678")).toBe("+8801712345678");
    expect(normalizeBangladeshPhone("+8801712345678")).toBe("+8801712345678");
  });

  it("strips harmless spaces, hyphens, and parentheses", () => {
    expect(normalizeBangladeshPhone("01712 345 678")).toBe("+8801712345678");
    expect(normalizeBangladeshPhone("01712-345678")).toBe("+8801712345678");
    expect(normalizeBangladeshPhone("(01712) 345678")).toBe("+8801712345678");
    expect(normalizeBangladeshPhone("+880 1712-345678")).toBe("+8801712345678");
  });

  it("rejects invalid mobile prefixes", () => {
    expect(normalizeBangladeshPhone("01212345678")).toBeNull();
    expect(normalizeBangladeshPhone("01012345678")).toBeNull();
    expect(normalizeBangladeshPhone("01112345678")).toBeNull();
  });

  it("rejects invalid lengths", () => {
    expect(normalizeBangladeshPhone("0171234567")).toBeNull(); // 10 digits
    expect(normalizeBangladeshPhone("017123456789")).toBeNull(); // 12 digits
  });

  it("rejects non-numeric characters and extensions", () => {
    expect(normalizeBangladeshPhone("0171234567a")).toBeNull();
    expect(normalizeBangladeshPhone("01712345678 ext 123")).toBeNull();
  });

  it("handles null, undefined, and empty strings gracefully", () => {
    expect(normalizeBangladeshPhone(null)).toBeNull();
    expect(normalizeBangladeshPhone(undefined)).toBeNull();
    expect(normalizeBangladeshPhone("   ")).toBeNull();
  });
});

describe("Phone Masking", () => {
  it("masks normalized Bangladesh mobile numbers safely", () => {
    const masked = maskPhone("+8801712345678");
    expect(masked).toBe("+880 17***-**78");
    expect(masked).not.toContain("12345");
  });

  it("masks raw BD mobile input", () => {
    const masked = maskPhone("01712345678");
    expect(masked).toBe("+880 17***-**78");
  });

  it("handles empty or null inputs", () => {
    expect(maskPhone(null)).toBe("");
    expect(maskPhone("")).toBe("");
  });
});
