import { useState, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useDataRefresh } from "./useDataRefresh";
import { config } from "@/config";
import { isCorridorUpdate } from "@/lib/websocket-message-parser";
import { logger } from "@/lib/logger";

export interface HomeStatTile {
  labelKey: string;
  value: string;
  change: string;
}

export interface UseHomeStatsReturn {
  tiles: HomeStatTile[];
  isConnected: boolean;
  isConnecting: boolean;
  isStaleData: boolean;
  connectionAttempts: number;
  lastUpdated: Date | null;
  reconnect: () => void;
}

const DEFAULT_TILES: HomeStatTile[] = [
  { labelKey: "usdcBrl", value: "0.998", change: "+0.02%" },
  { labelKey: "xlmEur", value: "3.1s", change: "-120ms" },
  { labelKey: "networkTvl", value: "$45.2M", change: "+5.5%" },
  { labelKey: "successRate", value: "99.98%", change: "+0.1%" },
];

interface KpiData {
  successRate: { value: number; trend: number; trendDirection: string };
  activeCorridors: { value: number; trend: number; trendDirection: string };
  liquidityDepth: { value: number; trend: number; trendDirection: string };
  settlementSpeed: { value: number; trend: number; trendDirection: string };
}

function kpiToTiles(kpi: KpiData): HomeStatTile[] {
  const sign = (dir: string, val: number) =>
    dir === "down" ? `-${val}` : `+${val}`;

  const fmtVolume = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);

  return [
    {
      labelKey: "usdcBrl",
      value: `${kpi.successRate.value}%`,
      change: `${sign(kpi.successRate.trendDirection, kpi.successRate.trend)}%`,
    },
    {
      labelKey: "xlmEur",
      value: `${kpi.settlementSpeed.value}s`,
      change: `${sign(kpi.settlementSpeed.trendDirection, Math.abs(kpi.settlementSpeed.trend))}s`,
    },
    {
      labelKey: "networkTvl",
      value: fmtVolume(kpi.liquidityDepth.value),
      change: `${sign(kpi.liquidityDepth.trendDirection, kpi.liquidityDepth.trend)}%`,
    },
    {
      labelKey: "successRate",
      value: `${kpi.successRate.value}%`,
      change: `${sign(kpi.successRate.trendDirection, kpi.successRate.trend)}%`,
    },
  ];
}

export function useHomeStats(): UseHomeStatsReturn {
  const [tiles, setTiles] = useState<HomeStatTile[]>(DEFAULT_TILES);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (!res.ok) throw new Error("Failed to fetch home stats");
    const data = await res.json();
    if (data?.kpi) setTiles(kpiToTiles(data.kpi));
  }, []);

  const { lastUpdated, markUpdated } = useDataRefresh({
    refreshIntervalMs: 30_000,
    onRefresh: fetchStats,
    refreshOnMount: true,
  });

  const { isConnected, isConnecting, isStaleData, connectionAttempts, reconnect } =
    useWebSocket(config.wsUrl, {
      staleDataThreshold: 30_000,
      onMessage: (message) => {
        if (isCorridorUpdate(message)) {
          markUpdated();
          setTiles((prev) =>
            prev.map((t) =>
              t.labelKey === "successRate"
                ? { ...t, value: `${(message as { success_rate?: number }).success_rate ?? t.value}%` }
                : t,
            ),
          );
        }
      },
      onError: (e) => logger.error("HomeStats WS error:", e),
    });

  return { tiles, isConnected, isConnecting, isStaleData, connectionAttempts, lastUpdated, reconnect };
}
