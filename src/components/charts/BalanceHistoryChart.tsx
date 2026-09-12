'use client';

import { useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BalanceHistoryDataPoint } from '@/lib/analytics-api';
import { ChartExportButton } from './ChartExportButton';
import { getTooltipContentStyle } from '@/lib/chart-utils';

interface BalanceHistoryChartProps {
  data: BalanceHistoryDataPoint[];
  address: string;
}

export function BalanceHistoryChart({ data, address }: BalanceHistoryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Group data by asset and prepare chart data
  const assets = Array.from(new Set(data.map(d => d.asset_code)));
  const timestamps = Array.from(new Set(data.map(d => d.timestamp))).sort();

  const chartData = timestamps.map(timestamp => {
    const point: any = {
      timestamp: new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };

    assets.forEach(assetCode => {
      const assetPoint = data.find(d => d.timestamp === timestamp && d.asset_code === assetCode);
      if (assetPoint) {
        point[assetCode] = Math.round(assetPoint.balance_usd);
      }
    });

    return point;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Color palette for assets
  const assetColors: Record<string, string> = {
    'XLM': '#00B0F0',
    'USDC': '#2775CA',
  };

  const getAssetColor = (assetCode: string) => {
    return assetColors[assetCode] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
  };

  // Calculate summary stats for total balance
  const totalBalancePerTimestamp = timestamps.map(timestamp => {
    const pointsAtTime = data.filter(d => d.timestamp === timestamp);
    return pointsAtTime.reduce((sum, p) => sum + p.balance_usd, 0);
  });

  const currentTotal = totalBalancePerTimestamp[totalBalancePerTimestamp.length - 1] || 0;
  const avgTotal = totalBalancePerTimestamp.reduce((sum, b) => sum + b, 0) / totalBalancePerTimestamp.length;
  const maxTotal = Math.max(...totalBalancePerTimestamp);
  const minTotal = Math.min(...totalBalancePerTimestamp);

  return (
    <div ref={chartRef} className="glass-card rounded-2xl p-6 border border-border/50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">Wallet Analytics // 04.A</div>
          <h2 className="text-xl font-black tracking-tighter uppercase italic mb-2">
            Balance History
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-6">
            {address.slice(0, 8)}...{address.slice(-8)}
          </p>
        </div>
        <ChartExportButton chartRef={chartRef} chartName="Balance History" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Current
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-emerald-400">
            {formatCurrency(currentTotal)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Average
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-foreground/80">
            {formatCurrency(avgTotal)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5">
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Range
          </p>
          <p className="text-xl font-black font-mono tracking-tighter text-accent">
            {formatCurrency(maxTotal - minTotal)}
          </p>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />
            <Tooltip
              contentStyle={getTooltipContentStyle({
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '10px',
                fontFamily: 'monospace'
              })}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
              iconType="circle"
            />
            {assets.map(assetCode => (
              <Line
                key={assetCode}
                type="monotone"
                dataKey={assetCode}
                stroke={getAssetColor(assetCode)}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4, fill: getAssetColor(assetCode), stroke: '#fff', strokeWidth: 2 }}
                name={assetCode}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}