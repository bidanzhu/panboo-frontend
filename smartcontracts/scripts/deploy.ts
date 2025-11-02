import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying Panboo contracts to BSC...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB\n");

  // Configuration
  const TOKEN_NAME = "Panboo";
  const TOKEN_SYMBOL = "PNB";
  const TOTAL_SUPPLY = ethers.parseUnits("10000000000", 18); // 10 billion tokens
  const CHARITY_WALLET = process.env.CHARITY_WALLET || deployer.address;

  // Network-specific router
  const network = await ethers.provider.getNetwork();
  const PANCAKE_ROUTER = network.chainId === 56n
    ? "0x10ED43C718714eb63d5aA57B78B54704E256024E" // BSC Mainnet
    : "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"; // BSC Testnet

  const PANCAKE_FACTORY = network.chainId === 56n
    ? "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73" // BSC Mainnet
    : "0x6725F303b657a9451d8BA641348b6761A6CC7a17"; // BSC Testnet

  // Reward emission: 100 PNB per block (~3 seconds) - Bootstrap phase
  // This gives ~53% APR with moderate TVL. Adjust via admin panel as needed.
  const REWARD_PER_BLOCK = ethers.parseUnits("100", 18);
  const START_BLOCK = await ethers.provider.getBlockNumber() + 100; // Start in ~5 minutes

  console.log("Configuration:");
  console.log("- Token Name:", TOKEN_NAME);
  console.log("- Token Symbol:", TOKEN_SYMBOL);
  console.log("- Total Supply:", ethers.formatUnits(TOTAL_SUPPLY, 18));
  console.log("- Charity Wallet:", CHARITY_WALLET);
  console.log("- Reward Per Block:", ethers.formatUnits(REWARD_PER_BLOCK, 18), "PNB");
  console.log("- Start Block:", START_BLOCK);
  console.log();

  // Deploy PanbooToken
  console.log("📜 Deploying PanbooToken...");
  const PanbooToken = await ethers.getContractFactory("PanbooToken");
  const panbooToken = await PanbooToken.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOTAL_SUPPLY,
    CHARITY_WALLET,
    PANCAKE_ROUTER
  );
  await panbooToken.waitForDeployment();
  const tokenAddress = await panbooToken.getAddress();
  console.log("✅ PanbooToken deployed to:", tokenAddress);
  console.log();

  // Get pancake pair address
  const pancakePair = await panbooToken.pancakePair();
  console.log("🥞 PancakeSwap LP Pair:", pancakePair);
  console.log();

  // Deploy MasterChef
  console.log("👨‍🍳 Deploying MasterChef...");
  const MasterChef = await ethers.getContractFactory("MasterChef");
  const masterChef = await MasterChef.deploy(
    tokenAddress,
    REWARD_PER_BLOCK,
    START_BLOCK
  );
  await masterChef.waitForDeployment();
  const masterChefAddress = await masterChef.getAddress();
  console.log("✅ MasterChef deployed to:", masterChefAddress);
  console.log();

  // Exclude MasterChef from tax
  console.log("⚙️  Excluding MasterChef from tax...");
  const excludeTx = await panbooToken.setExcludedFromTax(masterChefAddress, true);
  await excludeTx.wait();
  console.log("✅ MasterChef excluded from tax");
  console.log();

  // Transfer tokens to MasterChef for rewards
  const REWARD_POOL = ethers.parseUnits("2500000000", 18); // 2.5B tokens for staking rewards (25% of supply)
  console.log("💰 Transferring", ethers.formatUnits(REWARD_POOL, 18), "PNB to MasterChef...");
  const transferTx = await panbooToken.transfer(masterChefAddress, REWARD_POOL);
  await transferTx.wait();
  console.log("✅ Reward pool funded");
  console.log();

  // Add initial pool (PNB/BNB LP)
  console.log("🌾 Adding PNB/BNB LP pool to MasterChef...");
  const addPoolTx = await masterChef.add(
    1000, // allocation points
    pancakePair,
    false // don't mass update pools
  );
  await addPoolTx.wait();
  console.log("✅ Pool added");
  console.log();

  // Save deployment info
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PanbooToken: {
        address: tokenAddress,
        charityWallet: CHARITY_WALLET,
        pancakePair: pancakePair,
      },
      MasterChef: {
        address: masterChefAddress,
        rewardPerBlock: ethers.formatUnits(REWARD_PER_BLOCK, 18),
        startBlock: START_BLOCK,
      },
    },
    config: {
      totalSupply: ethers.formatUnits(TOTAL_SUPPLY, 18),
      rewardPool: ethers.formatUnits(REWARD_POOL, 18),
    },
  };

  const deploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("📄 Deployment info saved to:", deploymentPath);
  console.log();

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log();
  console.log("Contract Addresses:");
  console.log("- PANBOO Token:", tokenAddress);
  console.log("- MasterChef:", masterChefAddress);
  console.log("- Charity Wallet:", CHARITY_WALLET);
  console.log("- PANBOO/BNB Pair:", pancakePair);
  console.log();
  console.log("Next Steps:");
  console.log("1. Verify contracts on BscScan:");
  console.log("   npx hardhat verify --network bscTestnet", tokenAddress);
  console.log("   npx hardhat verify --network bscTestnet", masterChefAddress);
  console.log();
  console.log("2. Add liquidity to PancakeSwap:");
  console.log("   https://pancakeswap.finance/add/BNB/" + tokenAddress);
  console.log();
  console.log("3. Update frontend .env with contract addresses");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
