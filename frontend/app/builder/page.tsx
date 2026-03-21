"use client";

import { useState, useCallback, useRef, useMemo, DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type OnConnect,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
import {
  Broadcast,
  ChartBar,
  Drop,
  Crosshair,
  Prohibit,
  Coins,
  Clock,
  Pulse,
  ChartLineUp,
  WaveSine,
  Plus,
  Minus,
  X,
  Rocket,
  Trash,
  DotsSixVertical,
  Check,
  Copy,
  MagnifyingGlass,
  CaretDown,
  CaretRight,
  Play,
  FileCode,
  ArrowCounterClockwise,
  ArrowClockwise,
  Eraser,
  Lightning,
  Shield,
  Warning,
  GasPump,
  Info,
} from "@phosphor-icons/react";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

type NodeCategory = "data" | "condition" | "action" | "risk" | "fee";

interface ParamDef {
  key: string;
  label: string;
  type: "select" | "number" | "text";
  options?: string[];
  defaultValue: string | number;
}

interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  category: NodeCategory;
  icon: typeof Broadcast;
  params: ParamDef[];
  gasEstimate: string;
  riskLevel: "low" | "medium" | "high";
}

interface TemplatePreset {
  name: string;
  description: string;
  nodes: { type: string; x: number; y: number }[];
  edges: [number, number][];
}

// ────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────

const CATEGORY_META: Record<
  NodeCategory,
  { label: string; border: string; bg: string; accent: string; headerColor: string }
> = {
  data: {
    label: "Data Sources",
    border: "border-blue-200",
    bg: "bg-blue-50",
    accent: "text-blue-600",
    headerColor: "#3b82f6",
  },
  condition: {
    label: "Conditions",
    border: "border-yellow-200",
    bg: "bg-yellow-50",
    accent: "text-yellow-600",
    headerColor: "#eab308",
  },
  action: {
    label: "Actions",
    border: "border-red-200",
    bg: "bg-red-50",
    accent: "text-red-600",
    headerColor: "#ef4444",
  },
  risk: {
    label: "Risk Management",
    border: "border-green-200",
    bg: "bg-green-50",
    accent: "text-green-600",
    headerColor: "#22c55e",
  },
  fee: {
    label: "Fees",
    border: "border-purple-200",
    bg: "bg-purple-50",
    accent: "text-purple-600",
    headerColor: "#a855f7",
  },
};

