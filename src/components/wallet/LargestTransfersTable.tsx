'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { WalletTransfer } from '@/lib/analytics-api';
import { formatAddressShort } from '@/lib/address';

interface LargestTransfersTableProps {
  transfers: WalletTransfer[];
  address: string;
}

type SortKey = 'timestamp' | 'amount_usd' | 'asset_code';
type SortDir = 'asc' | 'desc';

function formatUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(v);
}

function formatAmount(amount: number, assetCode: string): string {
  const decimals = assetCode === 'USDC' ? 2 : 4;
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: decimals })} ${assetCode}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}

function SortHeader({ label, sortKey, currentKey, direction, onSort, className = '' }: SortHeaderProps) {
  const active = sortKey === currentKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider transition-colors ${
        active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
      } ${className}`}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <span className="flex flex-col" aria-hidden="true">
        <ChevronUp className={`w-2 h-2 -mb-0.5 ${active && direction === 'asc' ? 'text-accent' : 'text-muted-foreground/30'}`} />
        <ChevronDown className={`w-2 h-2 ${active && direction === 'desc' ? 'text-accent' : 'text-muted-foreground/30'}`} />
      </span>
    </button>
  );
}

export function LargestTransfersTable({ transfers, address }: LargestTransfersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('amount_usd');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...transfers].sort((a, b) => {
    let diff = 0;
    if (sortKey === 'amount_usd') diff = a.amount_usd - b.amount_usd;
    else if (sortKey === 'timestamp') diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    else if (sortKey === 'asset_code') diff = a.asset_code.localeCompare(b.asset_code);
    return sortDir === 'asc' ? diff : -diff;
  });

  const stellarExpertBase = 'https://stellar.expert/explorer/public/tx';

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/50">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">
          Wallet Analytics // 05
        </div>
        <h2 className="text-xl font-black tracking-tighter uppercase italic mb-1">
          Largest Transfers
        </h2>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {address.slice(0, 8)}...{address.slice(-8)} · top {sorted.length} by value
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono" role="table" aria-label="Largest wallet transfers">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left pb-3 pr-4 w-6" scope="col">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Dir</span>
              </th>
              <th className="text-left pb-3 pr-4" scope="col">
                <SortHeader
                  label="Date"
                  sortKey="timestamp"
                  currentKey={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left pb-3 pr-4" scope="col">
                <SortHeader
                  label="Asset"
                  sortKey="asset_code"
                  currentKey={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="text-right pb-3 pr-4" scope="col">
                <SortHeader
                  label="Amount"
                  sortKey="amount_usd"
                  currentKey={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                  className="justify-end"
                />
              </th>
              <th className="text-left pb-3 pr-4 hidden sm:table-cell" scope="col">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Counterparty</span>
              </th>
              <th className="text-right pb-3" scope="col">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider sr-only">Link</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => {
              const isIn = tx.direction === 'in';
              return (
                <tr
                  key={tx.id}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors group"
                >
                  {/* Direction badge */}
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                        isIn
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                      aria-label={isIn ? 'Incoming transfer' : 'Outgoing transfer'}
                    >
                      {isIn
                        ? <ArrowDownLeft className="w-2.5 h-2.5" aria-hidden="true" />
                        : <ArrowUpRight className="w-2.5 h-2.5" aria-hidden="true" />}
                      {isIn ? 'IN' : 'OUT'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="py-3 pr-4 text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatDate(tx.timestamp)}
                  </td>

                  {/* Asset + amount */}
                  <td className="py-3 pr-4">
                    <span className="text-foreground font-bold uppercase">{tx.asset_code}</span>
                  </td>

                  {/* USD value + raw amount */}
                  <td className="py-3 pr-4 text-right">
                    <p className="text-foreground font-bold tabular-nums">{formatUsd(tx.amount_usd)}</p>
                    <p className="text-muted-foreground/60 tabular-nums text-[9px]">
                      {formatAmount(tx.amount, tx.asset_code)}
                    </p>
                  </td>

                  {/* Counterparty */}
                  <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                    <span
                      className="font-mono tracking-tight"
                      title={tx.counterparty}
                    >
                      {formatAddressShort(tx.counterparty, 6, 6)}
                    </span>
                    {tx.memo && (
                      <p className="text-muted-foreground/40 text-[9px] mt-0.5 truncate max-w-[120px]">
                        {tx.memo}
                      </p>
                    )}
                  </td>

                  {/* External link */}
                  <td className="py-3 text-right">
                    <a
                      href={`${stellarExpertBase}/${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground/30 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`View transaction ${tx.id} on Stellar Expert`}
                    >
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-12 text-center text-muted-foreground font-mono text-xs uppercase tracking-widest">
            No transfers found
          </div>
        )}
      </div>
    </div>
  );
}
