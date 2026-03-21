"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useUserStrategies, useVaultStats, type StrategyView } from "@/lib/hooks/useStrategies";
import { useStrategyAction } from "@/lib/hooks/useStrategyActions";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { getExplorerAddressUrl } from "@/lib/contracts/avalanche-config";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  Wallet,
  ChartLineUp,
  ChartLineDown,
  Robot,
  Coins,
  CurrencyDollar,
  Pause,
  Stop,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  ArrowsClockwise,
  ShieldWarning,
  Receipt,
  Pulse,
  ArrowSquareOut,
  Clock,
} from "@phosphor-icons/react";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

type AgentStatus = "active" | "paused" | "stopped";
type PositionSide = "Long" | "Short";
type FeeStatus = "charged" | "none";
type AuditAction = "swap" | "rebalance" | "stop-loss" | "fee-charged" | "start" | "pause";

interface SparkPoint {
  v: number;
}

interface DashAgent {
  id: string;
  name: string;
  strategy: string;
  status: AgentStatus;
  pnl: number;
  pnl24h: number;
  invested: number;
  winRate: number;
  sparkline: SparkPoint[];
  hue: number;
}

interface Position {
  id: string;
  pair: string;
  side: PositionSide;
  entry: number;
  current: number;
  pnl: number;
  size: string;
  agent: string;
}

interface FeeRecord {
  id: string;
  date: string;
  agent: string;
  result: number;
  feeCharged: number | null;
  status: FeeStatus;
  txHash: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: AuditAction;
  details: string;
  txHash: string;
}

// ────────────────────────────────────────────────
// Mock data
// ────────────────────────────────────────────────

function spark(values: number[]): SparkPoint[] {
  return values.map((v) => ({ v }));
}

const AGENTS: DashAgent[] = [
  {
    id: "a1",
    name: "Avalanche Yield Optimizer",
    strategy: "AVAX/USDC LP",
    status: "active",
    pnl: 12.4,
    pnl24h: 2.1,
    invested: 5000,
    winRate: 78,
    sparkline: spark([10, 12, 11, 15, 14, 18, 17, 20, 19, 22, 24, 23]),
    hue: 0,
  },
  {
    id: "a2",
    name: "BTC Momentum Alpha",
    strategy: "BTC.b Momentum",
    status: "active",
    pnl: 28.7,
    pnl24h: -1.3,
    invested: 8000,
    winRate: 65,
    sparkline: spark([20, 22, 25, 23, 28, 26, 30, 29, 27, 32, 31, 30]),
    hue: 30,
  },
  {
    id: "a3",
    name: "Stablecoin Harvester",
    strategy: "USDC/USDT/DAI",
    status: "paused",
    pnl: 4.2,
    pnl24h: 0.1,
    invested: 12000,
    winRate: 94,
    sparkline: spark([5, 5.1, 5.2, 5.1, 5.3, 5.4, 5.3, 5.5, 5.4, 5.6, 5.5, 5.7]),
    hue: 140,
  },
];

const POSITIONS: Position[] = [
  { id: "p1", pair: "AVAX/USDC", side: "Long", entry: 34.2, current: 36.8, pnl: 7.6, size: "$2,400", agent: "Avalanche Yield Optimizer" },
  { id: "p2", pair: "BTC.b/USDC", side: "Long", entry: 67420, current: 71050, pnl: 5.38, size: "$4,000", agent: "BTC Momentum Alpha" },
  { id: "p3", pair: "WETH/AVAX", side: "Short", entry: 18.5, current: 19.1, pnl: -3.24, size: "$1,500", agent: "BTC Momentum Alpha" },
  { id: "p4", pair: "AVAX/USDC", side: "Long", entry: 33.8, current: 36.8, pnl: 8.88, size: "$3,200", agent: "Avalanche Yield Optimizer" },
  { id: "p5", pair: "JOE/AVAX", side: "Short", entry: 0.42, current: 0.45, pnl: -7.14, size: "$800", agent: "Avalanche Yield Optimizer" },
];

