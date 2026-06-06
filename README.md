# Ola Stake — ETH Staking DApp

A decentralized ETH staking platform on Ethereum Sepolia. Users stake ETH and earn tiered APR rewards.

## Live Links

| Item | Link |
|---|---|
| Frontend | https://staking-d-app-phi.vercel.app |
| Contract (Sepolia) | `0x9C8eeD0EF12BC79093d0f7423DC50E5d4B6a44c4` |
| Etherscan | https://sepolia.etherscan.io/address/0x9C8eeD0EF12BC79093d0f7423DC50E5d4B6a44c4#code |

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
- Pause system (owner) — blocks staking, claiming, and unstaking
- Emergency mode (owner) — users can instantly withdraw principal (no rewards, no penalty)

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
