"use client";

import { useQuery } from "@tanstack/react-query";
import { fujiClient } from "../contracts/avalanche-client";
import { AVALON_CONTRACTS, VAULT_ABI, EXECUTOR_ABI, FEE_ABI, ABIS } from "../contracts/avalanche-config";
import { parseAbi, formatUnits } from "viem";

const VAULT = AVALON_CONTRACTS.fuji.strategyVault;
const EXECUTOR = AVALON_CONTRACTS.fuji.strategyExecutor;
const FEE_COLLECTOR = AVALON_CONTRACTS.fuji.feeCollector;

export type StrategyStatus = "Draft" | "Funded" | "Active" | "Paused" | "Completed" | "Cancelled";
const STATUS_MAP: StrategyStatus[] = ["Draft", "Funded", "Active", "Paused", "Completed", "Cancelled"];

export interface StrategyView {
  strategyId: number;
  user: string;
  depositToken: string;
  depositAmount: string;
  currentBalance: string;
  pnl: string;
  pnlPercent: number;
  agentId: number;
  status: StrategyStatus;
  createdAt: Date;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

export interface TradeLog {
  strategyId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: Date;
  decisionHash: string;
  confidenceScore: number;
  agentId: number;
}

// Fetch all strategies for a user
export function useUserStrategies(userAddress: string | undefined) {
  return useQuery({
    queryKey: ["user-strategies", userAddress],
    enabled: !!userAddress,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<StrategyView[]> => {
      if (!userAddress) return [];

      try {
        const raw = await fujiClient.readContract({
          address: VAULT,
          abi: parseAbi(VAULT_ABI),
          functionName: "getUserStrategyViews",
          args: [userAddress as `0x${string}`],
        }) as any[];

        const strategies: StrategyView[] = [];
        for (const s of raw) {
          let tokenSymbol = "TOKEN";
          let tokenDecimals = 18;
          try {
            const [sym, dec] = await Promise.all([
              fujiClient.readContract({
                address: s.depositToken as `0x${string}`,
                abi: parseAbi(ABIS.erc20),
                functionName: "symbol",
              }),
              fujiClient.readContract({
                address: s.depositToken as `0x${string}`,
                abi: parseAbi(ABIS.erc20),
                functionName: "decimals",
              }),
            ]);
            tokenSymbol = sym as string;
            tokenDecimals = Number(dec);
          } catch {}

          const depositAmt = formatUnits(BigInt(s.depositAmount), tokenDecimals);
          const currentBal = formatUnits(BigInt(s.currentBalance), tokenDecimals);
          const pnlRaw = Number(s.pnl) / 10 ** tokenDecimals;
          const pnlPct = Number(depositAmt) > 0 ? (pnlRaw / Number(depositAmt)) * 100 : 0;

          strategies.push({
            strategyId: Number(s.strategyId),
            user: s.user,
            depositToken: s.depositToken,
            depositAmount: depositAmt,
            currentBalance: currentBal,
            pnl: pnlRaw.toFixed(tokenDecimals > 6 ? 4 : 2),
            pnlPercent: Math.round(pnlPct * 100) / 100,
            agentId: Number(s.agentId),
            status: STATUS_MAP[Number(s.status)] || "Draft",
            createdAt: new Date(Number(s.createdAt) * 1000),
            tokenSymbol,
            tokenDecimals,
          });
        }
        return strategies;
      } catch (err) {
        console.error("Failed to fetch strategies:", err);
        return [];
      }
    },
  });
}

// Fetch trades for a strategy
export function useStrategyTrades(strategyId: number | undefined) {
  return useQuery({
    queryKey: ["strategy-trades", strategyId],
    enabled: strategyId !== undefined,
    staleTime: 15_000,
    queryFn: async (): Promise<TradeLog[]> => {
      if (strategyId === undefined) return [];

      try {
        const raw = await fujiClient.readContract({
          address: EXECUTOR,
          abi: parseAbi(EXECUTOR_ABI),
          functionName: "getStrategyTrades",
          args: [BigInt(strategyId)],
        }) as any[];

        return raw.map((t: any) => ({
          strategyId: Number(t.strategyId),
          tokenIn: t.tokenIn,
          tokenOut: t.tokenOut,
          amountIn: t.amountIn.toString(),
          amountOut: t.amountOut.toString(),
          timestamp: new Date(Number(t.timestamp) * 1000),
          decisionHash: t.decisionHash,
          confidenceScore: Number(t.confidenceScore),
          agentId: Number(t.agentId),
        }));
      } catch {
        return [];
      }
    },
  });
}

// Fetch vault stats
export function useVaultStats() {
  return useQuery({
    queryKey: ["vault-stats"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      try {
        const [nextId, totalTrades, feeBps] = await Promise.all([
          fujiClient.readContract({
            address: VAULT,
            abi: parseAbi(VAULT_ABI),
            functionName: "nextStrategyId",
          }),
          fujiClient.readContract({
            address: EXECUTOR,
            abi: parseAbi(EXECUTOR_ABI),
            functionName: "totalTrades",
          }),
          fujiClient.readContract({
            address: FEE_COLLECTOR,
            abi: parseAbi(FEE_ABI),
            functionName: "feeBps",
          }),
        ]);

        return {
          totalStrategies: Number(nextId),
          totalTrades: Number(totalTrades),
          feeBps: Number(feeBps),
          feePercent: Number(feeBps) / 100,
        };
      } catch {
        return { totalStrategies: 0, totalTrades: 0, feeBps: 1000, feePercent: 10 };
      }
    },
  });
}
