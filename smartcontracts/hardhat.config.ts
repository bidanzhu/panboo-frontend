import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ledger";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Testnet - uses private key from .env (for testing only)
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    // Mainnet with private key (NOT RECOMMENDED - use bscMainnetLedger instead)
    bscMainnet: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    // Mainnet with Ledger hardware wallet (RECOMMENDED for production)
    bscMainnetLedger: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
      ledgerAccounts: [
        process.env.LEDGER_ADDRESS || "0x0000000000000000000000000000000000000000"
      ],
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY || "",
  },
};

export default config;
