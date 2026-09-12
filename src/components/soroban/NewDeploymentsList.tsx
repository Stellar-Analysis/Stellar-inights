"use client";

import React from "react";
import { AlertTriangle, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatAddressShort } from "@/lib/address";
import type { SorobanDeployment } from "@/lib/soroban-api";

interface NewDeploymentsListProps {
  deployments: SorobanDeployment[];
  /** Backend marks coverage incomplete pending contracts-repo event work. */
  partial?: boolean;
  notice?: string | null;
  loading?: boolean;
}

function formatDeployedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DEFAULT_PARTIAL_NOTICE =
  "Deployment coverage is partial — some contracts do not emit init/deploy events yet. This list may be incomplete.";

export function NewDeploymentsList({
  deployments,
  partial = false,
  notice,
  loading = false,
}: NewDeploymentsListProps) {
  const showPartialBanner = partial || Boolean(notice);
  const bannerText = notice?.trim() || DEFAULT_PARTIAL_NOTICE;

  return (
    <section
      aria-labelledby="new-deployments-heading"
      className="glass rounded-2xl border border-border/50 p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2
            id="new-deployments-heading"
            className="text-sm font-bold uppercase tracking-widest text-muted-foreground"
          >
            New Deployments
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest mt-1">
            Recent contract deployments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {partial && (
            <Badge
              variant="warning"
              className="text-[10px] font-mono min-h-0 min-w-0 px-2 py-0.5"
            >
              PARTIAL
            </Badge>
          )}
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-border/50 min-h-0 min-w-0 px-2 py-0.5"
          >
            {deployments.length} FOUND
          </Badge>
        </div>
      </div>

      {showPartialBanner && (
        <div
          role="status"
          className="mb-4 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <AlertTriangle
            className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-amber-100/90 leading-relaxed">{bannerText}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : deployments.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center"
          role="status"
        >
          <Rocket
            className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            No deployments reported
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2 max-w-md mx-auto">
            {partial
              ? "Empty for now — waiting on contract deployment/init event coverage from the contracts repo."
              : "No new Soroban deployments in the current window."}
          </p>
        </div>
      ) : (
        <ul role="list" className="m-0 p-0 list-none divide-y divide-border/20">
          {deployments.map((item) => (
            <li
              key={`${item.contract_id}-${item.deployed_at}`}
              className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Rocket className="w-4 h-4 text-accent" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <code
                    className="font-mono text-xs tracking-tight block truncate"
                    title={item.contract_id}
                  >
                    {formatAddressShort(item.contract_id, 6, 6)}
                  </code>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                    {formatDeployedAt(item.deployed_at)}
                    {item.ledger != null ? ` // Ledger ${item.ledger}` : ""}
                  </p>
                  {item.deployer && (
                    <p
                      className="text-[10px] font-mono text-muted-foreground/70 mt-1 truncate"
                      title={item.deployer}
                    >
                      Deployer {formatAddressShort(item.deployer, 4, 4)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
