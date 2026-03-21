# DeFindex — Vaults & Strategy Management en Stellar

> Referencia: [DeFindex](https://www.defindex.io) por [PaltaLabs](https://github.com/paltalabs)
> Contratos: https://github.com/paltalabs/defindex
> SDK: https://github.com/paltalabs/defindex-sdk
> Docs: https://docs.defindex.io

## Overview

DeFindex es un protocolo de vaults tokenizados en Stellar/Soroban.
Permite crear vaults que distribuyen inversiones entre múltiples protocolos DeFi
(como Blend) a través de estrategias configurables.

En el protocolo de crowdlending, DeFindex es la capa de abstracción interna
para rutear fondos idle a Blend. Es un building block del protocolo,
no algo que el integrador vea o toque.

## Conceptos clave

| Concepto | Descripción |
|----------|-------------|
| Vault | Contrato que recibe depósitos y los distribuye entre estrategias |
| dfToken | Token de recibo que representa la participación en el vault |
| Strategy | Contrato adaptador que conecta el vault con un protocolo DeFi |
| Factory | Contrato que deploya nuevos vaults con configuración personalizada |

## Arquitectura

```
Vault recibe assets
    ↓
Distribuye entre estrategias según pesos configurados
    ↓
Strategy Adapter (ej: Blend) deposita en el protocolo subyacente
    ↓
Yield se acumula → dfToken vale más
    ↓
Withdraw → quema dfTokens → recibe assets + yield
```

## SDK TypeScript (referencia)

```bash
npm install @paltalabs/defindex-sdk
```

### Operaciones principales

- **Deposit**: Depositar assets, recibir dfTokens
- **Withdraw**: Quemar dfTokens, recibir assets proporcionales
- **Rebalance**: Redistribuir entre estrategias
- **Harvest**: Reclamar rewards de estrategias subyacentes

## Strategy Adapters

Cada protocolo DeFi tiene un adaptador con interfaz común:

| Método | Qué hace |
|--------|----------|
| `deposit` | Depositar assets en el protocolo subyacente |
| `withdraw` | Retirar assets del protocolo |
| `balance` | Consultar balance actual |
| `harvest` | Reclamar rewards/yield |

### Blend Strategy Adapter

Ubicado en: `apps/contracts/strategies/blend/src/lib.rs`

## Factory Pattern

DeFindexFactory deploya vaults con roles, mapeo de assets a estrategias,
estructura de fees, y parámetros iniciales.

## Integración a nivel de protocolo

DeFindex es interno al protocolo. El integrador no lo ve:

```
Contrato LendingPool del protocolo
    ↓
Lógica interna detecta fondos idle
    ↓
Cross-contract call a DeFindex Vault (deposit)
    ↓
DeFindex usa Blend Strategy Adapter
    ↓
Yield se acumula automáticamente
    ↓
Cuando se matchea un préstamo:
    ↓
Cross-contract call a DeFindex Vault (withdraw)
    ↓
Fondos van al escrow de Trustless Work
```

### Para el integrador

El SDK del protocolo expone:
- `getIdleYieldAPY()` — retorna el APY actual de fondos idle
- `getPoolMetrics()` — incluye yield acumulado del pool
- Eventos `yield_accrued` para indexers

El integrador no necesita saber que DeFindex existe.
