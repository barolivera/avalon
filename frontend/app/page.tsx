"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  Robot,
  SlidersHorizontal,
  Trophy,
  ChartLineUp,
  Users,
  Lightning,
  IdentificationBadge,
  ShieldCheck,
  Handshake,
  Diamond,
  Mountains,
  Link as LinkIcon,
  Drop,
  Brain,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// ── Data ──

const stats = [
  { label: "Active Agents", value: "128", icon: Robot },
  { label: "Total Volume", value: "$4.2M", icon: ChartLineUp },
  { label: "Avg Win Rate", value: "68%", icon: Trophy },
];

const steps = [
  {
    icon: Robot,
    title: "Choose an Agent",
    description: "Explore the marketplace, filter by risk level and verified performance history. Every agent has an on-chain identity via ERC-8004.",
  },
  {
    icon: SlidersHorizontal,
    title: "Set Your Limits",
    description: "Configure stop loss, max allocation, and emergency stop. You stay in control — the agent operates within your boundaries.",
  },
  {
    icon: Lightning,
    title: "Pay Only If You Win",
    description: "Success fee charged automatically via x402 protocol. Zero fee if there's no profit. Fully transparent, fully on-chain.",
  },
];

const poweredBy = [
  { name: "Avalanche", role: "High-speed settlement", icon: Mountains },
  { name: "Chainlink", role: "Real-time price feeds", icon: LinkIcon },
  { name: "Trader Joe", role: "Liquidity execution", icon: Drop },
  { name: "GenLayer", role: "AI strategy engine", icon: Brain },
];

const whyAvalon = [
  {
    icon: IdentificationBadge,
    title: "On-chain Identity",
    description: "Every agent has a verifiable ERC-8004 identity with immutable reputation scores and auditable trade history.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Trust Needed",
    description: "Your strategy is fully auditable on-chain. You keep your keys, set your limits, and can emergency-stop anytime.",
  },
  {
    icon: Handshake,
    title: "Performance Aligned",
    description: "Agents only earn when you earn. Success fees are collected via x402 — no profit, no payment. Interests fully aligned.",
  },
];

// ── Scroll reveal hook ──

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const children = el.querySelectorAll(".reveal-item");
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}

// ── Page ──

export default function HomePage() {
  const revealRef = useScrollReveal();

  return (
    <div className="min-h-screen flex flex-col" ref={revealRef}>
      <Navbar />

      <main className="flex-grow pt-24 pb-0 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ── Hero ── */}
          <section className="text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-light)] text-sm text-[var(--primary)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]" />
              </span>
              Live on Avalanche
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-[var(--text-primary)]">
              Avalon — AI Agents
              <br />
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] bg-clip-text text-transparent">
                That Trade For You
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10">
              Deploy autonomous trading strategies powered by AI.
              No code required. You keep control.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 px-8 text-base bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-0">
                <Link href="/marketplace">
                  <Users className="w-4 h-4 mr-2" />
                  Explore Agents
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base border-[var(--border-light)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                <Link href="/builder">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Build Strategy
                </Link>
              </Button>
            </div>
          </section>

          {/* ── Stats Bar ── */}
          <section className="mb-20 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-4 p-5 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--primary-light)]">
                    <stat.icon className="w-5 h-5 text-[var(--primary)]" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">{stat.value}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── How it Works ── */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-center mb-4 reveal-item opacity-0 translate-y-6 transition-all duration-700">
              How it Works
            </h2>
            <p className="text-center text-[var(--text-secondary)] mb-12 max-w-lg mx-auto reveal-item opacity-0 translate-y-6 transition-all duration-700 delay-100">
              Three steps to autonomous trading — no code, no trust assumptions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="reveal-item opacity-0 translate-y-8 transition-all duration-700"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="relative p-6 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/30 transition-all duration-300 h-full">
                    <div className="absolute top-4 right-5 text-6xl font-bold text-[var(--primary)]/[0.06] select-none pointer-events-none">
                      {i + 1}
                    </div>
                    <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/10">
                      <step.icon className="w-6 h-6 text-[var(--primary)]" weight="duotone" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">{step.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Powered By ── */}
        <section className="bg-[var(--surface-hover)] -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-16 mb-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2 reveal-item opacity-0 translate-y-6 transition-all duration-700">
              Built on battle-tested infrastructure
            </h2>
            <p className="text-center text-[var(--text-tertiary)] mb-10 reveal-item opacity-0 translate-y-6 transition-all duration-700 delay-100">
              Every component production-grade and open source
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {poweredBy.map((item, i) => (
                <div
                  key={item.name}
                  className="reveal-item opacity-0 translate-y-6 transition-all duration-700 flex flex-col items-center text-center p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-light)] shadow-[var(--shadow-card)]"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--primary-light)] mb-3">
                    <item.icon className="w-5 h-5 text-[var(--primary)]" weight="duotone" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{item.name}</span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">{item.role}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Avalon ── */}
        <div className="max-w-6xl mx-auto mb-24">
          <section>
            <h2 className="text-3xl font-bold text-center mb-4 reveal-item opacity-0 translate-y-6 transition-all duration-700">
              Why Avalon
            </h2>
            <p className="text-center text-[var(--text-secondary)] mb-12 max-w-lg mx-auto reveal-item opacity-0 translate-y-6 transition-all duration-700 delay-100">
              Transparent, auditable, and aligned with your interests.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {whyAvalon.map((item, i) => (
                <div
                  key={item.title}
                  className="reveal-item opacity-0 translate-y-8 transition-all duration-700 p-6 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/10">
                    <item.icon className="w-6 h-6 text-[var(--primary)]" weight="duotone" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-light)] bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2">
                <Diamond className="w-5 h-5 text-[var(--primary)]" weight="fill" />
                <span className="text-lg font-bold text-[var(--text-primary)]">Avalon</span>
              </div>
              <p className="text-[12px] text-[var(--text-tertiary)]">AI agents that trade for you</p>
            </div>

            {/* Links */}
            <nav className="flex items-center gap-6 text-sm">
              {[
                { href: "/marketplace", label: "Marketplace" },
                { href: "/builder", label: "Builder" },
                { href: "/dashboard", label: "Dashboard" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--text-tertiary)]">
            <span>Built for Aleph Hackathon 2026 · Avalanche + GenLayer</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded border border-orange-200 bg-orange-50 text-orange-700">
                x402 Powered
              </span>
              <span>&copy; 2026 Avalon</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll reveal styles */}
      <style jsx global>{`
        .reveal-item.revealed {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </div>
  );
}
