import { describe, it, expect, vi } from "vitest";
import { buildRateUrl, parseRateResponse, resolveRate } from "./rate-utils";

describe("buildRateUrl", () => {
  it("uses the exact currency and date in the request", () => {
    expect(buildRateUrl("EUR", "2026-05-30")).toBe(
      "https://api.frankfurter.dev/v1/2026-05-30?from=EUR&to=USD"
    );
  });
});

describe("parseRateResponse", () => {
  it("extracts the USD rate and market date", () => {
    expect(
      parseRateResponse({ date: "2026-05-29", rates: { USD: 1.0834 } })
    ).toEqual({ rateToBase: 1.0834, rateDate: "2026-05-29" });
  });

  it("throws on a malformed response", () => {
    expect(() => parseRateResponse({ rates: {} })).toThrow();
    expect(() => parseRateResponse(null)).toThrow();
  });
});

describe("resolveRate", () => {
  /**
   * Builds spy-able deps for resolveRate.
   * @param {Object} [opts] - Optional cached/fetched rate overrides.
   * @return {Object} Mocked readCache/writeCache/fetchRate deps.
   */
  function makeDeps({ cached = null, fetched } = {}) {
    return {
      readCache: vi.fn().mockResolvedValue(cached),
      writeCache: vi.fn().mockResolvedValue(undefined),
      fetchRate: vi
        .fn()
        .mockResolvedValue(
          fetched ?? { rateToBase: 1.08, rateDate: "2026-05-29" }
        ),
    };
  }

  it("short-circuits USD with no cache or network access", async () => {
    const deps = makeDeps();
    const result = await resolveRate("USD", "2026-05-30", deps);
    expect(result).toEqual({ rateToBase: 1, rateDate: "2026-05-30" });
    expect(deps.readCache).not.toHaveBeenCalled();
    expect(deps.fetchRate).not.toHaveBeenCalled();
    expect(deps.writeCache).not.toHaveBeenCalled();
  });

  it("returns a cache hit without fetching or writing", async () => {
    const cached = { rateToBase: 1.07, rateDate: "2026-05-28" };
    const deps = makeDeps({ cached });
    const result = await resolveRate("EUR", "2026-05-28", deps);
    expect(result).toBe(cached);
    expect(deps.readCache).toHaveBeenCalledWith("EUR", "2026-05-28");
    expect(deps.fetchRate).not.toHaveBeenCalled();
    expect(deps.writeCache).not.toHaveBeenCalled();
  });

  it("on a miss, fetches with the exact currency/date, writes through, and returns it", async () => {
    const fetched = { rateToBase: 1.09, rateDate: "2026-05-29" };
    const deps = makeDeps({ cached: null, fetched });
    const result = await resolveRate("EUR", "2026-05-29", deps);
    expect(deps.readCache).toHaveBeenCalledWith("EUR", "2026-05-29");
    expect(deps.fetchRate).toHaveBeenCalledWith("EUR", "2026-05-29");
    expect(deps.writeCache).toHaveBeenCalledWith("EUR", "2026-05-29", fetched);
    expect(result).toBe(fetched);
  });

  it("preserves a business-day rate_date that differs from the requested date", async () => {
    // Requested a Saturday; Frankfurter answers with Friday's rate.
    const fetched = { rateToBase: 1.085, rateDate: "2026-05-29" };
    const deps = makeDeps({ cached: null, fetched });
    const result = await resolveRate("EUR", "2026-05-30", deps);
    // Cache is keyed by the requested date, but the stored/returned rate_date is the market date.
    expect(deps.writeCache).toHaveBeenCalledWith("EUR", "2026-05-30", fetched);
    expect(result.rateDate).toBe("2026-05-29");
  });
});
