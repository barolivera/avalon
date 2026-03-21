---
name: bnb-chain-dev
description: "Desarrollo de smart contracts y dApps sobre BNB Smart Chain (BSC) y opBNB. Usar cuando se necesite configurar proyectos Hardhat/Foundry para BSC, deployar contratos, crear tokens BEP-20, o integrar con PancakeSwap."
metadata:
  author: BuenDia-Builders
---

# Desarrollo en BNB Smart Chain

## Redes

BSC Mainnet: chainId 56, RPC `https://bsc-dataseed.bnbchain.org`, explorer bscscan.com
BSC Testnet: chainId 97, RPC `https://bsc-testnet-dataseed.bnbchain.org`, explorer testnet.bscscan.com, faucet bnbchain.org/en/testnet-faucet
opBNB (L2): chainId 204

## Filosofía

BSC es 100% EVM compatible. Mismo Solidity, mismo Hardhat, mismo ethers.js. Solo cambiás RPC y chainId. Gas ~$0.005/tx, bloques cada ~0.45s.

## Workflow de desarrollo

1. Hardhat con `@nomicfoundation/hardhat-toolbox`, config apuntando a BSC testnet (chainId 97)
2. Secrets con `npx hardhat vars set BSC_PRIVATE_KEY` (nunca en .env committeado)
3. Deploy con `npx hardhat ignition deploy --network bscTestnet`
4. Verify con `npx hardhat verify --network bscTestnet`
5. Tokens BEP-20 = ERC-20 con OpenZeppelin, sin diferencias

## PancakeSwap V3 (BSC)

Factory: `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`
Router: `0x1b81D678ffb9C0263b24A97847620C99d213eB14`
WBNB: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`
Quoter: `0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997`
Fee tiers: 100, 500, 2500, 10000 bps

## Consideraciones

- RPCs oficiales limitan 10K req/5min y no soportan eth_getLogs — usar Ankr/QuickNode/NodeReal en prod
- Oráculos disponibles: Chainlink, Pyth, Binance Oracle
- Account Abstraction via Particle Network y Biconomy