const NODE_TEMPLATES: NodeTemplate[] = [
  // Data Sources
  {
    type: "chainlink-price",
    label: "Chainlink Price Feed",
    description: "Real-time oracle price data",
    category: "data",
    icon: Broadcast,
    gasEstimate: "~21K",
    riskLevel: "low",
    params: [
      {
        key: "pair",
        label: "Price Pair",
        type: "select",
        options: ["AVAX/USD", "BTC/USD", "ETH/USD", "LINK/USD"],
        defaultValue: "AVAX/USD",
      },
    ],
  },
  {
    type: "onchain-volume",
    label: "On-chain Volume",
    description: "DEX volume aggregation",
    category: "data",
    icon: Pulse,
    gasEstimate: "~35K",
    riskLevel: "low",
    params: [
      {
        key: "dex",
        label: "DEX",
        type: "select",
        options: ["Trader Joe", "Pangolin", "GMX", "All"],
        defaultValue: "All",
      },
      { key: "window", label: "Window (hours)", type: "number", defaultValue: 24 },
    ],
  },
  {
    type: "funding-rate",
    label: "Funding Rate",
    description: "Perp funding rate signal",
    category: "data",
    icon: ChartLineUp,
    gasEstimate: "~28K",
    riskLevel: "low",
    params: [
      {
        key: "market",
        label: "Market",
        type: "select",
        options: ["GMX AVAX-USD", "GMX BTC-USD", "GMX ETH-USD"],
        defaultValue: "GMX AVAX-USD",
      },
    ],
  },
  // Conditions
  {
    type: "rsi-indicator",
    label: "RSI Indicator",
    description: "Relative strength index",
    category: "condition",
    icon: ChartBar,
    gasEstimate: "~45K",
    riskLevel: "low",
    params: [
      { key: "period", label: "Period", type: "number", defaultValue: 14 },
      { key: "overbought", label: "Overbought", type: "number", defaultValue: 70 },
      { key: "oversold", label: "Oversold", type: "number", defaultValue: 30 },
    ],
  },
  {
    type: "price-threshold",
    label: "Price Threshold",
    description: "Trigger at price level",
    category: "condition",
    icon: Crosshair,
    gasEstimate: "~22K",
    riskLevel: "low",
    params: [
      {
        key: "direction",
        label: "Direction",
        type: "select",
        options: ["Above", "Below", "Cross Up", "Cross Down"],
        defaultValue: "Above",
      },
      { key: "price", label: "Price (USD)", type: "number", defaultValue: 0 },
    ],
  },
  {
    type: "time-window",
    label: "Time Window",
    description: "Schedule-based execution",
    category: "condition",
    icon: Clock,
    gasEstimate: "~18K",
    riskLevel: "low",
    params: [
      {
        key: "days",
        label: "Active Days",
        type: "select",
        options: ["Mon-Fri", "Every day", "Weekends"],
        defaultValue: "Mon-Fri",
      },
      { key: "hours", label: "Hours (UTC)", type: "text", defaultValue: "09:00-17:00" },
    ],
  },
  {
    type: "volatility-check",
    label: "Volatility Check",
    description: "IV / realized vol gate",
    category: "condition",
    icon: WaveSine,
    gasEstimate: "~40K",
    riskLevel: "medium",
    params: [
      {
        key: "metric",
        label: "Metric",
        type: "select",
        options: ["Implied Vol", "Realized Vol", "Vol Ratio"],
        defaultValue: "Realized Vol",
      },
      { key: "threshold", label: "Threshold %", type: "number", defaultValue: 50 },
      {
        key: "direction",
        label: "When",
        type: "select",
        options: ["Above", "Below"],
        defaultValue: "Above",
      },
    ],
  },
  // Actions
  {
    type: "traderjoe-swap",
    label: "Trader Joe LB Swap",
    description: "Liquidity Book swap",
    category: "action",
    icon: Drop,
    gasEstimate: "~180K",
    riskLevel: "medium",
    params: [
      {
        key: "pair",
        label: "Pair",
        type: "select",
        options: ["AVAX/USDC", "WETH/AVAX", "BTC.b/USDC", "JOE/AVAX"],
        defaultValue: "AVAX/USDC",
      },
      { key: "slippage", label: "Slippage %", type: "number", defaultValue: 0.5 },
      { key: "amount", label: "Amount %", type: "number", defaultValue: 100 },
    ],
  },
  {
    type: "add-liquidity",
    label: "Add Liquidity",
    description: "Provide LP to Trader Joe",
    category: "action",
    icon: Plus,
    gasEstimate: "~250K",
    riskLevel: "medium",
    params: [
      {
        key: "pool",
        label: "Pool",
        type: "select",
        options: ["AVAX/USDC", "WETH/AVAX", "BTC.b/USDC"],
        defaultValue: "AVAX/USDC",
      },
      { key: "range", label: "Bin Range", type: "number", defaultValue: 10 },
      { key: "amount", label: "Amount %", type: "number", defaultValue: 50 },
    ],
  },
  {
    type: "remove-liquidity",
    label: "Remove Liquidity",
    description: "Withdraw LP position",
    category: "action",
    icon: Minus,
    gasEstimate: "~200K",
    riskLevel: "low",
    params: [
      {
        key: "pool",
        label: "Pool",
        type: "select",
        options: ["AVAX/USDC", "WETH/AVAX", "BTC.b/USDC"],
        defaultValue: "AVAX/USDC",
      },
      { key: "percent", label: "Withdraw %", type: "number", defaultValue: 100 },
    ],
  },
  // Risk
  {
    type: "take-profit",
    label: "Take Profit",
    description: "Close at profit target",
    category: "risk",
    icon: Crosshair,
    gasEstimate: "~30K",
    riskLevel: "low",
    params: [
      { key: "target", label: "Target %", type: "number", defaultValue: 15 },
    ],
  },
  {
    type: "stop-loss",
    label: "Stop Loss",
    description: "Close at max drawdown",
    category: "risk",
    icon: Prohibit,
    gasEstimate: "~30K",
    riskLevel: "low",
    params: [
      { key: "maxLoss", label: "Max Loss %", type: "number", defaultValue: 5 },
    ],
  },
  {
    type: "trailing-stop",
    label: "Trailing Stop",
    description: "Dynamic trailing exit",
    category: "risk",
    icon: Shield,
    gasEstimate: "~45K",
    riskLevel: "low",
    params: [
      { key: "trail", label: "Trail Distance %", type: "number", defaultValue: 3 },
      { key: "activation", label: "Activation Profit %", type: "number", defaultValue: 5 },
    ],
  },
  // Fees
  {
    type: "x402-fee",
    label: "x402 Success Fee",
    description: "Pay-for-performance fee",
    category: "fee",
    icon: Coins,
    gasEstimate: "~55K",
    riskLevel: "low",
    params: [
      { key: "fee", label: "Fee %", type: "number", defaultValue: 10 },
      { key: "minProfit", label: "Min Profit %", type: "number", defaultValue: 2 },
    ],
  },
];

