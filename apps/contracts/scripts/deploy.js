const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "AVAX\n");

  // ── Config ─────────────────────────────────────
  const LB_ROUTER = "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30"; // Trader Joe LB Router V2.2 Fuji
  const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e"; // ERC-8004 Fuji
  const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713"; // ERC-8004 Fuji
  const USDC_FUJI = "0x5425890298aed601595a70AB815c96711a31Bc65";
  const WAVAX_FUJI = "0xd00ae08403B9bbb9124bB305C09058E32C39A48c";
  const TREASURY = deployer.address; // Use deployer for testnet

  // Helper to deploy UUPS proxy
  async function deployProxy(name, args) {
    const Factory = await hre.ethers.getContractFactory(name);
    const impl = await Factory.deploy();
    await impl.waitForDeployment();
    const implAddr = await impl.getAddress();
    console.log(`   ${name} impl:`, implAddr);

    // Encode initialize call
    const initData = Factory.interface.encodeFunctionData("initialize", args);

    // Deploy ERC1967Proxy
    const ERC1967 = await hre.ethers.getContractFactory("AvalonProxy");
    const proxy = await ERC1967.deploy(implAddr, initData);
    await proxy.waitForDeployment();
    const proxyAddr = await proxy.getAddress();
    console.log(`   ${name} proxy:`, proxyAddr);

    // Return contract instance attached to proxy
    return Factory.attach(proxyAddr);
  }

  // ── 1. Deploy StrategyVault (UUPS Proxy) ──────
  console.log("1. Deploying StrategyVault...");
  const vault = await deployProxy("StrategyVault", [
    deployer.address,     // admin
    IDENTITY_REGISTRY,    // ERC-8004 Identity Registry
    REPUTATION_REGISTRY   // ERC-8004 Reputation Registry
  ]);
  const vaultAddress = await vault.getAddress();

  // ── 2. Deploy StrategyExecutor (UUPS Proxy) ───
  console.log("\n2. Deploying StrategyExecutor...");
  const executor = await deployProxy("StrategyExecutor", [
    deployer.address,     // admin
    LB_ROUTER,            // Trader Joe router
    vaultAddress,         // vault
    IDENTITY_REGISTRY     // ERC-8004 Identity Registry
  ]);
  const executorAddress = await executor.getAddress();

  // ── 3. Deploy FeeCollector (UUPS Proxy) ────────
  console.log("\n3. Deploying FeeCollector...");
  const feeCollector = await deployProxy("FeeCollector", [
    deployer.address,     // admin
    TREASURY,             // treasury
    USDC_FUJI             // USDC address
  ]);
  const feeCollectorAddress = await feeCollector.getAddress();

  // ── 4. Wire contracts together ─────────────────
  console.log("\n4. Wiring contracts...");

  // Vault: set fee collector + grant EXECUTOR_ROLE to executor
  await vault.setFeeCollector(feeCollectorAddress);
  console.log("   Vault.feeCollector =", feeCollectorAddress);

  const EXECUTOR_ROLE = await vault.EXECUTOR_ROLE();
  await vault.grantRole(EXECUTOR_ROLE, executorAddress);
  console.log("   Vault.EXECUTOR_ROLE granted to executor");

  // FeeCollector: grant VAULT_ROLE to vault
  const VAULT_ROLE = await feeCollector.VAULT_ROLE();
  await feeCollector.grantRole(VAULT_ROLE, vaultAddress);
  console.log("   FeeCollector.VAULT_ROLE granted to vault");

  // ── 5. Setup allowed pairs ─────────────────────
  console.log("\n5. Setting up allowed pairs...");
  await executor.setAllowedPair(WAVAX_FUJI, USDC_FUJI, true);
  console.log("   Allowed: WAVAX/USDC");

  // ── Summary ────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  AVALON — Deployment Complete (UUPS Proxies)");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  StrategyVault (proxy):    ", vaultAddress);
  console.log("  StrategyExecutor (proxy): ", executorAddress);
  console.log("  FeeCollector (proxy):     ", feeCollectorAddress);
  console.log("  Owner/Admin:              ", deployer.address);
  console.log("  Network:                  ", hre.network.name);
  console.log("  ERC-8004 Identity:        ", IDENTITY_REGISTRY);
  console.log("  ERC-8004 Reputation:      ", REPUTATION_REGISTRY);
  console.log("═══════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
