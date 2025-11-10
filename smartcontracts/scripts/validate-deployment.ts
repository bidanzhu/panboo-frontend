import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Validates deployed contracts and their configuration
 * Run this script after deployment to ensure everything is set up correctly
 */
async function main() {
  console.log("🔍 Validating Panboo Deployment...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ deployment.json not found. Deploy contracts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Network:", deployment.network);
  console.log("Chain ID:", deployment.chainId);
  console.log();

  let passed = 0;
  let failed = 0;

  // Get contract instances
  const panbooToken = await ethers.getContractAt(
    "PanbooToken",
    deployment.contracts.PanbooToken.address
  );

  const masterChef = await ethers.getContractAt(
    "MasterChef",
    deployment.contracts.MasterChef.address
  );

  console.log("=" .repeat(60));
  console.log("PANBOO TOKEN VALIDATION");
  console.log("=" .repeat(60));

  // Test 1: Basic token info
  try {
    const name = await panbooToken.name();
    const symbol = await panbooToken.symbol();
    const decimals = await panbooToken.decimals();
    const totalSupply = await panbooToken.totalSupply();

    console.log("✅ Token Info:");
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)} ${symbol}`);
    passed++;
  } catch (error) {
    console.error("❌ Failed to read token info:", error);
    failed++;
  }

  // Test 2: Charity wallet
  try {
    const charityWallet = await panbooToken.charityWallet();
    console.log(`✅ Charity Wallet: ${charityWallet}`);

    if (charityWallet === ethers.ZeroAddress) {
      console.warn("⚠️  Warning: Charity wallet is zero address!");
      failed++;
    } else {
      passed++;
    }
  } catch (error) {
    console.error("❌ Failed to read charity wallet:", error);
    failed++;
  }

  // Test 3: Tax rates
  try {
    const buyTax = await panbooToken.buyTaxBps();
    const sellTax = await panbooToken.sellTaxBps();

    console.log(`✅ Tax Rates:`);
    console.log(`   Buy Tax: ${Number(buyTax) / 100}%`);
    console.log(`   Sell Tax: ${Number(sellTax) / 100}%`);

    if (buyTax > 1000 || sellTax > 1000) {
      console.error("❌ Tax rate exceeds 10% maximum!");
      failed++;
    } else {
      passed++;
    }
  } catch (error) {
    console.error("❌ Failed to read tax rates:", error);
    failed++;
  }

  // Test 4: PancakeSwap pair
  try {
    const pancakePair = await panbooToken.pancakePair();
    const isAMMPair = await panbooToken.isAMMPair(pancakePair);

    console.log(`✅ PancakeSwap Pair: ${pancakePair}`);
    console.log(`   Marked as AMM Pair: ${isAMMPair}`);

    if (!isAMMPair) {
      console.error("❌ Primary pair not marked as AMM pair!");
      failed++;
    } else {
      passed++;
    }
  } catch (error) {
    console.error("❌ Failed to read pancake pair:", error);
    failed++;
  }

  // Test 5: Tax exclusions
  try {
    const ownerExcluded = await panbooToken.isExcludedFromTax(deployer.address);
    const contractExcluded = await panbooToken.isExcludedFromTax(deployment.contracts.PanbooToken.address);
    const charityExcluded = await panbooToken.isExcludedFromTax(deployment.contracts.PanbooToken.charityWallet);
    const masterChefExcluded = await panbooToken.isExcludedFromTax(deployment.contracts.MasterChef.address);

    console.log(`✅ Tax Exclusions:`);
    console.log(`   Owner: ${ownerExcluded}`);
    console.log(`   Contract: ${contractExcluded}`);
    console.log(`   Charity: ${charityExcluded}`);
    console.log(`   MasterChef: ${masterChefExcluded}`);

    if (!ownerExcluded || !contractExcluded || !masterChefExcluded) {
      console.warn("⚠️  Warning: Key addresses not excluded from tax!");
      failed++;
    } else {
      passed++;
    }
  } catch (error) {
    console.error("❌ Failed to check tax exclusions:", error);
    failed++;
  }

  // Test 6: Swap settings
  try {
    const swapThreshold = await panbooToken.swapThreshold();
    const swapEnabled = await panbooToken.swapEnabled();
    const maxSwapBps = await panbooToken.maxSwapBps();
    const minDonationBNB = await panbooToken.minDonationBNB();

    console.log(`✅ Swap Settings:`);
    console.log(`   Threshold: ${ethers.formatUnits(swapThreshold, 18)} PNB`);
    console.log(`   Enabled: ${swapEnabled}`);
    console.log(`   Max Swap: ${Number(maxSwapBps) / 100}%`);
    console.log(`   Min Donation: ${ethers.formatEther(minDonationBNB)} BNB`);
    passed++;
  } catch (error) {
    console.error("❌ Failed to read swap settings:", error);
    failed++;
  }

  // Test 7: Trading enabled
  try {
    const tradingEnabled = await panbooToken.tradingEnabled();
    console.log(`✅ Trading Enabled: ${tradingEnabled}`);

    if (!tradingEnabled) {
      console.warn("⚠️  Warning: Trading is disabled!");
    }
    passed++;
  } catch (error) {
    console.error("❌ Failed to check trading status:", error);
    failed++;
  }

  console.log();
  console.log("=" .repeat(60));
  console.log("MASTERCHEF VALIDATION");
  console.log("=" .repeat(60));

  // Test 8: Reward token
  try {
    const rewardToken = await masterChef.rewardToken();
    console.log(`✅ Reward Token: ${rewardToken}`);

    if (rewardToken !== deployment.contracts.PanbooToken.address) {
      console.error("❌ Reward token mismatch!");
      failed++;
    } else {
      passed++;
    }
  } catch (error) {
    console.error("❌ Failed to read reward token:", error);
    failed++;
  }

  // Test 9: Emission rate
  try {
    const rewardPerBlock = await masterChef.rewardPerBlock();
    const maxRewardPerBlock = await masterChef.MAX_REWARD_PER_BLOCK();

    console.log(`✅ Emission Rate:`);
    console.log(`   Reward Per Block: ${ethers.formatUnits(rewardPerBlock, 18)} PNB`);
    console.log(`   Max Allowed: ${ethers.formatUnits(maxRewardPerBlock, 18)} PNB`);

    if (rewardPerBlock > maxRewardPerBlock) {
      console.error("❌ Emission rate exceeds maximum!");
      failed++;
    } else {
      passed++;
    }
  } catch (error) {
    console.error("❌ Failed to read emission rate:", error);
    failed++;
  }

  // Test 10: Pool info
  try {
    const poolLength = await masterChef.poolLength();
    const totalAllocPoint = await masterChef.totalAllocPoint();

    console.log(`✅ Pools:`);
    console.log(`   Total Pools: ${poolLength}`);
    console.log(`   Total Alloc Points: ${totalAllocPoint}`);

    if (poolLength === 0n) {
      console.warn("⚠️  Warning: No pools added yet!");
    }

    // Check pool 0 if it exists
    if (poolLength > 0n) {
      const pool0 = await masterChef.poolInfo(0);
      console.log(`   Pool 0 LP Token: ${pool0.lpToken}`);
      console.log(`   Pool 0 Alloc Point: ${pool0.allocPoint}`);
      console.log(`   Pool 0 Total Staked: ${ethers.formatUnits(pool0.totalStaked, 18)}`);
    }

    passed++;
  } catch (error) {
    console.error("❌ Failed to read pool info:", error);
    failed++;
  }

  // Test 11: Reward token balance
  try {
    const masterChefBalance = await panbooToken.balanceOf(deployment.contracts.MasterChef.address);
    console.log(`✅ MasterChef PNB Balance: ${ethers.formatUnits(masterChefBalance, 18)} PNB`);

    if (masterChefBalance === 0n) {
      console.error("❌ MasterChef has no reward tokens! Fund it to enable rewards.");
      failed++;
    } else {
      // Estimate days of rewards
      const rewardPerBlock = await masterChef.rewardPerBlock();
      const blocksPerDay = 28800; // BSC: ~3s blocks
      const dailyRewards = rewardPerBlock * BigInt(blocksPerDay);
      const daysOfRewards = masterChefBalance / dailyRewards;

      console.log(`   Estimated days of rewards: ${daysOfRewards} days`);

      if (daysOfRewards < 7n) {
        console.warn("⚠️  Warning: Less than 7 days of rewards remaining!");
      }

      passed++;
    }
  } catch (error) {
    console.error("❌ Failed to check MasterChef balance:", error);
    failed++;
  }

  // Test 12: Ownership
  try {
    const tokenOwner = await panbooToken.owner();
    const masterChefOwner = await masterChef.owner();

    console.log(`✅ Ownership:`);
    console.log(`   Token Owner: ${tokenOwner}`);
    console.log(`   MasterChef Owner: ${masterChefOwner}`);

    if (tokenOwner !== deployer.address || masterChefOwner !== deployer.address) {
      console.warn("⚠️  Warning: Ownership has been transferred!");
    }

    passed++;
  } catch (error) {
    console.error("❌ Failed to check ownership:", error);
    failed++;
  }

  console.log();
  console.log("=" .repeat(60));
  console.log("VALIDATION SUMMARY");
  console.log("=" .repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log("🎉 All validation checks passed!");
    console.log();
    console.log("Next Steps:");
    console.log("1. Add liquidity on PancakeSwap");
    console.log("2. Test small buy/sell transactions");
    console.log("3. Verify donation mechanism");
    console.log("4. Monitor charity wallet for donations");
    console.log("5. Prepare for external security audit");
  } else {
    console.error(`⚠️  ${failed} validation check(s) failed. Please fix before proceeding.`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
