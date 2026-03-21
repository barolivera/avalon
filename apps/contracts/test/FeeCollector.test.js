const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("FeeCollector", function () {
  async function deployFixture() {
    const [admin, treasury, vaultSigner, facilitator, other] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy via UUPS proxy
    const FeeFactory = await ethers.getContractFactory("FeeCollector");
    const impl = await FeeFactory.deploy();
    await impl.waitForDeployment();

    const ERC1967 = await ethers.getContractFactory("AvalonProxy");
    const initData = FeeFactory.interface.encodeFunctionData("initialize", [
      admin.address,
      treasury.address,
      await usdc.getAddress()
    ]);
    const proxy = await ERC1967.deploy(await impl.getAddress(), initData);
    await proxy.waitForDeployment();
    const feeCollector = FeeFactory.attach(await proxy.getAddress());

    // Grant roles
    const VAULT_ROLE = await feeCollector.VAULT_ROLE();
    const FACILITATOR_ROLE = await feeCollector.FACILITATOR_ROLE();
    await feeCollector.connect(admin).grantRole(VAULT_ROLE, vaultSigner.address);
    await feeCollector.connect(admin).grantRole(FACILITATOR_ROLE, facilitator.address);

    return { feeCollector, usdc, admin, treasury, vaultSigner, facilitator, other };
  }

  describe("collectFee", function () {
    it("should collect 10% fee on profit", async function () {
      const { feeCollector, usdc, vaultSigner } = await loadFixture(deployFixture);

      const deposit = ethers.parseUnits("1000", 6);
      const finalBalance = ethers.parseUnits("1200", 6);
      const expectedFee = ethers.parseUnits("20", 6); // 10% of 200

      await usdc.mint(vaultSigner.address, expectedFee);
      await usdc.connect(vaultSigner).approve(await feeCollector.getAddress(), ethers.MaxUint256);

      await feeCollector.connect(vaultSigner).collectFee(0, await usdc.getAddress(), deposit, finalBalance);

      expect(await usdc.balanceOf(await feeCollector.getAddress())).to.equal(expectedFee);
      expect(await feeCollector.strategyFeesCollected(0)).to.equal(expectedFee);
    });

    it("should return 0 on loss", async function () {
      const { feeCollector, usdc, vaultSigner } = await loadFixture(deployFixture);

      const fee = await feeCollector.connect(vaultSigner).collectFee.staticCall(
        0, await usdc.getAddress(), ethers.parseUnits("1000", 6), ethers.parseUnits("900", 6)
      );
      expect(fee).to.equal(0n);
    });

    it("should only allow VAULT_ROLE", async function () {
      const { feeCollector, usdc, other } = await loadFixture(deployFixture);

      await expect(
        feeCollector.connect(other).collectFee(0, await usdc.getAddress(), 1000, 1200)
      ).to.be.revertedWithCustomError(feeCollector, "AccessControlUnauthorizedAccount");
    });
  });

  describe("x402 settlement", function () {
    it("should settle via facilitator", async function () {
      const { feeCollector, usdc, facilitator } = await loadFixture(deployFixture);

      const feeAmount = ethers.parseUnits("5", 6);
      const paymentHash = ethers.id("payment-001");

      // Simulate facilitator having already transferred USDC
      await usdc.mint(await feeCollector.getAddress(), feeAmount);

      await feeCollector.connect(facilitator).settleX402Fee(0, feeAmount, paymentHash);

      expect(await feeCollector.isSettled(paymentHash)).to.be.true;
      expect(await feeCollector.strategyFeesCollected(0)).to.equal(feeAmount);
    });

    it("should prevent double settlement", async function () {
      const { feeCollector, usdc, facilitator } = await loadFixture(deployFixture);

      const paymentHash = ethers.id("payment-002");
      await usdc.mint(await feeCollector.getAddress(), ethers.parseUnits("5", 6));

      await feeCollector.connect(facilitator).settleX402Fee(0, ethers.parseUnits("5", 6), paymentHash);

      await expect(
        feeCollector.connect(facilitator).settleX402Fee(0, ethers.parseUnits("5", 6), paymentHash)
      ).to.be.revertedWithCustomError(feeCollector, "AlreadySettled");
    });

    it("should only allow FACILITATOR_ROLE", async function () {
      const { feeCollector, other } = await loadFixture(deployFixture);

      await expect(
        feeCollector.connect(other).settleX402Fee(0, 100, ethers.id("x"))
      ).to.be.revertedWithCustomError(feeCollector, "AccessControlUnauthorizedAccount");
    });
  });

  describe("withdrawFees", function () {
    it("should withdraw to treasury", async function () {
      const { feeCollector, usdc, treasury, vaultSigner } = await loadFixture(deployFixture);

      const fee = ethers.parseUnits("50", 6);
      await usdc.mint(vaultSigner.address, fee);
      await usdc.connect(vaultSigner).approve(await feeCollector.getAddress(), ethers.MaxUint256);
      await feeCollector.connect(vaultSigner).collectFee(
        0, await usdc.getAddress(), ethers.parseUnits("1000", 6), ethers.parseUnits("1500", 6)
      );

      await feeCollector.withdrawFees(await usdc.getAddress());
      expect(await usdc.balanceOf(treasury.address)).to.equal(fee);
    });
  });

  describe("admin", function () {
    it("should cap fee at 20%", async function () {
      const { feeCollector, admin } = await loadFixture(deployFixture);

      await expect(
        feeCollector.connect(admin).setFeeBps(3000)
      ).to.be.revertedWithCustomError(feeCollector, "FeeTooHigh");

      await feeCollector.connect(admin).setFeeBps(500);
      expect(await feeCollector.feeBps()).to.equal(500n);
    });
  });
});
