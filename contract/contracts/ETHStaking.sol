// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ETHStaking is ReentrancyGuard, Pausable, Ownable, ERC721Enumerable {
    using Strings for uint256;

    uint256 public constant LOCK_PERIOD = 7 days;
    uint256 public constant PENALTY_RATE = 10; // 10%

    // APR in basis points
    uint256 public constant APR_TIER1 = 500;
    uint256 public constant APR_TIER2 = 800;
    uint256 public constant APR_TIER3 = 1200;

    uint256 public constant TIER1_THRESHOLD = 1 ether;
    uint256 public constant TIER2_THRESHOLD = 5 ether;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        bool active;
    }

    // Returned to callers; includes the tokenId for external identification.
    struct StakePosition {
        uint256 tokenId;
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        bool active;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => Stake) private _stakes;

    // Treasury
    uint256 public totalStaked;
    uint256 public totalRewardsPaid;
    uint256 public totalPenaltiesCollected;

    bool public emergencyMode;

    event StakeCreated(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 apr);
    event RewardClaimed(address indexed user, uint256 indexed tokenId, uint256 reward);
    event StakeWithdrawn(address indexed user, uint256 indexed tokenId, uint256 principal, uint256 reward);
    event PenaltyApplied(address indexed user, uint256 indexed tokenId, uint256 penalty);
    event EmergencyModeSet(bool enabled);

    constructor() Ownable(msg.sender) ERC721("Ola Stake Position", "OLASTAKE") {}

    // ─── ERC721 Metadata ────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Stake memory s = _stakes[tokenId];
        uint256 apr = getAPR(s.amount);
        string memory aprLabel = apr == APR_TIER3 ? "12%" : apr == APR_TIER2 ? "8%" : "5%";
        string memory amountStr = _formatEther(s.amount);
        string memory svg = _buildSVG(tokenId, amountStr, aprLabel, _formatDate(s.startTime));
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(_buildJSON(tokenId, amountStr, aprLabel, svg)))
        ));
    }

    function _buildSVG(
        uint256 tokenId,
        string memory amountStr,
        string memory aprLabel,
        string memory dateStr
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            _svgTop(tokenId),
            _svgBottom(amountStr, aprLabel, dateStr)
        ));
    }

    function _svgTop(uint256 tokenId) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">',
            '<rect width="400" height="240" rx="16" fill="#0d0d0d"/>',
            '<rect x="1" y="1" width="398" height="238" rx="15" fill="none" stroke="#2a2a2a" stroke-width="1"/>',
            '<text x="24" y="36" font-family="monospace" font-size="11" fill="#666">OLA STAKE</text>',
            '<text x="376" y="36" font-family="monospace" font-size="11" fill="#555" text-anchor="end"># ',
            tokenId.toString(),
            '</text>'
        ));
    }

    function _svgBottom(
        string memory amountStr,
        string memory aprLabel,
        string memory dateStr
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="24" y="98" font-family="monospace" font-size="32" font-weight="bold" fill="#e8e8e8">',
            amountStr, ' ETH</text>',
            '<text x="376" y="98" font-family="monospace" font-size="18" font-weight="bold" fill="#4ade80" text-anchor="end">',
            aprLabel, ' APR</text>',
            '<line x1="24" y1="120" x2="376" y2="120" stroke="#1e1e1e" stroke-width="1"/>',
            '<text x="24" y="152" font-family="monospace" font-size="10" fill="#555">STAKED</text>',
            '<text x="24" y="172" font-family="monospace" font-size="13" fill="#888">', dateStr, '</text>',
            '<text x="376" y="152" font-family="monospace" font-size="10" fill="#555" text-anchor="end">POSITION</text>',
            '<text x="376" y="172" font-family="monospace" font-size="13" fill="#d4d48a" text-anchor="end">ERC-721</text>',
            '</svg>'
        ));
    }

    function _buildJSON(
        uint256 tokenId,
        string memory amountStr,
        string memory aprLabel,
        string memory svg
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '{"name":"Stake Position #', tokenId.toString(),
            '","description":"ETH staking position on Ola Stake. Holding this NFT grants ownership of the underlying stake and all accrued rewards.",',
            '"attributes":[{"trait_type":"Amount","value":"', amountStr,
            ' ETH"},{"trait_type":"APR","value":"', aprLabel,
            '"},{"trait_type":"Token ID","value":', tokenId.toString(),
            '}],"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));
    }

    function _formatEther(uint256 weiAmount) internal pure returns (string memory) {
        uint256 whole = weiAmount / 1e18;
        uint256 fracWei = weiAmount % 1e18;
        if (fracWei == 0) return whole.toString();
        uint256 frac = fracWei / 1e14; // 4 decimal places
        string memory fracStr = frac.toString();
        while (bytes(fracStr).length < 4) fracStr = string(abi.encodePacked("0", fracStr));
        bytes memory fb = bytes(fracStr);
        uint256 len = fb.length;
        while (len > 1 && fb[len - 1] == bytes1("0")) len--;
        bytes memory trimmed = new bytes(len);
        for (uint256 i = 0; i < len; i++) trimmed[i] = fb[i];
        return string(abi.encodePacked(whole.toString(), ".", string(trimmed)));
    }

    // Howard Hinnant civil date algorithm (https://howardhinnant.github.io/date_algorithms.html)
    function _formatDate(uint256 ts) internal pure returns (string memory) {
        uint256 z = ts / 86400 + 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 y = yoe + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        uint256 d = doy - (153 * mp + 2) / 5 + 1;
        uint256 m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) y += 1;
        string memory ms = m < 10 ? string(abi.encodePacked("0", m.toString())) : m.toString();
        string memory ds = d < 10 ? string(abi.encodePacked("0", d.toString())) : d.toString();
        return string(abi.encodePacked(y.toString(), "-", ms, "-", ds));
    }

    // ─── View helpers ────────────────────────────────────────────────────────────

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

    function getPendingReward(uint256 tokenId) external view returns (uint256) {
        Stake storage s = _stakes[tokenId];
        if (!s.active) return 0;
        return calculateReward(s.amount, getAPR(s.amount), block.timestamp - s.lastClaimTime);
    }

    function getStakeByToken(uint256 tokenId) external view returns (Stake memory) {
        return _stakes[tokenId];
    }

    function getUserStakes(address user) external view returns (StakePosition[] memory positions) {
        uint256 count = balanceOf(user);
        positions = new StakePosition[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 tid = tokenOfOwnerByIndex(user, i);
            Stake storage s = _stakes[tid];
            positions[i] = StakePosition({
                tokenId: tid,
                amount: s.amount,
                startTime: s.startTime,
                lastClaimTime: s.lastClaimTime,
                active: s.active
            });
        }
    }

    function getStakeCount(address user) external view returns (uint256) {
        return balanceOf(user);
    }

    // ─── User actions ────────────────────────────────────────────────────────────

    function stake() external payable nonReentrant whenNotPaused {
        require(!emergencyMode, "Emergency mode active");
        require(msg.value > 0, "Must stake ETH");

        uint256 apr = getAPR(msg.value);
        uint256 tokenId = _nextTokenId++;

        _safeMint(msg.sender, tokenId);
        _stakes[tokenId] = Stake({
            amount: msg.value,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            active: true
        });

        totalStaked += msg.value;
        emit StakeCreated(msg.sender, tokenId, msg.value, apr);
    }

    function claimRewards(uint256 tokenId) external nonReentrant whenNotPaused {
        require(!emergencyMode, "Emergency mode active");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        Stake storage s = _stakes[tokenId];
        require(s.active, "Stake not active");

        uint256 reward = calculateReward(s.amount, getAPR(s.amount), block.timestamp - s.lastClaimTime);
        require(reward > 0, "No rewards to claim");
        require(address(this).balance >= reward, "Insufficient contract balance");

        s.lastClaimTime = block.timestamp;
        totalRewardsPaid += reward;
        emit RewardClaimed(msg.sender, tokenId, reward);

        (bool ok, ) = msg.sender.call{value: reward}("");
        require(ok, "Transfer failed");
    }

    function unstake(uint256 tokenId) external nonReentrant whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        Stake storage s = _stakes[tokenId];
        require(s.active, "Stake not active");

        uint256 reward = calculateReward(s.amount, getAPR(s.amount), block.timestamp - s.lastClaimTime);
        uint256 principal = s.amount;
        uint256 penalty = 0;

        if (block.timestamp < s.startTime + LOCK_PERIOD) {
            penalty = (principal * PENALTY_RATE) / 100;
            principal -= penalty;
            totalPenaltiesCollected += penalty;
            emit PenaltyApplied(msg.sender, tokenId, penalty);
        }

        uint256 payout = principal + reward;
        require(address(this).balance >= payout, "Insufficient contract balance");

        s.active = false;
        totalStaked -= s.amount;
        totalRewardsPaid += reward;
        emit StakeWithdrawn(msg.sender, tokenId, principal, reward);

        _burn(tokenId);

        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "Transfer failed");
    }

    /// @dev Returns principal immediately with no rewards. Burns the NFT.
    function emergencyUserWithdraw(uint256 tokenId) external nonReentrant {
        require(emergencyMode, "Emergency mode not active");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        Stake storage s = _stakes[tokenId];
        require(s.active, "Stake not active");

        uint256 principal = s.amount;
        s.active = false;
        totalStaked -= principal;
        require(address(this).balance >= principal, "Insufficient contract balance");

        emit StakeWithdrawn(msg.sender, tokenId, principal, 0);
        _burn(tokenId);

        (bool ok, ) = msg.sender.call{value: principal}("");
        require(ok, "Transfer failed");
    }

    // ─── Owner controls ──────────────────────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

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
