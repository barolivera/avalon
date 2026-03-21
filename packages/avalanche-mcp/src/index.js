#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import {
  NETWORKS,
  ERC8004,
  TOKENS,
  CHAINLINK_FEEDS,
  ABIS,
  TRADER_JOE,
} from "./config.js";

// --- Helpers ---

function getProvider(network = "fuji") {
  const net = NETWORKS[network];
  if (!net) throw new Error(`Unknown network: ${network}. Use "fuji" or "mainnet"`);
  return new ethers.JsonRpcProvider(net.rpc);
}

function getWallet(network = "fuji") {
  const pk = process.env.AVAX_PRIVATE_KEY;
  if (!pk) throw new Error("AVAX_PRIVATE_KEY env var not set");
  return new ethers.Wallet(pk, getProvider(network));
}

function formatResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// --- Tool Definitions ---

const TOOLS = [
  // === Network ===
  {
    name: "get_supported_networks",
    description: "Get supported Avalanche networks (Fuji testnet, Mainnet)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_native_balance",
    description: "Get AVAX balance of an address",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        network: { type: "string", description: "fuji or mainnet", default: "fuji" },
      },
      required: ["address"],
    },
  },
  {
    name: "get_erc20_balance",
    description: "Get ERC-20 token balance of an address",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address" },
        tokenAddress: { type: "string", description: "Token contract address" },
        network: { type: "string", default: "fuji" },
      },
      required: ["address", "tokenAddress"],
    },
  },
  {
    name: "get_erc20_token_info",
    description: "Get ERC-20 token info (name, symbol, decimals)",
    inputSchema: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "Token contract address" },
        network: { type: "string", default: "fuji" },
      },
      required: ["tokenAddress"],
    },
  },
  {
    name: "transfer_native_token",
    description: "Transfer AVAX to an address",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient address" },
        amount: { type: "string", description: "Amount in AVAX" },
        network: { type: "string", default: "fuji" },
      },
      required: ["to", "amount"],
    },
  },
  {
    name: "transfer_erc20",
    description: "Transfer ERC-20 tokens to an address",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient address" },
        tokenAddress: { type: "string", description: "Token contract address" },
        amount: { type: "string", description: "Amount in token units" },
        network: { type: "string", default: "fuji" },
      },
      required: ["to", "tokenAddress", "amount"],
    },
  },
  {
    name: "get_transaction",
    description: "Get transaction details by hash",
    inputSchema: {
      type: "object",
      properties: {
        txHash: { type: "string", description: "Transaction hash" },
        network: { type: "string", default: "fuji" },
      },
      required: ["txHash"],
    },
  },
  {
    name: "get_latest_block",
    description: "Get latest block info on Avalanche",
    inputSchema: {
      type: "object",
      properties: {
        network: { type: "string", default: "fuji" },
      },
    },
  },
  {
    name: "estimate_gas",
    description: "Estimate gas for a transaction",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Destination address" },
        value: { type: "string", description: "AVAX amount (optional)", default: "0" },
        data: { type: "string", description: "Calldata hex (optional)", default: "0x" },
        network: { type: "string", default: "fuji" },
      },
      required: ["to"],
    },
  },
  {
    name: "is_contract",
    description: "Check if an address is a contract",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string" },
        network: { type: "string", default: "fuji" },
      },
      required: ["address"],
    },
  },
  // === Chainlink ===
  {
    name: "get_chainlink_price",
    description: "Get price from Chainlink feed (AVAX/USD, ETH/USD, BTC/USD)",
    inputSchema: {
      type: "object",
      properties: {
        pair: { type: "string", description: "Price pair: AVAX/USD, ETH/USD, or BTC/USD" },
        network: { type: "string", default: "fuji" },
      },
      required: ["pair"],
    },
  },
  // === ERC-8004 ===
  {
    name: "register_agent",
    description: "Register an AI agent on ERC-8004 Identity Registry (mints NFT)",
    inputSchema: {
      type: "object",
      properties: {
        agentURI: { type: "string", description: "URI pointing to agent metadata JSON" },
        network: { type: "string", default: "fuji" },
      },
      required: ["agentURI"],
    },
  },
  {
    name: "get_agent_info",
    description: "Get AI agent info from ERC-8004 Identity Registry",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent ID (token ID)" },
        network: { type: "string", default: "fuji" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "get_agent_reputation",
    description: "Get AI agent reputation summary from ERC-8004 Reputation Registry",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent ID" },
        tag1: { type: "string", description: "Filter tag 1 (optional, hex bytes32)", default: "0x0000000000000000000000000000000000000000000000000000000000000000" },
        tag2: { type: "string", description: "Filter tag 2 (optional, hex bytes32)", default: "0x0000000000000000000000000000000000000000000000000000000000000000" },
        network: { type: "string", default: "fuji" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "give_agent_feedback",
    description: "Give feedback to an AI agent via ERC-8004 Reputation Registry",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent ID" },
        value: { type: "number", description: "Rating value (int128)" },
        tag1: { type: "string", description: "Category tag 1 (bytes32 hex)" },
        tag2: { type: "string", description: "Category tag 2 (bytes32 hex)" },
        comment: { type: "string", description: "Feedback comment" },
        network: { type: "string", default: "fuji" },
      },
      required: ["agentId", "value", "comment"],
    },
  },
  // === Read Contract ===
  {
    name: "read_contract",
    description: "Call a read-only function on any smart contract",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: { type: "string" },
        abi: { type: "string", description: "Function signature, e.g. 'function balanceOf(address) view returns (uint256)'" },
        args: { type: "array", description: "Function arguments", items: { type: "string" } },
        network: { type: "string", default: "fuji" },
      },
      required: ["contractAddress", "abi"],
    },
  },
  {
    name: "write_contract",
    description: "Call a state-changing function on any smart contract (requires AVAX_PRIVATE_KEY)",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: { type: "string" },
        abi: { type: "string", description: "Function signature, e.g. 'function approve(address,uint256) returns (bool)'" },
        args: { type: "array", description: "Function arguments", items: { type: "string" } },
        value: { type: "string", description: "AVAX to send (optional)", default: "0" },
        network: { type: "string", default: "fuji" },
      },
      required: ["contractAddress", "abi"],
    },
  },
  {
    name: "get_address_from_private_key",
    description: "Derive wallet address from the configured private key",
    inputSchema: { type: "object", properties: {} },
  },
];

