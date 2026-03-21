import { createPublicClient, http, defineChain } from "viem";
import { NETWORKS } from "./avalanche-config";

export const avalancheFuji = defineChain({
  id: NETWORKS.fuji.chainId,
  name: NETWORKS.fuji.name,
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: [NETWORKS.fuji.rpc] },
  },
  blockExplorers: {
    default: { name: "Snowtrace", url: NETWORKS.fuji.explorer },
  },
  testnet: true,
});

export const fujiClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(),
});
