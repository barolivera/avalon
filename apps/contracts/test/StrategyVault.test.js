const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("StrategyVault", function () {
  async function deployFixture() {
    const [admin, user, executorSigner, guardian, other] = await ethers.getSigners();

    // Deploy mock ERC-20
    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy mock ERC-8004 registries
    const MockIdentity = await ethers.getContractFactory("MockIdentityRegistry");
    const identityRegistry = await MockIdentity.deploy();
    await identityRegistry.waitForDeployment();

    const MockReputation = await ethers.getContractFactory("MockReputationRegistry");
    const reputationRegistry = await MockReputation.deploy();
    await reputationRegistry.waitForDeployment();

    // Register a mock agent (agentId = 1) and set its wallet
    await identityRegistry.connect(admin)["register(string)"]("https://agent.avalon.io/metadata");
    await identityRegistry.setAgentWalletDirect(1, executorSigner.address);

    // Deploy vault via UUPS proxy
    const VaultFactory = await ethers.getContractFactory("StrategyVault");
    const vaultImpl = await VaultFactory.deploy();
    await vaultImpl.waitForDeployment();

    const ERC1967 = await ethers.getContractFactory("AvalonProxy");
    const initData = VaultFactory.interface.encodeFunctionData("initialize", [
      admin.address,
      await identityRegistry.getAddress(),
      await reputationRegistry.getAddress()
    ]);
    const proxy = await ERC1967.deploy(await vaultImpl.getAddress(), initData);
    await proxy.waitForDeployment();
    const vault = VaultFactory.attach(await proxy.getAddress());

    // Deploy fee collector via UUPS proxy
    const FeeFactory = await ethers.getContractFactory("FeeCollector");
    const feeImpl = await FeeFactory.deploy();
    await feeImpl.waitForDeployment();
    const feeInitData = FeeFactory.interface.encodeFunctionData("initialize", [
      admin.address,
      admin.address, // treasury
      await usdc.getAddress()
    ]);
    const feeProxy = await ERC1967.deploy(await feeImpl.getAddress(), feeInitData);
    await feeProxy.waitForDeployment();
    const feeCollector = FeeFactory.attach(await feeProxy.getAddress());

    // Wire: grant roles
    const EXECUTOR_ROLE = await vault.EXECUTOR_ROLE();
    const GUARDIAN_ROLE = await vault.GUARDIAN_ROLE();
    const VAULT_ROLE = await feeCollector.VAULT_ROLE();

    await vault.connect(admin).grantRole(EXECUTOR_ROLE, executorSigner.address);
    await vault.connect(admin).grantRole(GUARDIAN_ROLE, guardian.address);
    await vault.connect(admin).setFeeCollector(await feeCollector.getAddress());
    await feeCollector.connect(admin).grantRole(VAULT_ROLE, await vault.getAddress());

    // Mint tokens to user + approve vault
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);

    return {
      vault, usdc, feeCollector, identityRegistry, reputationRegistry,
      admin, user, executorSigner, guardian, other,
      depositAmount, EXECUTOR_ROLE, GUARDIAN_ROLE
    };
  }

  describe("createStrategy with ERC-8004", function () {
    it("should create strategy linked to registered agent", async function () {
      const { vault, usdc, user, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, // agentId = 1
        ethers.parseUnits("100", 6), 50, 10
      );

      const s = await vault.getStrategy(0);
      expect(s.user).to.equal(user.address);
      expect(s.agentId).to.equal(1n);
      expect(s.status).to.equal(1n); // Funded
    });

    it("should revert if agent not registered", async function () {
      const { vault, usdc, user, depositAmount } = await loadFixture(deployFixture);

      await expect(
        vault.connect(user).createStrategy(
          await usdc.getAddress(), depositAmount, 999, // non-existent
          ethers.parseUnits("100", 6), 50, 10
        )
      ).to.be.revertedWithCustomError(vault, "AgentNotRegistered");
    });
  });

  describe("strategy lifecycle", function () {
    it("should activate, pause, resume", async function () {
      const { vault, usdc, user, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );

      await vault.connect(user).activateStrategy(0);
      expect((await vault.getStrategy(0)).status).to.equal(2n);

      await vault.connect(user).pauseStrategy(0);
      expect((await vault.getStrategy(0)).status).to.equal(3n);

      await vault.connect(user).resumeStrategy(0);
      expect((await vault.getStrategy(0)).status).to.equal(2n);
    });
  });

  describe("emergencyWithdraw", function () {
    it("should withdraw all funds in any status", async function () {
      const { vault, usdc, user, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );
      await vault.connect(user).activateStrategy(0);

      const before = await usdc.balanceOf(user.address);
      await vault.connect(user).emergencyWithdraw(0);
      const after = await usdc.balanceOf(user.address);

      expect(after - before).to.equal(depositAmount);
      expect((await vault.getStrategy(0)).status).to.equal(5n); // Cancelled
    });
  });

  describe("allocateFunds", function () {
    it("should allocate funds to executor", async function () {
      const { vault, usdc, user, executorSigner, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );
      await vault.connect(user).activateStrategy(0);

      const amount = ethers.parseUnits("50", 6);
      await vault.connect(executorSigner).allocateFunds(0, amount);

      expect(await usdc.balanceOf(executorSigner.address)).to.equal(amount);
    });

    it("should revert if exceeds budget", async function () {
      const { vault, usdc, user, executorSigner, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );
      await vault.connect(user).activateStrategy(0);

      await expect(
        vault.connect(executorSigner).allocateFunds(0, ethers.parseUnits("200", 6))
      ).to.be.revertedWithCustomError(vault, "ExceedsBudget");
    });

    it("should revert if not executor role", async function () {
      const { vault, usdc, user, other, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );
      await vault.connect(user).activateStrategy(0);

      await expect(
        vault.connect(other).allocateFunds(0, ethers.parseUnits("10", 6))
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("should enforce daily trade limit", async function () {
      const { vault, usdc, user, executorSigner, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 2
      );
      await vault.connect(user).activateStrategy(0);

      const small = ethers.parseUnits("10", 6);

      await vault.connect(executorSigner).allocateFunds(0, small);
      await usdc.connect(executorSigner).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(executorSigner).returnFunds(0, small);

      await vault.connect(executorSigner).allocateFunds(0, small);
      await vault.connect(executorSigner).returnFunds(0, small);

      await expect(
        vault.connect(executorSigner).allocateFunds(0, small)
      ).to.be.revertedWithCustomError(vault, "ExceedsDailyTradeLimit");
    });
  });

  describe("settleStrategy", function () {
    it("should settle with fee on profit", async function () {
      const { vault, usdc, feeCollector, user, executorSigner, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );
      await vault.connect(user).activateStrategy(0);

      // Simulate profit: allocate 100, return 120
      await vault.connect(executorSigner).allocateFunds(0, ethers.parseUnits("100", 6));
      await usdc.mint(executorSigner.address, ethers.parseUnits("20", 6));
      await usdc.connect(executorSigner).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(executorSigner).returnFunds(0, ethers.parseUnits("120", 6));

      // Settle
      await vault.connect(executorSigner).settleStrategy(0);

      const s = await vault.getStrategy(0);
      expect(s.status).to.equal(4n); // Completed

      // Fee = 10% of 20 USDC profit = 2 USDC
      const feeBalance = await usdc.balanceOf(await feeCollector.getAddress());
      expect(feeBalance).to.equal(ethers.parseUnits("2", 6));

      // User can withdraw remaining
      expect(s.currentBalance).to.equal(ethers.parseUnits("1018", 6)); // 1020 - 2
    });

    it("should settle without fee on loss", async function () {
      const { vault, usdc, feeCollector, user, executorSigner, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );
      await vault.connect(user).activateStrategy(0);

      // Simulate loss: allocate 100, return 80
      await vault.connect(executorSigner).allocateFunds(0, ethers.parseUnits("100", 6));
      await usdc.connect(executorSigner).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(executorSigner).returnFunds(0, ethers.parseUnits("80", 6));

      await vault.connect(executorSigner).settleStrategy(0);

      expect((await vault.getStrategy(0)).status).to.equal(4n);
      // No fee collected
      expect(await usdc.balanceOf(await feeCollector.getAddress())).to.equal(0n);
    });
  });

  describe("PnL & views", function () {
    it("should return user strategy views", async function () {
      const { vault, usdc, user, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );

      const views = await vault.getUserStrategyViews(user.address);
      expect(views.length).to.equal(1);
      expect(views[0].agentId).to.equal(1n);
      expect(views[0].pnl).to.equal(0n);
    });
  });

  describe("feedback via ERC-8004", function () {
    it("should give feedback after completion", async function () {
      const { vault, usdc, user, executorSigner, depositAmount } = await loadFixture(deployFixture);

      await vault.connect(user).createStrategy(
        await usdc.getAddress(), depositAmount, 1, ethers.parseUnits("100", 6), 50, 10
      );
      await vault.connect(user).activateStrategy(0);
      await vault.connect(executorSigner).settleStrategy(0);

      await expect(
        vault.connect(user).giveFeedback(0, 5, "grid-trading")
      ).to.emit(vault, "FeedbackGiven").withArgs(0, 1, 5);
    });
  });

  describe("access control", function () {
    it("guardian can pause, only admin can unpause", async function () {
      const { vault, guardian, admin, other } = await loadFixture(deployFixture);

      await vault.connect(guardian).pause();

      // Other cannot unpause
      await expect(
        vault.connect(other).unpause()
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");

      // Admin can unpause
      await vault.connect(admin).unpause();
    });
  });
});
