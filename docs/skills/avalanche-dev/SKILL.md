---
name: avalanche-dev
description: "Desarrollo de dApps, AI agents y DeFAI sobre Avalanche C-Chain. Usar cuando se necesite trabajar con ERC-8004 (identidad de agentes IA), x402 (pagos HTTP nativos), eERC (tokens encriptados), Trader Joe/LFJ (DEX Liquidity Book), o deployar contratos en Avalanche Fuji/Mainnet."
metadata:
  author: BuenDia-Builders
---

# Desarrollo en Avalanche

## Redes

Avalanche C-Chain Mainnet: chainId 43114, RPC `https://api.avax.network/ext/bc/C/rpc`, explorer snowtrace.io
Avalanche Fuji Testnet: chainId 43113, RPC `https://api.avax-test.network/ext/bc/C/rpc`, explorer testnet.snowtrace.io
Faucet: https://build.avax.network/console/primary-network/faucet

## Filosofía

Avalanche C-Chain es 100% EVM compatible. Mismo Solidity, mismo Hardhat, mismo ethers.js. Solo cambiás RPC y chainId. Finalidad sub-segundo (~2s), gas bajo. Subnets/L1s para casos especializados.

## Workflow de desarrollo

1. Hardhat con `@nomicfoundation/hardhat-toolbox`, config apuntando a Fuji (chainId 43113)
2. Secrets con `npx hardhat vars set AVAX_PRIVATE_KEY` (nunca en .env committeado)
3. Deploy con `npx hardhat ignition deploy --network fuji`
4. Verify con `npx hardhat verify --network fuji`
5. Tokens ERC-20 estándar con OpenZeppelin, sin diferencias

## hardhat.config.js ejemplo

```js
module.exports = {
  solidity: "0.8.20",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [vars.get("AVAX_PRIVATE_KEY")]
    },
    mainnet: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [vars.get("AVAX_PRIVATE_KEY")]
    }
  }
};
```

---

# ERC-8004 — Identidad On-Chain para AI Agents

> Ref: https://github.com/ava-labs/8004-boilerplate

## Qué es

Estándar de trust layer para agentes IA con 3 registries on-chain:

### Identity Registry (ERC-721)
Cada agente recibe un NFT como pasaporte on-chain. Contiene URI a metadata (capacidades, endpoints A2A/MCP) y key-value metadata on-chain. Soporta binding de agent wallet con firma EIP-712.

- Identity Registry Fuji: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Identity Registry Mainnet: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Reputation Registry Fuji: compartido (singleton)
- Reputation Registry Mainnet: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

Funciones clave: `register(agentURI)` → devuelve agentId (NFT), `setAgentWallet()`, `updateURI()`

### Reputation Registry
Feedback inmutable por agente por cliente. Cada feedback tiene:
- Valor int128 (con decimales configurables)
- 2 tags de categorización
- Revocable pero no borrable
- Threads de respuesta
- `getSummary()` agrega con filtro por tags, normaliza a 18 decimales
- Previene self-feedback chequeando agent wallet

### Validation Registry
Terceros verifican capacidades del agente:
- Agente solicita validación a un validator específico
- Validator responde con score 0-100, hash de respuesta, tag
- Se deploya por agente (no singleton)

## Arquitectura del boilerplate

```
Frontend (HTML/ethers.js) → TaskAgent.sol (on-chain) → Agent Backend (Node.js)
                                    ↕
                          ERC-8004 Registries
                    (Identity + Reputation + Validation)
```

## TaskAgent.sol — Contrato principal

Task types: TextSummarization, CodeReview, DataAnalysis, Translation, Custom
Task lifecycle: Pending → InProgress → Completed (o Disputed/Cancelled)

Funciones:
- `registerAgent()` — minta NFT de identidad
- `requestTask()` — payable, usuario crea tarea con pago en AVAX
- `startTask()` / `completeTask()` — solo el agente, postea hash del resultado
- `disputeTask()` — ventana de 7 días
- `cancelTask()` — reembolso
- `giveFeedback()` — rating + comentario → Reputation Registry
- `requestValidation()` → Validation Registry
- `withdraw()` — owner cobra pagos

