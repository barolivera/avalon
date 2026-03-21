"use client";

import { useState, useCallback } from "react";
import { parseAbi, parseUnits, encodeFunctionData } from "viem";
import { AVALON_CONTRACTS, VAULT_ABI, ABIS } from "../contracts/avalanche-config";
import { useWallet } from "../genlayer/WalletProvider";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../utils/toast";

const VAULT = AVALON_CONTRACTS.fuji.strategyVault;

function useWriteContract() {
  const { address } = useWallet();
  const [isPending, setIsPending] = useState(false);

  const send = useCallback(
    async (to: `0x${string}`, data: `0x${string}`) => {
      if (!address || !window.ethereum) throw new Error("Wallet not connected");
      setIsPending(true);
      try {
        const txHash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [{ from: address, to, data }],
        });
        // Wait for receipt
        let receipt = null;
        while (!receipt) {
          await new Promise((r) => setTimeout(r, 2000));
          receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });
        }
        if (receipt.status === "0x0") throw new Error("Transaction reverted");
        return txHash as string;
      } finally {
        setIsPending(false);
      }
    },
    [address]
  );

  return { send, isPending };
}

export function useCreateStrategy() {
  const { send, isPending } = useWriteContract();
  const { address } = useWallet();
  const qc = useQueryClient();

  const create = useCallback(
    async (params: {
      depositToken: `0x${string}`;
      amount: string;
      agentId: number;
      maxBudget: string;
      maxSlippageBps: number;
      maxTradesPerDay: number;
      tokenDecimals: number;
    }) => {
      if (!address) throw new Error("Connect wallet first");

      // 1. Approve token
      const approveData = encodeFunctionData({
        abi: parseAbi(ABIS.erc20),
        functionName: "approve",
        args: [VAULT, parseUnits(params.amount, params.tokenDecimals)],
      });

      toast.loading("Approving token...");
      await send(params.depositToken, approveData);

      // 2. Create strategy
      const createData = encodeFunctionData({
        abi: parseAbi(VAULT_ABI),
        functionName: "createStrategy",
        args: [
          params.depositToken,
          parseUnits(params.amount, params.tokenDecimals),
          BigInt(params.agentId),
          parseUnits(params.maxBudget, params.tokenDecimals),
          params.maxSlippageBps,
          params.maxTradesPerDay,
        ],
      });

      toast.loading("Creating strategy...");
      const txHash = await send(VAULT, createData);
      toast.success("Strategy created!");
      qc.invalidateQueries({ queryKey: ["user-strategies"] });
      return txHash;
    },
    [address, send, qc]
  );

  return { create, isPending };
}

export function useStrategyAction() {
  const { send, isPending } = useWriteContract();
  const qc = useQueryClient();

  const execute = useCallback(
    async (action: "activate" | "pause" | "resume" | "emergencyWithdraw" | "withdraw", strategyId: number) => {
      const fnMap = {
        activate: "activateStrategy",
        pause: "pauseStrategy",
        resume: "resumeStrategy",
        emergencyWithdraw: "emergencyWithdraw",
        withdraw: "withdraw",
      } as const;

      const data = encodeFunctionData({
        abi: parseAbi(VAULT_ABI),
        functionName: fnMap[action],
        args: [BigInt(strategyId)],
      });

      const actionLabel = {
        activate: "Activating",
        pause: "Pausing",
        resume: "Resuming",
        emergencyWithdraw: "Emergency withdrawing",
        withdraw: "Withdrawing",
      }[action];

      toast.loading(`${actionLabel}...`);
      const txHash = await send(VAULT, data);
      toast.success(`${actionLabel} done!`);
      qc.invalidateQueries({ queryKey: ["user-strategies"] });
      return txHash;
    },
    [send, qc]
  );

  return { execute, isPending };
}
