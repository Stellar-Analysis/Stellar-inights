"use client";

import React from "react";
import { Zap, Clock } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";

interface GasUsagePanelProps {
  totalGas: number;
  avgGas?: number;
  window?: string;
  trend?: number;
  /** True when backend#23 hasn't shipped yet */
  comingSoon?: boolean;
  loading?: boolean;
}

function formatGas(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function GasUsagePanel({
  totalGas,
  avgGas,
  window = "7d",
  trend,
  comingSoon = false,
  loading = false,
}: GasUsagePanelProps) {
  if (loading) {
    return (
      <div
        className="glass-card rounded-2xl p-6 border border-border/50 h-[180px] animate-pulse"
        aria-busy="true"
      >
        <div className="h-4 w-28 bg-white/5 rounded mb-4" />
        <div className="h-10 w-24 bg-white/5 rounded" />
      </div>
    );
  }

  if (comingSoon) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border/50 group hover:border-accent/30 transition-all duration-300">
        <div className="flex flex-row items-center justify-between pb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-accent transition-colors">
            Gas Usage
          </h3>
          <Zap
            className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors"
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="text-xl font-mono font-bold tracking-tighter">
              Coming Soon
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/50 mt-2 uppercase tracking-tighter">
            Gas analytics pending backend integration
          </p>
        </div>
      </div>
    );
  }

  const trendDirection =
    trend !== undefined && trend > 0
      ? "up"
      : trend !== undefined && trend < 0
        ? "down"
        : undefined;

  return (
    <MetricCard
      label="Gas Usage"
      value={formatGas(totalGas)}
      subLabel={
        avgGas !== undefined
          ? `~${formatGas(avgGas)} avg/op · ${window.toUpperCase()}`
          : `Total consumed · ${window.toUpperCase()}`
      }
      trend={trend !== undefined ? Math.abs(trend) : undefined}
      trendDirection={trendDirection}
    />
  );
}
