"use client";

import React from "react";
import { FileCode2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";

interface ActiveContractsPanelProps {
  count: number;
  window?: string;
  trend?: number;
  loading?: boolean;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function ActiveContractsPanel({
  count,
  window = "7d",
  trend,
  loading = false,
}: ActiveContractsPanelProps) {
  if (loading) {
    return (
      <div
        className="glass-card rounded-2xl p-6 border border-border/50 h-[180px] animate-pulse"
        aria-busy="true"
      >
        <div className="h-4 w-32 bg-white/5 rounded mb-4" />
        <div className="h-10 w-24 bg-white/5 rounded" />
      </div>
    );
  }

  const trendDirection = trend !== undefined && trend > 0 ? "up" : trend !== undefined && trend < 0 ? "down" : undefined;

  return (
    <MetricCard
      label="Active Contracts"
      value={formatCount(count)}
      subLabel={`Active in ${window.toUpperCase()}`}
      trend={trend !== undefined ? Math.abs(trend) : undefined}
      trendDirection={trendDirection}
    />
  );
}