// --- Tool Handlers ---

async function handleTool(name, args) {
  const network = args.network || "fuji";

  switch (name) {
    case "get_supported_networks":
      return formatResult(NETWORKS);

    case "get_native_balance": {
      const provider = getProvider(network);
      const balance = await provider.getBalance(args.address);
      return formatResult({
        address: args.address,
        balance: ethers.formatEther(balance),
        symbol: "AVAX",
        network,
      });
    }

    case "get_erc20_balance": {
      const provider = getProvider(network);
      const token = new ethers.Contract(args.tokenAddress, ABIS.erc20, provider);
      const [balance, decimals, symbol] = await Promise.all([
        token.balanceOf(args.address),
        token.decimals(),
        token.symbol(),
      ]);
      return formatResult({
        address: args.address,
        token: args.tokenAddress,
        balance: ethers.formatUnits(balance, decimals),
        symbol,
        network,
      });
    }

    case "get_erc20_token_info": {
      const provider = getProvider(network);
      const token = new ethers.Contract(args.tokenAddress, ABIS.erc20, provider);
      const [name, symbol, decimals] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
      ]);
      return formatResult({ address: args.tokenAddress, name, symbol, decimals: Number(decimals), network });
    }

    case "transfer_native_token": {
      const wallet = getWallet(network);
      const tx = await wallet.sendTransaction({
        to: args.to,
        value: ethers.parseEther(args.amount),
      });
      const receipt = await tx.wait();
      return formatResult({
        txHash: receipt.hash,
        from: wallet.address,
        to: args.to,
        amount: args.amount,
        symbol: "AVAX",
        explorer: `${NETWORKS[network].explorer}/tx/${receipt.hash}`,
      });
    }

    case "transfer_erc20": {
      const wallet = getWallet(network);
      const token = new ethers.Contract(args.tokenAddress, ABIS.erc20, wallet);
      const decimals = await token.decimals();
      const tx = await token.transfer(args.to, ethers.parseUnits(args.amount, decimals));
      const receipt = await tx.wait();
      return formatResult({
        txHash: receipt.hash,
        to: args.to,
        amount: args.amount,
        token: args.tokenAddress,
        explorer: `${NETWORKS[network].explorer}/tx/${receipt.hash}`,
      });
    }

    case "get_transaction": {
      const provider = getProvider(network);
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(args.txHash),
        provider.getTransactionReceipt(args.txHash),
      ]);
      return formatResult({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        status: receipt?.status === 1 ? "success" : "failed",
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        explorer: `${NETWORKS[network].explorer}/tx/${args.txHash}`,
      });
    }

    case "get_latest_block": {
      const provider = getProvider(network);
      const block = await provider.getBlock("latest");
      return formatResult({
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        date: new Date(block.timestamp * 1000).toISOString(),
        transactions: block.transactions.length,
        gasUsed: block.gasUsed.toString(),
        network,
      });
    }

    case "estimate_gas": {
      const provider = getProvider(network);
      const gas = await provider.estimateGas({
        to: args.to,
        value: ethers.parseEther(args.value || "0"),
        data: args.data || "0x",
      });
      const feeData = await provider.getFeeData();
      const costWei = gas * feeData.gasPrice;
      return formatResult({
        gasUnits: gas.toString(),
        gasPriceGwei: ethers.formatUnits(feeData.gasPrice, "gwei"),
        estimatedCostAVAX: ethers.formatEther(costWei),
        network,
      });
    }

    case "is_contract": {
      const provider = getProvider(network);
      const code = await provider.getCode(args.address);
      return formatResult({
        address: args.address,
        isContract: code !== "0x",
        network,
      });
    }

    case "get_chainlink_price": {
      const feeds = CHAINLINK_FEEDS[network];
      const feedAddr = feeds?.[args.pair];
      if (!feedAddr) {
        return formatResult({ error: `Unknown pair: ${args.pair}. Available: ${Object.keys(feeds || {}).join(", ")}` });
      }
      const provider = getProvider(network);
      const feed = new ethers.Contract(feedAddr, ABIS.chainlinkFeed, provider);
      const [roundData, decimals, description] = await Promise.all([
        feed.latestRoundData(),
        feed.decimals(),
        feed.description(),
      ]);
      return formatResult({
        pair: description,
        price: Number(roundData.answer) / 10 ** Number(decimals),
        decimals: Number(decimals),
        updatedAt: new Date(Number(roundData.updatedAt) * 1000).toISOString(),
        roundId: roundData.roundId.toString(),
        network,
      });
    }

    case "register_agent": {
      const wallet = getWallet(network);
      const registry = new ethers.Contract(ERC8004[network].identityRegistry, ABIS.identityRegistry, wallet);
      const tx = await registry.register(args.agentURI);
      const receipt = await tx.wait();
      return formatResult({
        txHash: receipt.hash,
        agentURI: args.agentURI,
        explorer: `${NETWORKS[network].explorer}/tx/${receipt.hash}`,
        note: "Agent registered. Check tx logs for agentId.",
      });
    }

    case "get_agent_info": {
      const provider = getProvider(network);
      const registry = new ethers.Contract(ERC8004[network].identityRegistry, ABIS.identityRegistry, provider);
      const [uri, owner, wallet] = await Promise.all([
        registry.agentURI(args.agentId),
        registry.ownerOf(args.agentId),
        registry.getAgentWallet(args.agentId).catch(() => "N/A"),
      ]);
      return formatResult({
        agentId: args.agentId,
        uri,
        owner,
        agentWallet: wallet,
        network,
      });
    }

    case "get_agent_reputation": {
      const provider = getProvider(network);
      const registry = new ethers.Contract(ERC8004[network].reputationRegistry, ABIS.reputationRegistry, provider);
      const tag1 = args.tag1 || "0x0000000000000000000000000000000000000000000000000000000000000000";
      const tag2 = args.tag2 || "0x0000000000000000000000000000000000000000000000000000000000000000";
      const summary = await registry.getSummary(args.agentId, tag1, tag2);
      return formatResult({
        agentId: args.agentId,
        totalScore: summary.total.toString(),
        feedbackCount: summary.count.toString(),
        averageScore: summary.count > 0 ? (Number(summary.total) / Number(summary.count)).toFixed(2) : "N/A",
        network,
      });
    }

    case "give_agent_feedback": {
      const wallet = getWallet(network);
      const registry = new ethers.Contract(ERC8004[network].reputationRegistry, ABIS.reputationRegistry, wallet);
      const tag1 = args.tag1 || "0x0000000000000000000000000000000000000000000000000000000000000000";
      const tag2 = args.tag2 || "0x0000000000000000000000000000000000000000000000000000000000000000";
      const tx = await registry.giveFeedback(args.agentId, args.value, tag1, tag2, args.comment);
      const receipt = await tx.wait();
      return formatResult({
        txHash: receipt.hash,
        agentId: args.agentId,
        value: args.value,
        comment: args.comment,
        explorer: `${NETWORKS[network].explorer}/tx/${receipt.hash}`,
      });
    }

    case "read_contract": {
      const provider = getProvider(network);
      const contract = new ethers.Contract(args.contractAddress, [args.abi], provider);
      const fnName = args.abi.match(/function\s+(\w+)/)?.[1];
      if (!fnName) throw new Error("Could not parse function name from ABI");
      const result = await contract[fnName](...(args.args || []));
      return formatResult({
        contract: args.contractAddress,
        function: fnName,
        result: result.toString(),
        network,
      });
    }

    case "write_contract": {
      const wallet = getWallet(network);
      const contract = new ethers.Contract(args.contractAddress, [args.abi], wallet);
      const fnName = args.abi.match(/function\s+(\w+)/)?.[1];
      if (!fnName) throw new Error("Could not parse function name from ABI");
      const tx = await contract[fnName](...(args.args || []), {
        value: ethers.parseEther(args.value || "0"),
      });
      const receipt = await tx.wait();
      return formatResult({
        txHash: receipt.hash,
        contract: args.contractAddress,
        function: fnName,
        explorer: `${NETWORKS[network].explorer}/tx/${receipt.hash}`,
      });
    }

    case "get_address_from_private_key": {
      const wallet = getWallet();
      return formatResult({ address: wallet.address });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Server Setup ---

const server = new Server(
  { name: "avalanche-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return await handleTool(request.params.name, request.params.arguments || {});
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
