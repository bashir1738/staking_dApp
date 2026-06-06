// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ETHStaking is ReentrancyGuard, Pausable, Ownable {
    uint256 public constant LOCK_PERIOD = 7 days;
    uint256 public constant PENALTY_RATE = 10; // 10%

    // APR in basis points: 500 = 5%, 800 = 8%, 1200 = 12%
    uint256 public constant APR_TIER1 = 500;
    uint256 public constant APR_TIER2 = 800;
    uint256 public constant APR_TIER3 = 1200;

    uint256 public constant TIER1_THRESHOLD = 1 ether;  // < 1 ETH → tier 1
    uint256 public constant TIER2_THRESHOLD = 5 ether;  // < 5 ETH → tier 2

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        bool active;
    }

    mapping(address => Stake[]) private _stakes;

    // Treasury
    uint256 public totalStaked;
    uint256 public totalRewardsPaid;
    uint256 public totalPenaltiesCollected;

    bool public emergencyMode;

    event StakeCreated(address indexed user, uint256 indexed stakeIndex, uint256 amount, uint256 apr);
    event RewardClaimed(address indexed user, uint256 indexed stakeIndex, uint256 reward);
    event StakeWithdrawn(address indexed user, uint256 indexed stakeIndex, uint256 principal, uint256 reward);
    event PenaltyApplied(address indexed user, uint256 indexed stakeIndex, uint256 penalty);
    event EmergencyModeSet(bool enabled);

    constructor() Ownable(msg.sender) {}

    // ─── View helpers ───────────────────────────────────────────────────────────

    function getAPR(uint256 amount) public pure returns (uint256) {
        if (amount >= TIER2_THRESHOLD) return APR_TIER3;
        if (amount >= TIER1_THRESHOLD) return APR_TIER2;
        return APR_TIER1;
    }

    function calculateReward(
        uint256 amount,
        uint256 apr,
        uint256 duration
    ) public pure returns (uint256) {
        return (amount * apr * duration) / (365 days * 10_000);
    }

    function getPendingReward(address user, uint256 stakeIndex) external view returns (uint256) {
        Stake storage s = _stakes[user][stakeIndex];
        if (!s.active) return 0;
        return calculateReward(s.amount, getAPR(s.amount), block.timestamp - s.lastClaimTime);
    }

    function getUserStakes(address user) external view returns (Stake[] memory) {
        return _stakes[user];
    }

    function getStakeCount(address user) external view returns (uint256) {
        return _stakes[user].length;
    }

    // ─── User actions ────────────────────────────────────────────────────────────

    function stake() external payable nonReentrant whenNotPaused {
        require(!emergencyMode, "Emergency mode active");
        require(msg.value > 0, "Must stake ETH");

        uint256 apr = getAPR(msg.value);
        uint256 idx = _stakes[msg.sender].length;

        _stakes[msg.sender].push(Stake({
            amount: msg.value,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            active: true
        }));

        totalStaked += msg.value;

        emit StakeCreated(msg.sender, idx, msg.value, apr);
    }

    function claimRewards(uint256 stakeIndex) external nonReentrant whenNotPaused {
        require(!emergencyMode, "Emergency mode active");
        Stake storage s = _stakes[msg.sender][stakeIndex];
        require(s.active, "Stake not active");

        uint256 reward = calculateReward(s.amount, getAPR(s.amount), block.timestamp - s.lastClaimTime);
        require(reward > 0, "No rewards to claim");
        require(address(this).balance >= reward, "Insufficient contract balance");

        s.lastClaimTime = block.timestamp;
        totalRewardsPaid += reward;

        emit RewardClaimed(msg.sender, stakeIndex, reward);

        (bool ok, ) = msg.sender.call{value: reward}("");
        require(ok, "Transfer failed");
    }

    function unstake(uint256 stakeIndex) external nonReentrant whenNotPaused {
        require(stakeIndex < _stakes[msg.sender].length, "Invalid stake index");
        Stake storage s = _stakes[msg.sender][stakeIndex];
        require(s.active, "Stake not active");

        uint256 reward = calculateReward(s.amount, getAPR(s.amount), block.timestamp - s.lastClaimTime);
        uint256 principal = s.amount;
        uint256 penalty = 0;

        if (block.timestamp < s.startTime + LOCK_PERIOD) {
            penalty = (principal * PENALTY_RATE) / 100;
            principal -= penalty;
            totalPenaltiesCollected += penalty;
            emit PenaltyApplied(msg.sender, stakeIndex, penalty);
        }

        uint256 payout = principal + reward;
        require(address(this).balance >= payout, "Insufficient contract balance");

        s.active = false;
        totalStaked -= s.amount;
        totalRewardsPaid += reward;

        emit StakeWithdrawn(msg.sender, stakeIndex, principal, reward);

        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "Transfer failed");
    }

    /// @dev Lets users withdraw principal immediately when emergency mode is active.
    ///      No rewards are paid; no penalty is applied.
    function emergencyUserWithdraw(uint256 stakeIndex) external nonReentrant {
        require(emergencyMode, "Emergency mode not active");
        require(stakeIndex < _stakes[msg.sender].length, "Invalid stake index");
        Stake storage s = _stakes[msg.sender][stakeIndex];
        require(s.active, "Stake not active");

        uint256 principal = s.amount;
        s.active = false;
        totalStaked -= principal;

        require(address(this).balance >= principal, "Insufficient contract balance");

        emit StakeWithdrawn(msg.sender, stakeIndex, principal, 0);

        (bool ok, ) = msg.sender.call{value: principal}("");
        require(ok, "Transfer failed");
    }

    // ─── Owner controls ───────────────────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setEmergencyMode(bool enabled) external onlyOwner {
        emergencyMode = enabled;
        emit EmergencyModeSet(enabled);
    }

    /// @dev Sweeps all ETH to the owner. Only callable in emergency mode.
    function emergencyWithdraw() external onlyOwner {
        require(emergencyMode, "Not in emergency mode");
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        (bool ok, ) = owner().call{value: balance}("");
        require(ok, "Transfer failed");
    }

    receive() external payable {}
}
