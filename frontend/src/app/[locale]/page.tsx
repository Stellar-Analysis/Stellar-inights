"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  Shield,
  Activity,
  ChevronRight,
  Globe,
  Database,
} from "lucide-react";
import { useWallet } from "@/components/lib/wallet-context";
import { HomeStatsTiles } from "@/components/dashboard/HomeStatsTiles";
import { TopAssetsCard } from "@/components/dashboard/TopAssetsCard";
import { useTopMovers } from "@/hooks/useTopMovers";
import { useHomeStats } from "@/hooks/useHomeStats";

export default function Home() {
  const { isConnected, connectWallet, isConnecting } = useWallet();
  const t = useTranslations("home");
  const { data: movers, loading: moversLoading, error: moversError } = useTopMovers(5);
  const homeStats = useHomeStats();

  const topMoversAssets = movers.map((asset) => ({
    asset: asset.symbol,
    volume: asset.volume24h,
    tvl: asset.volume24h,
    price: asset.price,
    change: asset.change24h,
    newHolders24h: asset.newHolders24h,
  }));

  return (
    <main className="space-y-24 pb-20">
      {/* Hero Section - Data First */}
      <section aria-labelledby="hero-heading" className="relative pt-12">
        <div className="max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-pulse-slow" role="status" aria-live="polite">
            <Activity className="w-4 h-4 text-accent" aria-hidden="true" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              {t("hero.liveBadge")}
            </span>
          </div>

          <h1 id="hero-heading" className="text-6xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-8">
            {t("hero.title")} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">
              {t("hero.titleHighlight")}
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-accent text-white rounded-xl font-bold hover:glow-accent transition-all flex items-center gap-2 group"
            >
              {t("hero.enterTerminal")}{" "}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {!isConnected && (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-8 py-4 glass text-foreground rounded-xl font-bold hover:bg-white/10 transition-all border-border"
              >
                {isConnecting ? t("hero.initializing") : t("hero.connectIdentity")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Live Intelligence Strip */}
      <HomeStatsTiles {...homeStats} t={t} />

      <section className="rounded-[2rem] border border-border/50 bg-background/50 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent">
              {t("topMovers.title")}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{t("topMovers.heading")}</h2>
          </div>
          {!moversLoading && !moversError && (
            <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {t("topMovers.live" )}
            </span>
          )}
        </div>

        {moversLoading ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            {t("topMovers.loading")}
          </div>
        ) : moversError ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            {moversError}
          </div>
        ) : topMoversAssets.length > 0 ? (
          <TopAssetsCard assets={topMoversAssets} mode="top-movers" title={t("topMovers.heading")} />
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            {t("topMovers.empty")}
          </div>
        )}
      </section>

      {/* Industrial Capabilities */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-accent mb-6">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold underline decoration-accent/30 underline-offset-8">
            {t("capabilities.globalCorridors")}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {t("capabilities.globalCorridorsDesc")}
          </p>
        </div>

        <div className="space-y-4">
          <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-accent mb-6">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold underline decoration-accent/30 underline-offset-8">
            {t("capabilities.deepTelemetry")}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {t("capabilities.deepTelemetryDesc")}
          </p>
        </div>

        <div className="space-y-4">
          <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-accent mb-6">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold underline decoration-accent/30 underline-offset-8">
            {t("capabilities.predictiveTrust")}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {t("capabilities.predictiveTrustDesc")}
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="glass-card p-12 rounded-[2rem] border border-accent/20 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[80px] -z-10 group-hover:bg-accent/30 transition-colors" />
        <div className="max-w-2xl">
          <h2 className="text-4xl font-bold mb-6 tracking-tight">
            {t("cta.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-10">{t("cta.subtitle")}</p>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-accent text-white rounded-xl font-bold hover:scale-105 transition-transform"
            >
              {t("cta.launchTerminal")}
            </Link>
            <button className="px-8 py-4 glass text-foreground rounded-xl font-bold hover:bg-white/10 transition-all">
              {t("cta.readSpec")}
            </button>
          </div>
        </div>
      </section>

      <footer className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight">{t("footer.stellarInsights")}</span>
          <span className="hidden md:inline text-xs text-muted-foreground/70">
            {t("footer.tagline")}
          </span>
        </div>
        <div className="flex gap-8 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">
            {t("footer.networkStatus")}
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            {t("footer.apiKeys")}
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            {t("footer.governance")}
          </a>
        </div>
        <p className="text-xs text-muted-foreground/50 font-mono">
          {t("footer.copyright")}
        </p>
      </footer>
    </main>
  );
}
