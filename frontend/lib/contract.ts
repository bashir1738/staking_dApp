// Chain ID is read from env so a future re-deploy to a different network
// only needs an .env.local update — no code change required.
export const SEPOLIA_CHAIN_ID: number =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

export const CONTRACT_ADDRESS: string =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000";

// ABI is read from .env.local (NEXT_PUBLIC_CONTRACT_ABI) when set,
// otherwise falls back to the hardcoded constant below.
// This lets you swap in a new ABI after redeployment without touching source.
const _ABI_FALLBACK = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "EnforcedPause", type: "error" },
  { inputs: [], name: "ExpectedPause", type: "error" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }], name: "OwnableInvalidOwner", type: "error" },
  { inputs: [{ internalType: "address", name: "account", type: "address" }], name: "OwnableUnauthorizedAccount", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: "bool", name: "enabled", type: "bool" }],
    name: "EmergencyModeSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "uint256", name: "stakeIndex", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "penalty", type: "uint256" },
    ],
    name: "PenaltyApplied",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "uint256", name: "stakeIndex", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "reward", type: "uint256" },
    ],
    name: "RewardClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "uint256", name: "stakeIndex", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "apr", type: "uint256" },
    ],
    name: "StakeCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "uint256", name: "stakeIndex", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "principal", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "reward", type: "uint256" },
    ],
    name: "StakeWithdrawn",
    type: "event",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "apr", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
    ],
    name: "calculateReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "stakeIndex", type: "uint256" }],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "emergencyMode",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "stakeIndex", type: "uint256" }],
    name: "emergencyUserWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "getAPR",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "stakeIndex", type: "uint256" },
    ],
    name: "getPendingReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getStakeCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserStakes",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "uint256", name: "startTime", type: "uint256" },
          { internalType: "uint256", name: "lastClaimTime", type: "uint256" },
          { internalType: "bool", name: "active", type: "bool" },
        ],
        internalType: "struct ETHStaking.Stake[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "enabled", type: "bool" }],
    name: "setEmergencyMode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPenaltiesCollected",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalRewardsPaid",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStaked",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "stakeIndex", type: "uint256" }],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ABI: any[] = process.env.NEXT_PUBLIC_CONTRACT_ABI
  ? JSON.parse(process.env.NEXT_PUBLIC_CONTRACT_ABI)
  : ([..._ABI_FALLBACK] as unknown as any[]);
