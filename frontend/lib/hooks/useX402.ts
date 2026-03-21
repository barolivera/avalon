"use client";

import { useState, useCallback } from "react";

export type X402Step = "idle" | "checking" | "fee-required" | "settling" | "settled" | "no-fee" | "error";

export interface X402Result {
  charged: boolean;
  feeAmount: number;
  txHash?: string;
  explorer?: string;
  reason?: string;
}

export function useX402() {
  const [step, setStep] = useState<X402Step>("idle");
  const [result, setResult] = useState<X402Result | null>(null);

  const settleAgentFee = useCallback(
    async (
      agentId: string,
      profitAmount: number,
      feePercent: number,
      userAddress: string
    ): Promise<X402Result> => {
      setStep("checking");
      setResult(null);

      try {
        // Simulate brief analysis delay
        await new Promise((r) => setTimeout(r, 800));

        // First call: no payment header → may get 402
        const res = await fetch("/api/settle-fee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, profitAmount, feePercent, userAddress }),
        });

        // No profit → no fee
        if (res.ok) {
          const data = await res.json();
          if (!data.charged) {
            const r: X402Result = { charged: false, feeAmount: 0, reason: data.reason };
            setResult(r);
            setStep("no-fee");
            return r;
          }
        }

        // Got 402 → payment required
        if (res.status === 402) {
          const feeData = await res.json();
          const feeAmount = feeData.requirements?.feeAmount ?? 0;

          setStep("fee-required");
          // Brief pause to show the fee-required state
          await new Promise((r) => setTimeout(r, 1000));

          // Second call: with payment authorization header
          setStep("settling");
          const settleRes = await fetch("/api/settle-fee", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Payment": btoa(JSON.stringify({
                authorization: "x402-payment-v1",
                amount: feeAmount,
                token: "USDC",
                chain: 43113,
                sender: userAddress,
                timestamp: Date.now(),
              })),
            },
            body: JSON.stringify({ agentId, profitAmount, feePercent, userAddress }),
          });

          if (!settleRes.ok) {
            throw new Error("Settlement failed");
          }

          const settlement = await settleRes.json();
          const r: X402Result = {
            charged: true,
            feeAmount: settlement.settlement.feeAmount,
            txHash: settlement.settlement.txHash,
            explorer: settlement.settlement.explorer,
          };
          setResult(r);
          setStep("settled");
          return r;
        }

        throw new Error(`Unexpected response: ${res.status}`);
      } catch (error: any) {
        const r: X402Result = { charged: false, feeAmount: 0, reason: error.message };
        setResult(r);
        setStep("error");
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStep("idle");
    setResult(null);
  }, []);

  return { step, result, settleAgentFee, reset };
}
