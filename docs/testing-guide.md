# Avalon — Guía de Testing del Circuito Completo

> Para testers, jurado, o cualquier persona que quiera probar Avalon desde cero.

## Requisitos previos

1. **Navegador** con MetaMask o Core Wallet instalado
2. **Red Avalanche Fuji** configurada en la wallet
3. **AVAX de testnet** (gratis, se pide del faucet)

---

## Paso 1: Configurar la wallet

### Si usás MetaMask:

1. Abrí MetaMask
2. Click en el selector de redes (arriba)
3. "Add network" → "Add network manually"
4. Completá:
   - **Network Name**: Avalanche Fuji
   - **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
   - **Chain ID**: `43113`
   - **Symbol**: `AVAX`
   - **Explorer**: `https://testnet.snowtrace.io`
5. Guardar

### Si usás Core Wallet:

Fuji ya viene configurada. Solo seleccioná "Testnet" en la configuración.

---

## Paso 2: Pedir AVAX de testnet

1. Andá a https://build.avax.network/console/primary-network/faucet
2. Necesitás crear cuenta en Builder Hub (gratis, 1 minuto)
3. Conectá tu wallet
4. Pedí AVAX → te dan 2 AVAX gratis
5. Verificá que te llegaron en la wallet

---

## Paso 3: Abrir Avalon

1. Andá a https://heyavalon.vercel.app (o `http://localhost:3000` si corrés local)
2. Te lleva automáticamente a `/marketplace`

---

## Paso 4: Conectar wallet

1. En la barra de navegación, click en **"Connect"** (arriba a la derecha)
2. Elegí MetaMask o Core Wallet
3. Aprobá la conexión en la wallet
4. Verificá que dice "Avalanche Fuji" y tu dirección aparece

---

## Paso 5: Explorar el Marketplace

Acá ves los agentes de trading registrados en ERC-8004:

1. Cada agente tiene un **Token ID** (su identidad on-chain)
2. Ves su **reputación** basada en feedback real
3. Podés filtrar por trending, risk, yield
4. Click en un agente → vas a su perfil con historial y performance

**Qué verificar:**
- [ ] Los agentes cargan (pueden venir de on-chain o mock si no hay agentes registrados)
- [ ] El precio de AVAX/USD aparece en la navbar (viene de Chainlink en vivo)

---

## Paso 6: Crear una estrategia en el Builder

1. Andá a `/builder` (click "Builder" en la navbar)
2. A la izquierda tenés los **nodos disponibles** organizados por categoría:
   - **Data**: Chainlink Feed, Pool Scanner
   - **Conditions**: Price Threshold, RSI, MACD
   - **Actions**: Swap, Limit Order
   - **Risk**: Stop Loss, Take Profit, Position Size
   - **Fee**: x402 Success Fee
3. **Arrastrá nodos** al canvas (drag & drop)
4. **Conectá nodos** arrastrando desde los puntos de conexión
5. **Configurá parámetros** clickeando en cada nodo (par, threshold, etc.)

**Qué verificar:**
- [ ] Podés arrastrar nodos al canvas
- [ ] Podés conectarlos entre sí
- [ ] Podés editar los parámetros de cada nodo
- [ ] El resumen de la estrategia se actualiza (nodos, pares, riesgo)

---

## Paso 7: Deployar la estrategia on-chain

1. Con al menos un nodo en el canvas, click **"Deploy Agent"** (botón violeta arriba a la derecha)
2. Se abre un modal con la configuración de deposit:

| Campo | Qué es | Valor sugerido para test |
|-------|--------|--------------------------|
| Token | El token que depositás | USDC o WAVAX |
| Deposit Amount | Cuánto depositás | 100 |
| Agent ID (ERC-8004) | ID del agente on-chain | 77 |
| Max Budget per Trade | Máximo por trade | 50 |
| Max Slippage (bps) | Slippage máximo (50 = 0.5%) | 50 |
| Max Trades per Day | Límite diario de trades | 10 |

3. Click **"Deploy to Fuji"**
4. MetaMask te pide **2 firmas**:
   - Primera: **Approve** (autorizás al vault a usar tus tokens)
   - Segunda: **Create Strategy** (crea la estrategia en el contrato)
5. Esperá confirmación → aparece el **tx hash** con link a Snowtrace
6. Click **"Go to Dashboard"**

**Qué verificar:**
- [ ] El modal muestra los campos de configuración
- [ ] MetaMask pide 2 firmas (approve + create)
- [ ] Aparece el tx hash al completar
- [ ] El link a Snowtrace funciona

