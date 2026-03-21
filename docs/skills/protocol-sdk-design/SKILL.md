# Protocol SDK Design — Interfaces y Patrones para Integradores

## Overview

Patrones para diseñar el protocolo de crowdlending como infraestructura que
terceros integran. Define cómo exponer contratos, SDK, eventos, y documentación.

## Capas del protocolo

```
Capa 1: Contratos Soroban (on-chain)
    → LendingPool, Reputation, Matching, Repayment
    → Cross-contract calls a Trustless Work, DeFindex

Capa 2: SDK Rust (para composición on-chain)
    → Crate publicado con tipos + WASM exports
    → Otros contratos pueden componer con el protocolo

Capa 3: SDK TypeScript (para integradores off-chain)
    → Wrapper sobre llamadas a contratos
    → Transaction building, type safety
    → npm package publicado

Capa 4: Documentación + AI
    → Gitbook con guías de integración
    → Landing con chatbot de docs
    → API reference generada desde código
```

## Contract Interface Design

### Principios

1. **Funciones públicas mínimas** — solo lo que el integrador necesita
2. **Tipos bien nombrados** — `LoanRequest`, `PoolConfig`, `ReputationScore`
3. **Errores descriptivos** — `#[contracterror]` enum con mensajes claros
4. **Eventos para todo** — cada acción emite un evento indexable

### Interfaz pública del LendingPool (ejemplo)

```rust
#[contractimpl]
impl LendingPool {
    // === Pool Management ===
    fn initialize(e: Env, config: PoolConfig) -> PoolId;
    fn get_config(e: Env, pool_id: PoolId) -> PoolConfig;
    fn get_metrics(e: Env, pool_id: PoolId) -> PoolMetrics;

    // === Lender Operations ===
    fn deposit(e: Env, pool_id: PoolId, lender: Address, amount: i128);
    fn withdraw(e: Env, pool_id: PoolId, lender: Address, amount: i128);
    fn get_lender_position(e: Env, pool_id: PoolId, lender: Address) -> LenderPosition;

    // === Borrower Operations ===
    fn request_loan(e: Env, pool_id: PoolId, borrower: Address, request: LoanRequest);
    fn repay(e: Env, pool_id: PoolId, borrower: Address, amount: i128);
    fn get_loan_status(e: Env, pool_id: PoolId, borrower: Address) -> LoanStatus;

    // === Reputation (read-only, free) ===
    fn get_reputation(e: Env, borrower: Address) -> ReputationScore;

    // === Pool Metrics (read-only, free) ===
    fn get_idle_yield_apy(e: Env, pool_id: PoolId) -> i128;
    fn get_total_lent(e: Env, pool_id: PoolId) -> i128;
    fn get_default_rate(e: Env, pool_id: PoolId) -> i128;
}
```

### Eventos on-chain

```rust
// Todos los eventos que integradores pueden indexar
env.events().publish(("pool_created",), pool_id);
env.events().publish(("deposit",), (pool_id, lender, amount));
env.events().publish(("loan_requested",), (pool_id, borrower, amount));
env.events().publish(("milestone_approved",), (pool_id, borrower, milestone_id));
env.events().publish(("repayment",), (pool_id, borrower, amount));
env.events().publish(("default",), (pool_id, borrower));
env.events().publish(("yield_accrued",), (pool_id, amount));
```

## SDK TypeScript Design

### Estructura del package

```
@lendara/sdk
├── src/
│   ├── pool.ts          # LendingPool interactions
│   ├── reputation.ts    # Reputation queries
│   ├── types.ts         # Shared types (PoolConfig, LoanRequest, etc.)
│   ├── events.ts        # Event parsing helpers
│   └── index.ts         # Public API
├── package.json
└── tsconfig.json
```

### API del SDK

```typescript
import { LendaraSDK } from '@lendara/sdk';

const sdk = new LendaraSDK({
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  contractIds: {
    lendingPool: 'C...',
    reputation: 'C...',
  }
});

// Pool operations
const pool = await sdk.getPool(poolId);
const metrics = await sdk.getPoolMetrics(poolId);

// Lender operations
const depositTx = await sdk.deposit(poolId, amount);
const position = await sdk.getLenderPosition(poolId, lenderAddress);

// Borrower operations
const loanTx = await sdk.requestLoan(poolId, loanRequest);
const repayTx = await sdk.repay(poolId, amount);
const reputation = await sdk.getReputation(borrowerAddress);

// Events
const events = await sdk.getPoolEvents(poolId, { fromLedger: 12345 });
```

## SDK Rust Design (para composición on-chain)

```toml
# Otro contrato que quiere componer con el protocolo
[dependencies]
lendara-sdk = { version = "0.1" }
```

```rust
use lendara_sdk::LendingPoolClient;

let pool_client = LendingPoolClient::new(&env, &pool_address);
let metrics = pool_client.get_metrics(&pool_id);
```

## Documentación para integradores

### Gitbook structure

```
docs/
├── getting-started/
│   ├── what-is-lendara.md
│   ├── quickstart.md
│   └── architecture.md
├── integration-guides/
│   ├── wallet-integration.md
│   ├── fintech-integration.md
│   └── dao-integration.md
├── sdk-reference/
│   ├── typescript.md
│   └── rust.md
├── contracts/
│   ├── lending-pool.md
│   ├── reputation.md
│   └── events.md
└── faq.md
```

### Cada guía de integración incluye

1. Prerequisitos (qué necesita el integrador)
2. Instalación del SDK
3. Configuración (contract IDs, network)
4. Ejemplo completo paso a paso
5. Manejo de errores
6. Eventos para monitorear

## Contract IDs publicados

Mantener un registry público de contract IDs por red:

```json
{
  "testnet": {
    "lendingPool": "CABC...",
    "reputation": "CDEF...",
    "poolFactory": "CGHI..."
  },
  "mainnet": {
    "lendingPool": "CXYZ...",
    "reputation": "CUVW...",
    "poolFactory": "CRST..."
  }
}
```

Publicar en el repo, en el SDK, y en la documentación.
