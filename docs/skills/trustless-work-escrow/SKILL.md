# Trustless Work — Escrow-as-a-Service en Stellar

> Referencia: [Trustless Work](https://www.trustlesswork.com) — Escrow infrastructure on Stellar/Soroban.
> Docs: https://docs.trustlesswork.com
> Contratos: https://github.com/Trustless-Work/Trustless-Work-Smart-Escrow
> React SDK: https://www.npmjs.com/package/@trustless-work/escrow

## Overview

Trustless Work provee infraestructura de escrow no-custodial sobre Stellar Soroban con USDC.
Los fondos quedan bloqueados en contratos inteligentes y se liberan por milestones aprobados.
Nadie (ni Trustless Work) puede mover los fondos unilateralmente.

## Modelo de roles

| Rol | Qué hace |
|-----|----------|
| Client | Crea y fondea el escrow |
| Service Provider | Recibe fondos al completar milestones |
| Dispute Resolver | Redirige fondos en caso de disputa |
| Approver | Aprueba milestones para liberar fondos |

## Tipos de escrow

- **Multi-release**: Fondos se liberan en múltiples pagos parciales (por milestone)
- **Single-release**: Fondos se liberan en una sola transacción

## Flujo de un escrow

1. **Inicializar** — Definir roles, milestones, montos, asset (USDC/EURC/PYUSD)
2. **Fondear** — Client deposita stablecoins en el contrato
3. **Completar milestone** — Service provider marca como completado
4. **Aprobar milestone** — Approver firma, fondos se liberan parcialmente
5. **Disputa** (si aplica) — Dispute resolver redistribuye fondos

## Pricing

- 0.3% fee solo al liberar fondos en mainnet
- Sin costo de setup, licencias ni subscripciones
- Fees de red Stellar: ~0.01 XLM (fracción de centavo)

## Smart Contract (Soroban/Rust)

Repo: `Trustless-Work/Trustless-Work-Smart-Escrow`

### Build y deploy

```bash
rustup target add wasm32-unknown-unknown
stellar contract build
stellar contract install --network testnet --source <account> --wasm <file>
stellar contract deploy --wasm-hash <hash> --source <account> --network testnet
```

## React SDK (para integradores que construyan frontends)

```bash
npm i @trustless-work/escrow
```

Envolver la app con `TrustlessWorkConfig`. API key requerida para escritura.

### Hooks disponibles

| Hook | Función |
|------|---------|
| `useInitializeEscrow` | Crear y deployar un escrow |
| `useUpdateEscrow` | Actualizar configuración del escrow |
| `useReleaseFunds` | Liberar fondos del escrow |
| `useApproveMilestone` | Aprobar un milestone específico |
| `useResolveDispute` | Resolver disputa y redistribuir fondos |
| `useGetEscrowsFromIndexerByRole` | Buscar escrows por rol |
| `useGetEscrowFromIndexerByContractIds` | Buscar escrows por contract ID |

### API REST

- Base URL mainnet: `api.trustlesswork.com`
- Swagger docs: `api.trustlesswork.com/docs`

## Integración a nivel de contrato (protocolo)

Los contratos del protocolo interactúan con Trustless Work via cross-contract calls:

1. **Contrato LendingPool** recibe fondos de prestamistas
2. **Al matchear un préstamo**, el contrato invoca Trustless Work para crear escrow (multi-release)
3. **Mapping de roles**: protocolo = Client, prestatario = Service Provider, governance/DAO = Dispute Resolver
4. **Milestones** se definen programáticamente según las condiciones del préstamo
5. **Al aprobar milestone**, Trustless Work libera el tramo al prestatario
6. **Si default**, el Dispute Resolver (governance del protocolo) redistribuye fondos al pool

El SDK del protocolo abstrae esta interacción — el integrador no necesita
llamar a Trustless Work directamente, solo usa las funciones del protocolo.

## Assets soportados

USDC, EURC, PYUSD, y otros assets emitidos en Stellar. Arquitectura asset-agnostic.

## Herramientas adicionales

- **Backoffice dApp**: https://dapp.trustlesswork.com/dashboard
- **Demo**: https://demo.trustlesswork.com/
- **Viewer**: https://viewer.trustlesswork.com/
- **Escrow Blocks SDK**: Componentes UI pre-armados para escrow flows