Usa OpenZeppelin Ownable + ReentrancyGuard.

## Agent Backend (Node.js)

- ethers.js v6, polls `getAllTaskIds()` cada 10s + escucha evento `TaskRequested`
- Para cada tarea pendiente: `startTask` on-chain → procesa con handler IA → `completeTask` con output hash
- Handlers pluggables: OpenAI, Anthropic, LLM local
- Config en `config/agent.config.js`

## Deploy

En redes públicas (Fuji/Mainnet) usa registries oficiales singleton (Identity + Reputation). Solo deploya Validation Registry + TaskAgent por agente.

```bash
npx hardhat run scripts/deploy.js --network fuji
```

---

# x402 — Pagos HTTP Nativos

> Ref: https://github.com/ava-labs/x402-starter-kit

## Qué es

Protocolo que implementa HTTP 402 Payment Required para pagos automáticos en USDC on-chain.

## Flujo

1. Cliente hace request a endpoint paywall
2. Server responde **HTTP 402** con requisitos de pago (monto, token, address, network)
3. Cliente firma autorización de pago con wallet
4. Cliente reintenta con header `X-PAYMENT` (payload base64)
5. Server llama `settlePayment()` via facilitator ERC-4337 → transfer USDC on-chain
6. Si settlement OK → server responde 200 con contenido

## Dos esquemas de pricing

- **Fixed**: Monto exacto (ej: $0.01 por consulta)
- **Upto (variable)**: Usuario autoriza máximo, server cobra solo lo usado (perfecto para IA donde costo depende de tokens consumidos)

## Pagos autónomos (Machine-to-Machine)

Un agent wallet con private key firma automáticamente sin popup humano → agentes IA que pagan por servicios de forma autónoma.

## Stack técnico

- Next.js 16 + TypeScript
- Thirdweb SDK v5 (`thirdweb/x402`)
- USDC en Fuji: `0x5425890298aed601595a70AB815c96711a31Bc65`
- Facilitator: DEBE ser ERC-4337 Smart Account (NO ERC-7702)

## Consideración Avalanche

Avalanche Fuji (chainId 43113) genera firmas EIP-155 con v values grandes. Hay que normalizar el v de ECDSA a formato legacy (27/28) con `normalizeSignatureV()`. Sin esto, la verificación de pago falla.

## Código clave server-side

```typescript
import { settlePayment, facilitator } from "thirdweb/x402";

// En el route handler:
const settlement = await settlePayment(paymentHeader, {
  facilitator: facilitator({
    secretKey: process.env.THIRDWEB_SECRET_KEY,
    walletAddress: process.env.THIRDWEB_SERVER_WALLET_ADDRESS
  }),
  chain: avalancheFuji
});
```

## Código clave client-side

```typescript
import { wrapFetchWithPayment } from "thirdweb/x402";

// Wrappea fetch para manejar 402 automáticamente:
const payFetch = wrapFetchWithPayment(wallet);
const response = await payFetch("https://api.example.com/premium-endpoint");
```

---

# eERC — Encrypted ERC (Tokens Privados)

> Ref: https://build.avax.network/academy/blockchain/encrypted-erc
> Repo: https://github.com/ava-labs/EncryptedERC

## Qué es

Versión encriptada de ERC-20 desarrollada por AvaCloud. Transacciones confidenciales en EVM manteniendo compatibilidad.

## Tecnologías core

1. **Zero-Knowledge Proofs (ZKP)**: Verifican transacciones sin revelar montos ni partes involucradas
2. **Homomorphic Encryption**: Operaciones matemáticas sobre datos encriptados sin descifrarlos. Balances siempre encriptados on-chain.

## Características

- **Balances ocultos**: Encriptados on-chain (vs ERC-20 donde cualquiera consulta balance)
- **Transfers confidenciales**: Montos privados con validez criptográficamente probada
- **Auditable**: Trail de auditoría accesible para partes autorizadas (compliance)

