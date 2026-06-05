# Ola Stake — ETH Staking DApp

A decentralized ETH staking platform on Ethereum Sepolia. Users stake ETH and earn tiered APR rewards.

## Live Links

| Item | Link |
|---|---|
| Frontend | `https://your-project.vercel.app` |
| Contract (Sepolia) | _address redacted_ |
| Etherscan | _link redacted_ |

## Tech Stack

| Layer | Tech |
|---|---|
| Smart Contract | Solidity, Hardhat, OpenZeppelin |
| Frontend | Next.js, ethers.js, wagmi, RainbowKit |
| Network | Ethereum Sepolia |
| Deployment | Vercel (frontend), Sepolia (contract) |

## Project Structure

```
staking_dApp/
├── contract/       # Solidity smart contract + Hardhat tests
└── frontend/       # Next.js frontend
```

## Features

- Stake ETH and earn tiered APR rewards (5% / 8% / 12%)
- Multiple independent stakes per wallet
- Claim rewards while keeping principal staked
- 7-day lock period with 10% early withdrawal penalty
- Reward calculation done fully on-chain
- Pause system and emergency mode (owner only)

## Quick Start

```bash
# Smart contract
cd contract
npm install
npx hardhat test

# Frontend
cd frontend
pnpm install
pnpm dev
```

See `contract/README.md` and `frontend/README.md` for full setup instructions.
