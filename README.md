# Avalon: AI Trading Agents You Can Actually Trust

Avalon is a DeFAI platform on Avalanche where retail users build trading strategies visually, assign them to AI agents with verified on-chain identity, and only pay when they profit. The user stays in full control — the AI operates within strict, unbreakable limits.

**Live demo:** https://heyavalon.vercel.app

## The Problem

Today's AI trading bots are black boxes. Users deposit funds, can't see what the bot does, and lose money when it fails — which it usually does. Bots with hardcoded strategies die in weeks. Most charge fees whether you win or lose. And when something goes wrong, there's no emergency brake.

> *"Gambled $3k on 3 AI trading bots, 2 robbed me."* — Reddit, r/CryptoCurrency

> *"You woke up… market dropped 50%. It didn't stop. It didn't adapt."* — @Lycellia_J

Real losses: Clawdbot ($1M), Lobstar Wilde ($450K), decimal errors sending 40K SOL to the wrong place. All because there were no on-chain guardrails.

## How Avalon Solves It

**Transparent, not black-box.** Every agent decision is logged on-chain with reasoning hash and confidence score. Anyone can audit on Snowtrace.

**Hard limits that can't be broken.** The user sets max budget per trade, max slippage, max trades per day. These are enforced by the smart contract — the agent literally cannot exceed them.

**Emergency withdraw, always.** Any status, any time, no delay. User pulls 100% of funds instantly.

**Pay only if you profit.** 10% success fee via x402 protocol. If the agent doesn't make money, it costs zero. This aligns incentives — we only earn when users earn.

**Verified agent identity.** Each agent is registered on-chain via ERC-8004 with public reputation. Users choose agents by track record, not marketing.

## Who Pays and Why

Retail crypto traders — the 95% who want professional strategies without being professionals. They already pay 20-30% performance fees on platforms like KvantsAI and AsterDEX. Avalon charges 10% and is fully transparent.

The model is validated: people pay for performance. The gap is trust. That's what we close.

## Business Model

**Success Fee (day 1):** 10% of profit, automatic via x402 + USDC. No profit = no fee.

**Premium Tier (month 3-6):** Advanced strategies (TWAP, multi-asset), priority execution, extended backtesting.

**Strategy Marketplace (month 6-12):** Creators publish strategies, others use them. Revenue share: 70% creator / 30% Avalon.

Costs are minimal — contracts are non-custodial (we never touch user funds), agents are autonomous, gas on Avalanche is cents per trade.

## Live Infrastructure

**Smart Contracts** — 3 UUPS upgradeable contracts deployed on Avalanche Fuji:

| Contract | Address |
|----------|---------|
| StrategyVault | `0x5C126932a5394Ca843608d38FfeB8A2AF9DBbBF3` |
| StrategyExecutor | `0x84a2408A7d7966A55ae6D28dc956AA52a6c28D6C` |
| FeeCollector | `0x04DAF41Fe41E2c25De5Dc9901024c89Fe9773053` |

**Frontend** — Next.js 16 app with 4 pages:
- `/marketplace` — Browse agents with on-chain reputation (ERC-8004)
- `/builder` — Visual drag-and-drop strategy builder that deploys on-chain
- `/dashboard` — Real-time portfolio from vault, strategy controls (activate/pause/withdraw)
- `/agents/[id]` — Agent profile with performance history

**Integrations:**
- Trader Joe Liquidity Book for trade execution
- Chainlink price feeds (AVAX/USD, ETH/USD, BTC/USD)
- ERC-8004 Identity + Reputation Registries
- x402 protocol for automatic fee settlement

**Circuit tested on-chain:** Create → Fund → Activate → Pause → Resume → Emergency Withdraw — all verified on Fuji.

## Why Avalanche

ERC-8004 gives agents verified identity with public reputation — no other chain has this as a standard. x402 enables automatic success fee settlement in USDC. Sub-cent gas makes frequent trading viable. 2-second finality lets agents react to markets in real time. Trader Joe Liquidity Book provides zero-slippage execution in active bins.

Avalon gives Avalanche a real use case for its newest technologies.

## Getting Started

```bash
cd frontend && npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Connect MetaMask on Avalanche Fuji.

## Team

BuenDia Builders — Aleph Hackathon 2026

## License

MIT