## Modos de deployment

1. **Standalone**: Contrato eERC independiente (token nuevo desde cero, ej: CBDC)
2. **Converter**: Wrappea ERC-20 existentes para agregar privacidad

## Casos de uso

- **DeFi**: Previene front-running y MEV ocultando detalles de tx antes de ejecución
- **Instituciones reguladas**: Transacciones sensibles con compliance
- **Enterprise**: Privacidad + auditabilidad simultánea (payroll, supply chain)

## Comparación

| Feature | ERC-20 | eERC |
|---------|--------|------|
| Balances | Públicos | Encriptados |
| Montos de transfer | Públicos | Confidenciales |
| Auditabilidad compliance | N/A (todo público) | Mantenida para autorizados |
| Privacidad | Ninguna | Total |

---

# Trader Joe / LFJ — DEX Principal de Avalanche

## Qué es

DEX dominante en Avalanche, rebrandeado a LFJ. Token nativo: JOE (governance, staking, fee sharing).

## Liquidity Book (innovación core)

A diferencia de Uniswap (curva continua x*y=k), Liquidity Book discretiza liquidez en **bins de precio**:
- Cada bin = pool constant-sum (x+y=k)
- **Zero-slippage swaps** cuando el trade cabe en el bin activo
- LPs concentran liquidez en rangos específicos (alta eficiencia de capital)
- LP tokens son **ERC-1155** (fungibles, shapes flexibles: Spot, Curve, Bid-Ask, Wide)
- **Fees dinámicos**: base + variable por volatilidad (protege LPs automáticamente)

## Contratos y SDK

- Smart contracts: github.com/traderjoe-xyz/joe-v2 (Solidity, Foundry)
- SDK: `npm i @traderjoe-xyz/sdk-v2` (v3.0.30)
- Docs: docs.traderjoexyz.com / docs.lfj.gg
- Whitepaper: github.com/traderjoe-xyz/LB-Whitepaper

## Comparación con otros DEXes

| Aspecto | Trader Joe/LFJ | Uniswap | PancakeSwap |
|---------|---------------|---------|-------------|
| Chain principal | Avalanche | Ethereum + L2s | BNB Chain |
| AMM model | Liquidity Book (bins) | Concentrated liquidity (ticks) | Mixed (v2/v3/v4) |
| Zero-slippage | Sí (dentro del bin) | No | No |
| Fee model | Dinámico (base + volatilidad) | Tiers fijos | Tiers fijos |
| LP token | ERC-1155 | ERC-721 (v3) | Mixed |

---

# Oráculos en Avalanche

## Chainlink

Price feeds disponibles en Avalanche C-Chain. Usar `AggregatorV3Interface` estándar.
- Feed registry: docs.chain.link/data-feeds/price-feeds/addresses?network=avalanche
- AVAX/USD, ETH/USD, BTC/USD, etc.

## Pyth Network

Oracle alternativo con feeds de alta frecuencia. Integrado en Trader Joe.

---

# Seguridad para Agentes Autónomos en Avalanche

- Nunca raw private keys — usar smart wallets (ERC-4337), TEEs
- Spending caps por tx y por período (constraints on-chain en el vault)
- Circuit breakers para pause de emergencia
- Emergency withdraw siempre disponible para el usuario
- Cada decisión del agente logueada con hash on-chain (transparencia total)
- Monitorear balance de AVAX del agente (sin gas = agente muerto)

---

# Hackathon: Aleph Hackathon Marzo 2026

- **Fechas**: 20-22 marzo 2026, Buenos Aires (Aleph Hub, Vedia 3892)
- **Premio Avalanche**: $5,000 USD (compatible con Grand Prize ~$10K)
- **Organiza**: Crecimiento
- **Plataforma**: DoraHacks

## Criterios de evaluación

1. **Technicality** — Complejidad técnica demostrada
2. **Originality** — Innovación y unicidad
3. **UI/UX/DX** — Accesibilidad y usabilidad
4. **Practicality** — Factibilidad real

