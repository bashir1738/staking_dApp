const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:  ", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:   ", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has no ETH — fund the wallet first");
  }

  console.log("\nDeploying ETHStaking...");
  const Factory = await ethers.getContractFactory("ETHStaking");
  const staking = await Factory.deploy();
  await staking.waitForDeployment();

  const address = await staking.getAddress();
  const receipt = await staking.deploymentTransaction().wait(1);

  console.log("Contract:  ", address);
  console.log("Tx hash:   ", receipt.hash);
  console.log("Block:     ", receipt.blockNumber);

  // Write CONTRACT_ADDRESS into the frontend .env.local
  const frontendEnvPath = path.resolve(__dirname, "../../frontend/.env.local");
  const line = `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}\n`;

  let existing = "";
  if (fs.existsSync(frontendEnvPath)) {
    existing = fs.readFileSync(frontendEnvPath, "utf8");
    // Replace existing entry if present
    if (existing.includes("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
      existing = existing.replace(/NEXT_PUBLIC_CONTRACT_ADDRESS=.*/g, line.trim());
      fs.writeFileSync(frontendEnvPath, existing);
    } else {
      fs.appendFileSync(frontendEnvPath, `\n${line}`);
    }
  } else {
    fs.writeFileSync(frontendEnvPath, line);
  }

  console.log("\nWrote NEXT_PUBLIC_CONTRACT_ADDRESS to frontend/.env.local");
  console.log("\nVerify on Etherscan (run after a few block confirmations):");
  console.log(`  npx hardhat verify --network sepolia ${address}`);

  return address;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
