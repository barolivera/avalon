# Avalon — AI Agents That Trade For You

> DeFAI platform on Avalanche. Visual strategy builder, autonomous trading agents with ERC-8004 identity, and pay-only-if-you-win fees via x402.

**Live demo:** https://heyavalon.vercel.app

Built for [Aleph Hackathon 2026](https://dorahacks.io) — Buenos Aires, March 2026.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| Icons | Phosphor Icons |
| Fonts | Sora + IBM Plex Mono |
| Blockchain | Avalanche C-Chain (Fuji testnet) |
| DEX | Trader Joe Liquidity Book (SDK v2) |
| Oracles | Chainlink price feeds (AVAX/USD, ETH/USD, BTC/USD) |
| Agent Identity | ERC-8004 Identity + Reputation Registries |
| Payments | x402 protocol (success fee) |
| AI Engine | GenLayer |

## Pages

- `/` — Landing page
- `/marketplace` — Browse agents with on-chain reputation
- `/agents/[tokenId]` — Agent profile with performance chart, trade history, hire CTA
- `/builder` — Visual strategy builder (drag & drop with React Flow)
- `/dashboard` — Portfolio, positions, fee history, audit log

## Getting Started

```bash
# Install dependencies
npm install

# Copy env and fill in values
cp frontend/.env.example frontend/.env

# Run dev server
npm run dev
```

Open http://localhost:3000.

## Environment Variables

```
NEXT_PUBLIC_WC_PROJECT_ID=        # WalletConnect (cloud.walletconnect.com)
NEXT_PUBLIC_CONTRACT_ADDRESS=     # Deployed contract address
NEXT_PUBLIC_GENLAYER_RPC_URL=     # GenLayer RPC
```

## Key Contracts (Fuji)

| Contract | Address |
|----------|---------|
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Chainlink AVAX/USD | `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD` |
| Trader Joe LB Router | `0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30` |
| USDC | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| WAVAX | `0xd00ae08403B9bbb9124bB305C09058E32C39A48c` |

## Architecture

Avalon separates AI decision-making (off-chain) from trade execution and fund custody (on-chain). The user stays in control — agents operate within strict on-chain constraints.

```
USER
 │
 ▼
┌──────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js 16 / React 19)                       │
│                                                          │
│  Landing ─ Marketplace ─ Builder ─ Dashboard ─ Agent     │
│                │              │          │               │
│          Browse agents   Drag & drop   Track PnL        │
│          + hire          strategy       + audit log      │
└──────┬───────────────────────┬───────────────────────────┘
       │                       │
       ▼                       ▼
┌──────────────┐    ┌─────────────────────┐
│  ERC-8004    │    │  STRATEGY ENGINE     │
│  Registries  │    │  (GenLayer AI)       │
│              │    │                     │
│  Identity    │    │  Perceive: read     │
│  (NFT per    │    │    Chainlink feeds  │
│   agent)     │    │  Analyze: evaluate  │
│              │    │    RSI, vol, etc.   │
│  Reputation  │    │  Decide: entry/exit │
│  (on-chain   │    │    signals          │
│   feedback)  │    │  Execute: call      │
│              │    │    contracts        │
└──────────────┘    │  Log: hash on-chain │
                    └──────────┬──────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐    ┌─────────────────┐    ┌───────────────┐
│ StrategyVault│    │  Trader Joe LB  │    │ FeeCollector  │
│ (Solidity)   │    │  (DEX)          │    │ (Solidity)    │
│              │    │                 │    │               │
│ deposit()    │    │ Swap via        │    │ collectFee()  │
│ withdraw()   │    │ Liquidity Book  │    │ x402 protocol │
│ emergencyStop│    │ Zero-slippage   │    │ Only on profit│
│ balances[]   │    │ bins            │    │ USDC transfer │
└──────────────┘    └─────────────────┘    └───────────────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               ▼
                    ┌─────────────────┐
                    │  AVALANCHE      │
                    │  C-Chain        │
                    │                 │
                    │  ~2s finality   │
                    │  Low gas        │
                    │  EVM compatible │
                    └─────────────────┘
```

### Separation of concerns

| Layer | Where | What it does |
|-------|-------|-------------|
| **Frontend** | Browser | Visual strategy builder, agent marketplace, portfolio dashboard |
| **AI Engine** | Off-chain (GenLayer) | Reads market data, evaluates strategies, decides trades |
| **Smart Contracts** | On-chain (Avalanche) | Holds funds, executes swaps, collects fees, logs decisions |
| **Oracles** | On-chain (Chainlink) | Real-time price feeds for AVAX, ETH, BTC |
| **DEX** | On-chain (Trader Joe) | Trade execution via Liquidity Book |
| **Identity** | On-chain (ERC-8004) | Agent NFT identity + immutable reputation scores |
| **Payments** | On-chain (x402) | Success fees settled in USDC only when user profits |

### Strategy flow: Builder to execution

```
1. BUILD     User drags nodes in /builder (Chainlink → RSI → Swap → TP/SL)
                 │
2. DEPLOY    "Deploy Agent" → registers agent on ERC-8004 Identity Registry
             → mints NFT with strategy metadata URI
             → user deposits USDC into StrategyVault
                 │
3. MONITOR   GenLayer AI agent reads Chainlink price feeds every block
             → evaluates strategy conditions (RSI thresholds, price levels)
                 │
4. EXECUTE   Conditions met → agent calls Trader Joe LB Router
             → swap executed with zero-slippage in active bin
             → decision hash logged on-chain for auditability
                 │
5. SETTLE    Profitable cycle → FeeCollector.collectFee()
             → x402 protocol: fee = profit × agent.feePercent
             → USDC transferred from vault to treasury
             → FeeCollected event indexed by dashboard
                 │
6. REPEAT    Agent continues until user pauses or hits stop-loss
             → emergencyStop() available anytime
```

### Key security properties

- **User keeps keys**: funds are in StrategyVault, only user can withdraw
- **Agent is constrained**: can only trade within user-defined limits (stop-loss, max allocation)
- **Emergency stop**: owner can pause the vault instantly, freezing all operations
- **Transparent**: every agent decision is hashed and logged on-chain
- **Aligned incentives**: agent earns 0% if user earns 0% (x402 variable pricing)

## Team

BuenDia Builders — Aleph Hackathon 2026

## License

MIT