## Requisitos de entrega

- Repo en GitHub con código
- Demo video del proyecto funcionando
- Documentación clara
- Debe usar tecnologías de Avalanche
- Proyecto completo y funcional

## Bonus

- Top proyectos pueden entrar al **Codebase Incubator Program** de Avalanche
- Acceso a grants pipeline

---

# Proyecto Avalon — Arquitectura Propuesta

## Concepto

Plataforma DeFAI retail-first en Avalanche. Builder visual drag-and-drop para estrategias pro (Grid, DCA, TWAP, TP/SL) ejecutadas por agentes IA autónomos on-chain via Trader Joe Liquidity Book.

## Cómo encajan las tecnologías de Avalanche

- **ERC-8004**: Agente de trading con identidad verificable + reputación basada en performance real on-chain
- **x402**: Success fee automático — el agente cobra solo si genera ganancia (variable pricing)
- **Trader Joe Liquidity Book**: Ejecución de trades on-chain con zero-slippage en bins
- **Chainlink**: Price feeds para decisiones del agente
- **eERC** (futuro): Privacidad en balances y estrategias del usuario

## Diferenciador

Cierra el gap de bots Telegram opacos: visual + autónomo + auditable + portfolio-aware. Usuario = piloto, IA = copiloto. Cada decisión logueada con hash on-chain. 0% black-box.

## Stack técnico

- **Contratos**: Solidity 0.8.20, Hardhat, OpenZeppelin, Avalanche Fuji
- **DEX**: Trader Joe SDK v2 (@traderjoe-xyz/sdk-v2)
- **Oráculos**: Chainlink price feeds
- **Identidad agente**: ERC-8004 boilerplate (ava-labs/8004-boilerplate)
- **Pagos**: x402 protocol con Thirdweb SDK v5
- **Backend**: Node.js/Fastify + ethers.js v6
- **Frontend**: Next.js + TypeScript + Tailwind
- **IA**: Python (pandas-ta, Optuna) o TypeScript con OpenAI/Anthropic

---

# Repositorios Oficiales de ava-labs — Referencia

## Infraestructura Core

- **avalanchego** — Implementación Go del nodo Avalanche (2.3k ⭐)
  > https://github.com/ava-labs/avalanchego

- **coreth** — C-Chain EVM: extrae funcionalidades Ethereum para servicios custom
  > https://github.com/ava-labs/coreth

- **subnet-evm** — Lanzar tu propio EVM como Avalanche L1/Subnet
  > https://github.com/ava-labs/subnet-evm

- **hypersdk** — Framework para construir HyperVMs hiper-escalables sobre Avalanche
  > https://github.com/ava-labs/hypersdk

## SDKs y Herramientas de Desarrollo

- **avalanchejs** — SDK JavaScript/TypeScript para interactuar con Avalanche (354 ⭐). Útil para integración frontend.
  > https://github.com/ava-labs/avalanchejs

- **avalanche-cli** — CLI oficial para crear y gestionar Subnets/L1s
  > https://github.com/ava-labs/avalanche-cli

- **avalanche-starter-kit** — Templates de contratos Solidity para empezar rápido
  > https://github.com/ava-labs/avalanche-starter-kit

- **avalanche-network-runner** — Herramienta para correr red Avalanche local (testing)
  > https://github.com/ava-labs/avalanche-network-runner

## Cross-Chain y Messaging

- **icm-contracts** — Smart contracts sobre Avalanche Interchain Messaging (ICM) para desarrollo cross-chain entre L1s
  > https://github.com/ava-labs/icm-contracts

- **icm-services** — Servicios para relay de mensajes ICM entre L1s
  > https://github.com/ava-labs/icm-services

## Recursos y Documentación

- **builders-hub** — Hub oficial para builders de Avalanche (docs, herramientas, guías)
  > https://github.com/ava-labs/builders-hub

- **avalanche-faucet** — Faucet para Fuji testnet y Subnets
  > https://github.com/ava-labs/avalanche-faucet
