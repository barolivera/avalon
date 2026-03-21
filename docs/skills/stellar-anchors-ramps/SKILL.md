# Stellar Anchors & On/Off Ramps — Guía para Integradores

> Docs: https://developers.stellar.org/docs/learn/fundamentals/anchors
> MoneyGram Ramps: https://developer.moneygram.com
> Anchor Platform: https://developers.stellar.org/docs/platforms/anchor-platform

## Overview

Los anchors son el puente entre fiat y Stellar. **El protocolo de crowdlending
no maneja on/off ramps.** Esta documentación es para los integradores que
necesitan conectar sus apps con fiat.

El protocolo opera en USDC on-chain. Cómo el usuario final llega a tener
USDC es responsabilidad del integrador.

## SEPs (Stellar Ecosystem Proposals) clave

| SEP | Nombre | Para qué |
|-----|--------|----------|
| SEP-6 | Programmatic Deposit/Withdrawal | Wallets interactúan directamente con anchors |
| SEP-10 | Authentication | Autenticación entre wallet y anchor |
| SEP-12 | KYC API | Envío de datos de identidad |
| SEP-24 | Hosted Deposit/Withdrawal | Anchor hostea webview para KYC. El más usado |
| SEP-31 | Cross-Border Payments | Anchor-to-anchor para pagos internacionales |
| SEP-38 | RFQ API | Cotizaciones en tiempo real |

## SEP-24: El más relevante

Flujo:
1. App del integrador inicia deposit/withdrawal
2. Se abre webview del anchor (KYC, datos bancarios)
3. Anchor procesa y emite/redime tokens en Stellar
4. Usuario recibe USDC en su wallet o fiat en su cuenta bancaria

Permite que cualquier app integre on/off ramp sin manejar KYC propio.

## MoneyGram Ramps

La opción más accesible para LATAM:
- Cash deposits en 30+ países
- Cash withdrawals en 170+ países
- Setup en minutos
- Usa SEP-10 (auth) + SEP-24 (deposit/withdrawal)
- USDC como asset intermedio

### Integración técnica

1. Registrar dominio en MoneyGram (allowlist)
2. Implementar SEP-10 para autenticación
3. Usar SEP-24 para deposit/withdrawal
4. Abrir webview de MoneyGram para KYC
5. Polling de estado hasta `pending_user_transfer_start`
6. Enviar/recibir USDC con memo proporcionado

Ref MVP: https://github.com/stellar/moneygram-access-wallet-mvp

## Anchors en LATAM

- **Settle Network** — Argentina, México, Brasil
- **Anclap** — Argentina (ARS)
- **Nuvei** — Pagos LATAM
- Directorio: https://stellar.org/use-cases/ramps

## Regional Starter Pack (recomendado para integradores)

> Por [@ElliotFriend](https://github.com/ElliotFriend/regional-starter-pack)

Starter pack con librerías TypeScript portables para conectar anchors regionales
en Stellar. Trae integraciones pre-armadas y soporte completo de SEPs.

- **Anchors incluidos**: Etherfuse, AlfredPay, BlindPay (México/LATAM)
- **Librerías portables**: `/src/lib/anchors/` y `/src/lib/wallet/` se copian a cualquier proyecto TS
- **Workflows completos**: KYC, cotizaciones, on-ramp, off-ramp, polling de estado
- **SEPs soportados**: SEP-1, SEP-6, SEP-10, SEP-12, SEP-24, SEP-31, SEP-38
- **Stack**: SvelteKit + TypeScript + Stellar SDK + Freighter

Ideal para integradores que necesitan conectar fiat en LATAM sin construir
la infraestructura de ramps desde cero.

## Anchor Platform (SDF)

Framework oficial para deployar un anchor. Útil si un integrador
decide operar su propio anchor.

## Relación con el protocolo

| Responsabilidad | Quién |
|----------------|-------|
| Contratos de lending, escrow, reputación | Protocolo |
| SDK para interactuar con los contratos | Protocolo |
| On/off ramp fiat ↔ USDC | Integrador |
| KYC / compliance regulatorio | Integrador |
| Wallet / UX del usuario final | Integrador |

El protocolo documenta cómo integradores pueden conectar ramps,
pero no implementa ni gestiona la conexión fiat.
