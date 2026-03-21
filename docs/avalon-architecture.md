# Avalon — Arquitectura para el Equipo

> Actualización 21 de marzo 2026
> v0.1.0 · Avalanche Fuji Testnet

---

## 1. Modelo de Negocio

```
┌─────────────────────────────────────────────────────────────┐
│                     AVALON — INGRESOS                       │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │  1. Success Fee     │    │  2. Premium Tier           │  │
│  │                     │    │                            │  │
│  │  % del profit       │    │  Estrategias avanzadas     │  │
│  │  generado por       │    │  (TWAP, multi-asset)       │  │
│  │  estrategias        │    │  Ejecución prioritaria     │  │
│  │                     │    │  Backtesting extendido     │  │
│  │  Solo cobra si      │    │                            │  │
│  │  el usuario gana    │    │  Paga: usuario mensual     │  │
│  │  (10% del profit)   │    │                            │  │
│  └─────────────────────┘    └────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  3. Template Marketplace (futuro)                       ││
│  │                                                         ││
│  │  Creadores publican estrategias → otros las usan        ││
│  │  Revenue share entre creador y plataforma               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Usuario recibe:                                            │
│  - Builder visual de estrategias                            │
│  - Agente IA autónomo que ejecuta y optimiza                │
│  - Transparencia total: cada decisión logueada on-chain     │
│  - Portfolio awareness (riesgo, rebalanceo)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Qué construimos nosotros vs. qué ya existe

```
┌─────────────────────────────────────────────────────────────┐
│                  LO QUE CONSTRUIMOS NOSOTROS                │
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  Dashboard Web    │  │  API Backend      │               │
│  │  Next.js 16       │  │  Fastify / Next   │               │
│  │  React 19         │  │  Routes           │               │
│  │  Tailwind v4      │  │                   │               │
│  │  shadcn/ui        │  │  Lógica de:       │               │
│  │                   │  │  - Estrategias    │               │
│  │  Vistas:          │  │  - Market data    │               │
│  │  - Landing        │  │  - Agent status   │               │
│  │  - Dashboard      │  │  - Portfolio      │               │
│  │  - Strategy       │  │  - Ejecución      │               │
│  │    Builder        │  │  - Decision logs  │               │
│  │  - Strategy       │  │                   │               │
│  │    Detail         │  │                   │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  Smart Contracts  │  │  AI Agent         │               │
│  │  Solidity 0.8.20  │  │  Backend          │               │
│  │  Hardhat          │  │                   │               │
│  │                   │  │  Node.js          │               │
│  │  StrategyVault    │  │  ethers.js v6     │               │
│  │  StrategyExecutor │  │                   │               │
│  │  FeeCollector     │  │  Decision         │               │
│  │  ERC-8004 integr. │  │  pipeline:        │               │
│  │                   │  │  percepción →     │               │
│  │  OpenZeppelin     │  │  análisis →       │               │
│  │  ReentrancyGuard  │  │  decisión →       │               │
│  │  Ownable          │  │  ejecución →      │               │
│  └───────────────────┘  │  log on-chain     │               │
│                         └───────────────────┘               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LO QUE YA EXISTE                          │
│            (infraestructura que usamos, no creamos)          │
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  Avalanche        │  │  Trader Joe / LFJ │               │
│  │  C-Chain          │  │                   │               │
│  │                   │  │  DEX principal     │               │
│  │  Blockchain EVM   │  │  Liquidity Book   │               │
│  │  ~2s finality     │  │  Zero-slippage    │               │
│  │  Gas bajo         │  │  Fees dinámicos   │               │
│  │  chainId 43113    │  │  SDK v2           │               │
│  │  (Fuji testnet)   │  │                   │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  ERC-8004         │  │  Chainlink        │               │
│  │  Registries       │  │                   │               │
│  │                   │  │  Price feeds       │               │
│  │  Identity (NFT)   │  │  AVAX/USD         │               │
│  │  Reputation       │  │  ETH/USD          │               │
│  │  Validation       │  │  BTC/USD          │               │
│  │                   │  │                   │               │
│  │  Singleton en     │  │  AggregatorV3     │               │
│  │  Fuji y Mainnet   │  │  Interface        │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  x402 Protocol    │  │  Wallets          │               │
│  │                   │  │                   │               │
│  │  HTTP 402 pagos   │  │  MetaMask         │               │
│  │  USDC on-chain    │  │  Core Wallet      │               │
│  │  Thirdweb SDK v5  │  │  WalletConnect    │               │
│  │  Variable pricing │  │                   │               │
│  └───────────────────┘  └───────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Usuarios del sistema

