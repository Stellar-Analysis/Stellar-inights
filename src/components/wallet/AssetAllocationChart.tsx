'use client';

import { useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { WalletAssetAllocation } from '@/lib/analytics-api';
import { ChartExportButton } from '@/components/charts/ChartExportButton';
import { getTooltipContentStyle } from '@/lib/chart-utils';

interface AssetAllocationChartProps {
  allocations: WalletAssetAllocation[];
  address: string;
}

const PALETTE = [
  '#00B0F0', // XLM blue
  '#2775CA', // USDC blue
  '#6366F1', // accent indigo
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // rose
  '#8B5CF6', // violet
  '#EC4899', // pink
];

function formatUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);
}

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  pct_of_portfolio: number;
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct_of_portfolio }: CustomLabelProps) {
  if (pct_of_portfolio < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontFamily="monospace"
      fontWeight="bold"
    >
      {pct_of_portfolio.toFixed(1)}%
    </text>
  );
}

export function AssetAllocationChart({ allocations, address }: AssetAllocationChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = allocations.map((a) => ({
    name: a.asset_code,
    value: a.value_usd,
    pct_of_portfolio: a.pct_of_portfolio,
    balance: a.balance,
  }));

  const totalUsd = allocations.reduce((s, a) => s + a.value_usd, 0);

  return (
    <div ref={chartRef} className="glass-card rounded-2xl p-6 border border-border/50 h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">
            Wallet Analytics // 03
          </div>
          <h2 className="text-xl font-black tracking-tighter uppercase italic mb-1">
            Asset Allocation
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {address.slice(0, 8)}...{address.slice(-8)}
          </p>
        </div>
        <ChartExportButton chartRef={chartRef} chartName="Asset Allocation" />
      </div>

      {/* Donut chart */}
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={(props) => (
                <CustomLabel
                  cx={props.cx}
                  cy={props.cy}
                  midAngle={props.midAngle}
                  innerRadius={props.innerRadius}
                  outerRadius={props.outerRadius}
                  pct_of_portfolio={props.payload.pct_of_portfolio}
                />
              )}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={PALETTE[i % PALETTE.length]}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={getTooltipContentStyle({
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '10px',
                fontFamily: 'monospace',
              })}
              formatter={(value: number, name: string) => [
                `${formatUsd(value)} (${chartData.find((d) => d.name === name)?.pct_of_portfolio.toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Allocation rows */}
      <div className="mt-4 space-y-2">
        {allocations.map((a, i) => (
          <div
            key={a.asset_code}
            className="flex items-center justify-between text-[10px] font-mono"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: PALETTE[i % PALETTE.length] }}
                aria-hidden="true"
              />
              <span className="text-foreground font-bold uppercase tracking-wider truncate">
                {a.asset_code}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-muted-foreground tabular-nums">
                {a.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </span>
              <span className="text-foreground/80 tabular-nums w-16 text-right">
                {formatUsd(a.value_usd)}
              </span>
            </div>
          </div>
        ))}
        <div className="border-t border-white/10 pt-2 flex justify-between text-[10px] font-mono">
          <span className="text-muted-foreground uppercase tracking-wider">Total</span>
          <span className="text-accent font-bold tabular-nums">{formatUsd(totalUsd)}</span>
        </div>
      </div>
    </div>
  );
}
