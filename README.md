# Ola Stake — ETH Staking DApp

A decentralized ETH staking platform on Ethereum Sepolia. Stake ETH, earn tiered APR rewards, and receive an ERC-721 NFT representing your position — available on web and mobile.

## Live Links

| Item | Link |
|---|---|
| Web App | https://staking-d-app-phi.vercel.app |
| Contract (Sepolia) | `0xB7e7BBF94b6CAed0AFDED631c0eF33a9A9e2696C` |
| Etherscan | https://sepolia.etherscan.io/address/0xB7e7BBF94b6CAed0AFDED631c0eF33a9A9e2696C#code |

## Tech Stack

| Layer | Tech |
|---|---|
| Smart Contract | Solidity · Hardhat · OpenZeppelin (ERC-721, Pausable, ReentrancyGuard) |
| Web Frontend | Next.js 16 · ethers.js v6 · wagmi v2 · RainbowKit |
| Mobile App | Expo SDK 54 · React Native 0.81 · expo-router · ethers.js v6 · AppKit (WalletConnect) |
| Network | Ethereum Sepolia testnet |
| Deployment | Vercel (web) · Sepolia (contract) |

## Project Structure

```
staking_dApp/
├── contract/                   # Solidity smart contract
│   ├── contracts/
│   │   └── ETHStaking.sol      # Main contract (ERC-721 + staking logic)
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── ETHStaking.js
│   └── hardhat.config.js
│
├── frontend/                   # Next.js web app
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AdminPanel.tsx
│   │   ├── Dashboard.tsx
│   │   ├── NetworkGuard.tsx
│   │   ├── StakeCard.tsx
│   │   ├── StakeForm.tsx
│   │   ├── TxHistory.tsx
│   │   ├── TxStatus.tsx
│   │   └── WalletButton.tsx
│   ├── hooks/
│   │   ├── useEthersSigner.ts
│   │   ├── useStaking.ts
│   │   └── useWallet.ts
│   └── lib/
│       ├── contract.ts         # ABI + contract address
│       ├── utils.ts
│       └── wagmi-config.ts
│
└── mobile/                     # Expo React Native app
    ├── app/
    │   ├── _layout.tsx         # Root layout · AppKit setup · onboarding gate
    │   └── (tabs)/
    │       ├── _layout.tsx     # Tab navigator (Stake / History / Account)
    │       ├── index.tsx       # Main staking screen
    │       ├── history.tsx     # Transaction history
    │       └── admin.tsx       # Account info + owner admin panel
    ├── components/
    │   ├── onboarding-screen.tsx   # 3-slide onboarding with animated dots
    │   ├── dashboard.tsx
    │   ├── stake-form.tsx
    │   ├── stake-card.tsx          # Claim · Unstake · Transfer NFT
    │   ├── tx-history.tsx
    │   ├── tx-status-toast.tsx
    │   ├── admin-panel.tsx
    │   └── wallet-button.tsx
    ├── hooks/
    │   ├── use-wallet.ts       # AppKit wallet state + ethers signer
    │   └── use-staking.ts      # Contract reads/writes + AsyncStorage history
    ├── lib/
    │   ├── contract.ts         # ABI · address · RPC URL (reads from .env)
    │   ├── evm-adapter.ts      # WalletConnect EVM adapter for AppKit
    │   └── utils.ts
    ├── constants/
    │   └── theme.ts            # Design tokens (dark palette)
    ├── metro.config.js         # Custom resolver: @reown → compiled JS, cross-fetch → RN ponyfill
    └── .env                    # EXPO_PUBLIC_* vars (not committed)
```

## Smart Contract

`ETHStaking` is an ERC-721 NFT contract — each stake mints a position token.

### APR Tiers

| Tier | Amount | APR |
|---|---|---|
| Tier 1 | < 1 ETH | 5% |
| Tier 2 | 1 – 4.99 ETH | 8% |
| Tier 3 | ≥ 5 ETH | 12% |

### Key rules
- **Lock period** — 7 days. Withdrawing early incurs a 10% penalty on principal.
- **Rewards** — accrue per-second from last claim time; claimable without unstaking.
- **NFT transfer** — transferring the ERC-721 token transfers full ownership of the stake and all accrued rewards to the recipient.
- **Emergency mode** — owner can activate to let users withdraw principal instantly (no rewards, no penalty). Normal staking/claiming is blocked.
- **Pause** — owner can pause all user actions without entering emergency mode.

## Features

| Feature | Web | Mobile |
|---|---|---|
| Connect wallet | RainbowKit (MetaMask, WC, Coinbase…) | WalletConnect modal (AppKit) |
| Stake ETH | ✓ | ✓ |
| Claim rewards | ✓ | ✓ |
| Unstake (with early-exit warning) | ✓ | ✓ |
| Transfer NFT stake position | ✓ | ✓ |
| Emergency withdraw | ✓ | ✓ |
| Transaction history | localStorage | AsyncStorage |
| Owner admin panel | ✓ | ✓ |
| Network guard (Sepolia check) | ✓ | ✓ |
| Onboarding screens | — | 3-slide animated onboarding |
| Live contract event updates | ✓ | ✓ |
| 30s auto-refresh | ✓ | ✓ |

## Quick Start

### Smart contract

```bash
cd contract
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia
```

### Web frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in WalletConnect project ID + contract address
npm run dev
```

### Mobile app

```bash
cd mobile
npm install
cp .env.example .env               # fill in EXPO_PUBLIC_* vars
npx expo start --clear             # Expo Go (UI/read-only) or dev build (full wallet)
```

**Full wallet support** (connecting to MetaMask, etc.) requires a native development build:

```bash
npx expo install expo-dev-client
npx expo run:ios      # requires Xcode
npx expo run:android  # requires Android Studio
```

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID (11155111 for Sepolia) |

### Mobile (`mobile/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `EXPO_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address |
| `EXPO_PUBLIC_CHAIN_ID` | Chain ID (11155111 for Sepolia) |
| `EXPO_PUBLIC_RPC_URL` | Sepolia JSON-RPC endpoint |