```
┌─────────────────────┐
│  RETAIL USER        │  Usuario principal
│                     │
│  Qué hace:          │
│  - Conecta wallet
│  - Arma estrategias visualmente (drag-and-drop)
│  - Elige tipo: Grid, DCA, TWAP, TP/SL
│  - Deposita fondos en vault non-custodial
│  - Asigna agente IA a la estrategia
│  - Monitorea performance en dashboard
│  - Pausa, ajusta o retira fondos
│  - Ve cada decisión del IA con razonamiento
│                     │
│  Vista: /dashboard, /strategy-builder, /strategy/:id
└─────────────────────┘

┌─────────────────────┐
│  AI AGENT           │  Entidad autónoma on-chain
│  (Strategy)         │
│                     │
│  Qué hace:          │
│  - Tiene identidad ERC-8004 (NFT)
│  - Monitorea mercado (Chainlink + Trader Joe)
│  - Optimiza parámetros en real-time
│  - Ejecuta swaps en Trader Joe Liquidity Book
│  - Loguea cada decisión con hash on-chain
│  - Opera dentro de constraints del vault
│  - Acumula reputación verificable
│                     │
│  Backend: agent-backend/
└─────────────────────┘

┌─────────────────────┐
│  PORTFOLIO AGENT    │  Agente global (futuro)
│                     │
│  Qué hace:          │
│  - Monitorea todas las estrategias del usuario
│  - Sugiere rebalanceo cross-estrategia
│  - Alerta sobre riesgo y over-exposure
│  - Recomienda allocation óptima
│                     │
│  Vista: /dashboard (panel de portfolio)
└─────────────────────┘

┌─────────────────────┐
│  STRATEGY CREATOR   │  Creador de templates (futuro)
│                     │
│  Qué hace:          │
│  - Crea estrategias y las publica como template
│  - Gana revenue share cuando otros las usan
│  - Construye reputación como creador
│                     │
│  Vista: /marketplace (futuro)
└─────────────────────┘
```

---

## 4. Flujo de usuario: Retail User

```
    ┌──────────────┐
    │  Conectar    │
    │  Wallet      │  MetaMask / Core / WalletConnect
    │              │  Red: Avalanche Fuji
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  Dashboard   │  Portfolio overview
    │  /dashboard  │  Estrategias activas, P&L agregado
    │              │  Balance total, allocation
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  Strategy Builder (drag-and-drop)        │
    │  /strategy-builder                       │
    │                                          │
    │  1. Seleccionar par (AVAX/USDC, etc.)    │
    │  2. Elegir tipo de estrategia:           │
    │     - Grid Trading                       │
    │     - DCA (Dollar Cost Averaging)        │
    │     - TWAP (Time-Weighted Avg Price)     │
    │     - Take-Profit / Stop-Loss            │
    │  3. Configurar parámetros                │
    │     (rango, frecuencia, montos)          │
    │  4. IA sugiere optimizaciones            │
    │  5. Preview con simulación histórica     │
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  Depositar   │  Usuario firma tx con wallet
    │  fondos      │  Fondos van a StrategyVault.sol
    │              │  100% non-custodial
    └──────┬───────┘  Emergency withdraw siempre disponible
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  Agente IA ejecuta autónomamente         │
    │                                          │
    │  - Monitorea mercado 24/7                │
    │  - Optimiza parámetros en real-time      │
    │  - Ejecuta swaps en Trader Joe           │
    │  - Opera dentro de constraints on-chain: │
    │    max budget, max slippage, pares        │
    │    permitidos, max trades por período     │
    │  - Loguea CADA decisión con hash on-chain│
    └──────┬───────────────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────┐
    │  Monitorear y controlar                  │
    │  /strategy/:id                           │
    │                                          │
    │  - Timeline de trades ejecutados         │
    │  - Decision log (razonamiento del IA)    │
    │  - Confidence score por decisión         │
    │  - Contexto de mercado en cada trade     │
    │  - Controles: PAUSAR / AJUSTAR / RETIRAR│
    │  - Emergency withdraw (siempre activo)   │
    └──────────────────────────────────────────┘
```

