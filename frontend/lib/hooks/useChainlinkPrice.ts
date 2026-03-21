"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbi, formatUnits } from "viem";
import { fujiClient } from "@/lib/contracts/avalanche-client";
import { CHAINLINK_FEEDS } from "@/lib/contracts/avalanche-config";

type PricePair = keyof typeof CHAINLINK_FEEDS.fuji;

const chainlinkAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);

async function fetchPrice(pair: PricePair) {
  const feedAddress = CHAINLINK_FEEDS.fuji[pair];

  const [roundData, decimals] = await Promise.all([
    fujiClient.readContract({
      address: feedAddress,
      abi: chainlinkAbi,
      functionName: "latestRoundData",
    }),
    fujiClient.readContract({
      address: feedAddress,
      abi: chainlinkAbi,
      functionName: "decimals",
    }),
  ]);

  const [, answer, , updatedAt] = roundData;
  const price = Number(formatUnits(answer, decimals));
  const updatedAtDate = new Date(Number(updatedAt) * 1000);

  return { price, decimals: Number(decimals), updatedAt: updatedAtDate };
}

export function useChainlinkPrice(pair: PricePair = "AVAX/USD") {
  return useQuery({
    queryKey: ["chainlink-price", pair],
    queryFn: () => fetchPrice(pair),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 2,
  });
}
