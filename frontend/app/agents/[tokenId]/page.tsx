"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMockAgents } from "@/lib/hooks/useAgents";
import { useChainlinkPrice } from "@/lib/hooks/useChainlinkPrice";
import { useX402, type X402Step } from "@/lib/hooks/useX402";
import {
  CaretRight,
  Trophy,
  ChartLineUp,
  ChartLineDown,
  Broadcast,
  ChartBar,
  Drop,
  Crosshair,
  Shield,
  Clock,
  Coins,
  Wallet,
  Lightning,
  CheckCircle,
  Warning,
  ArrowSquareOut,
  Hourglass,
  ArrowRight,
  CircleNotch,
  CurrencyDollar,
  Receipt,
} from "@phosphor-icons/react";

// ── Types ──

type Period = "7D" | "30D" | "90D";

interface Trade {
  date: string;
  action: "Buy" | "Sell";
  pair: string;
  entry: number;
  exit: number;
  pnl: number;
}

// ── Mock chart data ──

function generateChartData(days: number): { day: string; pnl: number }[] {
  const data: { day: string; pnl: number }[] = [];
  let value = 1000;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Upward bias with noise
    value += (Math.random() - 0.35) * 40;
    value = Math.max(800, value);
    data.push({ day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), pnl: Math.round(value) });
  }
  return data;
}

const CHART_DATA: Record<Period, { day: string; pnl: number }[]> = {
  "7D": generateChartData(7),
  "30D": generateChartData(30),
  "90D": generateChartData(90),
};

// ── Mock trades ──

const MOCK_TRADES: Trade[] = [
  { date: "Mar 21, 14:32", action: "Sell", pair: "AVAX/USDC", entry: 34.2, exit: 36.8, pnl: 7.6 },
  { date: "Mar 21, 09:15", action: "Buy", pair: "AVAX/USDC", entry: 33.8, exit: 34.2, pnl: 1.18 },
  { date: "Mar 20, 22:48", action: "Sell", pair: "WETH/AVAX", entry: 18.1, exit: 19.3, pnl: 6.63 },
  { date: "Mar 20, 16:03", action: "Buy", pair: "BTC.b/USDC", entry: 67420, exit: 66100, pnl: -1.96 },
  { date: "Mar 19, 11:27", action: "Sell", pair: "AVAX/USDC", entry: 32.1, exit: 34.5, pnl: 7.48 },
  { date: "Mar 18, 08:45", action: "Buy", pair: "AVAX/USDC", entry: 31.5, exit: 32.1, pnl: 1.9 },
  { date: "Mar 17, 19:12", action: "Sell", pair: "WETH/AVAX", entry: 17.8, exit: 18.1, pnl: 1.69 },
  { date: "Mar 16, 14:33", action: "Buy", pair: "BTC.b/USDC", entry: 65800, exit: 67420, pnl: 2.46 },
  { date: "Mar 15, 10:22", action: "Sell", pair: "AVAX/USDC", entry: 30.2, exit: 31.5, pnl: 4.3 },
  { date: "Mar 14, 07:01", action: "Buy", pair: "AVAX/USDC", entry: 29.8, exit: 30.2, pnl: 1.34 },
];

// ── Strategy node chips ──

