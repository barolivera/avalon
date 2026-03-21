"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbi } from "viem";
import { fujiClient } from "@/lib/contracts/avalanche-client";
import { ERC8004 } from "@/lib/contracts/avalanche-config";

// ── Types ──

export interface OnChainAgent {
  id: bigint;
  uri: string;
  owner: string;
  wallet: string | null;
}

export interface Agent {
  id: string;
  name: string;
  strategy: string;
  description: string;
  reputationScore: number;
  winRate: number;
  pnl: number;
  successFee: number;
  riskLevel: "low" | "medium" | "high";
  trending: boolean;
  totalTrades: number;
  tvl: string;
  hue: number;
  onChain?: OnChainAgent;
}

// ── ABIs ──

const identityAbi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function agentURI(uint256 agentId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
]);

const reputationAbi = parseAbi([
  "function getSummary(uint256 agentId, bytes32 tag1, bytes32 tag2) view returns (int256 total, uint256 count)",
]);

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

// ── On-chain fetch ──

async function fetchOnChainAgents(): Promise<OnChainAgent[]> {
  const registry = ERC8004.fuji.identityRegistry;

  const totalSupply = await fujiClient.readContract({
    address: registry,
    abi: identityAbi,
    functionName: "totalSupply",
  });

  const count = Number(totalSupply);
  if (count === 0) return [];

  // Fetch up to 20 agents (1-indexed token IDs)
  const limit = Math.min(count, 20);
  const agents: OnChainAgent[] = [];

  for (let i = 1; i <= limit; i++) {
    try {
      const id = BigInt(i);
      const [uri, owner] = await Promise.all([
        fujiClient.readContract({
          address: registry,
          abi: identityAbi,
          functionName: "agentURI",
          args: [id],
        }),
        fujiClient.readContract({
          address: registry,
          abi: identityAbi,
          functionName: "ownerOf",
          args: [id],
        }),
      ]);

      let wallet: string | null = null;
      try {
        wallet = await fujiClient.readContract({
          address: registry,
          abi: identityAbi,
          functionName: "getAgentWallet",
          args: [id],
        });
      } catch {
        // getAgentWallet may not be set
      }

      agents.push({ id, uri, owner, wallet });
    } catch {
      // Skip invalid/burned token IDs
    }
  }

  return agents;
}

async function fetchAgentReputation(agentId: bigint): Promise<{ total: bigint; count: bigint }> {
  try {
    const [total, count] = await fujiClient.readContract({
      address: ERC8004.fuji.reputationRegistry,
      abi: reputationAbi,
      functionName: "getSummary",
      args: [agentId, ZERO_BYTES32, ZERO_BYTES32],
    });
    return { total, count };
  } catch {
    return { total: 0n, count: 0n };
  }
}

// ── Mock data fallback ──

const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-001",
    name: "Avalanche Yield Optimizer",
    strategy: "AVAX/USDC LP",
    description: "Automated liquidity provisioning on Trader Joe with dynamic range rebalancing.",
    reputationScore: 92,
    winRate: 78,
    pnl: 34.2,
    successFee: 10,
    riskLevel: "low",
    trending: true,
    totalTrades: 1847,
    tvl: "$1.2M",
    hue: 0,
  },
  {
    id: "agent-002",
    name: "BTC Momentum Alpha",
    strategy: "BTC.b Momentum",
    description: "Trend-following strategy on BTC.b using on-chain volume and funding rate signals.",
    reputationScore: 87,
    winRate: 65,
    pnl: 52.8,
    successFee: 15,
    riskLevel: "high",
    trending: true,
    totalTrades: 923,
    tvl: "$840K",
    hue: 30,
  },
  {
    id: "agent-003",
    name: "ETH Mean Reversion",
    strategy: "WETH.e Mean Reversion",
    description: "Statistical arbitrage on ETH price deviations with Bollinger Band triggers.",
    reputationScore: 84,
    winRate: 71,
    pnl: 18.5,
    successFee: 12,
    riskLevel: "medium",
    trending: false,
    totalTrades: 2156,
    tvl: "$620K",
    hue: 200,
  },
  {
    id: "agent-004",
    name: "Stablecoin Harvester",
    strategy: "USDC/USDT/DAI",
    description: "Yield farming across stable pools on Aave and Benqi with auto-compounding.",
    reputationScore: 96,
    winRate: 94,
    pnl: 8.7,
    successFee: 8,
    riskLevel: "low",
    trending: false,
    totalTrades: 412,
    tvl: "$2.1M",
    hue: 140,
  },
  {
    id: "agent-005",
    name: "DeFi Leverage Bot",
    strategy: "AVAX Leveraged Long",
    description: "Automated leveraged positions on GMX with dynamic stop-loss and take-profit.",
    reputationScore: 72,
    winRate: 58,
    pnl: 89.4,
    successFee: 20,
    riskLevel: "high",
    trending: true,
    totalTrades: 634,
    tvl: "$380K",
    hue: 270,
  },
  {
    id: "agent-006",
    name: "Cross-DEX Arbitrage",
    strategy: "Multi-pair Arb",
    description: "Real-time price discrepancy detection across Trader Joe, Pangolin, and GMX.",
    reputationScore: 89,
    winRate: 82,
    pnl: 22.1,
    successFee: 12,
    riskLevel: "medium",
    trending: false,
    totalTrades: 5210,
    tvl: "$950K",
    hue: 60,
  },
];

// ── Main hook ──

async function fetchAgents(): Promise<{ agents: Agent[]; source: "onchain" | "mock" }> {
  try {
    const onChainAgents = await fetchOnChainAgents();

    if (onChainAgents.length === 0) {
      return { agents: MOCK_AGENTS, source: "mock" };
    }

    // Map on-chain agents to Agent type, enriching with reputation
    const agents: Agent[] = await Promise.all(
      onChainAgents.map(async (oc, i) => {
        const rep = await fetchAgentReputation(oc.id);
        const avgScore =
          rep.count > 0n
            ? Number((rep.total * 100n) / rep.count) / 100
            : 0;

        // Try to parse URI as JSON metadata, fallback to defaults
        let name = `Agent #${oc.id}`;
        let description = oc.uri;
        let strategy = "On-chain Strategy";

        try {
          if (oc.uri.startsWith("{")) {
            const meta = JSON.parse(oc.uri);
            name = meta.name || name;
            description = meta.description || description;
            strategy = meta.strategy || strategy;
          } else if (oc.uri.startsWith("http")) {
            // URI points to external metadata — just use the ID as name
            description = `Metadata: ${oc.uri}`;
          }
        } catch {
          // URI is not JSON, use as description
        }

        return {
          id: `onchain-${oc.id}`,
          name,
          strategy,
          description,
          reputationScore: Math.min(100, Math.max(0, Math.round(avgScore))),
          winRate: 0,
          pnl: 0,
          successFee: 10,
          riskLevel: "medium" as const,
          trending: false,
          totalTrades: Number(rep.count),
          tvl: "—",
          hue: (Number(oc.id) * 47) % 360,
          onChain: oc,
        };
      })
    );

    return { agents, source: "onchain" };
  } catch (error) {
    console.warn("Failed to fetch on-chain agents, using mock data:", error);
    return { agents: MOCK_AGENTS, source: "mock" };
  }
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useMockAgents() {
  return MOCK_AGENTS;
}
