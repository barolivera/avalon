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

## Team

BuenDia Builders — Aleph Hackathon 2026

## License

MIT
