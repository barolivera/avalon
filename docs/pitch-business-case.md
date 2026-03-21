# Avalon — Por qué este negocio funciona

> Pitch para jurado, mentores e inversores.
> Aleph Hackathon Crecimiento — Marzo 2026

---

## El problema real: la gente pierde plata con bots de trading

Hoy millones de personas quieren hacer trading de crypto pero no saben cómo. Entonces usan bots o "agentes de IA" que prometen tradear por ellos. ¿El resultado? La enorme mayoría pierde plata.

No es exageración. Esto pasa todos los días:

### La gente no confía (y tiene razón)

> *"Aposté $3,000 en 3 bots de IA. 2 me robaron."* — Reddit, r/CryptoCurrency

> *"La mayoría de bots de trading en Telegram... cuando baja el volumen, el equipo desaparece con tu plata."* — @SCHIZO_FREQ

El usuario deposita sus fondos en una caja negra. No ve qué hace el bot. No sabe por qué compró o vendió. No puede hacer nada cuando sale mal. Y cuando el bot falla o el equipo desaparece, pierde todo.

### Los bots mueren rápido

> *"Te despertaste y el mercado cayó 50%. El bot no paró. No se adaptó. Ese es todo el problema."* — @Lycellia_J

Los bots actuales tienen estrategias fijas que funcionan 2 semanas y después mueren. El mercado cambia, el bot no. El usuario se entera cuando ya perdió.

### Errores que cuestan fortunas

- Un agente de IA perdió **$1 millón** en días (Clawdbot, viral en GitHub con 60k stars)
- Un bot envió **40,000 SOL por error** de un decimal
- Otro perdió **$450,000** porque no tenía freno de emergencia

¿Por qué? Porque no tienen límites. No hay nada que le diga al bot "pará, hasta acá". No hay botón de emergencia.

### Te cobran ganes o pierdas

La mayoría de bots cobra comisión fija o por volumen. ¿El resultado? Al bot le conviene tradear mucho, no tradear bien. Cobra lo mismo si ganás o perdés.

> *"El overtrading es el asesino silencioso... las comisiones te desangran de a poco."* — Reddit, r/algotrading

---

## Avalon: cómo lo resolvemos

### Concepto simple

Avalon es una plataforma donde armás tu estrategia de trading visualmente (como armar un flujo en Canva), se la asignás a un agente de IA, y el agente tradea por vos 24/7. Vos mantenés el control total.

**Vos sos el piloto. La IA es tu copiloto.**

### ¿Por qué no nos pasa lo que les pasa a los demás?

**1. No somos caja negra — todo es transparente**

Cada decisión que toma el agente queda grabada públicamente en la blockchain. Cualquier persona puede verificar qué hizo, por qué lo hizo, y con cuánta confianza. No hay "confiá en nosotros" — es "verificalo vos mismo".

**2. El agente tiene límites que no puede romper**

El usuario define las reglas: cuánto puede gastar por trade, cuánto slippage acepta, cuántos trades por día. Esas reglas se graban en el contrato inteligente y se verifican automáticamente. Si el agente intenta pasarse → la operación se cancela sola. No hay forma de saltarse los límites.

**3. Botón de emergencia siempre disponible**

En cualquier momento, sin importar qué esté haciendo el agente, el usuario puede retirar el 100% de sus fondos al instante. Sin demoras, sin aprobaciones, sin intermediarios.

**4. Solo cobramos si ganás**

Nuestro fee es 10% del profit. Si el agente no genera ganancia, no cobramos nada. Literalmente cero. Esto alinea nuestros intereses con los del usuario: nosotros ganamos solamente si el usuario gana.

**5. Reputación pública y verificable**

Cada agente tiene una identidad registrada en blockchain (ERC-8004) con historial de performance público. No elegís un agente por marketing — lo elegís por su track record verificable.

---

## ¿Quién es nuestro cliente?

### El trader retail frustrado

Es el 95% de personas en crypto: quieren hacer trading profesional pero no saben cómo. No van a aprender análisis técnico, no van a programar bots, no van a pasar 12 horas mirando gráficos.

**Lo que quieren:** una herramienta que haga el trabajo por ellos, que sea transparente, que no les robe, y que solo cobre si funciona.

**Lo que existe hoy:** cajas negras que cobran siempre, no se adaptan, y eventualmente fallan.

**Lo que ofrece Avalon:** exactamente lo que quieren.

### ¿Por qué pagarían?

1. **No hay riesgo:** si el agente pierde, no pagan nada
2. **Ven todo:** cada decisión es pública y verificable
3. **Controlan todo:** pausan, ajustan o retiran cuando quieran
4. **Eligen por mérito:** agentes con reputación real, no promesas

### Ya hay gente pagando por esto

- **KvantsAI** cobra entre 20-30% de performance fee — y tiene usuarios activos pagando
- **AsterDEX** cobra similar — el modelo "solo pagás si ganás" está validado
- **Nosotros cobramos solo 10%** — más barato, misma alineación

La pregunta no es si la gente paga por esto. Ya paga. La pregunta es si confía. Y ahí ganamos.

---

## Cómo hacemos plata

### Tres fuentes de ingreso

**1. Success Fee (desde el día 1)**
10% del profit que genera el agente. Automático, on-chain, sin intermediarios. Si no hay ganancia, no cobramos.

**2. Suscripción Premium (mes 3-6)**
Estrategias avanzadas, ejecución prioritaria, backtesting extendido. Pago mensual.

