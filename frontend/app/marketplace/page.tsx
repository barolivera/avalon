"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAgents, type Agent } from "@/lib/hooks/useAgents";
import { useCountUp } from "@/lib/hooks/useCountUp";
import {
  Robot,
  ChartLineUp,
  ChartLineDown,
  Trophy,
  Percent,
  Flame,
  Shield,
  Lightning,
  ArrowUpRight,
} from "@phosphor-icons/react";

// --- Types ---

type RiskLevel = "low" | "medium" | "high";
type FilterKey = "all" | "low-risk" | "high-yield" | "trending";

const FILTERS: { key: FilterKey; label: string; icon: typeof Robot }[] = [
  { key: "all", label: "All Agents", icon: Robot },
  { key: "low-risk", label: "Low Risk", icon: Shield },
  { key: "high-yield", label: "High Yield", icon: ChartLineUp },
  { key: "trending", label: "Trending", icon: Flame },
];

// --- Helpers ---

function filterAgents(agents: Agent[], filter: FilterKey): Agent[] {
  switch (filter) {
    case "low-risk":
      return agents.filter((a) => a.riskLevel === "low");
    case "high-yield":
      return agents.filter((a) => a.pnl > 30);
    case "trending":
      return agents.filter((a) => a.trending);
    default:
      return agents;
  }
}

function riskBadge(risk: RiskLevel) {
  switch (risk) {
    case "low":
      return "text-green-700 bg-green-50 border-green-200";
    case "medium":
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "high":
      return "text-red-700 bg-red-50 border-red-200";
  }
}

// --- Generative avatar ---

function AgentAvatar({ hue, name }: { hue: number; name: string }) {
  const seed = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cells = Array.from({ length: 9 }, (_, i) => (seed * (i + 7)) % 3 !== 0);

  return (
    <div
      className="w-12 h-12 rounded-xl grid grid-cols-3 gap-px p-1.5 shrink-0"
      style={{ background: `hsl(${hue} 30% 95%)`, border: `1px solid hsl(${hue} 30% 88%)` }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            background: on ? `hsl(${hue} 60% 55%)` : `hsl(${hue} 20% 92%)`,
            opacity: on ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

// --- Reputation bar ---

function ReputationBar({ score }: { score: number }) {
  const barColor =
    score >= 90 ? "from-[#8373FF] to-[#6E5FE8]" :
    score >= 75 ? "from-yellow-500 to-amber-400" :
    "from-red-500 to-orange-400";

  const animated = useCountUp(score, 1000, 300);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--border-lighter)] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          style={{ width: `${animated}%`, transition: "width 50ms linear" }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums font-mono w-8 text-right text-[var(--text-primary)]">{Math.round(animated)}</span>
    </div>
  );
}

// --- Animated PnL number ---

function AnimatedPnl({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const animated = useCountUp(Math.abs(value), 1200, 200);
  const positive = value >= 0;
  return (
    <span className={`text-sm font-semibold tabular-nums font-mono ${positive ? "text-green-600" : "text-red-600"}`}>
      {positive ? "+" : "-"}{animated.toFixed(1)}{suffix}
    </span>
  );
}

// --- Agent card ---

function AgentCard({ agent }: { agent: Agent }) {
  const pnlPositive = agent.pnl >= 0;

  return (
    <div className="group relative flex flex-col rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/30 transition-all duration-300 overflow-hidden">
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header: avatar + name + badges */}
        <div className="flex items-start gap-3">
          <AgentAvatar hue={agent.hue} name={agent.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate text-[var(--text-primary)]">{agent.name}</h3>
              {agent.trending && (
                <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{agent.strategy}</p>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded border border-[var(--primary)]/20 bg-[var(--primary-light)] text-[var(--primary)]">
            ERC-8004
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border ${riskBadge(agent.riskLevel)}`}>
            {agent.riskLevel === "low" ? "Low Risk" : agent.riskLevel === "medium" ? "Medium" : "High Risk"}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border border-[var(--border-light)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
            {agent.totalTrades.toLocaleString()} trades
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
          {agent.description}
        </p>

        {/* Reputation */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
            Reputation Score
          </p>
          <ReputationBar score={agent.reputationScore} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Win Rate</p>
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span className="text-sm font-semibold tabular-nums font-mono text-[var(--text-primary)]">{agent.winRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">PNL</p>
            <div className="flex items-center gap-1">
              {pnlPositive ? (
                <ChartLineUp className="w-3 h-3 text-green-500" />
              ) : (
                <ChartLineDown className="w-3 h-3 text-red-500" />
              )}
              <AnimatedPnl value={agent.pnl} />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">TVL</p>
            <span className="text-sm font-semibold tabular-nums font-mono text-[var(--text-primary)]">{agent.tvl}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-[var(--border-light)] flex items-center justify-between bg-[var(--surface-secondary)]">
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <Percent className="w-3 h-3" />
          <span>
            <span className="text-[var(--text-primary)] font-medium font-mono">{agent.successFee}%</span> fee only if you profit
          </span>
        </div>
        <Button asChild size="sm" className="h-8 px-4 text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-0">
          <Link href={`/agents/${agent.id}`}>
            Hire Agent
            <ArrowUpRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// --- Page ---

export default function MarketplacePage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { data, isLoading } = useAgents();
  const agents = data?.agents ?? [];
  const source = data?.source ?? "mock";
  const filtered = filterAgents(agents, activeFilter);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">Agent Marketplace</h1>
              {source === "onchain" && (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border border-green-200 bg-green-50 text-green-700">
                  Live on-chain
                </span>
              )}
            </div>
            <p className="text-[var(--text-secondary)]">
              Browse autonomous trading agents with verified on-chain track records.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 animate-fade-in">
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeFilter === key
                    ? "bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-light)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] shadow-[var(--shadow-card)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up">
            {filtered.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-[var(--text-secondary)]">
              No agents match this filter.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
