/**
 * Top Movers (24h) API Client
 * Ranks Stellar assets by 24h percent change (price or volume), alongside
 * new-holder count. Backed by `GET /api/v1/rankings/top-movers`
 * (Stellar-Analysis/backend#33).
 */
import { logger } from "@/lib/logger";
import { config } from "@/config";

const API_BASE = config.apiUrl;

export type TopMoversSortBy = "change" | "volume";

export interface TopMoverAsset {
  rank: number;
  asset_code: string;
  asset_issuer: string;
  price_usd: number;
  /**
   * 24h percent change. `null` for assets with no 24h-ago baseline (e.g. a
   * newly-issued asset) — see backend#38's zero-supply/new-asset edge case.
   * Consumers must not assume a finite number here.
   */
  change_24h_pct: number | null;
  volume_24h_usd: number;
  new_holders_24h: number;
}

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError &&
      (error.message.includes("Failed to fetch") ||
        error.message.includes("Network request failed"));
    if (!isNetworkError) {
      logger.error(`Failed to fetch ${url}:`, error);
    }
    return fallback;
  }
}

/**
 * Fetch the top 24h movers sorted by percent change or by trading volume.
 * Falls back to representative mock data if the backend endpoint
 * (backend#33) is unreachable, so the Top Movers card never renders broken.
 */
export async function fetchTopMovers(
  sortBy: TopMoversSortBy = "change",
  limit: number = 10,
): Promise<TopMoverAsset[]> {
  return safeFetch(
    `${API_BASE}/api/v1/rankings/top-movers?sort_by=${sortBy}&limit=${limit}`,
    getMockTopMovers(sortBy, limit),
  );
}

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_MOVERS: Omit<TopMoverAsset, "rank">[] = [
  {
    asset_code: "AQUA",
    asset_issuer:
      "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
    price_usd: 0.00234,
    change_24h_pct: 18.4,
    volume_24h_usd: 4_120_000,
    new_holders_24h: 12_341,
  },
  {
    asset_code: "yXLM",
    asset_issuer:
      "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55",
    price_usd: 0.132,
    change_24h_pct: 9.7,
    volume_24h_usd: 5_450_000,
    new_holders_24h: 2_108,
  },
  {
    asset_code: "USDC",
    asset_issuer:
      "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    price_usd: 1.0,
    change_24h_pct: 0.1,
    volume_24h_usd: 96_300_000,
    new_holders_24h: 640,
  },
  {
    asset_code: "XLM",
    asset_issuer: "native",
    price_usd: 0.1287,
    change_24h_pct: -3.2,
    volume_24h_usd: 182_500_000,
    new_holders_24h: 3_954,
  },
  {
    // Newly-issued asset with no 24h-ago baseline yet — exercises the
    // null-change edge case (backend#38) so the card is exercised against
    // it rather than only ever seeing finite numbers.
    asset_code: "NEWX",
    asset_issuer:
      "GCNEWXO4Y3ZQKD2T7VQFQJXJMFPBQGYQ4C3E6VJXKT5NEWXAAAAAAAAA",
    price_usd: 0.0041,
    change_24h_pct: null,
    volume_24h_usd: 12_800,
    new_holders_24h: 87,
  },
];

function getMockTopMovers(
  sortBy: TopMoversSortBy,
  limit: number,
): TopMoverAsset[] {
  const sorted = [...MOCK_MOVERS].sort((a, b) => {
    if (sortBy === "volume") return b.volume_24h_usd - a.volume_24h_usd;
    // Sort by |% change| descending; assets with no baseline (null) sink to
    // the bottom rather than being treated as 0% (which would misrank them
    // as "unchanged" among real movers).
    if (a.change_24h_pct === null) return 1;
    if (b.change_24h_pct === null) return -1;
    return Math.abs(b.change_24h_pct) - Math.abs(a.change_24h_pct);
  });

  return sorted
    .slice(0, limit)
    .map((asset, index) => ({ ...asset, rank: index + 1 }));
}
