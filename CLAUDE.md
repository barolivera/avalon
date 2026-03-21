# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Avalon

Avalon is a DeFAI retail-first platform on Avalanche where AI agents with on-chain identity (ERC-8004) execute trading strategies on Trader Joe Liquidity Book, charge performance fees via x402, and the user maintains full control with transparency.

## Quick Commands

```bash
cd frontend && npm run dev       # Start frontend dev server
cd frontend && npm run build     # Build frontend for production
```

## Architecture

```
frontend/           # Next.js 16 app (TypeScript, TanStack Query, shadcn/ui, wagmi/viem)
docs/               # Architecture docs, agent personas, skills
packages/           # MCP server for Avalanche
deploy/             # TypeScript deployment scripts
```

**Frontend stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, TanStack Query, Zustand, Wagmi v2 + Viem, shadcn/ui, RainbowKit.

## Smart Contracts (Deployed on Avalanche Fuji)

Contracts live in a separate repo (mariaelisaaraya/avalon) and are already deployed:

| Contract | Proxy Address |
|----------|--------------|
| StrategyVault | `0x5C126932a5394Ca843608d38FfeB8A2AF9DBbBF3` |
| StrategyExecutor | `0x84a2408A7d7966A55ae6D28dc956AA52a6c28D6C` |
| FeeCollector | `0x04DAF41Fe41E2c25De5Dc9901024c89Fe9773053` |

**External contracts (Avalanche Fuji):**
- ERC-8004 Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ERC-8004 Reputation Registry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Trader Joe LB Router: `0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30`
- USDC: `0x5425890298aed601595a70AB815c96711a31Bc65`
- WAVAX: `0xd00ae08403B9bbb9124bB305C09058E32C39A48c`
- Chainlink AVAX/USD: `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`

**Owner/Admin:** `0xfE0C41602CAcb28217e1eAfa4C987C78Db78AAFD`

## Frontend Pages

| Page | Purpose |
|------|---------|
| `/marketplace` | Agent marketplace — browse ERC-8004 registered agents by reputation |
| `/dashboard` | Portfolio overview, active strategies, P&L, alerts |
| `/builder` | Visual Strategy Builder: type selection, config, AI suggestions, preview |
| `/agents/[tokenId]` | Agent detail: reputation, trades, performance |

## Frontend Patterns

- Contract config: `frontend/lib/contracts/avalanche-config.ts`
- Avalanche client: `frontend/lib/contracts/avalanche-client.ts`
- Contract types: `frontend/lib/contracts/types.ts`
- Hooks: `frontend/lib/hooks/useAgents.ts`, `useChainlinkPrice.ts`, `useX402.ts`
- Wallet: wagmi/viem + RainbowKit

## Key Concepts

- **User = Pilot**: controls, pauses, withdraws. Full custody at all times.
- **AI = Copilot**: optimizes parameters, executes trades, logs every decision on-chain.
- **ERC-8004**: On-chain agent identity + reputation. Agents have verifiable track records.
- **x402**: Success fee — only charges if the strategy is profitable (10% of profit).
- **Trader Joe Liquidity Book**: DEX for on-chain trade execution.
- **Chainlink**: Price feeds for agent decision-making.

## Resources

- Full architecture: `docs/avalon-architecture.md`
- Agent personas: `docs/agents/`
- Skills: `docs/skills/`
- MCP server: `packages/avalanche-mcp/`
