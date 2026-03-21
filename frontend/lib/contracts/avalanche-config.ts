// Avalanche contract addresses and ABIs
// Source: avalon-skills/packages/avalanche-mcp/src/config.js

export type NetworkId = "fuji" | "mainnet";

// ── Networks ──

export const NETWORKS = {
  fuji: {
    name: "Avalanche Fuji Testnet",
    chainId: 43113,
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    explorer: "https://testnet.snowtrace.io",
    faucet: "https://build.avax.network/console/primary-network/faucet",
  },
  mainnet: {
    name: "Avalanche C-Chain",
    chainId: 43114,
    rpc: "https://api.avax.network/ext/bc/C/rpc",
    explorer: "https://snowtrace.io",
  },
} as const;

// ── ERC-8004 Identity & Reputation Registries ──

export const ERC8004 = {
  fuji: {
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`,
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as `0x${string}`,
  },
  mainnet: {
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as `0x${string}`,
  },
} as const;

// ── Token Addresses ──

export const TOKENS = {
  fuji: {
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65" as `0x${string}`,
    WAVAX: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c" as `0x${string}`,
  },
  mainnet: {
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as `0x${string}`,
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7" as `0x${string}`,
  },
} as const;

// ── Trader Joe / LFJ ──

export const TRADER_JOE = {
  fuji: {
    lbRouter: "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30" as `0x${string}`,
    lbFactory: "0x8e42f2F4101563bF679975178e880FD87d3eFd4e" as `0x${string}`,
  },
  mainnet: {
    lbRouter: "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30" as `0x${string}`,
    lbFactory: "0x8e42f2F4101563bF679975178e880FD87d3eFd4e" as `0x${string}`,
  },
} as const;

// ── Chainlink Price Feeds ──

export const CHAINLINK_FEEDS = {
  fuji: {
    "AVAX/USD": "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD" as `0x${string}`,
    "ETH/USD": "0x86d67c3D38D2bCeE722E601025C25a575021c6EA" as `0x${string}`,
    "BTC/USD": "0x31CF013A08c6Ac228C94551d535d5BAfE19c602a" as `0x${string}`,
  },
  mainnet: {
    "AVAX/USD": "0x0A77230d17318075983913bC2145DB16C7366156" as `0x${string}`,
    "ETH/USD": "0x976B3D034E162d8bD72D6b9C989d545b839003b0" as `0x${string}`,
    "BTC/USD": "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743" as `0x${string}`,
  },
} as const;

// ── ABIs (minimal, human-readable for viem/ethers) ──

export const ABIS = {
  erc20: [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ] as const,

  chainlinkFeed: [
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function decimals() view returns (uint8)",
    "function description() view returns (string)",
  ] as const,

  identityRegistry: [
    "function register(string agentURI) returns (uint256)",
    "function agentURI(uint256 agentId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function totalSupply() view returns (uint256)",
    "function getAgentWallet(uint256 agentId) view returns (address)",
  ] as const,

  reputationRegistry: [
    "function giveFeedback(uint256 agentId, int128 value, bytes32 tag1, bytes32 tag2, string comment)",
    "function getSummary(uint256 agentId, bytes32 tag1, bytes32 tag2) view returns (int256 total, uint256 count)",
  ] as const,
} as const;

// ── Avalon Contracts (deployed UUPS proxies) ──

export const AVALON_CONTRACTS = {
  fuji: {
    strategyVault: "0x5C126932a5394Ca843608d38FfeB8A2AF9DBbBF3" as `0x${string}`,
    strategyExecutor: "0x84a2408A7d7966A55ae6D28dc956AA52a6c28D6C" as `0x${string}`,
    feeCollector: "0x04DAF41Fe41E2c25De5Dc9901024c89Fe9773053" as `0x${string}`,
  },
  mainnet: {
    strategyVault: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    strategyExecutor: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    feeCollector: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
} as const;

// ── Helpers ──

export function getExplorerTxUrl(txHash: string, network: NetworkId = "fuji"): string {
  return `${NETWORKS[network].explorer}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, network: NetworkId = "fuji"): string {
  return `${NETWORKS[network].explorer}/address/${address}`;
}
