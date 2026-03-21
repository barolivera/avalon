// Avalanche network configuration
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
};

// ERC-8004 official singleton registries
export const ERC8004 = {
  fuji: {
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
  mainnet: {
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
};

// Tokens on Fuji
export const TOKENS = {
  fuji: {
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65",
    WAVAX: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
  },
  mainnet: {
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  },
};

// Trader Joe / LFJ addresses
export const TRADER_JOE = {
  fuji: {
    lbRouter: "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30",
    lbFactory: "0x8e42f2F4101563bF679975178e880FD87d3eFd4e",
  },
  mainnet: {
    lbRouter: "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30",
    lbFactory: "0x8e42f2F4101563bF679975178e880FD87d3eFd4e",
  },
};

// Chainlink price feed addresses (Fuji)
export const CHAINLINK_FEEDS = {
  fuji: {
    "AVAX/USD": "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD",
    "ETH/USD": "0x86d67c3D38D2bCeE722E601025C25a575021c6EA",
    "BTC/USD": "0x31CF013A08c6Ac228C94551d535d5BAfE19c602a",
  },
  mainnet: {
    "AVAX/USD": "0x0A77230d17318075983913bC2145DB16C7366156",
    "ETH/USD": "0x976B3D034E162d8bD72D6b9C989d545b839003b0",
    "BTC/USD": "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743",
  },
};

// ABIs (minimal)
export const ABIS = {
  erc20: [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ],
  chainlinkFeed: [
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function decimals() view returns (uint8)",
    "function description() view returns (string)",
  ],
  identityRegistry: [
    "function register(string agentURI) returns (uint256)",
    "function agentURI(uint256 agentId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function totalSupply() view returns (uint256)",
    "function getAgentWallet(uint256 agentId) view returns (address)",
  ],
  reputationRegistry: [
    "function giveFeedback(uint256 agentId, int128 value, bytes32 tag1, bytes32 tag2, string comment)",
    "function getSummary(uint256 agentId, bytes32 tag1, bytes32 tag2) view returns (int256 total, uint256 count)",
  ],
};