---

## 5. Flujo del AI Agent (Decision Pipeline)

```
    ┌──────────────┐
    │  PERCEPCIÓN  │  Chainlink price feeds
    │              │  Trader Joe pool data (bins, liquidez)
    │              │  Volumen, spreads, volatilidad
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  ANÁLISIS    │  Indicadores técnicos:
    │              │  RSI, MACD, Bollinger Bands
    │              │  Análisis de bins del Liquidity Book
    │              │  Detección de tendencia
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  DECISIÓN    │  LLM / Optimizador decide acción:
    │              │  COMPRAR / VENDER / HOLD / AJUSTAR
    │              │  Genera confidence score (0-100)
    │              │  Documenta razonamiento
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  PLAN        │  Determina:
    │              │  - Tamaño del trade
    │              │  - Timing óptimo
    │              │  - Bin targeting (Liquidity Book)
    │              │  - Slippage esperado
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  VERIFICAR   │  Chequea constraints on-chain:
    │              │  ✓ Max budget no excedido
    │              │  ✓ Max slippage dentro de rango
    │              │  ✓ Par permitido
    │              │  ✓ Max trades/período no excedido
    │              │  ✗ Si falla → HOLD + log razón
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  EJECUTAR    │  StrategyExecutor.sol →
    │              │  Swap en Trader Joe Liquidity Book
    │              │  TX hash registrado
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  LOG         │  Almacena on-chain:
    │  ON-CHAIN    │  - Razonamiento completo
    │              │  - Confidence score
    │              │  - Contexto de mercado
    │              │  - Hash del decision log
    │              │  - Via ERC-8004 Reputation Registry
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  FEEDBACK    │  Resultado del trade →
    │              │  Actualiza modelo/parámetros
    │              │  Loop continuo de mejora
    └──────────────┘
```

---

## 6. Arquitectura técnica general

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
│                                                                     │
│  Next.js 16 + React 19 + Tailwind v4 + shadcn/ui                   │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Landing  │ │Dashboard │ │Strategy  │ │Strategy  │ │ Portfolio │ │
│  │ /        │ │/dashboard│ │Builder   │ │Detail    │ │ Overview  │ │
│  │          │ │          │ │/strategy │ │/strategy │ │           │ │
│  │          │ │ P&L, bal │ │/builder  │ │/:id      │ │ Riesgo,   │ │
│  │          │ │ activas  │ │          │ │          │ │ allocation│ │
│  │          │ │          │ │ Drag&Drop│ │ Trades   │ │           │ │
│  │          │ │          │ │ Params   │ │ Logs IA  │ │           │ │
│  │          │ │          │ │ Preview  │ │ Controls │ │           │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Wallet: MetaMask / Core / WalletConnect (Avalanche Fuji)  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API BACKEND                                    │
│                                                                     │
│  /api/strategies          CRUD estrategias                          │
│  /api/strategies/:id      Detalle + controles (pause/adjust)        │
│  /api/market-data         Precios, pools, indicadores               │
│  /api/agent/status        Estado del agente, decisiones recientes   │
│  /api/agent/decisions     Decision log con razonamiento             │
│  /api/portfolio           Resumen cross-estrategia                  │
│  /api/deposit             Iniciar depósito al vault                 │
│  /api/withdraw            Iniciar retiro del vault                  │
│                                                                     │
└──────────┬───────────────────────────────────┬──────────────────────┘
           │                                   │
           ▼                                   ▼
