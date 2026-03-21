---
name: bnb-ai-agents
description: "Construir AI agents autónomos sobre BNB Chain. Usar cuando se necesite trabajar con ERC-8004 (identidad de agentes), BAP-578 (Non-Fungible Agents), integrar agentes con DeFi en BSC, o diseñar arquitecturas DeFAI."
metadata:
  author: BuenDia-Builders
---

# AI Agents en BNB Chain

## Dos estándares clave

### ERC-8004 — El pasaporte del agente
Identidad verificable on-chain. El agente se registra como un NFT (ERC-721) con una URI que apunta a un JSON con sus servicios.

- IdentityRegistry BSC: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- IdentityRegistry testnet: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry BSC: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- Verificar en: 8004scan.io (mainnet) / testnet.8004scan.io

Funciones clave: `register(agentURI)` → devuelve agentId, `setAgentWallet()`, `giveFeedback()`, `getSummary()`

### BAP-578 (NFA) — El cuerpo del agente
Extiende ERC-721. El agente es un NFT que puede holdear assets, ejecutar lógica y aprender.

- Status: Active / Paused / Terminated
- Tiene `logicAddress` pluggable (el cerebro del agente)
- `executeAction()` usa delegatecall con gas cap de 3M
- `fundAgent()` para cargarle BNB para gas
- Learning module opcional: Merkle root on-chain, datos off-chain. Max 50 updates/día.
- Templates: DeFiAgent, GameAgent, DAOAgent, CreatorAgent, StrategicAgent
- Ref impl: github.com/ChatAndBuild/non-fungible-agents-BAP-578

### Cómo se combinan
ERC-8004 = identidad + descubrimiento + reputación
BAP-578 = capacidades + wallet + ejecución + aprendizaje

## AgentKit (Python + LangChain)

SDK de NodeReal. Python 3.12+, usa LangChain + LangGraph.
Repo: github.com/node-real/bnb-chain-agentkit

Acciones disponibles: get_balance, transfer, swap (PancakeSwap V3), stake (Lista DAO), bridge (BSC↔opBNB), deploy (ERC20/721/1155), faucet (async), token_price_query, + 7 analytics tools.

Limitaciones: mainnet only, single wallet, swap solo single-hop PancakeSwap V3, staking solo Lista DAO.

## Patrón DeFAI

```
Intent del usuario → LLM decide → Agente planifica → Contratos ejecutan → Feedback loop
```

El gap en BSC: faltan estrategias cuantitativas especializadas (Grid, TWAP, DCA con AI). Los players actuales (Singularry, BINK AI) son copilots generalistas.

## Seguridad para agentes autónomos

- Nunca raw private keys — usar smart wallets (ERC-4337), TEEs, HSMs
- Spending caps por tx y por período
- Timelock en cambios de logicAddress (BAP-578)
- Circuit breakers para pause de emergencia
- Monitorear balance de BNB del agente (sin gas = agente muerto)

## Funding disponible

BNB AI Hack (rolling): $10K + $50K Kickstart
Grants: hasta $200K
MVB Accelerator: hasta $500K
YZi Labs Builder Fund: $1B total
