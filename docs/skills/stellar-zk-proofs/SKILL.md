# Zero-Knowledge Proofs en Stellar (X-Ray / Protocol 25)

> Docs oficiales: https://developers.stellar.org/docs/build/apps/zk
> Private Payments: https://github.com/NethermindEth/stellar-private-payments
> RISC Zero Verifier: https://github.com/NethermindEth/stellar-risc0-verifier
> Groth16 Verifier: https://github.com/stellar/soroban-examples/tree/main/groth16_verifier
> UltraHonk Verifier: https://github.com/indextree/ultrahonk_soroban_contract
> Blog X-Ray: https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25
> Blog Private Payments: https://stellar.org/blog/developers/financial-privacy
> Blog Privacy Pools: https://stellar.org/blog/ecosystem/prototyping-privacy-pools-on-stellar

## Overview

Protocol 25 (X-Ray) introdujo soporte nativo de zero-knowledge proofs en Stellar.
Los contratos Soroban ahora pueden verificar pruebas ZK on-chain, habilitando
privacidad sin comprometer transparencia ni compliance.

Para el protocolo de crowdlending, ZK es la Fase 2: el prestatario demuestra
su historial de repago sin revelar datos personales. Ej: "pagué 5 préstamos
a tiempo" sin mostrar cuáles ni a quién.

## Host Functions nativas

Soroban expone estas funciones de bajo nivel para ZK:

### BN254 (Curva elíptica para zk-SNARKs)

| Función | Qué hace |
|---------|----------|
| `g1_add` | Suma de puntos en el grupo G1 |
| `g1_mul` | Multiplicación escalar de un punto G1 |
| `pairing_check` | Verificación de ecuaciones de pairing (paso final de verificación) |

Estas funciones son equivalentes a los precompiles EIP-196 y EIP-197 de Ethereum,
lo que facilita portar proyectos ZK existentes de EVM a Soroban.

### Poseidon (Hash ZK-friendly)

| Función | Qué hace |
|---------|----------|
| `poseidon` | Hash de field elements, optimizado para circuitos ZK |
| `poseidon2` | Variante alternativa de Poseidon |

Poseidon es 100x más eficiente dentro de circuitos ZK que SHA-256 o Keccak.

## Sistemas de prueba soportados

| Sistema | Curva | Herramienta | Repo |
|---------|-------|-------------|------|
| Groth16 | BN254 | Circom | stellar/soroban-examples/groth16_verifier |
| Groth16 | BLS12-381 | Circom | (también soportado) |
| RISC Zero zkVM | BN254 | RISC Zero / Boundless | NethermindEth/stellar-risc0-verifier |
| UltraHonk | BN254 | Noir / Barretenberg | indextree/ultrahonk_soroban_contract |

## Soroban SDK: feature hazmat-crypto

Para usar BN254 en contratos, habilitar el feature `hazmat-crypto` en `Cargo.toml`:

```toml
[dependencies]
soroban-sdk = { version = "...", features = ["hazmat-crypto"] }
```

Esto expone tipos como `G1Affine`, scalar fields de BN254, y las funciones de Poseidon.

## Groth16 en Soroban (el más relevante para crowdlending)

### Flujo

```
Off-chain: Generar prueba ZK
    ↓
1. Definir circuito en Circom (ej: "tengo >= 5 repagos exitosos")
    ↓
2. Compilar circuito → genera R1CS + WASM
    ↓
3. Trusted setup → genera proving key + verification key
    ↓
4. Prover genera la prueba (proof) con sus datos privados
    ↓

On-chain: Verificar prueba
    ↓
5. Enviar proof + public inputs al contrato verificador en Soroban
    ↓
6. Contrato ejecuta pairing_check → true/false
    ↓
7. Si true → el prestatario demostró su claim sin revelar datos
```

### Verificador Groth16 en Soroban

El repo `stellar/soroban-examples/groth16_verifier` contiene una implementación
no_std compatible de verificador Groth16. Los circuitos se construyen con Circom
y las funciones de conversión adaptan los outputs de Circom para el verificador.

## Private Payments (Nethermind) — Referencia completa

El repo más avanzado para ZK en Stellar. Componentes:

| Componente | Qué hace |
|-----------|----------|
| Pool contract | Depósitos, transfers, withdrawals privados |
| Groth16 verifier contract | Verifica pruebas on-chain |
| Circom circuits | Lógica de privacidad (anti-double-spend, Merkle proofs, balance conservation) |
| WebAssembly prover | Generación de pruebas en el browser del usuario |
| Membership trees | Merkle trees para compliance (ASP-based membership proofs) |

### Garantías del circuito

- Anti-double-spending (nullifiers)
- Merkle proof de commitments
- Conservación de balance (inputs == outputs + public amount)
- Membership/non-membership proofs para compliance

## RISC Zero / Boundless

RISC Zero permite ejecutar programas arbitrarios en un zkVM y generar
pruebas verificables. Nethermind construyó el contrato verificador para Soroban.

Ventaja: no necesitás escribir circuitos. Escribís un programa en Rust normal
y RISC Zero genera la prueba de que se ejecutó correctamente.

```
Programa Rust (off-chain en zkVM)
    → "Este address tiene score > 80"
    → Genera proof
    ↓
Contrato Soroban verifica proof
    → Acepta o rechaza sin ver los datos
```

## Aplicación al crowdlending (Fase 2)

### Credit Scoring Privado

```
Prestatario tiene historial on-chain:
- 5 préstamos pagados a tiempo
- Score calculado: 85/100
- Monto promedio: $1,500

Con ZK:
- Circuito: "score >= 70 AND repagos_exitosos >= 3"
- Prover genera proof con datos privados
- Contrato verifica → true
- NADIE ve los datos individuales
```

### Implementación sugerida

1. **Circuito Circom** que verifica:
   - Cantidad de repagos exitosos >= umbral
   - Score de reputación >= mínimo requerido por el pool
   - Antigüedad en la red >= mínimo

2. **Verification key** hardcodeada en el contrato del protocolo

3. **Prover** corre en el browser del prestatario (WASM, como Nethermind)

4. **Contrato verificador** en Soroban valida la prueba

5. **Resultado**: el pool acepta al prestatario sin ver su historial detallado

### Privacy Pools para compliance

Usando el modelo de Nethermind, se pueden crear pools donde:
- Solo miembros verificados pueden participar (membership proof)
- Las transacciones son privadas pero auditables por reguladores con la key correcta
- Compatible con regulaciones LATAM de KYC/AML
