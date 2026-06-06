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

  // ─── ERC721 metadata ─────────────────────────────────────────────────────────

  describe("ERC721 metadata", function () {
    it("has correct name and symbol", async function () {
      expect(await staking.name()).to.equal("Ola Stake Position");
      expect(await staking.symbol()).to.equal("OLASTAKE");
    });

    it("returns a valid base64-encoded JSON tokenURI", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      const uri = await staking.tokenURI(0);
      expect(uri).to.match(/^data:application\/json;base64,/);
      const json = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString());
      expect(json.name).to.equal("Stake Position #0");
      expect(json.attributes).to.be.an("array").with.length(3);
      expect(json.image).to.match(/^data:image\/svg\+xml;base64,/);
    });

    it("reverts tokenURI for non-existent token", async function () {
      await expect(staking.tokenURI(99))
        .to.be.revertedWithCustomError(staking, "ERC721NonexistentToken");
    });
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

    it("mints an NFT to the staker with incrementing tokenId", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      expect(await staking.ownerOf(0)).to.equal(alice.address);
      expect(await staking.balanceOf(alice.address)).to.equal(1);
    });

    it("emits StakeCreated with correct tokenId and APR", async function () {
      await expect(
        staking.connect(alice).stake({ value: ethers.parseEther("2") })
      )
        .to.emit(staking, "StakeCreated")
        .withArgs(alice.address, 0, ethers.parseEther("2"), 800);
    });

    it("tokenIds increment across users", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") }); // tokenId 0
      await staking.connect(bob).stake({ value: ethers.parseEther("1") });   // tokenId 1
      expect(await staking.ownerOf(0)).to.equal(alice.address);
      expect(await staking.ownerOf(1)).to.equal(bob.address);
    });

    it("supports multiple stakes per user", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      const positions = await staking.getUserStakes(alice.address);
      expect(positions.length).to.equal(2);
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
      const duration = 30 * ONE_DAY;
      const expected = (amount * 800n * BigInt(duration)) / (BigInt(365 * ONE_DAY) * 10_000n);
      expect(await staking.calculateReward(amount, 800, duration)).to.equal(expected);
    });

    it("getPendingReward increases over time", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(ONE_DAY);
      const r1 = await staking.getPendingReward(0); // tokenId 0
      await time.increase(ONE_DAY);
      const r2 = await staking.getPendingReward(0);
      expect(r2).to.be.gt(r1);
    });
  });

  // ─── Claim rewards ────────────────────────────────────────────────────────────

  describe("claimRewards()", function () {
    it("pays out reward and resets lastClaimTime", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(30 * ONE_DAY);

      const before = await ethers.provider.getBalance(alice.address);
      const pending = await staking.getPendingReward(0);

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

    it("keeps principal staked after claim and NFT remains", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(30 * ONE_DAY);
      await staking.connect(alice).claimRewards(0);

      const positions = await staking.getUserStakes(alice.address);
      expect(positions[0].active).to.be.true;
      expect(positions[0].amount).to.equal(ethers.parseEther("1"));
      expect(await staking.ownerOf(0)).to.equal(alice.address);
    });

    it("reverts for non-owner of the token", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(ONE_DAY);
      await expect(staking.connect(bob).claimRewards(0))
        .to.be.revertedWith("Not token owner");
    });

    it("reverts on a burned (redeemed) token", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await staking.connect(alice).unstake(0);
      // Token is burned — ownerOf reverts
      await expect(staking.connect(alice).claimRewards(0))
        .to.be.revertedWithCustomError(staking, "ERC721NonexistentToken");
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
    it("returns principal + reward with no penalty and burns the NFT", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      await time.increase(SEVEN_DAYS + ONE_DAY);

      const pending = await staking.getPendingReward(0);
      const before = await ethers.provider.getBalance(alice.address);

      const tx = await staking.connect(alice).unstake(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      expect(after).to.be.closeTo(
        before + ethers.parseEther("2") + pending - gasCost,
        ethers.parseEther("0.0001")
      );
      // NFT burned
      await expect(staking.ownerOf(0)).to.be.revertedWithCustomError(staking, "ERC721NonexistentToken");
    });

    it("removes the position from getUserStakes and decrements totalStaked", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await staking.connect(alice).unstake(0);

      const positions = await staking.getUserStakes(alice.address);
      expect(positions.length).to.equal(0);
      expect(await staking.totalStaked()).to.equal(0);
    });

    it("emits StakeWithdrawn", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await expect(staking.connect(alice).unstake(0)).to.emit(staking, "StakeWithdrawn");
    });

    it("reverts for non-owner of the token", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await expect(staking.connect(bob).unstake(0))
        .to.be.revertedWith("Not token owner");
    });
  });

  // ─── Early withdrawal penalty ─────────────────────────────────────────────────

  describe("unstake() early withdrawal", function () {
    it("applies 10% penalty before lock period ends", async function () {
      const stakeAmount = ethers.parseEther("1");
      await staking.connect(alice).stake({ value: stakeAmount });
      await time.increase(ONE_DAY);

      const before = await ethers.provider.getBalance(alice.address);
      const tx = await staking.connect(alice).unstake(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      const penalty = stakeAmount / 10n;
      const expectedPrincipal = stakeAmount - penalty;

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

  // ─── NFT transfer ─────────────────────────────────────────────────────────────

  describe("NFT transfer (stake ownership transfer)", function () {
    it("transferring the NFT transfers stake ownership", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      expect(await staking.ownerOf(0)).to.equal(alice.address);

      await staking.connect(alice).transferFrom(alice.address, bob.address, 0);
      expect(await staking.ownerOf(0)).to.equal(bob.address);

      const alicePositions = await staking.getUserStakes(alice.address);
      const bobPositions   = await staking.getUserStakes(bob.address);
      expect(alicePositions.length).to.equal(0);
      expect(bobPositions.length).to.equal(1);
      expect(bobPositions[0].tokenId).to.equal(0n);
    });

    it("new owner can claim accrued rewards after transfer", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(7 * ONE_DAY);

      await staking.connect(alice).transferFrom(alice.address, bob.address, 0);

      const pending = await staking.getPendingReward(0);
      expect(pending).to.be.gt(0);

      const before = await ethers.provider.getBalance(bob.address);
      const tx = await staking.connect(bob).claimRewards(0);
      const receipt = await tx.wait();
      const after = await ethers.provider.getBalance(bob.address);
      expect(after - before + receipt.gasUsed * tx.gasPrice).to.be.closeTo(
        pending, ethers.parseEther("0.001")
      );
    });

    it("original owner cannot claim or unstake after transfer", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(ONE_DAY);
      await staking.connect(alice).transferFrom(alice.address, bob.address, 0);

      await expect(staking.connect(alice).claimRewards(0)).to.be.revertedWith("Not token owner");
      await expect(staking.connect(alice).unstake(0)).to.be.revertedWith("Not token owner");
    });

    it("new owner can unstake after lock period", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await staking.connect(alice).transferFrom(alice.address, bob.address, 0);

      const before = await ethers.provider.getBalance(bob.address);
      const tx = await staking.connect(bob).unstake(0);
      const receipt = await tx.wait();
      const after = await ethers.provider.getBalance(bob.address);

      expect(after - before + receipt.gasUsed * tx.gasPrice).to.be.gte(ethers.parseEther("1"));
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

  // ─── Pause blocks unstake ─────────────────────────────────────────────────────

  describe("unstake() when paused", function () {
    it("reverts when contract is paused", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS + ONE_DAY);
      await staking.pause();
      await expect(staking.connect(alice).unstake(0)).to.be.revertedWithCustomError(
        staking,
        "EnforcedPause"
      );
    });
  });

  // ─── Emergency user withdrawal ────────────────────────────────────────────────

  describe("emergencyUserWithdraw()", function () {
    it("reverts when emergency mode is not active", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await expect(staking.connect(alice).emergencyUserWithdraw(0)).to.be.revertedWith(
        "Emergency mode not active"
      );
    });

    it("returns principal with no rewards and burns the NFT", async function () {
      const stakeAmount = ethers.parseEther("1");
      await staking.connect(alice).stake({ value: stakeAmount });
      await time.increase(30 * ONE_DAY);

      await staking.setEmergencyMode(true);

      const before = await ethers.provider.getBalance(alice.address);
      const tx = await staking.connect(alice).emergencyUserWithdraw(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      expect(after).to.be.closeTo(before + stakeAmount - gasCost, ethers.parseEther("0.0001"));
      await expect(staking.ownerOf(0)).to.be.revertedWithCustomError(staking, "ERC721NonexistentToken");
    });

    it("removes position from getUserStakes and decrements totalStaked", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("2") });
      await staking.setEmergencyMode(true);
      await staking.connect(alice).emergencyUserWithdraw(0);

      const positions = await staking.getUserStakes(alice.address);
      expect(positions.length).to.equal(0);
      expect(await staking.totalStaked()).to.equal(0);
    });

    it("emits StakeWithdrawn with reward=0", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await staking.setEmergencyMode(true);
      await expect(staking.connect(alice).emergencyUserWithdraw(0))
        .to.emit(staking, "StakeWithdrawn")
        .withArgs(alice.address, 0, ethers.parseEther("1"), 0);
    });

    it("works even when contract is paused", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await staking.setEmergencyMode(true);
      await staking.pause();
      await expect(staking.connect(alice).emergencyUserWithdraw(0)).to.not.be.reverted;
    });

    it("reverts when called again after the token is burned", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") });
      await staking.setEmergencyMode(true);
      await staking.connect(alice).emergencyUserWithdraw(0);
      // Token is burned
      await expect(staking.connect(alice).emergencyUserWithdraw(0))
        .to.be.revertedWithCustomError(staking, "ERC721NonexistentToken");
    });
  });

  // ─── Multiple stakes ──────────────────────────────────────────────────────────

  describe("Multiple stakes", function () {
    it("each stake is tracked independently via its tokenId", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("0.5") }); // tokenId 0, APR 5%
      await time.increase(ONE_DAY);
      await staking.connect(alice).stake({ value: ethers.parseEther("5") });   // tokenId 1, APR 12%
      await time.increase(ONE_DAY);

      const r0 = await staking.getPendingReward(0);
      const r1 = await staking.getPendingReward(1);

      // 5 ETH @ 12% for 1 day >> 0.5 ETH @ 5% for 2 days
      expect(r1).to.be.gt(r0);
    });

    it("unstaking one position does not affect others", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") }); // tokenId 0
      await staking.connect(alice).stake({ value: ethers.parseEther("2") }); // tokenId 1
      await time.increase(SEVEN_DAYS + ONE_DAY);

      await staking.connect(alice).unstake(0); // burns tokenId 0

      const positions = await staking.getUserStakes(alice.address);
      expect(positions.length).to.equal(1);
      expect(positions[0].tokenId).to.equal(1n);
      expect(positions[0].active).to.be.true;
      expect(await staking.totalStaked()).to.equal(ethers.parseEther("2"));
    });
  });

  // ─── Treasury ─────────────────────────────────────────────────────────────────

  describe("Treasury tracking", function () {
    it("tracks totalStaked correctly across multiple users", async function () {
      await staking.connect(alice).stake({ value: ethers.parseEther("1") }); // tokenId 0
      await staking.connect(bob).stake({ value: ethers.parseEther("3") });   // tokenId 1
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
