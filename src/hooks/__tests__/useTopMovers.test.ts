import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/top-movers-api", () => ({
  fetchTopMovers: vi.fn(),
}));

import { fetchTopMovers } from "@/lib/top-movers-api";
import { useTopMovers } from "../useTopMovers";

const mockFetchTopMovers = vi.mocked(fetchTopMovers);

describe("useTopMovers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in a loading state with no data", () => {
    mockFetchTopMovers.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTopMovers(5));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("maps the API's snake_case shape into the hook's view-model", async () => {
    mockFetchTopMovers.mockResolvedValue([
      {
        rank: 1,
        asset_code: "AQUA",
        asset_issuer: "GBNZ...AQUA",
        price_usd: 0.00234,
        change_24h_pct: 18.4,
        volume_24h_usd: 4_120_000,
        new_holders_24h: 12_341,
      },
    ]);

    const { result } = renderHook(() => useTopMovers(5));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([
      {
        symbol: "AQUA",
        name: "AQUA",
        price: 0.00234,
        change24h: 18.4,
        volume24h: 4_120_000,
        newHolders24h: 12_341,
      },
    ]);
    expect(result.current.error).toBeNull();
  });

  it("preserves a null change24h for assets with no 24h-ago baseline", async () => {
    mockFetchTopMovers.mockResolvedValue([
      {
        rank: 1,
        asset_code: "NEWX",
        asset_issuer: "GNEW...X",
        price_usd: 0.0041,
        change_24h_pct: null,
        volume_24h_usd: 12_800,
        new_holders_24h: 87,
      },
    ]);

    const { result } = renderHook(() => useTopMovers(5));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data[0].change24h).toBeNull();
  });

  it("passes limit and sortBy through to fetchTopMovers", async () => {
    mockFetchTopMovers.mockResolvedValue([]);

    renderHook(() => useTopMovers(3, "volume"));

    await waitFor(() => expect(mockFetchTopMovers).toHaveBeenCalledWith("volume", 3));
  });

  it("defaults to sorting by change with a limit of 5", async () => {
    mockFetchTopMovers.mockResolvedValue([]);

    renderHook(() => useTopMovers());

    await waitFor(() => expect(mockFetchTopMovers).toHaveBeenCalledWith("change", 5));
  });

  it("surfaces an error and clears data if fetchTopMovers unexpectedly rejects", async () => {
    mockFetchTopMovers.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useTopMovers(5));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("boom");
    expect(result.current.data).toEqual([]);
  });
});
