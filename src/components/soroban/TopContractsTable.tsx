"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatAddressShort } from "@/lib/address";
import type { SorobanTopContract } from "@/lib/soroban-api";

interface TopContractsTableProps {
  contracts: SorobanTopContract[];
  windowLabel?: string;
  loading?: boolean;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function TopContractsTable({
  contracts,
  windowLabel = "7d",
  loading = false,
}: TopContractsTableProps) {
  return (
    <section
      aria-labelledby="top-contracts-heading"
      className="glass rounded-2xl border border-border/50 p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2
            id="top-contracts-heading"
            className="text-sm font-bold uppercase tracking-widest text-muted-foreground"
          >
            Top Contracts
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest mt-1">
            Ranked by call volume // {windowLabel}
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-mono border-border/50 min-h-0 min-w-0 px-2 py-0.5"
        >
          TOP_{contracts.length || 0}
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center"
          role="status"
        >
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            No contract activity in this window
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2 max-w-md mx-auto">
            Top contracts will appear once Soroban call events are available from the backend.
          </p>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground w-12">
                  #
                </th>
                <th className="pb-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
                  Contract
                </th>
                <th className="pb-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-right">
                  Calls
                </th>
                <th className="pb-4 font-bold uppercase tracking-widest text-[10px] text-muted-foreground text-right">
                  Events
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {contracts.map((contract, index) => (
                <tr
                  key={contract.contract_id}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 font-mono text-muted-foreground tabular-nums">
                    {index + 1}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
                        C
                      </div>
                      <code
                        className="font-mono text-xs tracking-tight"
                        title={contract.contract_id}
                      >
                        {formatAddressShort(contract.contract_id, 6, 6)}
                      </code>
                    </div>
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums font-medium">
                    {formatCount(contract.call_count)}
                  </td>
                  <td className="py-4 text-right font-mono tabular-nums text-muted-foreground">
                    {contract.event_count != null
                      ? formatCount(contract.event_count)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