> **Nota:** Si usás USDC, necesitás tener USDC en Fuji. El USDC oficial de Fuji no tiene faucet público. Para testing con el equipo, usamos un MockUSDC en `0x84FE06e23962fc873e4043F836b317137FDE50C6` que permite mintear tokens libremente.

---

## Paso 8: Ver la estrategia en el Dashboard

1. Andá a `/dashboard`
2. En el tab **"My Agents"** deberías ver tu estrategia:
   - Strategy ID
   - Agent ID
   - Token depositado
   - Balance actual
   - PnL (ganancia/pérdida)
   - Status: **Funded** (recién creada)

**Qué verificar:**
- [ ] La estrategia aparece con los datos correctos
- [ ] El balance coincide con lo que depositaste
- [ ] El status es "Funded"
- [ ] Los stats de arriba se actualizan (Total Deposited, Active Strategies)

---

## Paso 9: Controlar la estrategia

Desde el dashboard podés controlar tu estrategia con los botones:

### Activar
1. En la estrategia con status "Funded", click **"Activate"**
2. MetaMask te pide firma
3. El status cambia a **"Active"**

### Pausar
1. En una estrategia "Active", click **"Pause"**
2. MetaMask te pide firma
3. El status cambia a **"Paused"**

### Resumir
1. En una estrategia "Paused", click **"Resume"**
2. MetaMask te pide firma
3. Vuelve a **"Active"**

### Emergency Withdraw
1. Disponible en **cualquier status** (Funded, Active, Paused)
2. Click **"Withdraw"**
3. MetaMask te pide firma
4. Tus tokens vuelven a tu wallet inmediatamente
5. Status cambia a **"Cancelled"**

**Qué verificar:**
- [ ] Activate: Funded → Active
- [ ] Pause: Active → Paused
- [ ] Resume: Paused → Active
- [ ] Emergency Withdraw: cualquier status → Cancelled + tokens devueltos
- [ ] Cada acción pide firma en MetaMask
- [ ] El dashboard se actualiza automáticamente después de cada acción

---

## Paso 10: Verificar on-chain en Snowtrace

Cada transacción se puede verificar en el explorador:

1. Andá a https://testnet.snowtrace.io
2. Buscá tu dirección de wallet
3. Deberías ver todas las transacciones:
   - Approve
   - createStrategy
   - activateStrategy
   - pauseStrategy / resumeStrategy
   - emergencyWithdraw

También podés verificar los contratos directamente:

| Contrato | Link |
|----------|------|
| StrategyVault | https://testnet.snowtrace.io/address/0x5C126932a5394Ca843608d38FfeB8A2AF9DBbBF3 |
| StrategyExecutor | https://testnet.snowtrace.io/address/0x84a2408A7d7966A55ae6D28dc956AA52a6c28D6C |
| FeeCollector | https://testnet.snowtrace.io/address/0x04DAF41Fe41E2c25De5Dc9901024c89Fe9773053 |

---

## Resumen del circuito completo

```
Marketplace (explorar agentes)
    │
    ▼
Builder (armar estrategia visual)
    │
    ▼
Deploy Agent (deposit tokens + constraints)
    │  ← 2 firmas: approve + createStrategy
    ▼
Dashboard (ver estrategia creada)
    │
    ├── Activate (Funded → Active)
    ├── Pause (Active → Paused)
    ├── Resume (Paused → Active)
    └── Emergency Withdraw (→ Cancelled, tokens devueltos)
```

---

## Qué NO está implementado todavía

| Feature | Por qué |
|---------|---------|
| Ejecución automática de trades | Requiere el AI agent backend (GenLayer) que aún no está corriendo |
| Fee History con datos reales | Requiere que haya trades con profit para que el FeeCollector cobre |
| Audit Log con datos reales | Requiere un indexador de eventos on-chain |
| Settle Strategy | Lo llama el executor (agente), no el usuario |

Estos features dependen del backend AI. El circuito usuario (depositar, controlar, retirar) funciona completo.

---

## Troubleshooting

### "Connect Wallet" no funciona
- Verificá que MetaMask/Core está en la red **Avalanche Fuji** (chainId 43113)

### La transacción falla
- Verificá que tenés suficiente AVAX para gas (~0.01 AVAX por tx)
- Si usás USDC/WAVAX, verificá que tenés balance del token

### No veo mi estrategia en el dashboard
- Asegurate de estar conectado con la misma wallet que usaste para crear
- Esperá unos segundos — el dashboard refresca cada 30 segundos

### El precio de AVAX no aparece en la navbar
- Es normal si Chainlink no responde en Fuji testnet. No afecta el funcionamiento.

---

*Última actualización: 21 de marzo 2026*
*Contratos deployados en Avalanche Fuji testnet*