┌─────────────────────────┐     ┌─────────────────────────────────────┐
│   AI AGENT BACKEND      │     │     AVALANCHE / SOROBAN             │
│                         │     │                                     │
│  Node.js + ethers.js v6 │     │  StrategyVault.sol                  │
│                         │     │    deposit / withdraw / emergency   │
│  Decision Pipeline:     │     │    non-custodial, constraints       │
│  - Percepción           │     │    Ownable + ReentrancyGuard        │
│  - Análisis             │     │                                     │
│  - Decisión             │     │  StrategyExecutor.sol               │
│  - Ejecución            │     │    executeSwap() en Trader Joe      │
│  - Logging              │     │    max budget, max slippage         │
│                         │     │    allowed pairs, rate limit         │
│  Polls cada 10s         │     │                                     │
│  + event listeners      │     │  FeeCollector.sol                   │
│                         │     │    success fee (% profit only)      │
│  Handlers pluggables:   │     │                                     │
│  OpenAI / Anthropic     │     │  ERC-8004 Integration               │
│  Optuna (optimización)  │     │    Identity Registry (singleton)    │
│  pandas-ta (indicadores)│     │    Reputation Registry (singleton)  │
│                         │     │    Validation Registry (per-agent)  │
│                         │     │                                     │
│                         │     │  Solidity 0.8.20 · Hardhat          │
│                         │     │  OpenZeppelin · Fuji testnet        │
└─────────────────────────┘     └─────────────────────────────────────┘
           │                                   │
           │         ┌─────────────────┐       │
           └────────►│  TRADER JOE     │◄──────┘
                     │  Liquidity Book │
                     │                 │
                     │  Swaps en bins  │
                     │  Zero-slippage  │
                     │  SDK v2         │
                     └─────────────────┘
                              │
                     ┌────────┴────────┐
                     │  CHAINLINK      │
                     │  Price Feeds    │
                     │                 │
                     │  AVAX/USD       │
                     │  ETH/USD        │
                     │  BTC/USD        │
                     └─────────────────┘
```

---

## 7. Ciclo de vida de una estrategia

```
  CREACIÓN        DEPÓSITO         ACTIVA           EJECUTANDO       COMPLETADA
     │               │               │                │                │
     ▼               ▼               ▼                ▼                ▼

  Usuario        Fondos van       Agente IA        Swaps en          Profit
  configura  →   al Vault     →   monitorea    →   Trader Joe   →    calculado
  estrategia     on-chain         mercado 24/7     con hash          Fee cobrado
  en builder     non-custodial                     on-chain

  Estado:        Estado:          Estado:          Estado:           Estado:
  draft          funded           active           executing         completed

  ──────────────────────────────────────────────────────────────────────────
                                    │
                                    ▼
                              ┌───────────┐
                              │  PAUSADA   │  Usuario pausa manualmente
                              │            │  o circuit breaker automático
                              │  Estado:   │
                              │  paused    │  → puede resumir o retirar
                              └───────────┘

  ──────────────────────────────────────────────────────────────────────────
  EMERGENCY WITHDRAW: disponible en CUALQUIER estado. Usuario retira
  100% de los fondos inmediatamente. Sin delay, sin aprobación.
  ──────────────────────────────────────────────────────────────────────────
```

---

## 8. Integración ERC-8004

```
┌─────────────────────────────────────────────────────────────┐
│              ERC-8004 — TRUST LAYER DEL AGENTE              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  IDENTITY REGISTRY (singleton Fuji)                 │    │
│  │  0x8004A818BFB912233c491871b3d84c89A494BD9e         │    │
│  │                                                     │    │
│  │  Agente se registra → recibe NFT (ERC-721)          │    │
│  │  URI apunta a metadata: capacidades, estrategias    │    │
│  │  soportadas, historial, endpoints                   │    │
│  │  Agent wallet vinculada con firma EIP-712           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  REPUTATION REGISTRY (singleton Fuji)               │    │
│  │                                                     │    │
│  │  Después de cada ciclo de estrategia:               │    │
│  │  - Usuario califica al agente (rating + tags)       │    │
│  │  - Tags: "grid-trading", "dca", "avax-usdc"         │    │
│  │  - Rating basado en performance real                │    │
│  │  - Inmutable, revocable, filtrable                  │    │
│  │  - getSummary() para ver track record               │    │
│  │                                                     │    │
│  │  → Usuarios eligen agentes por reputación on-chain  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  VALIDATION REGISTRY (per-agent)                    │    │
│  │                                                     │    │
│  │  Validadores terceros verifican:                    │    │
│  │  - Track record real del agente                     │    │
│  │  - Score 0-100 por categoría                        │    │
│  │  - Attestation independiente de calidad             │    │
│  │                                                     │    │
│  │  → Capa extra de confianza beyond user reviews      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Integración x402

