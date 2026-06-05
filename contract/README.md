# ETHStaking — Smart Contract

Solidity staking contract deployed on Ethereum Sepolia.

## Deployed Contract

| Network | Address |
|---|---|
| Sepolia | _address redacted_ |

Verified on Etherscan: _link redacted_

## How It Works

Users deposit ETH and earn rewards based on stake size:

| Amount | APR |
|---|---|
| 0 – 0.99 ETH | 5% |
| 1 – 4.99 ETH | 8% |
| 5+ ETH | 12% |

- Rewards accrue every second on-chain
- 7-day lock period per stake
- 10% penalty for early withdrawal
- Multiple stakes per wallet, each tracked independently

## Setup

```bash
npm install
```

Create a `.env` file (see `.env.example`):

```
PRIVATE_KEY=your_wallet_private_key_without_0x
INFURA_API_KEY=your_infura_key
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=your_etherscan_key
```

## Commands

```bash
# Compile
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Contract Functions

| Function | Description |
|---|---|
| `stake()` | Deposit ETH, starts earning rewards |
| `claimRewards(index)` | Claim accrued rewards, principal stays staked |
| `unstake(index)` | Withdraw principal + rewards (10% penalty if early) |
| `getUserStakes(address)` | Returns all stakes for a wallet |
| `getPendingReward(address, index)` | Returns current pending reward |
| `pause()` / `unpause()` | Owner only — disables all user actions |
| `setEmergencyMode(bool)` | Owner only — enables emergency mode |
| `emergencyWithdraw()` | Owner only — sweeps contract balance |

## Security

- `ReentrancyGuard` — prevents reentrancy attacks
- `Pausable` — owner can pause the contract
- `Ownable` — access control for admin functions
- Input validation on all state-changing functions

## Tests

30 tests covering:

- Staking (zero ETH, multiple stakes, APR tiers)
- Reward accumulation and claiming
- Normal and early withdrawal with penalty
- Pause and emergency mode access control
- Treasury tracking
