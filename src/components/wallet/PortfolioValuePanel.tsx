'use client';

import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Layers, Clock } from 'lucide-react';
import { WalletPortfolioSnapshot } from '@/lib/analytics-api';
import { formatAddressShort } from '@/lib/address';

interface PortfolioValuePanelProps {
  data: WalletPortfolioSnapshot;
}

function formatUsd(value: number, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 1) return 'Less than 1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function PortfolioValuePanel({ data }: PortfolioValuePanelProps) {
  const isUp = data.change_24h_usd >= 0;
  const changeColor = isUp ? 'text-emerald-400' : 'text-rose-400';
  const changeBg = isUp ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20';

  const kpis = [
    {
      icon: Layers,
      label: 'Total Assets',
      value: data.total_assets,
      sub: 'distinct tokens held',
      accent: false,
    },
    {
      icon: Activity,
      label: '30d Transactions',
      value: data.total_transactions_30d,
      sub: 'last 30 days',
      accent: false,
    },
    {
      icon: Clock,
      label: 'Last Activity',
      value: formatRelativeTime(data.last_activity),
      sub: new Date(data.last_activity).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      accent: false,
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/50">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">
          Wallet Analytics // 01
        </div>
        <h2 className="text-xl font-black tracking-tighter uppercase italic mb-1">
          Portfolio Value
        </h2>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
          <Wallet className="w-3 h-3" aria-hidden="true" />
          {formatAddressShort(data.address)}
        </p>
      </div>

      {/* Hero value */}
      <div className="flex items-end gap-4 mb-6">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Total Value
          </p>
          <p className="text-5xl font-black font-mono tracking-tighter text-foreground">
            {formatUsd(data.total_value_usd)}
          </p>
        </div>

        {/* 24h change pill */}
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold mb-2 ${changeBg} ${changeColor}`}
          aria-label={`24-hour change: ${isUp ? 'up' : 'down'} ${Math.abs(data.change_24h_pct).toFixed(2)} percent`}
        >
          {isUp
            ? <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            : <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />}
          <span>{isUp ? '+' : ''}{data.change_24h_pct.toFixed(2)}%</span>
          <span className="text-muted-foreground font-normal ml-1">24h</span>
        </div>
      </div>

      {/* Change in USD */}
      <p className={`text-sm font-mono mb-8 ${changeColor}`}>
        {isUp ? '+' : ''}{formatUsd(data.change_24h_usd)} today
      </p>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map(({ icon: Icon, label, value, sub }) => (
          <div
            key={label}
            className="p-4 rounded-xl bg-slate-900/30 border border-white/5 group hover:border-accent/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon
                className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-accent transition-colors"
                aria-hidden="true"
              />
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                {label}
              </p>
            </div>
            <p className="text-lg font-black font-mono tracking-tighter text-foreground truncate">
              {value}
            </p>
            <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-wide mt-0.5 truncate">
              {sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
