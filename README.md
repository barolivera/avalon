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
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin 5.x, UUPS Proxy |
| DEX | Trader Joe Liquidity Book (SDK v2) |
| Oracles | Chainlink price feeds (AVAX/USD, ETH/USD, BTC/USD) |
| Agent Identity | ERC-8004 Identity + Reputation Registries |
| Payments | x402 protocol (success fee via USDC) |
| AI Engine | GenLayer |

## Pages

- `/marketplace` — Browse agents with on-chain reputation
- `/agents/[tokenId]` — Agent profile with performance chart, trade history, hire CTA
- `/builder` — Visual strategy builder (drag & drop with React Flow)
- `/dashboard` — Portfolio with real on-chain data, strategy controls, fee history, audit log

## Getting Started

```bash
# Install frontend dependencies
cd frontend && npm install

# Copy env and configure
cp .env.example .env.local

# Run dev server
npm run dev
```

Open http://localhost:3000.

## Environment Variables

```
NEXT_PUBLIC_NETWORK=fuji                # Network: "fuji" or "mainnet"
NEXT_PUBLIC_WC_PROJECT_ID=              # WalletConnect (cloud.walletconnect.com)
```

Contract addresses are hardcoded in `frontend/lib/contracts/avalanche-config.ts`.

## Deployed Contracts (Avalanche Fuji)

### Avalon Contracts (UUPS Proxies)

| Contract | Proxy Address |
|----------|--------------|
| **StrategyVault** | `0x5C126932a5394Ca843608d38FfeB8A2AF9DBbBF3` |
| **StrategyExecutor** | `0x84a2408A7d7966A55ae6D28dc956AA52a6c28D6C` |
| **FeeCollector** | `0x04DAF41Fe41E2c25De5Dc9901024c89Fe9773053` |

**Owner/Admin:** `0xfE0C41602CAcb28217e1eAfa4C987C78Db78AAFD`

### External Contracts (Avalanche Fuji)

| Contract | Address |
|----------|---------|
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Chainlink AVAX/USD | `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD` |
| Chainlink ETH/USD | `0x86d67c3D38D2bCeE722E601025C25a575021c6EA` |
| Chainlink BTC/USD | `0x31CF013A08c6Ac228C94551d535d5BAfE19c602a` |
| Trader Joe LB Router | `0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30` |
| USDC | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| WAVAX | `0xd00ae08403B9bbb9124bB305C09058E32C39A48c` |

### Contract Wiring

```
StrategyVault
  ├─ EXECUTOR_ROLE → StrategyExecutor
  ├─ feeCollector  → FeeCollector
  └─ ERC-8004 Identity + Reputation Registries

StrategyExecutor
  ├─ vault  → StrategyVault
  ├─ router → Trader Joe LB Router
  ├─ ERC-8004 Identity Registry (agent verification)
  └─ Allowed pair: WAVAX/USDC ✓

FeeCollector
  ├─ VAULT_ROLE → StrategyVault
  ├─ feeBps = 1000 (10% of profit only)
  └─ treasury → 0xfE0C...AAFD
```

## Architecture

Avalon separates AI decision-making (off-chain) from trade execution and fund custody (on-chain). The user stays in control — agents operate within strict on-chain constraints.

```
USER
 │
 ▼
┌──────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js 16 / React 19)                       │
│                                                          │
│  Marketplace ─ Builder ─ Dashboard ─ Agent Detail        │
│       │           │          │                           │
│  Browse agents  Drag &    Track PnL + controls           │
│  + hire         drop      (activate/pause/withdraw)      │
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
│StrategyVault │    │StrategyExecutor │    │ FeeCollector  │
│              │    │                 │    │               │
│createStrategy│    │ executeSwap()   │    │ collectFee()  │
│activateStrat.│    │ via Trader Joe  │    │ x402 protocol │
│pauseStrategy │    │ Liquidity Book  │    │ Only on profit│
│emergencyWith.│    │ + Chainlink     │    │ 10% of profit │
│settleStrategy│    │   price checks  │    │ USDC transfer │
│getUserStrat. │    │ decisionHash    │    │               │
│              │    │ logged on-chain │    │ settleX402Fee │
└──────────────┘    └─────────────────┘    └───────────────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               ▼
                    ┌─────────────────┐
                    │  AVALANCHE      │
                    │  C-Chain (Fuji) │
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
| **StrategyVault** | On-chain (Avalanche) | Non-custodial fund custody, strategy lifecycle, emergency withdraw |
| **StrategyExecutor** | On-chain (Avalanche) | Trade execution via Trader Joe LB, on-chain constraints, decision logging |
| **FeeCollector** | On-chain (Avalanche) | Success fee (10% of profit only), x402 settlement, USDC |
| **Oracles** | On-chain (Chainlink) | Real-time price feeds for AVAX, ETH, BTC |
| **DEX** | On-chain (Trader Joe) | Trade execution via Liquidity Book |
| **Identity** | On-chain (ERC-8004) | Agent NFT identity + immutable reputation scores |

### Strategy lifecycle

```
1. BUILD     User drags nodes in /builder (Chainlink → RSI → Swap → TP/SL)
                 │
2. DEPLOY    "Deploy Agent" → registers agent on ERC-8004 Identity Registry
             → user deposits tokens into StrategyVault.createStrategy()
             → sets constraints: maxBudget, maxSlippage, maxTradesPerDay
                 │
3. ACTIVATE  User calls activateStrategy() → status: Active
                 │
4. MONITOR   GenLayer AI agent reads Chainlink price feeds
             → evaluates strategy conditions (RSI thresholds, price levels)
                 │
5. EXECUTE   Conditions met → StrategyExecutor.executeSwap()
             → Trader Joe LB swap with slippage protection
             → decision hash + confidence score logged on-chain
                 │
6. SETTLE    Strategy complete → settleStrategy()
             → profit calculated on-chain
             → FeeCollector.collectFee() takes 10% of profit only
             → user withdraws remaining balance
                 │
7. CONTROL   User can at any time:
             → pauseStrategy() / resumeStrategy()
             → emergencyWithdraw() (instant, any status, no delay)
```

### Key security properties

- **Non-custodial**: funds are in StrategyVault, only user can withdraw
- **Agent is constrained**: maxBudget, maxSlippage, maxTradesPerDay enforced on-chain
- **Emergency withdraw**: available in ANY status, no delay, no approval needed
- **Transparent**: every agent decision hash + confidence score logged on-chain
- **Aligned incentives**: agent earns 0% if user earns 0% (x402 success fee)
- **UUPS Upgradeable**: contracts can be upgraded by admin (multisig recommended)
- **Rate limited**: daily trade counter resets every 24h, prevents runaway agents

## Contracts Source

Smart contracts live in a separate repo: [mariaelisaaraya/avalon](https://github.com/mariaelisaaraya/avalon)

## Team

BuenDia Builders — Aleph Hackathon 2026

## License

MIT
