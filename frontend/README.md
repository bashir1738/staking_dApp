# Ola Stake — Frontend

Next.js frontend for the ETH staking platform.

## Live URL

`https://your-project.vercel.app`

## Tech Stack

- Next.js 16 (App Router)
- ethers.js v6
- wagmi + RainbowKit (wallet connection)
- Tailwind CSS v4
- TypeScript

## Setup

```bash
pnpm install
```

Create a `.env.local` file (see `.env.local.example`):

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ABI=[...abi json...]
```

## Commands

```bash
# Run locally
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open http://localhost:3000 in your browser.

## Features

- Connect wallet via RainbowKit (MetaMask, WalletConnect, and more)
- Network guard — prompts user to switch to Sepolia
- Dashboard showing total staked, active positions, claimable rewards
- Stake form with live APR tier preview and MAX button
- Per-stake cards with Claim and Unstake actions
- Lock countdown and early penalty warning
- Transaction history stored in localStorage
- Loading states: Waiting for Signature → Pending → Confirmed

## Deploy to Vercel

1. Push the `frontend/` folder to a GitHub repository
2. Import the repo in Vercel
3. Set the root directory to `frontend`
4. Add the environment variables from `.env.local`
5. Deploy