const STRATEGY_NODES = [
  { label: "Chainlink Price Feed", icon: Broadcast, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { label: "RSI Indicator", icon: ChartBar, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { label: "Trader Joe LB Swap", icon: Drop, color: "text-red-600 bg-red-50 border-red-200" },
  { label: "Take Profit", icon: Crosshair, color: "text-green-600 bg-green-50 border-green-200" },
];

// ── Avatar ──

function AgentAvatar({ hue, name, size = 64 }: { hue: number; name: string; size?: number }) {
  const seed = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cells = Array.from({ length: 9 }, (_, i) => (seed * (i + 7)) % 3 !== 0);
  const px = size * 0.12;

  return (
    <div
      className="rounded-2xl grid grid-cols-3 shrink-0"
      style={{
        width: size,
        height: size,
        padding: px,
        gap: 2,
        background: `hsl(${hue} 30% 95%)`,
        border: `1px solid hsl(${hue} 30% 88%)`,
      }}
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

// ── x402 step indicator ──

const STEP_ORDER: X402Step[] = ["checking", "fee-required", "settling", "settled"];

function X402StepIndicator({ label, step, current }: { label: string; step: X402Step; current: X402Step }) {
  const stepIdx = STEP_ORDER.indexOf(step);
  const currentIdx = STEP_ORDER.indexOf(current);
  const isActive = step === current;
  const isDone = currentIdx > stepIdx;
  const isPending = currentIdx < stepIdx;

  return (
    <div className={`flex items-center gap-2.5 text-[12px] transition-opacity duration-300 ${isPending ? "opacity-30" : "opacity-100"}`}>
      {isDone ? (
        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" weight="fill" />
      ) : isActive ? (
        <CircleNotch className="w-4 h-4 text-[var(--primary)] shrink-0 animate-spin" />
      ) : (
        <div className="w-4 h-4 rounded-full border border-[var(--border-light)] shrink-0" />
      )}
      <span className={isDone ? "text-green-700" : isActive ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
        {label}
      </span>
    </div>
  );
}

// ── Page ──

export default function AgentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = params.tokenId as string;

  const agents = useMockAgents();
  const agent = agents.find((a) => a.id === tokenId);

  const { data: avaxPrice } = useChainlinkPrice("AVAX/USD");

  const [period, setPeriod] = useState<Period>("30D");
  const [showHireModal, setShowHireModal] = useState(false);
  const [allocAmount, setAllocAmount] = useState("1000");
  const [stopLoss, setStopLoss] = useState("10");
  const [maxAlloc, setMaxAlloc] = useState("5000");
  const [agreed, setAgreed] = useState(false);
  const { step: x402Step, result: x402Result, settleAgentFee, reset: resetX402 } = useX402();

  if (!agent) {
    if (typeof window !== "undefined") router.replace("/marketplace");
    return null;
  }

  const pnlPositive = agent.pnl >= 0;
  const tokenIdDisplay = `#${tokenId.replace("agent-", "").padStart(4, "0")}`;

  const handleHire = async () => {
    // Simulate a profit amount for the demo (random $50-$500)
    const mockProfit = Math.round((50 + Math.random() * 450) * 100) / 100;
    try {
      await settleAgentFee(agent.id, mockProfit, agent.successFee, "0x7a3B...f29E");
    } catch {
      // error state handled by the hook
    }
  };

  const handleCloseModal = () => {
    setShowHireModal(false);
    resetX402();
    setAgreed(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] mb-6 animate-fade-in">
            <Link href="/marketplace" className="hover:text-[var(--primary)] transition-colors">
              Marketplace
            </Link>
            <CaretRight className="w-3 h-3" />
            <span className="text-[var(--text-primary)] font-medium">{agent.name}</span>
          </nav>

          {/* Two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── LEFT COLUMN ── */}
            <div className="lg:col-span-7 space-y-6 animate-fade-in">
              {/* Hero */}
              <div className="p-6 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-4">
                  <AgentAvatar hue={agent.hue} name={agent.name} size={72} />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{agent.name}</h1>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">{agent.strategy}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded border border-[var(--primary)]/20 bg-[var(--primary-light)] text-[var(--primary)]">
                        ERC-8004
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border ${
                        agent.riskLevel === "low" ? "text-green-700 bg-green-50 border-green-200" :
                        agent.riskLevel === "medium" ? "text-yellow-700 bg-yellow-50 border-yellow-200" :
                        "text-red-700 bg-red-50 border-red-200"
                      }`}>
                        {agent.riskLevel === "low" ? "Low Risk" : agent.riskLevel === "medium" ? "Medium" : "High Risk"}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border text-green-700 bg-green-50 border-green-200">
                        ACTIVE
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-[var(--text-tertiary)]">
                      <span>Token ID: <span className="font-mono text-[var(--text-secondary)]">{tokenIdDisplay}</span></span>
                      <span>Owner: <span className="font-mono text-[var(--text-secondary)]">0x7a3B...f29E</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="p-6 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Performance</h2>
                  <div className="flex items-center gap-1">
                    {(["7D", "30D", "90D"] as Period[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          period === p
                            ? "bg-[var(--primary-light)] text-[var(--primary)]"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART_DATA[period]}>
                      <defs>
                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8373FF" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#8373FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #E4E7ED",
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                        formatter={(v) => [`$${v}`, "PnL"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke="#8373FF"
                        strokeWidth={2}
                        fill="url(#pnlGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trade History */}
              <div className="rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-light)]">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Trades</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-[var(--border-light)] bg-[var(--surface-secondary)]">
                        {["Date", "Action", "Pair", "Entry", "Exit", "PnL"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_TRADES.map((t, i) => (
                        <tr key={i} className="border-b border-[var(--border-lighter)] hover:bg-[var(--surface-secondary)] transition-colors">
                          <td className="px-4 py-2.5 text-[var(--text-secondary)]">{t.date}</td>
                          <td className="px-4 py-2.5">
                            <span className={t.action === "Buy" ? "text-green-600" : "text-red-600"}>
                              {t.action}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[var(--text-primary)]">{t.pair}</td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--text-secondary)]">${t.entry.toLocaleString()}</td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--text-secondary)]">${t.exit.toLocaleString()}</td>
                          <td className="px-4 py-2.5 font-mono tabular-nums font-medium">
                            <span className={t.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                              {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 border-t border-[var(--border-light)] flex items-center justify-center">
                  <span className="text-[10px] text-[var(--text-tertiary)]">Powered by Trader Joe Liquidity Book</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="lg:col-span-5 space-y-5 animate-slide-up lg:sticky lg:top-24 lg:self-start">
              {/* Stats Card */}
              <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Reputation Score</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--border-lighter)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                      style={{ width: `${agent.reputationScore}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold font-mono text-[var(--text-primary)]">{agent.reputationScore}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Win Rate", value: `${agent.winRate}%`, icon: Trophy },
                    { label: "Total PnL", value: `${pnlPositive ? "+" : ""}${agent.pnl}%`, icon: pnlPositive ? ChartLineUp : ChartLineDown, color: pnlPositive ? "text-green-600" : "text-red-600" },
                    { label: "Total Trades", value: agent.totalTrades.toLocaleString(), icon: Lightning },
                    { label: "TVL", value: agent.tvl, icon: Wallet },
                    { label: "Avg Hold Time", value: "4.2h", icon: Hourglass },
                    { label: "AVAX Price", value: avaxPrice ? `$${avaxPrice.price.toFixed(2)}` : "—", icon: Broadcast },
                  ].map((s) => (
                    <div key={s.label} className="p-2.5 rounded-lg bg-[var(--surface-secondary)]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <s.icon className={`w-3 h-3 ${s.color || "text-[var(--text-tertiary)]"}`} />
                        <span className="text-[10px] text-[var(--text-tertiary)]">{s.label}</span>
                      </div>
                      <span className={`text-sm font-semibold font-mono tabular-nums ${s.color || "text-[var(--text-primary)]"}`}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategy Details */}
              <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Strategy</h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">
                  {agent.description} Uses Chainlink oracles for real-time pricing, RSI indicators for entry/exit signals, and executes via Trader Joe Liquidity Book for minimal slippage.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {STRATEGY_NODES.map((node, i) => (
                    <span key={node.label} className="inline-flex items-center gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border ${node.color}`}>
                        <node.icon className="w-3 h-3" />
                        {node.label}
                      </span>
                      {i < STRATEGY_NODES.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                      )}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-[var(--text-tertiary)]">Max Drawdown</span>
                    <p className="font-mono font-semibold text-[var(--text-primary)]">-5%</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Position Size</span>
                    <p className="font-mono font-semibold text-[var(--text-primary)]">25% of capital</p>
                  </div>
                </div>
              </div>

              {/* Fee Structure */}
              <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Fee Structure</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded border border-orange-200 bg-orange-50 text-orange-700">
                    <Receipt className="w-3 h-3" />
                    x402 Powered
                  </span>
                </div>
                <div className="text-center mb-3">
                  <span className="text-3xl font-bold font-mono text-[var(--primary)]">{agent.successFee}%</span>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">Only charged when you profit</p>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-lighter)]">
                    <span className="text-[var(--text-secondary)]">Performance Fee</span>
                    <span className="font-mono text-[var(--text-primary)]">{agent.successFee}% of profit</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-lighter)]">
                    <span className="text-[var(--text-secondary)]">Settlement</span>
                    <span className="font-mono text-[var(--text-primary)]">USDC via x402</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[var(--text-secondary)]">Est. Gas per Trade</span>
                    <span className="font-mono text-[var(--text-primary)]">~0.02 AVAX</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="p-5 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-light)]/30 shadow-[var(--shadow-card)]">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-[var(--text-secondary)]">Amount to allocate (USDC)</Label>
                    <Input
                      type="number"
                      value={allocAmount}
                      onChange={(e) => setAllocAmount(e.target.value)}
                      className="h-10 bg-white border-[var(--border-light)] font-mono text-sm"
                      placeholder="1000"
                    />
                  </div>
                  <Button
                    className="w-full h-11 text-sm font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-0"
                    onClick={() => setShowHireModal(true)}
                  >
                    Hire This Agent
                  </Button>
                </div>
              </div>

              {/* Safety Controls */}
              <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Safety Controls</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-[var(--text-secondary)]">Max Stop Loss %</Label>
                    <Input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="h-8 bg-[var(--surface-secondary)] border-[var(--border-light)] font-mono text-[12px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-[var(--text-secondary)]">Max Allocation Cap (USDC)</Label>
                    <Input
                      type="number"
                      value={maxAlloc}
                      onChange={(e) => setMaxAlloc(e.target.value)}
                      className="h-8 bg-[var(--surface-secondary)] border-[var(--border-light)] font-mono text-[12px]"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Shield className="w-4 h-4 shrink-0" weight="duotone" />
                    Emergency Stop available anytime
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hire Modal with x402 Flow */}
      <Dialog open={showHireModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md brand-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {x402Step === "idle" ? "Confirm Hire" : "x402 Settlement"}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              {x402Step === "idle"
                ? "Review before deploying this agent with your capital."
                : "Processing fee via x402 protocol on Avalanche"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            {/* Summary (always visible) */}
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-light)] space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Agent</span>
                <span className="text-[var(--text-primary)] font-medium">{agent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Allocation</span>
                <span className="font-mono text-[var(--text-primary)]">{Number(allocAmount).toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Success Fee</span>
                <span className="font-mono text-[var(--text-primary)]">{agent.successFee}% of profit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Protocol</span>
                <span className="inline-flex items-center gap-1 font-mono text-orange-700">
                  <Receipt className="w-3 h-3" /> x402
                </span>
              </div>
            </div>

            {/* x402 Flow Steps */}
            {x402Step !== "idle" && (
              <div className="p-3 rounded-lg border border-[var(--border-light)] space-y-2.5">
                <X402StepIndicator label="Checking profit..." step="checking" current={x402Step} />
                <X402StepIndicator label={x402Result?.feeAmount ? `Fee calculated: $${x402Result.feeAmount.toFixed(2)} USDC` : "Fee required — awaiting authorization"} step="fee-required" current={x402Step} />
                <X402StepIndicator label="Settling payment on-chain..." step="settling" current={x402Step} />
                <X402StepIndicator label={x402Result?.txHash ? "Payment processed" : "Complete"} step="settled" current={x402Step} />
              </div>
            )}

            {/* No fee result */}
            {x402Step === "no-fee" && (
              <div className="flex items-center gap-2 text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <CheckCircle className="w-4 h-4 shrink-0" weight="fill" />
                No profit generated — zero fee charged per x402 variable pricing
              </div>
            )}

            {/* Success result with tx link */}
            {x402Step === "settled" && x402Result?.txHash && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 space-y-2">
                <div className="flex items-center gap-2 text-[12px] text-green-700 font-medium">
                  <CheckCircle className="w-4 h-4 shrink-0" weight="fill" />
                  Fee settled: ${x402Result.feeAmount.toFixed(2)} USDC
                </div>
                <a
                  href={x402Result.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors"
                >
                  {x402Result.txHash.slice(0, 18)}...
                  <ArrowSquareOut className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Error */}
            {x402Step === "error" && (
              <div className="flex items-center gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <Warning className="w-4 h-4 shrink-0" />
                Settlement failed: {x402Result?.reason || "Unknown error"}
              </div>
            )}

            {/* Consent + Actions (only shown before starting) */}
            {x402Step === "idle" && (
              <>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[var(--border-light)] accent-[var(--primary)]"
                  />
                  <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    I understand this agent trades autonomously and fees are settled via x402 protocol in USDC on Avalanche.
                  </span>
                </label>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-0 font-semibold"
                    disabled={!agreed}
                    onClick={handleHire}
                  >
                    Confirm & Deploy
                  </Button>
                </div>
              </>
            )}

            {/* Close button after completion */}
            {(x402Step === "settled" || x402Step === "no-fee" || x402Step === "error") && (
              <Button variant="outline" className="w-full" onClick={handleCloseModal}>
                {x402Step === "error" ? "Close" : "Done"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
