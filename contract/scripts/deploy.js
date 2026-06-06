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

  // Write CONTRACT_ADDRESS and ABI into the frontend .env.local
  const frontendEnvPath = path.resolve(__dirname, "../../frontend/.env.local");
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/ETHStaking.sol/ETHStaking.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiJson = JSON.stringify(artifact.abi);

  const updates = {
    NEXT_PUBLIC_CONTRACT_ADDRESS: address,
    NEXT_PUBLIC_CONTRACT_ABI: abiJson,
  };

  let existing = fs.existsSync(frontendEnvPath) ? fs.readFileSync(frontendEnvPath, "utf8") : "";

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    if (existing.includes(`${key}=`)) {
      existing = existing.replace(new RegExp(`${key}=.*`), line);
    } else {
      existing += `\n${line}`;
    }
  }

  fs.writeFileSync(frontendEnvPath, existing);
  console.log("\nWrote NEXT_PUBLIC_CONTRACT_ADDRESS and NEXT_PUBLIC_CONTRACT_ABI to frontend/.env.local");
  console.log("\nVerify on Etherscan (run after a few block confirmations):");
  console.log(`  npx hardhat verify --network sepolia ${address}`);

  return address;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
