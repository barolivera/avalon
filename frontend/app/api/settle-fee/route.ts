import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Success Fee Settlement API
 *
 * Simulates the HTTP 402 Payment Required flow:
 * 1. Client POSTs profit data
 * 2. If profit > 0 and no payment header → respond 402 with fee requirements
 * 3. If profit > 0 and payment header present → settle and respond 200
 * 4. If profit <= 0 → respond 200 with no charge
 *
 * In production this would call settlePayment() via Thirdweb x402 SDK
 * to execute an on-chain USDC transfer from user to platform.
 */

interface SettleFeeRequest {
  agentId: string;
  profitAmount: number;
  feePercent: number;
  userAddress: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SettleFeeRequest = await req.json();
    const { agentId, profitAmount, feePercent, userAddress } = body;

    if (!agentId || feePercent == null || profitAmount == null || !userAddress) {
      return NextResponse.json(
        { error: "Missing required fields: agentId, profitAmount, feePercent, userAddress" },
        { status: 400 }
      );
    }

    // No profit → no fee (x402 variable pricing: $0 charged)
    if (profitAmount <= 0) {
      return NextResponse.json({
        charged: false,
        reason: "No profit generated — zero fee per x402 variable pricing",
        agentId,
        profitAmount,
        feeAmount: 0,
      });
    }

    const feeAmount = Math.round(profitAmount * feePercent) / 100;
    const paymentHeader = req.headers.get("x-payment");

    // No payment authorization → respond 402 Payment Required
    if (!paymentHeader) {
      return NextResponse.json(
        {
          error: "Payment Required",
          protocol: "x402",
          requirements: {
            feeAmount,
            token: "USDC",
            network: "avalanche-fuji",
            chainId: 43113,
            recipient: process.env.THIRDWEB_SERVER_WALLET_ADDRESS,
            scheme: "upto", // x402 variable pricing — charge only actual profit %
            maxAuthorized: feeAmount,
            description: `${feePercent}% success fee on $${profitAmount.toFixed(2)} profit`,
          },
        },
        {
          status: 402,
          headers: {
            "X-Payment-Required": "true",
            "X-Fee-Amount": feeAmount.toFixed(2),
            "X-Fee-Token": "USDC",
            "X-Fee-Network": "avalanche-fuji",
            "X-Fee-Protocol": "x402",
          },
        }
      );
    }

    // Payment header present → simulate settlement
    // In production: await settlePayment(paymentHeader, { facilitator, chain })
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    // Simulate network delay for realistic demo
    await new Promise((r) => setTimeout(r, 1500));

    return NextResponse.json({
      charged: true,
      protocol: "x402",
      settlement: {
        feeAmount,
        token: "USDC",
        from: userAddress,
        to: process.env.THIRDWEB_SERVER_WALLET_ADDRESS,
        txHash: mockTxHash,
        network: "avalanche-fuji",
        explorer: `https://testnet.snowtrace.io/tx/${mockTxHash}`,
      },
      agentId,
      profitAmount,
      feePercent,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
