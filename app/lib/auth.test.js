import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { get: vi.fn(() => undefined) };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const { requireAuth, requireReadAccess } = await import("./auth");
const { COOKIE_NAME, signToken } = await import("./session");

describe("preview read-only access", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    cookieStore.get.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows reads without a session on a preview deployment", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(requireReadAccess()).resolves.toBeUndefined();
  });

  it("still blocks writes without a session on a preview deployment", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("blocks reads without a session in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    await expect(requireReadAccess()).rejects.toThrow("Unauthorized");
  });

  it("allows reads and writes with a valid session in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const token = await signToken();
    cookieStore.get.mockImplementation((name) =>
      name === COOKIE_NAME ? { value: token } : undefined
    );
    await expect(requireReadAccess()).resolves.toBeUndefined();
    await expect(requireAuth()).resolves.toBeUndefined();
  });
});