const FEE_HISTORY: FeeRecord[] = [
  { id: "f1", date: "2026-03-21 14:32", agent: "Avalanche Yield Optimizer", result: 340, feeCharged: 34, status: "charged", txHash: "0xa1b2c3d4e5f6" },
  { id: "f2", date: "2026-03-20 09:15", agent: "BTC Momentum Alpha", result: 1280, feeCharged: 192, status: "charged", txHash: "0xb2c3d4e5f6a1" },
  { id: "f3", date: "2026-03-19 22:48", agent: "Stablecoin Harvester", result: 18, feeCharged: 1.44, status: "charged", txHash: "0xc3d4e5f6a1b2" },
  { id: "f4", date: "2026-03-18 16:03", agent: "BTC Momentum Alpha", result: -420, feeCharged: null, status: "none", txHash: "0xd4e5f6a1b2c3" },
  { id: "f5", date: "2026-03-17 11:27", agent: "Avalanche Yield Optimizer", result: 210, feeCharged: 21, status: "charged", txHash: "0xe5f6a1b2c3d4" },
  { id: "f6", date: "2026-03-16 08:45", agent: "Stablecoin Harvester", result: -5, feeCharged: null, status: "none", txHash: "0xf6a1b2c3d4e5" },
  { id: "f7", date: "2026-03-15 19:12", agent: "BTC Momentum Alpha", result: 890, feeCharged: 133.5, status: "charged", txHash: "0xa1c2d3e4f5b6" },
  { id: "f8", date: "2026-03-14 07:33", agent: "Avalanche Yield Optimizer", result: 156, feeCharged: 15.6, status: "charged", txHash: "0xb1c2d3e4f5a6" },
];

const AUDIT_LOG: AuditEntry[] = [
  { id: "l1", timestamp: "2026-03-21 14:32:15", agent: "Avalanche Yield Optimizer", action: "swap", details: "Swapped 120 AVAX → 4,416 USDC at $36.80", txHash: "0xa1b2c3d4" },
  { id: "l2", timestamp: "2026-03-21 14:30:02", agent: "Avalanche Yield Optimizer", action: "fee-charged", details: "Success fee: $34.00 (10% of $340 profit)", txHash: "0xa1b2c3d5" },
  { id: "l3", timestamp: "2026-03-21 12:15:44", agent: "BTC Momentum Alpha", action: "rebalance", details: "Rebalanced BTC.b position: +$800 size adjustment", txHash: "0xb2c3d4e5" },
  { id: "l4", timestamp: "2026-03-21 09:45:31", agent: "Stablecoin Harvester", action: "pause", details: "Agent paused by user", txHash: "0xc3d4e5f6" },
  { id: "l5", timestamp: "2026-03-20 22:18:07", agent: "BTC Momentum Alpha", action: "swap", details: "Bought 0.058 BTC.b at $67,420", txHash: "0xd4e5f6a1" },
  { id: "l6", timestamp: "2026-03-20 18:33:22", agent: "Avalanche Yield Optimizer", action: "rebalance", details: "LP range rebalanced: bins 45-55 → 48-58", txHash: "0xe5f6a1b2" },
  { id: "l7", timestamp: "2026-03-20 14:02:55", agent: "BTC Momentum Alpha", action: "stop-loss", details: "Stop loss triggered on WETH/AVAX short at -3.24%", txHash: "0xf6a1b2c3" },
  { id: "l8", timestamp: "2026-03-20 09:15:10", agent: "BTC Momentum Alpha", action: "fee-charged", details: "Success fee: $192.00 (15% of $1,280 profit)", txHash: "0xa2b3c4d5" },
  { id: "l9", timestamp: "2026-03-19 23:48:33", agent: "Avalanche Yield Optimizer", action: "swap", details: "Swapped 2,200 USDC → 64.7 AVAX at $34.00", txHash: "0xb3c4d5e6" },
  { id: "l10", timestamp: "2026-03-19 16:22:01", agent: "Stablecoin Harvester", action: "start", details: "Agent started with $12,000 allocation", txHash: "0xc4d5e6f7" },
];

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

