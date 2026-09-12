"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, CircleDot, Compass, ScanLine, ShieldCheck } from "lucide-react";
import { animate, motion, useInView } from "framer-motion";

const signals = [
  ["SETTLEMENT VELOCITY", "98.4%", "STABLE"],
  ["ACTIVE CORRIDORS", "142", "TRACKED"],
  ["LIQUIDITY DEPTH", "$2.8B", "OBSERVED"],
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function AnimatedStat({ value }: { value: string }) {
  const match = value.match(/^([^\d.]*)([\d.]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const target = match ? parseFloat(match[2]) : 0;
  const decimals = match?.[2]?.includes(".") ? 1 : 0;
  const suffix = match?.[3] ?? "";

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState((0).toFixed(decimals));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate(latest) {
        setDisplay(latest.toFixed(decimals));
      },
    });
    return () => controls.stop();
  }, [inView, target, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default function Home() {
  return (
    <main data-landing className="stellar-landing -mx-4 -mt-4 min-h-[calc(100vh-2rem)] overflow-hidden md:-mx-8 md:-mt-8">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center justify-between border-b border-landing-line px-6 py-5 md:px-12"
      >
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-landing-ink">
          <span className="flex size-8 items-center justify-center border border-landing-gold text-landing-gold"><CircleDot className="size-4" /></span>
          STELLAR ANALYSIS
        </Link>
        <div className="hidden items-center gap-8 text-[10px] font-mono uppercase tracking-[0.24em] text-landing-muted md:flex">
          <span>NETWORK / 01</span><span>INTELLIGENCE / 02</span><span>ARCHIVE / 03</span>
        </div>
        <Link href="/dashboard" className="border border-landing-line px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-landing-ink transition-colors hover:border-landing-gold hover:text-landing-gold">Open console</Link>
      </motion.header>

      <section className="relative flex min-h-[590px] items-center px-6 py-20 md:px-12 lg:min-h-[680px] lg:px-24">
        <div className="stellar-dune" aria-hidden="true" />
        <div className="relative z-10 max-w-3xl">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.1}
            className="mb-8 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.35em] text-landing-gold"
          >
            <ScanLine className="size-4" /> Field intelligence for the Stellar network
          </motion.p>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.22}
            className="max-w-4xl font-serif text-6xl leading-[0.92] tracking-[-0.06em] text-landing-ink md:text-8xl lg:text-[9.5rem]"
          >
            Read the<br /><em className="text-landing-gold">signal.</em>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.36}
            className="mt-10 max-w-xl text-base leading-7 text-landing-muted md:text-lg"
          >
            Stellar Analysis turns a living payment network into a navigable map of liquidity, settlement, and trust. See the movement beneath the surface.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.48}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link href="/dashboard" className="group inline-flex items-center gap-3 bg-landing-gold px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-landing-night transition-transform hover:-translate-y-1">In-depth analysis <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link>
            <Link href="/rankings" className="inline-flex items-center gap-2 border border-landing-line px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-landing-ink transition-colors hover:border-landing-gold">Explore rankings</Link>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="absolute bottom-10 right-8 hidden max-w-[190px] text-right text-[10px] font-mono uppercase leading-5 tracking-[0.18em] text-landing-muted lg:block"
        >
          A living atlas of<br />payments in motion.<br /><span className="text-landing-gold">Est. 2024 // v1.0</span>
        </motion.div>
      </section>

      <section className="relative z-10 grid border-t border-landing-line md:grid-cols-3">
        {signals.map(([label, value, status], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ backgroundColor: "rgba(215, 168, 75, 0.05)" }}
            className="flex items-end justify-between border-b border-landing-line px-6 py-8 md:border-b-0 md:border-r md:px-12"
          >
            <div>
              <p className="text-[10px] font-mono tracking-[0.24em] text-landing-muted">{label}</p>
              <p className="mt-3 font-serif text-4xl text-landing-ink"><AnimatedStat value={value} /></p>
            </div>
            <span className="mb-1 text-[9px] font-mono tracking-[0.18em] text-landing-gold">{status}</span>
          </motion.div>
        ))}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col gap-10 border-t border-landing-line px-6 py-16 md:flex-row md:items-end md:justify-between md:px-12 lg:px-24"
      >
        <div className="max-w-xl"><p className="text-[10px] font-mono uppercase tracking-[0.3em] text-landing-gold">The observatory</p><h2 className="mt-5 font-serif text-4xl leading-tight text-landing-ink md:text-5xl">Every corridor tells a story.</h2></div>
        <div className="max-w-md text-sm leading-6 text-landing-muted"><p>Follow the routes, anchors, and liquidity pools shaping global settlement. Stellar Analysis keeps the instruments close and the conclusions clear.</p><div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-landing-ink"><ShieldCheck className="size-4 text-landing-gold" /> Auditable by design</div></div>
      </motion.section>

      <footer className="relative z-10 flex flex-col gap-4 border-t border-landing-line px-6 py-6 text-[10px] font-mono uppercase tracking-[0.2em] text-landing-muted md:flex-row md:items-center md:justify-between md:px-12"><span>Stellar Analysis / Payment network intelligence</span><span className="flex items-center gap-2"><Compass className="size-3 text-landing-gold" /> Signal is everywhere</span></footer>
    </main>
  );
}
