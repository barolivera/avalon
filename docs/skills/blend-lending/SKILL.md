# Blend Protocol — Lending/Borrowing en Stellar

> Referencia: [Blend Capital](https://docs.blend.capital)
> Contratos: https://github.com/blend-capital/blend-contracts-v2
> SDK Rust: https://github.com/blend-capital/blend-contract-sdk
> SDK JS: https://www.npmjs.com/package/@blend-capital/blend-sdk

## Overview

Blend es un protocolo de lending/borrowing overcollateralized en Stellar/Soroban.
Permite la creación permissionless de lending pools.

El protocolo de crowdlending usa Blend (via DeFindex) para generar yield
con fondos idle. El protocolo interactúa con Blend a nivel de contrato,
no a nivel de usuario.

## Conceptos clave

| Concepto | Descripción |
|----------|-------------|
| Reserve | Un asset dentro de un pool (ej: USDC, XLM) |
| bToken | Token de recibo por supply (crece con el índice de interés) |
| dToken | Token de deuda por borrow |
| Backstop | Módulo de seguro con BLND/USDC LP tokens |
| Utilization | % del pool que está prestado — determina la tasa de interés |

## Tasas de interés

Curva de 3 tramos basada en utilización:
- Bajo utilización óptima: base rate + slope1
- Sobre utilización óptima: sube con slope2 (más empinado)
- Parámetros configurables por pool creator

## SDK JavaScript (referencia para integradores)

```javascript
import { PoolMetadata, PoolV2, ReserveV2, Positions } from '@blend-capital/blend-sdk';

const poolMetadata = await PoolMetadata.load(network, poolId);
const pool = await PoolV2.load(network, poolId);
const reserve = pool.reserves.get(assetId);
const user = await pool.loadUser(userId);
```

## Operaciones principales (Rust contract level)

```rust
fn get_config(e: Env) -> PoolConfig;
fn get_reserve_list(e: Env) -> Vec<Address>;
fn get_positions(e: Env, address: Address) -> Positions;
fn get_reserve_emissions(e: Env, reserve_token_id: u32) -> Option<ReserveEmissionData>;
```

## Supply via SDK JS

```javascript
import { PoolContract, RequestType } from '@blend-capital/blend-sdk';

const pool_contract = new PoolContract(poolId);
const supply_op = pool_contract.submit({
    from: user,
    spender: user,
    to: user,
    requests: [{
        amount: to_lend,
        request_type: RequestType.SupplyCollateral,
        address: asset,
    }],
});
```

## Emissions (rewards)

- dTokens (deuda): `reserve_index * 2`
- bTokens (supply): `reserve_index * 2 + 1`

## Integración a nivel de protocolo

El protocolo NO expone Blend al integrador. Blend es un detalle interno:

```
Contrato LendingPool del protocolo
    ↓ (cross-contract call)
Contrato DeFindex Vault (strategy adapter)
    ↓ (cross-contract call)
Blend Pool (supply/withdraw)
```

El SDK del protocolo expone funciones como `getIdleYieldAPY()` o `getPoolMetrics()`
que internamente consultan Blend via DeFindex, pero el integrador nunca
interactúa con Blend directamente.

## Fee Vault

Se puede usar un contrato intermedio (fee vault) entre el protocolo y Blend
para revenue sharing — el protocolo cobra un fee por rutear fondos.
