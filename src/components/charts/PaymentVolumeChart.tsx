"use client";

import { useRef } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartExportButton } from "./ChartExportButton";
import { getTooltipContentStyle } from "@/lib/chart-utils";
import type { NetworkPaymentVolumePoint } from "@/lib/network-api";

interface PaymentVolumeChartProps {
  data: NetworkPaymentVolumePoint[];
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function PaymentVolumeChart({
  data,
  loading = false,
}: PaymentVolumeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = data.map((point) => ({
    label: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    date: point.date,
    volume: point.volume,
  }));

  const total = chartData.reduce((sum, d) => sum + d.volume, 0);
  const peak = chartData.length
    ? Math.max(...chartData.map((d) => d.volume))
    : 0;
  const latest = chartData[chartData.length - 1]?.volume ?? 0;

  if (loading) {
    return (
      <div
        className="glass-card rounded-2xl p-6 border border-border/50 h-[420px] animate-pulse"
        aria-busy="true"
        aria-label="Loading payment volume"
      >
        <div className="h-4 w-40 bg-white/5 rounded mb-4" />
        <div className="h-8 w-64 bg-white/5 rounded mb-8" />
        <div className="h-[260px] w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <section
        aria-labelledby="payment-volume-heading"
        className="glass-card rounded-2xl p-6 border border-border/50 flex flex-col items-center justify-center h-[420px]"
      >
        <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">
          Network // Payment Volume
        </div>
        <h2
          id="payment-volume-heading"
          className="text-xl font-black tracking-tighter uppercase italic mb-2 opacity-50"
        >
          Payment Volume
        </h2>
        <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest text-center max-w-md">
          No payment-volume series yet. Data appears once{" "}
          <code className="text-accent">/api/v1/network/payment-volume</code>{" "}
          returns daily USD volume (aligned with volume_24h).
        </p>
      </section>
    );
  }

  return (
    <section
      ref={chartRef}
      aria-labelledby="payment-volume-heading"
      className="glass-card rounded-2xl p-6 border border-border/50"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">
            Network // Payment Volume
          </div>
          <h2
            id="payment-volume-heading"
            className="text-xl font-black tracking-tighter uppercase italic mb-2"
          >
            Payment Volume
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Daily USD-equivalent volume // same unit as volume_24h
          </p>
        </div>
        <ChartExportButton chartRef={chartRef} chartName="Payment Volume" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Latest day
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-emerald-400">
            {formatCurrency(latest)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Period total
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-foreground/80">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Peak day
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-accent">
            {formatCurrency(peak)}
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPaymentVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              dx={-10}
              width={56}
            />
            <Tooltip
              contentStyle={getTooltipContentStyle({
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                fontSize: "10px",
                fontFamily: "monospace",
              })}
              labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
              formatter={(value) => [
                formatCurrency(
                  typeof value === "number" ? value : Number(value),
                ),
                "Volume",
              ]}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#colorPaymentVolume)"
              name="Volume"
              activeDot={{
                r: 4,
                fill: "#10b981",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
