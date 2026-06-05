require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY
  ? `0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`
  : "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ||
        `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=11155111",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};