**3. Marketplace de estrategias (mes 6-12)**
Creadores publican estrategias, otros usuarios las usan. Avalon toma 30%, el creador 70%. Como una app store de estrategias de trading.

### ¿Por qué los costos son bajos?

- No manejamos los fondos del usuario (están en contratos non-custodial)
- Los agentes son autónomos (no requieren intervención manual)
- Las comisiones de la red son mínimas ($0.01-0.05 por operación)
- Cada nuevo agente es ingreso extra sin costo adicional

### Números (proyección conservadora)

| Escenario | Usuarios | TVL | Revenue mensual |
|---|---|---|---|
| Mes 6 | 500 | $500K | $2,500 (solo fees) |
| Mes 9 | 1,000 | $1M | $8,000 (fees + premium) |
| Mes 12 | 2,000 | $2M | $25,000-50,000 (fees + premium + marketplace) |

*Asumiendo 5% profit mensual promedio, 10% success fee.*

---

## Roadmap: de hackathon a empresa

```
AHORA          → Hackathon. Producto funcional en testnet.
Mes 1-3        → Grant de Avalanche. Mainnet. Primeros 100 usuarios reales.
Mes 3-6        → Premium tier. 500 usuarios. Revenue empieza a fluir.
Mes 6-9        → Marketplace. Creadores de estrategias se suman.
Mes 9-12       → 2,000 usuarios. SaaS rentable. No necesitamos más funding.
```

**¿Qué necesitamos de Avalanche?**
- Funding inicial (grant) para llegar a mainnet
- Conexión con mentores, liquidez y ecosystem partners
- Seguimiento para escalar rápido

**¿Qué devolvemos?**
- Una empresa real que genera revenue en el ecosistema Avalanche
- Más usuarios y TVL para Avalanche
- Caso de uso real para ERC-8004 y x402 (las tecnologías que Avalanche empuja)

---

## ¿Por qué Avalanche?

No elegimos Avalanche porque sí. Lo elegimos porque tiene exactamente lo que necesitamos:

- **Identidad de agentes (ERC-8004):** los agentes tienen "pasaporte" con reputación pública. Ninguna otra blockchain tiene esto como estándar.
- **Pagos nativos para agentes (x402):** el agente cobra su fee automáticamente, sin intermediarios. Nativo de Avalanche.
- **Fees bajísimos:** operar cuesta centavos. Esto hace viable que el agente tradee frecuentemente.
- **Velocidad (~2 segundos):** el agente reacciona al mercado en tiempo real.
- **Ecosistema activo en AI:** 1,600+ agentes registrados, grants activos, partnerships en crecimiento.

Avalon le da al ecosistema Avalanche un caso de uso real para sus tecnologías más nuevas.

---

## La competencia y por qué ganamos

| | Visual Builder | IA Autónoma | Transparencia | Solo cobra si ganás |
|---|---|---|---|---|
| Bots Telegram | No | Parcial | Nada | No |
| Ava DeFAI | No | Sí | Parcial | No |
| AMI.Finance | Básico | Sí | Parcial | No |
| KvantsAI | No | Sí | Parcial | Sí (20-30%) |
| **Avalon** | **Sí** | **Sí** | **Total** | **Sí (10%)** |

Nadie combina las 4 cosas. Y nosotros cobramos la mitad.

---

## Preguntas que nos van a hacer (y las respuestas)

### "¿Por qué ustedes y no otro?"

Porque nadie combina visual builder + IA autónoma + transparencia total + fee solo sobre profit. Los demás tienen 1 o 2 de estas cosas. Nosotros las 4.

### "¿Por qué no tendrían bugs si todos tienen bugs?"

El código puede tener bugs. Pero nuestros contratos tienen límites automáticos: si algo sale mal, la operación se cancela sola. Y el usuario siempre puede retirar al instante. Los otros no tenían eso — por eso les drenaron fondos.

### "¿La ventana de vida de los agentes no es muy corta?"

La era con bots hardcodeados, sí. Pero con IA que se adapta en tiempo real + datos de mercado on-chain, la ventana se amplía enormemente. Es un problema de tecnología obsoleta, no del mercado.

### "¿Cómo se vuelven rentables después del grant?"

Success fee (10% del profit) + suscripciones premium + marketplace de estrategias. Con 2,000 usuarios generamos $25K-50K/mes. Costos operativos mínimos porque no manejamos fondos y los agentes son autónomos.

### "¿Quién paga por esto?"

Retail traders que quieren estrategias pro sin ser pros. Ya hay gente pagando 20-30% de performance fee en otros productos (KvantsAI, AsterDEX). Nosotros cobramos 10% y somos más transparentes.

### "¿Qué hicieron mal los otros que ustedes harían bien?"

Cuatro cosas: fueron opacos (caja negra), no se adaptaron (estrategias fijas), no tenían frenos (sin constraints), y cobraban mal (fee fijo). Nosotros somos transparentes, adaptativos, con límites on-chain y solo cobramos si hay ganancia.

---

## Pitch de 30 segundos

La gente pierde plata con bots de trading porque son cajas negras, no se adaptan, no tienen freno y cobran ganes o pierdas.

Avalon resuelve las 4 cosas: el usuario arma su estrategia visualmente, un agente IA con identidad verificable tradea por él con límites duros que no puede romper, todo queda grabado públicamente, y solo cobramos si hay ganancia.

Ya funciona en Avalanche testnet. Queremos ser empresa, no solo un proyecto de hackathon.
