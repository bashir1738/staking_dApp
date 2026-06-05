const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const SEVEN_DAYS = 7 * 24 * 60 * 60;
const ONE_DAY = 24 * 60 * 60;

describe("ETHStaking", function () {
  let staking, owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ETHStaking");
    staking = await Factory.deploy();

    // Seed contract with reward funds
    await owner.sendTransaction({ to: staking.target, value: ethers.parseEther("100") });
  });

  // ─── APR tiers ────────────────────────────────────────────────────────────────

  describe("APR tiers", function () {
    it("returns 5% (500 bps) for < 1 ETH", async function () {
      expect(await staking.getAPR(ethers.parseEther("0.5"))).to.equal(500);
    });

    it("returns 8% (800 bps) for 1–4.99 ETH", async function () {
      expect(await staking.getAPR(ethers.parseEther("1"))).to.equal(800);
      expect(await staking.getAPR(ethers.parseEther("4.99"))).to.equal(800);
    });

    it("returns 12% (1200 bps) for >= 5 ETH", async function () {
      expect(await staking.getAPR(ethers.parseEther("5"))).to.equal(1200);
      expect(await staking.getAPR(ethers.parseEther("10"))).to.equal(1200);
    });
  });

  // ─── Staking ──────────────────────────────────────────────────────────────────

  describe("stake()", function () {
    it("creates a stake and increments totalStaked", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      expect(await staking.totalStaked()).to.equal(ethers.parseEther("2"));
    });

    it("emits StakeCreated with correct APR", async function () {
      await expect(
        staking.connect(alice).stake({ value: ethers.parseEther("2") })
      )
        .to.emit(staking, "StakeCreated")
        .withArgs(alice.address, 0, ethers.parseEther("2"), 800);
    });

    it("supports multiple stakes per user", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      const stakes = await staking.getUserStakes(alice.address);
      expect(stakes.length).to.equal(2);
    });

    it("reverts when staking 0 ETH", async function () {
      await expect(staking.connect(alice).stake({ value: 0 })).to.be.revertedWith("Must stake ETH");
    });

    it("reverts when paused", async function () {
      await staking.pause();
      await expect(
        staking.connect(alice).stake({ value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(staking, "EnforcedPause");
    });

    it("reverts in emergency mode", async function () {
      await staking.setEmergencyMode(true);
      await expect(
        staking.connect(alice).stake({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Emergency mode active");
    });
  });

  // ─── Rewards ──────────────────────────────────────────────────────────────────

  describe("reward calculation", function () {
    it("calculates reward proportional to time", async function () {
      const amount = ethers.parseEther("1"); // APR = 800 bps
      // 30 days
      const duration = 30 * ONE_DAY;
      const expected = (amount * 800n * BigInt(duration)) / (BigInt(365 * ONE_DAY) * 10_000n);
      expect(await staking.calculateReward(amount, 800, duration)).to.equal(expected);
    });

    it("getPendingReward increases over time", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(ONE_DAY);
      const r1 = await staking.getPendingReward(alice.address, 0);
      await time.increase(ONE_DAY);
      const r2 = await staking.getPendingReward(alice.address, 0);
      expect(r2).to.be.gt(r1);
    });
  });

  // ─── Claim rewards ────────────────────────────────────────────────────────────

  describe("claimRewards()", function () {
    it("pays out reward and resets lastClaimTime", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(30 * ONE_DAY);

      const before = await ethers.provider.getBalance(alice.address);
      const pending = await staking.getPendingReward(alice.address, 0);

      const tx = await staking.connect(alice).claimRewards(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;

      const after = await ethers.provider.getBalance(alice.address);
      expect(after).to.be.closeTo(before + pending - gasCost, ethers.parseEther("0.0001"));
    });

    it("emits RewardClaimed", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(30 * ONE_DAY);
      await expect(staking.connect(alice).claimRewards(0)).to.emit(staking, "RewardClaimed");
    });

    it("keeps principal staked after claim", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(30 * ONE_DAY);
      await staking.connect(alice).claimRewards(0);

      const stakes = await staking.getUserStakes(alice.address);
      expect(stakes[0].active).to.be.true;
      expect(stakes[0].amount).to.equal(ethers.parseEther("1"));
    });

    it("reverts when claiming on an inactive stake", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await staking.connect(alice).unstake(0);
      await expect(staking.connect(alice).claimRewards(0)).to.be.revertedWith("Stake not active");
    });

    it("reverts when paused", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(ONE_DAY);
      await staking.pause();
      await expect(staking.connect(alice).claimRewards(0)).to.be.revertedWithCustomError(
        staking,
        "EnforcedPause"
      );
    });
  });

  // ─── Unstake (normal) ─────────────────────────────────────────────────────────

  describe("unstake() after lock period", function () {
    it("returns principal + reward with no penalty", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      await time.increase(SEVEN_DAYS + ONE_DAY);

      const pending = await staking.getPendingReward(alice.address, 0);
      const before = await ethers.provider.getBalance(alice.address);

      const tx = await staking.connect(alice).unstake(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      expect(after).to.be.closeTo(
        before + ethers.parseEther("2") + pending - gasCost,
        ethers.parseEther("0.0001")
      );
    });

    it("marks stake as inactive and decrements totalStaked", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await staking.connect(alice).unstake(0);

      const stakes = await staking.getUserStakes(alice.address);
      expect(stakes[0].active).to.be.false;
      expect(await staking.totalStaked()).to.equal(0);
    });

    it("emits StakeWithdrawn", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await expect(staking.connect(alice).unstake(0)).to.emit(staking, "StakeWithdrawn");
    });
  });

  // ─── Early withdrawal penalty ─────────────────────────────────────────────────

  describe("unstake() early withdrawal", function () {
    it("applies 10% penalty before lock period ends", async function () {
      const stakeAmount = ethers.parseEther("1");
      await staking.connect(alice).stake({ value: stakeAmount });
      await time.increase(ONE_DAY); // only 1 day, lock is 7

      const before = await ethers.provider.getBalance(alice.address);
      const tx = await staking.connect(alice).unstake(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      const penalty = stakeAmount / 10n;
      const expectedPrincipal = stakeAmount - penalty;

      // net received ≈ principal - penalty (reward is tiny for 1 day, ignore in comparison)
      expect(after - before + gasCost).to.be.lt(stakeAmount);
      expect(after - before + gasCost).to.be.gte(expectedPrincipal);
    });

    it("emits PenaltyApplied and increments totalPenaltiesCollected", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(ONE_DAY);

      await expect(staking.connect(alice).unstake(0))
        .to.emit(staking, "PenaltyApplied")
        .withArgs(alice.address, 0, ethers.parseEther("1") / 10n);

      expect(await staking.totalPenaltiesCollected()).to.equal(ethers.parseEther("0.1"));
    });

    it("does not penalise when exactly at lock period boundary", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS);

      await expect(staking.connect(alice).unstake(0)).to.not.emit(staking, "PenaltyApplied");
    });
  });

  // ─── Owner controls ───────────────────────────────────────────────────────────

  describe("Ownership & access control", function () {
    it("only owner can pause/unpause", async function () {
      await expect(staking.connect(alice).pause()).to.be.revertedWithCustomError(
        staking,
        "OwnableUnauthorizedAccount"
      );
      await staking.pause();
      await staking.unpause();
    });

    it("only owner can set emergency mode", async function () {
      await expect(staking.connect(alice).setEmergencyMode(true)).to.be.revertedWithCustomError(
        staking,
        "OwnableUnauthorizedAccount"
      );
    });

    it("emergency withdraw sweeps all ETH to owner", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      await staking.setEmergencyMode(true);

      const before = await ethers.provider.getBalance(owner.address);
      const contractBalance = await ethers.provider.getBalance(staking.target);

      const tx = await staking.emergencyWithdraw();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const after = await ethers.provider.getBalance(owner.address);

      expect(after).to.be.closeTo(before + contractBalance - gasCost, ethers.parseEther("0.0001"));
      expect(await ethers.provider.getBalance(staking.target)).to.equal(0);
    });

    it("emergencyWithdraw reverts when not in emergency mode", async function () {
      await expect(staking.emergencyWithdraw()).to.be.revertedWith("Not in emergency mode");
    });
  });

  // ─── Multiple stakes ──────────────────────────────────────────────────────────

  describe("Multiple stakes", function () {
    it("each stake is tracked independently", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("0.5") }); // APR 5%
      await time.increase(ONE_DAY);
      await staking.connect(alice).stake({ value: ethers.parseEther("5") });   // APR 12%
      await time.increase(ONE_DAY);

      const r0 = await staking.getPendingReward(alice.address, 0);
      const r1 = await staking.getPendingReward(alice.address, 1);

      // Stake 1 (5 ETH @ 12%) should have higher reward despite less elapsed time
      // 0.5 ETH @ 5% for 2 days vs 5 ETH @ 12% for 1 day
      // 0.5*500*2 = 500 vs 5*1200*1 = 6000 — stake 1 wins
      expect(r1).to.be.gt(r0);
    });

    it("unstaking one stake does not affect others", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      await time.increase(SEVEN_DAYS + ONE_DAY);

      await staking.connect(alice).unstake(0);

      const stakes = await staking.getUserStakes(alice.address);
      expect(stakes[0].active).to.be.false;
      expect(stakes[1].active).to.be.true;
    });
  });

  // ─── Treasury ─────────────────────────────────────────────────────────────────

  describe("Treasury tracking", function () {
    it("tracks totalStaked correctly across multiple users", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await staking.connect(bob).stake({ value: ethers.parseEther("3") });
      expect(await staking.totalStaked()).to.equal(ethers.parseEther("4"));

      await time.increase(SEVEN_DAYS + ONE_DAY);
      await staking.connect(alice).unstake(0);
      expect(await staking.totalStaked()).to.equal(ethers.parseEther("3"));
    });

    it("increments totalRewardsPaid on claim", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(30 * ONE_DAY);
      await staking.connect(alice).claimRewards(0);
      expect(await staking.totalRewardsPaid()).to.be.gt(0);
    });
  });
});