```
┌─────────────────────────────────────────────────────────────┐
│              x402 — SUCCESS FEE AUTOMÁTICO                  │
│                                                             │
│  Esquema "upto" (variable pricing):                        │
│                                                             │
│  1. Usuario autoriza fee máximo al crear estrategia         │
│     (ej: hasta 10% del profit)                              │
│                                                             │
│  2. Al completar ciclo, agente calcula profit real          │
│                                                             │
│  3. Cobra SOLO el % real del profit generado                │
│     (si no hay ganancia → no cobra nada)                    │
│                                                             │
│  4. Settlement on-chain via USDC                            │
│     Facilitator ERC-4337 ejecuta transfer                   │
│                                                             │
│  USDC Fuji: 0x5425890298aed601595a70AB815c96711a31Bc65      │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Usuario │    │ Agente  │    │ x402    │    │ USDC    │  │
│  │ autoriza│ →  │ calcula │ →  │ settle  │ →  │ transfer│  │
│  │ max fee │    │ profit  │    │ payment │    │ on-chain│  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                             │
│  Nota Avalanche: normalizar v de ECDSA (chainId 43113      │
│  genera v values grandes con EIP-155)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Stack completo

| Capa | Tecnología |
|------|-----------|
| Blockchain | Avalanche Fuji (testnet) → Mainnet |
| Smart contracts | Solidity 0.8.20, Hardhat, OpenZeppelin |
| DEX | Trader Joe SDK v2 (Liquidity Book) |
| Oráculos | Chainlink price feeds |
| Agent identity | ERC-8004 (registries oficiales Avalanche) |
| Pagos/Fees | x402 protocol + Thirdweb SDK v5 |
| Frontend | Next.js 16, React 19, Tailwind v4, shadcn/ui |
| Wallet | MetaMask, Core Wallet, WalletConnect |
| Backend | Node.js / Fastify, ethers.js v6 |
| AI/ML | OpenAI / Anthropic API, Optuna, pandas-ta |
| Deploy | Vercel (main branch) |

---

## 11. Estructura del repo (propuesta)

```
avalon/
├── apps/
│   ├── web/                          Next.js 16 (@avalon/web)
│   │   ├── app/
│   │   │   ├── page.tsx              Landing
│   │   │   ├── dashboard/            Dashboard + portfolio
│   │   │   ├── strategy/
│   │   │   │   ├── builder/          Strategy builder (drag-and-drop)
│   │   │   │   └── [id]/            Strategy detail + controls
│   │   │   └── api/                  API Routes
│   │   ├── components/               UI components
│   │   ├── hooks/                    Contract + data hooks
│   │   └── lib/                      Config, types, utils
│   │
│   └── contracts/                    Solidity (Hardhat)
│       ├── StrategyVault.sol         Non-custodial vault
│       ├── StrategyExecutor.sol      Trade execution + constraints
│       └── FeeCollector.sol          Success fee logic
│
├── packages/
│   └── agent/                        AI Agent Backend
│       ├── index.js                  Main loop (poll + events)
│       ├── pipeline/                 Decision pipeline steps
│       ├── handlers/                 AI handlers (OpenAI, etc.)
│       └── config/                   Agent config + ERC-8004
│
├── docs/                             Documentación
│
└── scripts/
    ├── deploy.js                     Deploy contratos a Fuji
    └── simulate.js                   Simulador de mercado (testnet)
```
