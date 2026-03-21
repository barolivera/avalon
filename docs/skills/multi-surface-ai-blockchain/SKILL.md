# Arquitectura de Protocolo/SDK para Integradores

> **Basado en [Mochi](https://github.com/shimeji-ai/Mochi) por el equipo de [shimeji-ai](https://github.com/shimeji-ai).**
> **Crédito especial y agradecimiento al equipo de Mochi** por su arquitectura innovadora
> de separación AI off-chain / blockchain on-chain y diseño pluggable.
> Su trabajo es referencia fundamental para este proyecto.

## Overview

El protocolo de crowdlending es infraestructura, no una app. Es un conjunto de
contratos Soroban + SDK que terceros (wallets, fintechs, DAOs) integran en sus productos.

Este skill define la arquitectura del protocolo como SDK y los patrones
para que integradores lo consuman correctamente.

## Principio de separación (inspirado en Mochi)

| Capa | Responsable | Qué maneja |
|------|------------|------------|
| Contratos Soroban | El protocolo (nosotros) | Lending pools, reputación, repago, matching |
| Integraciones DeFi | El protocolo (nosotros) | Conexión con Trustless Work, DeFindex, Blend |
| SDK / API | El protocolo (nosotros) | Interfaces limpias para que terceros integren |
| Wallet / UX | El integrador | Cómo presenta el lending al usuario final |
| On/off ramps | El integrador | SEP-24, MoneyGram, anchors locales |
| KYC / compliance | El integrador | Regulación local de cada mercado |
| AI / chatbot | El protocolo (docs) | Solo para documentación interactiva, no para el producto |

**Regla clave**: El protocolo no maneja wallets, no maneja KYC, no maneja UI.
Expone contratos + SDK. El integrador decide la experiencia.

## Arquitectura del protocolo como SDK

```
INTEGRADOR (wallet, fintech, DAO)
    ↓
SDK del Protocolo (TypeScript + Rust)
    ├── createLendingPool()
    ├── deposit()
    ├── requestLoan()
    ├── repay()
    ├── getReputationScore()
    └── ...
    ↓
CONTRATOS SOROBAN (on-chain)
    ├── LendingPool contract
    ├── Reputation contract
    ├── Matching contract
    └── Repayment contract
    ↓
BUILDING BLOCKS (composición)
    ├── Trustless Work → escrow con milestones
    ├── DeFindex → yield routing a Blend
    └── ZK X-Ray → scoring privado (Fase 2)
    ↓
STELLAR / SOROBAN / USDC
```

## Qué expone el protocolo a integradores

### Contratos (Rust/Soroban)
- Interfaces públicas bien documentadas
- Eventos on-chain para indexers
- Contract IDs publicados por red (testnet/mainnet)

### SDK TypeScript
- Wrapper sobre las llamadas a contratos
- Transaction building helpers
- Type safety completo
- Documentación inline

### SDK Rust (para otros contratos que quieran componer)
- WASM exports vía crate publicado
- Tipos compartidos para interoperabilidad

### Documentación
- Gitbook con guías de integración
- API reference generada desde código
- Ejemplos de integración por caso de uso
- IA interactiva para preguntas (landing + gitbook)

## Patrones de diseño para el SDK

### Factory pattern
```
PoolFactory → deploya LendingPools con configuración custom
```

### Event-driven
Todos los contratos emiten eventos que integradores pueden indexar:
- `pool_created`, `deposit`, `loan_requested`, `milestone_approved`, `repayment`
- Permite que cada integrador construya su propia vista de datos

### Pluggable (inspirado en Mochi)
- El integrador elige qué asset usar (USDC, EURC, etc.)
- El integrador elige qué anchor/ramp usar
- El integrador elige su propia lógica de KYC
- El protocolo es agnóstico a estas decisiones

## Ejemplo de integración

```
Una fintech en Perú quiere ofrecer micro-préstamos:

1. Integra el SDK del protocolo en su app móvil
2. Usa MoneyGram Ramps para on/off ramp (SEP-24)
3. Usa su propio KYC (regulación peruana)
4. Llama a createLendingPool() con parámetros de su mercado
5. Sus usuarios depositan/piden via la app
6. El protocolo maneja la lógica de lending, escrow, reputación
7. La fintech cobra un fee por encima del protocolo
```
