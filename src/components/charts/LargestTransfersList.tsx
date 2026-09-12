'use client';

import { useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { LargestTransfer } from '@/lib/analytics-api';
import { formatAddressShort } from '@/lib/address';
import { ChartExportButton } from './ChartExportButton';

interface LargestTransfersListProps {
  transfers: LargestTransfer[];
  address: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value < 1 ? 7 : 2,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LargestTransfersList({ transfers, address }: LargestTransfersListProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={chartRef} className="glass-card rounded-2xl p-6 border border-border/50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">Wallet Analytics // 04.C</div>
          <h2 className="text-xl font-black tracking-tighter uppercase italic mb-2">
            Largest Transfers
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-6">
            {address.slice(0, 8)}...{address.slice(-8)}
          </p>
        </div>
        <ChartExportButton chartRef={chartRef} chartName="Largest Transfers" />
      </div>

      {transfers.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No transfers recorded for this address yet.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-sm min-w-[560px]">
            <thead>
              <tr className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider border-b border-white/5">
                <th className="px-2 py-2 font-medium">Direction</th>
                <th className="px-2 py-2 font-medium">Counterparty</th>
                <th className="px-2 py-2 font-medium text-right">Amount</th>
                <th className="px-2 py-2 font-medium text-right">Value</th>
                <th className="px-2 py-2 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-2 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        t.direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.direction === 'in' ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                      {t.direction === 'in' ? 'Received' : 'Sent'}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-slate-300">
                    {formatAddressShort(t.counterparty, 6, 6)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-slate-300">
                    {formatAmount(t.amount)}{' '}
                    <span className="text-muted-foreground">{t.asset_code}</span>
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-bold text-foreground/90">
                    {formatCurrency(t.amount_usd)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-[10px] text-muted-foreground uppercase">
                    {formatDate(t.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
