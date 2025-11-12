import { expect } from "chai";
import { ethers } from "hardhat";
import { PanbooToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-toolbox/signers";
import { time, setCode } from "@nomicfoundation/hardhat-network-helpers";

describe("PanbooToken", function () {
  let panbooToken: PanbooToken;
  let owner: SignerWithAddress;
  let charity: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let router: any;
  let factory: any;
  let wbnb: any;
  let pair: string;

  const TOTAL_SUPPLY = ethers.parseUnits("10000000000", 18); // 10 billion
  const BUY_TAX = 300; // 3%
  const SELL_TAX = 700; // 7%

  // BSC Testnet factory address
  const FACTORY_ADDRESS = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";

  beforeEach(async function () {
    [owner, charity, user1, user2] = await ethers.getSigners();

    // Deploy mock contracts
    const MockWBNB = await ethers.getContractFactory("MockWBNB");
    wbnb = await MockWBNB.deploy();

    const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
    router = await MockPancakeRouter.deploy(await wbnb.getAddress());

    const MockPancakeFactory = await ethers.getContractFactory("MockPancakeFactory");
    factory = await MockPancakeFactory.deploy();

    // Set the mock factory contract code at the expected address
    const factoryCode = await ethers.provider.getCode(await factory.getAddress());
    await setCode(FACTORY_ADDRESS, factoryCode);

    // Deploy PanbooToken
    const PanbooToken = await ethers.getContractFactory("PanbooToken");
    panbooToken = await PanbooToken.deploy(
      "Panboo",
      "PNB",
      TOTAL_SUPPLY,
      charity.address,
      await router.getAddress(),
      FACTORY_ADDRESS
    );

    pair = await panbooToken.pancakePair();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await panbooToken.name()).to.equal("Panboo");
      expect(await panbooToken.symbol()).to.equal("PNB");
    });

    it("Should mint total supply to deployer", async function () {
      expect(await panbooToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
    });

    it("Should set correct charity wallet", async function () {
      expect(await panbooToken.charityWallet()).to.equal(charity.address);
    });

    it("Should set correct tax rates", async function () {
      expect(await panbooToken.buyTaxBps()).to.equal(BUY_TAX);
      expect(await panbooToken.sellTaxBps()).to.equal(SELL_TAX);
    });

    it("Should exclude owner, contract, and charity from tax", async function () {
      expect(await panbooToken.isExcludedFromTax(owner.address)).to.be.true;
      expect(await panbooToken.isExcludedFromTax(await panbooToken.getAddress())).to.be.true;
      expect(await panbooToken.isExcludedFromTax(charity.address)).to.be.true;
    });

    it("Should mark pancake pair as AMM pair", async function () {
      expect(await panbooToken.isAMMPair(pair)).to.be.true;
    });

    it("Should revert if charity wallet is zero address", async function () {
      const PanbooToken = await ethers.getContractFactory("PanbooToken");
      await expect(
        PanbooToken.deploy(
          "Panboo",
          "PNB",
          TOTAL_SUPPLY,
          ethers.ZeroAddress,
          await router.getAddress(),
          FACTORY_ADDRESS
        )
      ).to.be.revertedWith("Charity wallet cannot be zero address");
    });

    it("Should revert if router is zero address", async function () {
      const PanbooToken = await ethers.getContractFactory("PanbooToken");
      await expect(
        PanbooToken.deploy(
          "Panboo",
          "PNB",
          TOTAL_SUPPLY,
          charity.address,
          ethers.ZeroAddress,
          FACTORY_ADDRESS
        )
      ).to.be.reverted; // Will revert when trying to call WETH() on zero address
    });

    it("Should revert if factory is zero address", async function () {
      const PanbooToken = await ethers.getContractFactory("PanbooToken");
      await expect(
        PanbooToken.deploy(
          "Panboo",
          "PNB",
          TOTAL_SUPPLY,
          charity.address,
          await router.getAddress(),
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Factory cannot be zero address");
    });

    it("Should revert if charity wallet is a contract", async function () {
      const PanbooToken = await ethers.getContractFactory("PanbooToken");
      await expect(
        PanbooToken.deploy(
          "Panboo",
          "PNB",
          TOTAL_SUPPLY,
          await router.getAddress(), // Using router address as contract
          await router.getAddress(),
          FACTORY_ADDRESS
        )
      ).to.be.revertedWith("Charity wallet cannot be contract");
    });
  });

  describe("Tax Mechanism", function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await panbooToken.transfer(user1.address, ethers.parseUnits("1000000", 18));
    });

    it("Should not apply tax on regular transfers", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await panbooToken.connect(user1).transfer(user2.address, amount);

      expect(await panbooToken.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should apply buy tax when buying from AMM pair", async function () {
      // Mark user1 as AMM pair to simulate buy
      await panbooToken.setAMMPair(user1.address, true);

      const amount = ethers.parseUnits("1000", 18);
      const expectedTax = (amount * BigInt(BUY_TAX)) / 10000n;
      const expectedReceived = amount - expectedTax;

      await panbooToken.connect(user1).transfer(user2.address, amount);

      expect(await panbooToken.balanceOf(user2.address)).to.equal(expectedReceived);
      expect(await panbooToken.balanceOf(await panbooToken.getAddress())).to.equal(expectedTax);
    });

    it("Should apply sell tax when selling to AMM pair", async function () {
      // Mark user2 as AMM pair to simulate sell
      await panbooToken.setAMMPair(user2.address, true);

      const amount = ethers.parseUnits("1000", 18);
      const expectedTax = (amount * BigInt(SELL_TAX)) / 10000n;
      const expectedReceived = amount - expectedTax;

      await panbooToken.connect(user1).transfer(user2.address, amount);

      expect(await panbooToken.balanceOf(user2.address)).to.equal(expectedReceived);
      expect(await panbooToken.balanceOf(await panbooToken.getAddress())).to.equal(expectedTax);
    });

    it("Should emit TaxCollected event on buy", async function () {
      await panbooToken.setAMMPair(user1.address, true);
      const amount = ethers.parseUnits("1000", 18);
      const expectedTax = (amount * BigInt(BUY_TAX)) / 10000n;

      await expect(panbooToken.connect(user1).transfer(user2.address, amount))
        .to.emit(panbooToken, "TaxCollected")
        .withArgs(user1.address, user1.address, expectedTax, false);
    });

    it("Should emit TaxCollected event on sell", async function () {
      await panbooToken.setAMMPair(user2.address, true);
      const amount = ethers.parseUnits("1000", 18);
      const expectedTax = (amount * BigInt(SELL_TAX)) / 10000n;

      await expect(panbooToken.connect(user1).transfer(user2.address, amount))
        .to.emit(panbooToken, "TaxCollected")
        .withArgs(user1.address, user2.address, expectedTax, true);
    });

    it("Should not apply tax when trading is disabled", async function () {
      await panbooToken.setTradingEnabled(false);
      await panbooToken.setAMMPair(user2.address, true);

      const amount = ethers.parseUnits("1000", 18);
      await panbooToken.connect(user1).transfer(user2.address, amount);

      // No tax should be collected
      expect(await panbooToken.balanceOf(user2.address)).to.equal(amount);
      expect(await panbooToken.balanceOf(await panbooToken.getAddress())).to.equal(0);
    });
  });

  describe("Tax Rate Changes (Timelock)", function () {
    it("Should schedule tax rate change", async function () {
      const newBuyTax = 200; // 2%
      const newSellTax = 500; // 5%

      await panbooToken.scheduleTaxRateChange(newBuyTax, newSellTax);

      expect(await panbooToken.hasPendingTaxChange()).to.be.true;
      expect(await panbooToken.pendingBuyTaxBps()).to.equal(newBuyTax);
      expect(await panbooToken.pendingSellTaxBps()).to.equal(newSellTax);
    });

    it("Should revert if buy tax > 10%", async function () {
      await expect(
        panbooToken.scheduleTaxRateChange(1100, 500)
      ).to.be.revertedWith("Buy tax too high");
    });

    it("Should revert if sell tax > 10%", async function () {
      await expect(
        panbooToken.scheduleTaxRateChange(200, 1100)
      ).to.be.revertedWith("Sell tax too high");
    });

    it("Should revert if buy tax < 1%", async function () {
      await expect(
        panbooToken.scheduleTaxRateChange(50, 500) // 0.5% buy tax
      ).to.be.revertedWith("Buy tax too low");
    });

    it("Should revert if sell tax < 1%", async function () {
      await expect(
        panbooToken.scheduleTaxRateChange(200, 50) // 0.5% sell tax
      ).to.be.revertedWith("Sell tax too low");
    });

    it("Should execute tax rate change after timelock", async function () {
      const newBuyTax = 200;
      const newSellTax = 500;

      await panbooToken.scheduleTaxRateChange(newBuyTax, newSellTax);

      // Advance time by 24 hours + 1 second
      await time.increase(24 * 60 * 60 + 1);

      await panbooToken.executeTaxRateChange();

      expect(await panbooToken.buyTaxBps()).to.equal(newBuyTax);
      expect(await panbooToken.sellTaxBps()).to.equal(newSellTax);
      expect(await panbooToken.hasPendingTaxChange()).to.be.false;
    });

    it("Should revert if trying to execute before timelock", async function () {
      await panbooToken.scheduleTaxRateChange(200, 500);

      await expect(
        panbooToken.executeTaxRateChange()
      ).to.be.revertedWith("Timelock not expired");
    });

    it("Should allow cancelling tax rate change", async function () {
      await panbooToken.scheduleTaxRateChange(200, 500);
      await panbooToken.cancelTaxRateChange();

      expect(await panbooToken.hasPendingTaxChange()).to.be.false;
      expect(await panbooToken.pendingBuyTaxBps()).to.equal(0);
      expect(await panbooToken.pendingSellTaxBps()).to.equal(0);
    });

    it("Should emit events for tax changes", async function () {
      const newBuyTax = 200;
      const newSellTax = 500;

      await expect(panbooToken.scheduleTaxRateChange(newBuyTax, newSellTax))
        .to.emit(panbooToken, "TaxChangeScheduled");

      await time.increase(24 * 60 * 60 + 1);

      await expect(panbooToken.executeTaxRateChange())
        .to.emit(panbooToken, "TaxRatesUpdated")
        .withArgs(newBuyTax, newSellTax);
    });
  });

  describe("AMM Pair Management", function () {
    it("Should allow owner to add AMM pair", async function () {
      await panbooToken.setAMMPair(user1.address, true);
      expect(await panbooToken.isAMMPair(user1.address)).to.be.true;
    });

    it("Should allow owner to remove AMM pair", async function () {
      await panbooToken.setAMMPair(user1.address, true);
      await panbooToken.setAMMPair(user1.address, false);
      expect(await panbooToken.isAMMPair(user1.address)).to.be.false;
    });

    it("Should revert if pair is zero address", async function () {
      await expect(
        panbooToken.setAMMPair(ethers.ZeroAddress, true)
      ).to.be.revertedWith("Pair cannot be zero address");
    });

    it("Should emit AMMPairUpdated event", async function () {
      await expect(panbooToken.setAMMPair(user1.address, true))
        .to.emit(panbooToken, "AMMPairUpdated")
        .withArgs(user1.address, true);
    });
  });

  describe("Tax Exclusions", function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await panbooToken.transfer(user1.address, ethers.parseUnits("10000", 18));
    });

    it("Should allow owner to exclude address from tax", async function () {
      await panbooToken.setExcludedFromTax(user1.address, true);
      expect(await panbooToken.isExcludedFromTax(user1.address)).to.be.true;
    });

    it("Should not apply tax to excluded addresses", async function () {
      await panbooToken.setExcludedFromTax(user1.address, true);
      await panbooToken.setAMMPair(user2.address, true);

      // Disable auto-swap to prevent the swap trigger
      await panbooToken.setSwapEnabled(false);

      const amount = ethers.parseUnits("1000", 18);
      await panbooToken.connect(user1).transfer(user2.address, amount);

      // No tax should be collected because user1 is excluded
      expect(await panbooToken.balanceOf(user2.address)).to.equal(amount);
    });
  });

  describe("Swap Settings", function () {
    it("Should allow owner to update swap threshold", async function () {
      const newThreshold = ethers.parseUnits("50000", 18);
      await panbooToken.setSwapThreshold(newThreshold);
      expect(await panbooToken.swapThreshold()).to.equal(newThreshold);
    });

    it("Should allow owner to enable/disable swap", async function () {
      await panbooToken.setSwapEnabled(false);
      expect(await panbooToken.swapEnabled()).to.be.false;

      await panbooToken.setSwapEnabled(true);
      expect(await panbooToken.swapEnabled()).to.be.true;
    });

    it("Should allow owner to update max swap BPS", async function () {
      const newMaxSwap = 50; // 0.5%
      await panbooToken.setMaxSwapBps(newMaxSwap);
      expect(await panbooToken.maxSwapBps()).to.equal(newMaxSwap);
    });

    it("Should revert if max swap BPS > 1%", async function () {
      await expect(
        panbooToken.setMaxSwapBps(101)
      ).to.be.revertedWith("Max swap too high");
    });

    it("Should allow owner to update min donation BNB", async function () {
      const newMin = ethers.parseEther("0.1");
      await panbooToken.setMinDonationBNB(newMin);
      expect(await panbooToken.minDonationBNB()).to.equal(newMin);
    });

    it("Should allow owner to update slippage tolerance", async function () {
      const newSlippage = 500; // 5%
      await panbooToken.setSlippageTolerance(newSlippage);
      expect(await panbooToken.slippageToleranceBps()).to.equal(newSlippage);
    });

    it("Should revert if slippage tolerance > 10%", async function () {
      await expect(
        panbooToken.setSlippageTolerance(1001)
      ).to.be.revertedWith("Slippage too high");
    });

    it("Should emit SlippageToleranceUpdated event", async function () {
      const newSlippage = 300; // 3%
      await expect(panbooToken.setSlippageTolerance(newSlippage))
        .to.emit(panbooToken, "SlippageToleranceUpdated")
        .withArgs(newSlippage);
    });
  });

  describe("Charity Wallet Management", function () {
    it("Should allow owner to update charity wallet", async function () {
      await panbooToken.setCharityWallet(user1.address);
      expect(await panbooToken.charityWallet()).to.equal(user1.address);
    });

    it("Should revert if new charity wallet is zero address", async function () {
      await expect(
        panbooToken.setCharityWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot be zero address");
    });

    it("Should revert if new charity wallet is a contract", async function () {
      await expect(
        panbooToken.setCharityWallet(await router.getAddress())
      ).to.be.revertedWith("Cannot be contract address");
    });

    it("Should emit CharityWalletUpdated event", async function () {
      await expect(panbooToken.setCharityWallet(user1.address))
        .to.emit(panbooToken, "CharityWalletUpdated")
        .withArgs(user1.address);
    });
  });

  describe("Router and Pair Updates", function () {
    it("Should allow owner to update router", async function () {
      await panbooToken.setRouter(user1.address);
      expect(await panbooToken.pancakeRouter()).to.equal(user1.address);
    });

    it("Should allow owner to update primary pair", async function () {
      await panbooToken.setPrimaryPair(user1.address);
      expect(await panbooToken.pancakePair()).to.equal(user1.address);
      expect(await panbooToken.isAMMPair(user1.address)).to.be.true;
    });

    it("Should revert if new router is zero address", async function () {
      await expect(
        panbooToken.setRouter(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });

    it("Should revert if new pair is zero address", async function () {
      await expect(
        panbooToken.setPrimaryPair(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });
  });

  describe("Trading Circuit Breaker", function () {
    it("Should allow owner to enable/disable trading", async function () {
      await panbooToken.setTradingEnabled(false);
      expect(await panbooToken.tradingEnabled()).to.be.false;

      await panbooToken.setTradingEnabled(true);
      expect(await panbooToken.tradingEnabled()).to.be.true;
    });

    it("Should emit TradingEnabledSet event", async function () {
      await expect(panbooToken.setTradingEnabled(false))
        .to.emit(panbooToken, "TradingEnabledSet")
        .withArgs(false);
    });
  });

  describe("Access Control", function () {
    it("Should revert if non-owner tries to schedule tax change", async function () {
      await expect(
        panbooToken.connect(user1).scheduleTaxRateChange(200, 500)
      ).to.be.reverted;
    });

    it("Should revert if non-owner tries to set AMM pair", async function () {
      await expect(
        panbooToken.connect(user1).setAMMPair(user2.address, true)
      ).to.be.reverted;
    });

    it("Should revert if non-owner tries to set charity wallet", async function () {
      await expect(
        panbooToken.connect(user1).setCharityWallet(user2.address)
      ).to.be.reverted;
    });

    it("Should revert if non-owner tries to disable trading", async function () {
      await expect(
        panbooToken.connect(user1).setTradingEnabled(false)
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      await expect(
        panbooToken.connect(user1).transfer(user2.address, 0)
      ).to.not.be.reverted;
    });

    it("Should handle max supply transfer", async function () {
      await panbooToken.transfer(user1.address, TOTAL_SUPPLY);
      expect(await panbooToken.balanceOf(user1.address)).to.equal(TOTAL_SUPPLY);
    });

    it("Should revert on insufficient balance", async function () {
      const amount = ethers.parseUnits("1", 18);
      await expect(
        panbooToken.connect(user2).transfer(user1.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Calculate Max Swap Amount", function () {
    it("Should return zero when LP reserves are zero", async function () {
      // Our mock pair has no reserves set by default (all zero)
      // So calculateMaxSwapAmount will calculate 0 * maxSwapBps / 10000 = 0
      const maxSwap = await panbooToken.calculateMaxSwapAmount();

      // With zero reserves, max swap should be 0
      expect(maxSwap).to.equal(0);
    });

    it("Should calculate based on reserves when LP has liquidity", async function () {
      // Get the mock pair contract
      const MockPancakePair = await ethers.getContractFactory("MockPancakePair");
      const mockPair = MockPancakePair.attach(pair);

      // Set reserves: 1M PNB and 100 BNB
      const pnbReserve = ethers.parseUnits("1000000", 18);
      const bnbReserve = ethers.parseUnits("100", 18);

      // Determine which is token0
      const token0 = await mockPair.token0();
      const isPanbooToken0 = token0.toLowerCase() === (await panbooToken.getAddress()).toLowerCase();

      if (isPanbooToken0) {
        await mockPair.setReserves(pnbReserve, bnbReserve);
      } else {
        await mockPair.setReserves(bnbReserve, pnbReserve);
      }

      // Now calculate max swap
      const maxSwap = await panbooToken.calculateMaxSwapAmount();
      const maxSwapBps = await panbooToken.maxSwapBps();

      // Should be 0.3% of PNB reserves
      const expected = (pnbReserve * maxSwapBps) / 10000n;
      expect(maxSwap).to.equal(expected);
    });
  });
});
