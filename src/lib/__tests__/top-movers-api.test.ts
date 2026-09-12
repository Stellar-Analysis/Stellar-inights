/**
 * Top Movers API Client Tests
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/config", () => ({
  config: { apiUrl: "http://localhost:8080" },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { fetchTopMovers } from "../top-movers-api";

global.fetch = vi.fn();
const mockFetch = vi.mocked(global.fetch);

describe("fetchTopMovers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the backend#33 endpoint with the requested sort mode and limit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchTopMovers("volume", 25);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/rankings/top-movers?sort_by=volume&limit=25",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("defaults to sorting by change with a limit of 10", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchTopMovers();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/rankings/top-movers?sort_by=change&limit=10",
      expect.anything(),
    );
  });

  it("returns the API response verbatim on success", async () => {
    const apiResponse = [
      {
        rank: 1,
        asset_code: "AQUA",
        asset_issuer: "GBNZ...AQUA",
        price_usd: 0.00234,
        change_24h_pct: 18.4,
        volume_24h_usd: 4_120_000,
        new_holders_24h: 12_341,
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    } as Response);

    const result = await fetchTopMovers("change");

    expect(result).toEqual(apiResponse);
  });

  it("falls back to mock movers sorted by |% change| when the request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    const result = await fetchTopMovers("change");

    expect(result.length).toBeGreaterThan(0);
    result.forEach((asset, index) => expect(asset.rank).toBe(index + 1));

    const withBaseline = result.filter((a) => a.change_24h_pct !== null);
    expect(withBaseline).toEqual(
      [...withBaseline].sort(
        (a, b) => Math.abs(b.change_24h_pct as number) - Math.abs(a.change_24h_pct as number),
      ),
    );
  });

  it("falls back to mock movers sorted by volume when the network is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await fetchTopMovers("volume");

    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual(
      [...result].sort((a, b) => b.volume_24h_usd - a.volume_24h_usd),
    );
  });

  it("sinks assets with no 24h-ago baseline (null change) to the bottom when sorting by change", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    const result = await fetchTopMovers("change", 10);
    const nullChangeIndexes = result
      .map((a, i) => (a.change_24h_pct === null ? i : -1))
      .filter((i) => i >= 0);

    for (const idx of nullChangeIndexes) {
      expect(idx).toBeGreaterThanOrEqual(result.length - nullChangeIndexes.length);
    }
  });

  it("mock data includes the AQUA +18.4% / 12,341 new-holders example from the issue spec", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    const result = await fetchTopMovers("change", 10);
    const aqua = result.find((a) => a.asset_code === "AQUA");

    expect(aqua).toBeDefined();
    expect(aqua?.change_24h_pct).toBe(18.4);
    expect(aqua?.new_holders_24h).toBe(12_341);
  });

  it("respects the limit parameter against fallback data", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    const result = await fetchTopMovers("change", 2);
    expect(result.length).toBe(2);
  });
});