const CATEGORIES = ["data", "condition", "action", "risk", "fee"] as const;

// ────────────────────────────────────────────────
// Strategy templates
// ────────────────────────────────────────────────

const PRESETS: TemplatePreset[] = [
  {
    name: "AVAX Yield",
    description: "LP yield farming with risk gates",
    nodes: [
      { type: "chainlink-price", x: 100, y: 50 },
      { type: "volatility-check", x: 100, y: 200 },
      { type: "add-liquidity", x: 100, y: 350 },
      { type: "take-profit", x: -50, y: 500 },
      { type: "stop-loss", x: 250, y: 500 },
      { type: "x402-fee", x: 100, y: 650 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 5],
    ],
  },
  {
    name: "BTC Momentum",
    description: "Trend-following with RSI signals",
    nodes: [
      { type: "chainlink-price", x: 100, y: 50 },
      { type: "rsi-indicator", x: 100, y: 200 },
      { type: "traderjoe-swap", x: 100, y: 350 },
      { type: "trailing-stop", x: 100, y: 500 },
      { type: "x402-fee", x: 100, y: 650 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "Stable Harvest",
    description: "Low-risk stable yield optimization",
    nodes: [
      { type: "funding-rate", x: 100, y: 50 },
      { type: "time-window", x: 100, y: 200 },
      { type: "add-liquidity", x: 100, y: 350 },
      { type: "take-profit", x: 100, y: 500 },
      { type: "x402-fee", x: 100, y: 650 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
];

// ────────────────────────────────────────────────
// Custom node component
// ────────────────────────────────────────────────

function StrategyNode({ data, selected }: NodeProps) {
  const template =
    NODE_TEMPLATES.find((t) => t.type === data.templateType) ?? NODE_TEMPLATES[0];
  const cat = CATEGORY_META[template.category];
  const Icon = template.icon;

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all duration-150 ${
        selected ? "ring-2 ring-[var(--primary)]/40 shadow-md" : "shadow-sm"
      }`}
      style={{ width: 210, background: "#FFFFFF", border: "1px solid #E4E7ED" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-gray-300 !border-gray-400 !-left-1"
      />

      {/* Color header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: `color-mix(in srgb, ${cat.headerColor} 10%, #FFFFFF)` }}
      >
        <Icon className={`w-3.5 h-3.5 ${cat.accent} shrink-0`} />
        <span className="text-[11px] font-semibold truncate text-[#0F1117]">{template.label}</span>
      </div>

      {/* Params body */}
      {template.params.length > 0 && (
        <div className="px-3 py-2 space-y-0.5 border-t border-[#E4E7ED]">
          {template.params.map((p) => {
            const val = (data.params as Record<string, any>)?.[p.key] ?? p.defaultValue;
            return (
              <div key={p.key} className="flex items-center justify-between">
                <span className="text-[10px] text-[#9CA3AF]">{p.label}</span>
                <span className="text-[10px] font-mono text-[#6B7280]">{val}</span>
              </div>
            );
          })}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-gray-300 !border-gray-400 !-right-1"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  strategyNode: StrategyNode,
};

// ────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────

export default function BuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showDeploy, setShowDeploy] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [strategyName, setStrategyName] = useState("My Strategy");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const idCounter = useRef(0);

  // Undo/redo history
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const pushHistory = useCallback(() => {
    setHistory((h) => {
      const next = [...h.slice(0, historyIdx + 1), { nodes: [...nodes], edges: [...edges] }];
      return next.slice(-30); // keep last 30
    });
    setHistoryIdx((i) => Math.min(i + 1, 29));
  }, [nodes, edges, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx < 0) return;
    const snap = history[historyIdx];
    if (snap) {
      setNodes(snap.nodes);
      setEdges(snap.edges);
      setHistoryIdx((i) => i - 1);
    }
  }, [history, historyIdx, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const snap = history[historyIdx + 1];
    if (snap) {
      setNodes(snap.nodes);
      setEdges(snap.edges);
      setHistoryIdx((i) => i + 1);
    }
  }, [history, historyIdx, setNodes, setEdges]);

  const getId = () => `node_${++idCounter.current}`;

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return NODE_TEMPLATES;
    const q = search.toLowerCase();
    return NODE_TEMPLATES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.includes(q)
    );
  }, [search]);

  const templatesByCategory = useMemo(() => {
    const map: Record<string, NodeTemplate[]> = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const t of filteredTemplates) map[t.category].push(t);
    return map;
  }, [filteredTemplates]);

  // Connect
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      pushHistory();
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "url(#edge-gradient)", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges, pushHistory]
  );

  // Drag & drop
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const templateType = e.dataTransfer.getData("application/reactflow");
      if (!templateType || !reactFlowInstance) return;

      const template = NODE_TEMPLATES.find((t) => t.type === templateType);
      if (!template) return;

      pushHistory();

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const defaultParams: Record<string, any> = {};
      template.params.forEach((p) => (defaultParams[p.key] = p.defaultValue));

      setNodes((nds) => [
        ...nds,
        {
          id: getId(),
          type: "strategyNode",
          position,
          data: { templateType: template.type, params: defaultParams },
        },
      ]);
    },
    [reactFlowInstance, setNodes, pushHistory]
  );

  // Load preset
  const loadPreset = useCallback(
    (preset: TemplatePreset) => {
      pushHistory();
      idCounter.current = 0;

      const presetNodes: Node[] = preset.nodes.map((n) => {
        const id = getId();
        const template = NODE_TEMPLATES.find((t) => t.type === n.type)!;
        const defaultParams: Record<string, any> = {};
        template.params.forEach((p) => (defaultParams[p.key] = p.defaultValue));
        // Override defaults for specific templates
        if (n.type === "chainlink-price" && preset.name === "BTC Momentum") {
          defaultParams.pair = "BTC/USD";
        }
        return {
          id,
          type: "strategyNode",
          position: { x: n.x, y: n.y },
          data: { templateType: n.type, params: defaultParams },
        };
      });

      const presetEdges: Edge[] = preset.edges.map(([s, t], i) => ({
        id: `e${i}`,
        source: presetNodes[s].id,
        target: presetNodes[t].id,
        animated: true,
        style: { stroke: "url(#edge-gradient)", strokeWidth: 2 },
      }));

      setNodes(presetNodes);
      setEdges(presetEdges);
      setSelectedNode(null);
      setStrategyName(preset.name);

      setTimeout(() => reactFlowInstance?.fitView({ padding: 0.3 }), 50);
    },
    [setNodes, setEdges, pushHistory, reactFlowInstance]
  );

  // Node click
  const onNodeClick = useCallback((_: any, node: Node) => setSelectedNode(node), []);

  // Update param
  const updateNodeParam = (nodeId: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, data: { ...n.data, params: { ...(n.data.params as any), [key]: value } } };
      })
    );
    setSelectedNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev;
      return { ...prev, data: { ...prev.data, params: { ...(prev.data.params as any), [key]: value } } };
    });
  };

  // Delete selected node
  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    pushHistory();
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
    );
    setSelectedNode(null);
  };

  // Strategy summary
  const strategySummary = useMemo(() => {
    const usedTypes = nodes.map((n) => (n.data as any).templateType as string);
    const usedTemplates = usedTypes
      .map((t) => NODE_TEMPLATES.find((nt) => nt.type === t)!)
      .filter(Boolean);
    const pairs = new Set<string>();
    nodes.forEach((n) => {
      const p = (n.data.params as any)?.pair;
      if (p) pairs.add(p);
    });
    const hasHighRisk = usedTemplates.some((t) => t.riskLevel === "high");
    const hasMedRisk = usedTemplates.some((t) => t.riskLevel === "medium");
    const riskLevel = hasHighRisk ? "High" : hasMedRisk ? "Medium" : "Low";
    const feeNode = nodes.find((n) => (n.data as any).templateType === "x402-fee");
    const fee = feeNode ? (feeNode.data.params as any)?.fee ?? 10 : null;
    return { count: nodes.length, pairs: Array.from(pairs), riskLevel, fee, usedTemplates };
  }, [nodes]);

  const strategyJson = JSON.stringify(
    {
      name: strategyName,
      version: "1.0",
      network: "avalanche-fuji",
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.data as any).templateType,
        params: (n.data as any).params,
        position: n.position,
      })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(strategyJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedTemplate = selectedNode
    ? NODE_TEMPLATES.find((t) => t.type === (selectedNode.data as any).templateType)
    : null;

  const riskBadgeColor =
    strategySummary.riskLevel === "High"
      ? "text-red-700 bg-red-50 border-red-200"
      : strategySummary.riskLevel === "Medium"
      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
      : "text-green-700 bg-green-50 border-green-200";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />

      {/* Canvas toolbar */}
      <div className="fixed top-14 left-[280px] right-0 z-40 border-b border-[var(--border-light)] bg-white/95 backdrop-blur-sm">
        <div className="px-4 flex items-center justify-between h-11">
          <div className="flex items-center gap-1">
            {/* Templates */}
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => loadPreset(p)}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors"
                title={p.description}
              >
                {p.name}
              </button>
            ))}

            <div className="w-px h-4 bg-[var(--border-light)] mx-1" />

            <button
              onClick={undo}
              disabled={historyIdx < 0}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-30"
              title="Undo"
            >
              <ArrowCounterClockwise className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={historyIdx >= history.length - 1}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-30"
              title="Redo"
            >
              <ArrowClockwise className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-[var(--border-light)] mx-1" />

            <button
              onClick={() => {
                pushHistory();
                setNodes([]);
                setEdges([]);
                setSelectedNode(null);
                idCounter.current = 0;
              }}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors"
              title="Clear canvas"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums font-mono">
              {nodes.length} nodes · {edges.length} edges
            </span>
            <Button
              size="sm"
              className="h-7 px-3 text-[11px] font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] border-0"
              onClick={() => setShowDeploy(true)}
              disabled={nodes.length === 0}
            >
              <Play className="w-3 h-3 mr-1 fill-current" />
              Deploy Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 pt-[108px]">
        {/* ── LEFT PANEL ── */}
        <aside
          className="shrink-0 border-r border-[var(--border-light)] overflow-y-auto overflow-x-hidden"
          style={{ width: 280, background: "#FFFFFF" }}
        >
          {/* Search */}
          <div className="p-3 border-b border-[var(--border-light)]">
            <div className="relative">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-md bg-[var(--surface-secondary)] border border-[var(--border-light)] text-[12px] text-foreground placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-light)]"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="py-1">
            {CATEGORIES.map((catKey) => {
              const templates = templatesByCategory[catKey];
              if (templates.length === 0) return null;
              const cat = CATEGORY_META[catKey];
              const isCollapsed = collapsed[catKey] ?? false;

              return (
                <div key={catKey}>
                  <button
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [catKey]: !c[catKey] }))
                    }
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {isCollapsed ? (
                      <CaretRight className="w-3 h-3" />
                    ) : (
                      <CaretDown className="w-3 h-3" />
                    )}
                    {cat.label}
                    <span className="ml-auto text-[var(--text-tertiary)] font-normal normal-case tracking-normal">
                      {templates.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {templates.map((template) => {
                        const Icon = template.icon;
                        return (
                          <div
                            key={template.type}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("application/reactflow", template.type);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            className="flex items-start gap-2.5 px-2.5 py-2 rounded-md cursor-grab active:cursor-grabbing hover:bg-[var(--surface-secondary)] transition-colors select-none group"
                          >
                            <DotsSixVertical className="w-3 h-3 mt-0.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-tertiary)] shrink-0" />
                            <Icon className={`w-3.5 h-3.5 mt-0.5 ${cat.accent} shrink-0`} />
                            <div className="min-w-0">
                              <div className="text-[11px] font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)] truncate">
                                {template.label}
                              </div>
                              <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                                {template.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── CANVAS ── */}
        <div className="flex-1 relative" style={{ background: "#F1F3F7" }}>
          <svg className="absolute w-0 h-0">
            <defs>
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8373FF" />
                <stop offset="100%" stopColor="#6E5FE8" />
              </linearGradient>
            </defs>
          </svg>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "url(#edge-gradient)", strokeWidth: 2 },
            }}
            className="!bg-transparent"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#E4E7ED"
            />
            <Controls
              className="!bg-white !border-[var(--border-light)] !rounded-lg [&>button]:!bg-transparent [&>button]:!border-[var(--border-lighter)] [&>button]:!text-[var(--text-secondary)] [&>button:hover]:!text-[var(--text-primary)]"
              position="bottom-left"
            />
            <MiniMap
              className="!bg-white !border-[var(--border-light)] !rounded-lg"
              nodeColor={() => "rgba(131,115,255,0.5)"}
              maskColor="rgba(241,243,247,0.8)"
              position="bottom-right"
            />
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-light)]">
                  <Lightning className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <div>
                  <p className="text-[13px] text-[var(--text-tertiary)]">Drag nodes to start building</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">or load a template from the toolbar</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        {selectedNode && selectedTemplate && (
          <aside
            className="shrink-0 border-l border-[var(--border-light)] overflow-y-auto"
            style={{ width: 320, background: "#FFFFFF" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-md ${CATEGORY_META[selectedTemplate.category].bg} ${CATEGORY_META[selectedTemplate.category].border} border`}
                >
                  <selectedTemplate.icon
                    className={`w-3.5 h-3.5 ${CATEGORY_META[selectedTemplate.category].accent}`}
                  />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold leading-tight">
                    {selectedTemplate.label}
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)]">{selectedTemplate.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Params */}
            <div className="p-4 space-y-3 border-b border-[var(--border-light)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                Parameters
              </p>
              {selectedTemplate.params.map((param) => {
                const currentVal =
                  (selectedNode.data.params as Record<string, any>)?.[param.key] ??
                  param.defaultValue;
                return (
                  <div key={param.key} className="space-y-1">
                    <Label className="text-[11px] text-[var(--text-secondary)]">{param.label}</Label>
                    {param.type === "select" ? (
                      <select
                        value={currentVal}
                        onChange={(e) =>
                          updateNodeParam(selectedNode.id, param.key, e.target.value)
                        }
                        className="flex h-8 w-full rounded-md border border-[var(--border-light)] bg-[var(--surface-secondary)] px-2.5 text-[12px] text-foreground focus:outline-none focus:border-[var(--border-light)]"
                      >
                        {param.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-white text-[#0F1117]">
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={param.type}
                        value={currentVal}
                        onChange={(e) =>
                          updateNodeParam(
                            selectedNode.id,
                            param.key,
                            param.type === "number" ? Number(e.target.value) : e.target.value
                          )
                        }
                        className="h-8 bg-[var(--surface-secondary)] border-[var(--border-light)] text-[12px] focus-visible:ring-0 focus-visible:border-[var(--border-light)]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Node info */}
            <div className="p-4 space-y-3 border-b border-[var(--border-light)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                Node Info
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Info className="w-3 h-3" /> Description
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {selectedTemplate.description}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 p-2 rounded-md bg-[var(--surface-secondary)] border border-[var(--border-lighter)]">
                  <div className="flex items-center gap-1 mb-0.5">
                    <GasPump className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span className="text-[10px] text-[var(--text-tertiary)]">Gas Est.</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-primary)]">
                    {selectedTemplate.gasEstimate}
                  </span>
                </div>
                <div className="flex-1 p-2 rounded-md bg-[var(--surface-secondary)] border border-[var(--border-lighter)]">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Warning className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span className="text-[10px] text-[var(--text-tertiary)]">Risk</span>
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      selectedTemplate.riskLevel === "high"
                        ? "text-red-400"
                        : selectedTemplate.riskLevel === "medium"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {selectedTemplate.riskLevel.charAt(0).toUpperCase() +
                      selectedTemplate.riskLevel.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Remove node */}
            <div className="p-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={deleteSelectedNode}
              >
                <Trash className="w-3 h-3 mr-1.5" />
                Remove Node
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* ── DEPLOY MODAL ── */}
      <Dialog open={showDeploy} onOpenChange={setShowDeploy}>
        <DialogContent className="max-w-lg border border-[var(--border-light)]" style={{ background: "#FFFFFF" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Deploy Agent</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Review and deploy your strategy to Avalanche Fuji testnet.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[var(--text-secondary)]">Strategy Name</Label>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="h-9 bg-[var(--surface-secondary)] border-[var(--border-light)] text-sm focus-visible:ring-0 focus-visible:border-[var(--border-light)]"
              />
            </div>

            {/* Summary */}
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-light)] space-y-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-secondary)]">Nodes</span>
                <span className="text-[var(--text-primary)] font-medium">{strategySummary.count}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-secondary)]">Pairs</span>
                <span className="text-[var(--text-primary)] font-medium">
                  {strategySummary.pairs.length > 0 ? strategySummary.pairs.join(", ") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-secondary)]">Risk Level</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${riskBadgeColor}`}>
                  {strategySummary.riskLevel}
                </span>
              </div>
              {strategySummary.fee !== null && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--text-secondary)]">Success Fee</span>
                  <span className="text-[var(--text-primary)] font-medium">{strategySummary.fee}%</span>
                </div>
              )}
            </div>

            {/* JSON toggle */}
            <div>
              <button
                onClick={() => setShowJson(!showJson)}
                className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                {showJson ? "Hide" : "Show"} JSON preview
                {showJson ? (
                  <CaretDown className="w-3 h-3" />
                ) : (
                  <CaretRight className="w-3 h-3" />
                )}
              </button>

              {showJson && (
                <div className="mt-2 relative">
                  <pre className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-lighter)] text-[10px] text-[var(--text-secondary)] overflow-auto max-h-48 font-mono leading-relaxed">
                    {strategyJson}
                  </pre>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-10 border-[var(--border-light)] bg-transparent hover:bg-white/5"
                onClick={() => setShowDeploy(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-10 bg-[var(--primary)] hover:bg-[var(--primary-hover)] border-0 font-semibold"
                onClick={() => setShowDeploy(false)}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Deploy to Fuji
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
