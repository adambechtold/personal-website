import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
  shareKeyGrants: vi.fn(),
  recordGuestWrite: vi.fn(),
}));

vi.mock("./auth", () => ({ isAuthenticated: mocks.isAuthenticated }));
vi.mock("./shareLinks", () => ({
  shareKeyGrants: mocks.shareKeyGrants,
  recordGuestWrite: mocks.recordGuestWrite,
}));

const { requireReadAccess, requireWriteAccess } = await import("./access");

const SHARE_KEY = "abcDEF123_-abcDEF123_-";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.isAuthenticated.mockResolvedValue(false);
});

describe("requireReadAccess", () => {
  it("lets the signed-in owner in without a key", async () => {
    mocks.isAuthenticated.mockResolvedValue(true);
    await expect(requireReadAccess("scrabble", 7)).resolves.toBe("owner");
    expect(mocks.shareKeyGrants).not.toHaveBeenCalled();
  });

  it("lets a guest in with a key for that exact thing", async () => {
    mocks.shareKeyGrants.mockResolvedValue(true);
    await expect(requireReadAccess("scrabble", 7, SHARE_KEY)).resolves.toBe(
      "guest"
    );
    expect(mocks.shareKeyGrants).toHaveBeenCalledWith(
      SHARE_KEY,
      "scrabble",
      "7"
    );
  });

  it("refuses a guest whose key is for something else", async () => {
    mocks.shareKeyGrants.mockResolvedValue(false);
    await expect(
      requireReadAccess("trip", "manila", SHARE_KEY)
    ).rejects.toThrow("Unauthorized");
  });

  it("refuses an anonymous caller with no key", async () => {
    await expect(requireReadAccess("trip", "manila")).rejects.toThrow(
      "Unauthorized"
    );
    expect(mocks.shareKeyGrants).not.toHaveBeenCalled();
  });
});

describe("requireWriteAccess", () => {
  it("does not rate-limit the owner", async () => {
    mocks.isAuthenticated.mockResolvedValue(true);
    await expect(requireWriteAccess("trip", "manila")).resolves.toBe("owner");
    expect(mocks.recordGuestWrite).not.toHaveBeenCalled();
  });

  it("counts a guest write and allows it under the limit", async () => {
    mocks.recordGuestWrite.mockResolvedValue("allowed");
    await expect(requireWriteAccess("trip", "manila", SHARE_KEY)).resolves.toBe(
      "guest"
    );
    expect(mocks.recordGuestWrite).toHaveBeenCalledWith(
      SHARE_KEY,
      "trip",
      "manila"
    );
  });

  it("turns a guest away over the limit", async () => {
    mocks.recordGuestWrite.mockResolvedValue("rate_limited");
    await expect(requireWriteAccess("scrabble", 7, SHARE_KEY)).rejects.toThrow(
      /Too many changes/
    );
  });

  it("refuses a guest whose key doesn't match", async () => {
    mocks.recordGuestWrite.mockResolvedValue("denied");
    await expect(requireWriteAccess("scrabble", 7, SHARE_KEY)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("refuses an anonymous caller with no key", async () => {
    await expect(requireWriteAccess("scrabble", 7)).rejects.toThrow(
      "Unauthorized"
    );
    expect(mocks.recordGuestWrite).not.toHaveBeenCalled();
  });
});
