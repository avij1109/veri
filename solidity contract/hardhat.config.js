require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "your_private_key_here";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: PRIVATE_KEY !== "your_private_key_here" ? [PRIVATE_KEY] : [],
      gas: 3000000,
      gasPrice: 30000000000, // 30 gwei
    },
    hardhat: {
      chainId: 31337
    }
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: "your_snowtrace_api_key"
    }
  }
};