const SNOWTRACE = "https://testnet.snowtrace.io/tx/";

const statusConfig: Record<AgentStatus, { label: string; class: string }> = {
  active:  { label: "ACTIVE",  class: "text-green-700 bg-green-50 border-green-200" },
  paused:  { label: "PAUSED",  class: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  stopped: { label: "STOPPED", class: "text-red-700 bg-red-50 border-red-200" },
};

const auditIcons: Record<AuditAction, { icon: typeof ArrowsClockwise; class: string }> = {
  swap:         { icon: ArrowsClockwise, class: "text-blue-600 bg-blue-50" },
  rebalance:    { icon: Pulse,            class: "text-yellow-600 bg-yellow-50" },
  "stop-loss":  { icon: ShieldWarning,   class: "text-red-600 bg-red-50" },
  "fee-charged":{ icon: Receipt,         class: "text-orange-600 bg-orange-50" },
  start:        { icon: ChartLineUp,     class: "text-green-600 bg-green-50" },
  pause:        { icon: Pause,           class: "text-yellow-600 bg-yellow-50" },
};

// Generative avatar (same as marketplace)
function AgentAvatar({ hue, name }: { hue: number; name: string }) {
  const seed = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cells = Array.from({ length: 9 }, (_, i) => (seed * (i + 7)) % 3 !== 0);
  return (
    <div
      className="w-10 h-10 rounded-lg grid grid-cols-3 gap-px p-1.5 shrink-0"
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

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={`${SNOWTRACE}${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors"
    >
      {hash.slice(0, 10)}...
      <ArrowSquareOut className="w-3 h-3" />
    </a>
  );
}

// ────────────────────────────────────────────────
// Tab components
// ────────────────────────────────────────────────

function MyAgentsTab({ strategies }: { strategies: StrategyView[] }) {
  const { execute, isPending } = useStrategyAction();

  const strategyStatusConfig: Record<string, { label: string; class: string }> = {
    Active:    { label: "ACTIVE",    class: "text-green-700 bg-green-50 border-green-200" },
    Funded:    { label: "FUNDED",    class: "text-blue-700 bg-blue-50 border-blue-200" },
    Paused:    { label: "PAUSED",    class: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    Completed: { label: "COMPLETED", class: "text-gray-700 bg-gray-50 border-gray-200" },
    Cancelled: { label: "CANCELLED", class: "text-red-700 bg-red-50 border-red-200" },
    Draft:     { label: "DRAFT",     class: "text-gray-500 bg-gray-50 border-gray-200" },
  };

  if (strategies.length === 0) {
    return (
      <div className="text-center py-16">
        <Robot className="w-12 h-12 mx-auto mb-4 text-[var(--text-tertiary)]" />
        <h3 className="text-lg font-semibold mb-2">No strategies yet</h3>
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">Go to the Builder to create your first strategy</p>
        <a href="/builder">
          <Button variant="default" size="sm">Create Strategy</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {strategies.map((s) => {
        const pnlPositive = Number(s.pnl) >= 0;
        const sc = strategyStatusConfig[s.status] || strategyStatusConfig.Draft;
        const hue = (s.agentId * 47) % 360;
        return (
          <div key={s.strategyId} className="rounded-xl border border-[var(--border-light)] bg-[var(--surface)] overflow-hidden">
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AgentAvatar hue={hue} name={`Agent #${s.agentId}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold truncate">Strategy #{s.strategyId}</h3>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold rounded border ${sc.class}`}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Agent #{s.agentId} · {s.tokenSymbol}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)]">PnL</p>
                  <span className={`text-sm font-semibold tabular-nums font-mono ${pnlPositive ? "text-green-600" : "text-red-600"}`}>
                    {pnlPositive ? "+" : ""}{s.pnl} {s.tokenSymbol}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)]">PnL %</p>
                  <span className={`text-sm font-semibold tabular-nums font-mono ${pnlPositive ? "text-green-600" : "text-red-600"}`}>
                    {pnlPositive ? "+" : ""}{s.pnlPercent}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Balance</p>
                  <span className="text-sm font-semibold tabular-nums font-mono">{s.currentBalance}</span>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-secondary)]">
                Deposited: <span className="text-[var(--text-primary)] font-medium">{s.depositAmount} {s.tokenSymbol}</span>
                <span className="ml-2">·</span>
                <span className="ml-2">{s.createdAt.toLocaleDateString()}</span>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[var(--border-lighter)] flex items-center gap-2">
              {s.status === "Funded" && (
                <Button variant="ghost" size="sm" disabled={isPending} onClick={() => execute("activate", s.strategyId)}
                  className="h-7 text-[11px] text-green-600/70 hover:text-green-600 hover:bg-green-500/5 flex-1">
                  <ChartLineUp className="w-3 h-3 mr-1" /> Activate
                </Button>
              )}
              {s.status === "Active" && (
                <Button variant="ghost" size="sm" disabled={isPending} onClick={() => execute("pause", s.strategyId)}
                  className="h-7 text-[11px] text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/5 flex-1">
                  <Pause className="w-3 h-3 mr-1" /> Pause
                </Button>
              )}
              {s.status === "Paused" && (
                <Button variant="ghost" size="sm" disabled={isPending} onClick={() => execute("resume", s.strategyId)}
                  className="h-7 text-[11px] text-green-600/70 hover:text-green-600 hover:bg-green-500/5 flex-1">
                  <ChartLineUp className="w-3 h-3 mr-1" /> Resume
                </Button>
              )}
              {(s.status === "Active" || s.status === "Paused" || s.status === "Funded") && (
                <Button variant="ghost" size="sm" disabled={isPending} onClick={() => execute("emergencyWithdraw", s.strategyId)}
                  className="h-7 text-[11px] text-red-600/70 hover:text-red-600 hover:bg-red-500/5 flex-1">
                  <Stop className="w-3 h-3 mr-1" /> Withdraw
                </Button>
              )}
              {s.status === "Completed" && (
                <Button variant="ghost" size="sm" disabled={isPending} onClick={() => execute("withdraw", s.strategyId)}
                  className="h-7 text-[11px] text-[var(--primary)] hover:bg-[var(--primary-light)] flex-1">
                  <Coins className="w-3 h-3 mr-1" /> Claim
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OpenPositionsTab() {
  return (
    <div className="rounded-xl border border-[var(--border-light)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border-light)] bg-[var(--surface)]">
              {["Pair", "Side", "Entry", "Current", "PnL", "Size", "Agent", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {POSITIONS.map((pos) => {
              const positive = pos.pnl >= 0;
              return (
                <tr
                  key={pos.id}
                  className="border-b border-[var(--border-lighter)] hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{pos.pair}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 ${pos.side === "Long" ? "text-green-600" : "text-red-600"}`}>
                      {pos.side === "Long" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {pos.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-mono text-[var(--text-primary)]">${pos.entry.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums font-mono text-[var(--text-primary)]">${pos.current.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums font-mono font-medium">
                    <span className={positive ? "text-green-600" : "text-red-600"}>
                      {positive ? "+" : ""}{pos.pnl.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-mono text-[var(--text-primary)]">{pos.size}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[160px] truncate">{pos.agent}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      Close
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeeHistoryTab() {
  return (
    <div className="rounded-xl border border-[var(--border-light)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
        <span className="text-[12px] font-medium text-[var(--text-primary)]">Settlement History</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded border border-orange-200 bg-orange-50 text-orange-700">
          <Receipt className="w-3 h-3" />
          x402 Powered
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border-light)] bg-[var(--surface)]">
              {["Date", "Agent", "Result", "Fee", "Status", "Tx"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEE_HISTORY.map((fee) => {
              const resultPositive = fee.result >= 0;
              return (
                <tr
                  key={fee.id}
                  className="border-b border-[var(--border-lighter)] hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                      {fee.date}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-primary)] max-w-[180px] truncate">{fee.agent}</td>
                  <td className="px-4 py-3 tabular-nums font-mono font-medium">
                    <span className={resultPositive ? "text-green-600" : "text-red-600"}>
                      {resultPositive ? "+$" : "-$"}{Math.abs(fee.result).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-mono text-[var(--text-primary)]">
                    {fee.feeCharged !== null ? `$${fee.feeCharged.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {fee.status === "charged" ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-semibold rounded border text-orange-700 bg-orange-50 border-orange-200">
                        SUCCESS FEE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-semibold rounded border text-[var(--text-tertiary)] bg-[var(--surface-secondary)] border-[var(--border-light)]">
                        NO FEE
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TxLink hash={fee.txHash} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogTab() {
  return (
    <div className="space-y-1">
      {AUDIT_LOG.map((entry) => {
        const ai = auditIcons[entry.action];
        const Icon = ai.icon;
        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${ai.class}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-medium text-[var(--text-primary)]">{entry.agent}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] font-medium">
                  {entry.action.replace("-", " ")}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{entry.details}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-[var(--text-tertiary)]">{entry.timestamp}</span>
                <TxLink hash={entry.txHash} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Simulated infinite scroll hint */}
      <div className="flex items-center justify-center py-6">
        <span className="text-[11px] text-[var(--text-tertiary)]">Showing 10 most recent entries</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Tabs
// ────────────────────────────────────────────────

const TABS = [
  { key: "agents", label: "My Agents" },
  { key: "positions", label: "Open Positions" },
  { key: "fees", label: "Fee History" },
  { key: "audit", label: "Audit Log" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────

export default function DashboardPage() {
  const [tab, setTab] = useState<TabKey>("agents");
  const { address, isConnected } = useWallet();
  const { data: strategies = [], isLoading } = useUserStrategies(address || undefined);
  const { data: vaultStats } = useVaultStats();

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";

  // Compute real stats from on-chain data
  const totalDeposited = strategies.reduce((sum, s) => sum + Number(s.depositAmount), 0);
  const totalPnl = strategies.reduce((sum, s) => sum + Number(s.pnl), 0);
  const totalPnlPct = totalDeposited > 0 ? ((totalPnl / totalDeposited) * 100).toFixed(1) : "0";
  const activeCount = strategies.filter((s) => s.status === "Active" || s.status === "Funded").length;
  const symbol = strategies[0]?.tokenSymbol || "USDC";

  const STATS = [
    { label: "Total Deposited", value: `${totalDeposited.toFixed(2)} ${symbol}`, icon: CurrencyDollar, change: null, positive: false },
    { label: "Total PnL", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} ${symbol}`, icon: totalPnl >= 0 ? ChartLineUp : ChartLineDown, change: `${totalPnl >= 0 ? "+" : ""}${totalPnlPct}%`, positive: totalPnl >= 0 },
    { label: "Active Strategies", value: `${activeCount}`, icon: Robot, change: null, positive: false },
    { label: "Fee Rate (x402)", value: `${vaultStats?.feePercent ?? 10}%`, icon: Coins, change: "of profit only", positive: true },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold">My Dashboard</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Wallet className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <span className="text-[12px] font-mono text-[var(--text-secondary)]">{shortAddr}</span>
                <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-semibold rounded border text-[var(--primary)] bg-[var(--primary-light)] border-[var(--primary)]/20">
                  Avalanche Fuji
                </span>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 animate-fade-in">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--surface)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--surface-secondary)]">
                    <stat.icon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                    {stat.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums font-mono">{stat.value}</span>
                  {stat.change && (
                    <span className={`text-[11px] font-medium ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                      {stat.change}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-[var(--border-light)] overflow-x-auto animate-fade-in">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors relative ${
                  tab === key
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
                {tab === key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="animate-slide-up">
            {tab === "agents" && <MyAgentsTab strategies={strategies} />}
            {tab === "positions" && <OpenPositionsTab />}
            {tab === "fees" && <FeeHistoryTab />}
            {tab === "audit" && <AuditLogTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
