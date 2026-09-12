"use client";

import { useEffect, useState } from "react";
import { fetchTopMovers, type TopMoversSortBy } from "@/lib/top-movers-api";

export interface TopMoverAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number | null;
  volume24h: number;
  newHolders24h: number;
}

interface UseTopMoversResult {
  data: TopMoverAsset[];
  loading: boolean;
  error: string | null;
}

export function useTopMovers(
  limit = 5,
  sortBy: TopMoversSortBy = "change",
): UseTopMoversResult {
  const [data, setData] = useState<TopMoverAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const movers = await fetchTopMovers(sortBy, limit);
        if (isMounted) {
          setData(movers.map((asset) => ({
            symbol: asset.asset_code,
            name: asset.asset_code,
            price: asset.price_usd,
            change24h: asset.change_24h_pct,
            volume24h: asset.volume_24h_usd,
            newHolders24h: asset.new_holders_24h,
          })));
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load top movers");
          setData([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => { isMounted = false; };
  }, [limit, sortBy]);

  return { data, loading, error };
}
