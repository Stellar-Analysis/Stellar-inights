"use client";

import React, { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { getAddressValidationError, isStellarAccountAddress } from "@/lib/address";
import { useWallet } from "@/components/lib/wallet-context";

export default function WalletInsightsLookupPage() {
  const t = useTranslations("layout.walletInsights");
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useWallet();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (value: string) => {
    const trimmed = value.trim();
    const validationError = getAddressValidationError(trimmed);
    if (validationError) {
      setError(t("invalidAddress"));
      return;
    }
    setError(null);
    router.push(`/wallet/${trimmed}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="text-[10px] font-mono text-accent uppercase tracking-[0.2em] mb-2">
            {t("eyebrow")}
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <Wallet className="w-8 h-8 text-accent" aria-hidden="true" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mt-3">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <form
        className="glass rounded-2xl border border-border/50 p-6 space-y-4 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          submit(address);
        }}
      >
        <label htmlFor="wallet-address" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("addressLabel")}
        </label>
        <input
          id="wallet-address"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t("addressPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="px-4 py-3 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform"
          >
            {t("submit")}
          </button>
          {isConnected && connectedAddress && isStellarAccountAddress(connectedAddress) && (
            <button
              type="button"
              onClick={() => submit(connectedAddress)}
              className="px-4 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {t("connectedShortcut")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
