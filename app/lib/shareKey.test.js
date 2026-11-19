import { describe, expect, it } from "vitest";
import {
  generateShareKey,
  isShareKind,
  isWellFormedShareKey,
} from "./shareKey";

describe("generateShareKey", () => {
  it("produces well-formed, distinct keys", () => {
    const keys = new Set();
    for (let index = 0; index < 200; index++) {
      const shareKey = generateShareKey();
      expect(isWellFormedShareKey(shareKey)).toBe(true);
      keys.add(shareKey);
    }
    expect(keys.size).toBe(200);
  });
});

describe("isWellFormedShareKey", () => {
  it("rejects junk without touching the database", () => {
    expect(isWellFormedShareKey(undefined)).toBe(false);
    expect(isWellFormedShareKey(null)).toBe(false);
    expect(isWellFormedShareKey(12345)).toBe(false);
    expect(isWellFormedShareKey("")).toBe(false);
    expect(isWellFormedShareKey("short")).toBe(false);
    expect(isWellFormedShareKey("a".repeat(23))).toBe(false);
    expect(isWellFormedShareKey("a".repeat(21) + "/")).toBe(false);
    expect(isWellFormedShareKey("' OR 1=1 --aaaaaaaaaaaa")).toBe(false);
  });

  it("accepts a 22-character base64url key", () => {
    expect(isWellFormedShareKey("abcDEF123_-abcDEF123_-")).toBe(true);
  });
});

describe("isShareKind", () => {
  it("only accepts the known kinds", () => {
    expect(isShareKind("scrabble")).toBe(true);
    expect(isShareKind("trip")).toBe(true);
    expect(isShareKind("lift")).toBe(false);
    expect(isShareKind(undefined)).toBe(false);
  });
});
