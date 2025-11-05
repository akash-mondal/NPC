import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("NPC System Integration", function () {
  async function deployNPCSystemFixture() {
    const [owner, npcController, player1, player2] = await ethers.getSigners();

    // Deploy BehaviorController
    const BehaviorController = await ethers.getContractFactory("BehaviorController");
    const behaviorController = await BehaviorController.deploy(owner.address);

    // Deploy NPCRegistry
    const NPCRegistry = await ethers.getContractFactory("NPCRegistry");
    const npcRegistry = await NPCRegistry.deploy(owner.address);

    // Deploy Arena
    const Arena = await ethers.getContractFactory("Arena");
    const arena = await Arena.deploy(behaviorController.target);

    // Deploy Quest
    const Quest = await ethers.getContractFactory("Quest");
    const quest = await Quest.deploy(behaviorController.target);

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("Test Token", "TEST", ethers.parseEther("1000000"));

    // Setup initial policies
    const arenaMethodSelectors = [
      arena.interface.getFunction("concludeDuel").selector
    ];
    
    const questMethodSelectors = [
      quest.interface.getFunction("completeQuest").selector
    ];

    await behaviorController.setPolicy(
      arena.target,
      arenaMethodSelectors,
      ethers.parseEther("1"), // 1 ETH gas budget
      10, // 10 calls per minute
      100 // 100 calls per day
    );

    await behaviorController.setPolicy(
      quest.target,
      questMethodSelectors,
      ethers.parseEther("0.5"), // 0.5 ETH gas budget
      5, // 5 calls per minute
      50 // 50 calls per day
    );

    // Grant trusted caller role to arena and quest contracts
    await behaviorController.grantTrustedCallerRole(arena.target);
    await behaviorController.grantTrustedCallerRole(quest.target);

    // Distribute tokens for testing
    await token.transfer(player1.address, ethers.parseEther("1000"));
    await token.transfer(player2.address, ethers.parseEther("1000"));
    await token.transfer(npcController.address, ethers.parseEther("1000"));

    return {
      behaviorController,
      npcRegistry,
      arena,
      quest,
      token,
      owner,
      npcController,
      player1,
      player2
    };
  }

  describe("NPC Registration", function () {
    it("Should register an NPC successfully", async function () {
      const { npcRegistry, npcController, owner } = await loadFixture(deployNPCSystemFixture);

      const metadataUri = "https://ipfs.io/ipfs/QmExampleNPC";
      
      await expect(npcRegistry.registerNPC(owner.address, npcController.address, metadataUri))
        .to.emit(npcRegistry, "NPCRegistered")
        .withArgs(0, owner.address, npcController.address);

      const npc = await npcRegistry.getNPC(0);
      expect(npc.owner).to.equal(owner.address);
      expect(npc.controller).to.equal(npcController.address);
      expect(npc.metadataUri).to.equal(metadataUri);
    });

    it("Should update NPC controller", async function () {
      const { npcRegistry, npcController, owner, player1 } = await loadFixture(deployNPCSystemFixture);

      await npcRegistry.registerNPC(owner.address, npcController.address, "test");
      
      await expect(npcRegistry.updateNPCController(0, player1.address))
        .to.emit(npcRegistry, "NPCUpdated")
        .withArgs(0);

      const npc = await npcRegistry.getNPC(0);
      expect(npc.controller).to.equal(player1.address);
    });
  });

  describe("Arena Duels", function () {
    it("Should create and complete a duel", async function () {
      const { arena, token, player1, player2, behaviorController } = await loadFixture(deployNPCSystemFixture);

      const wager = ethers.parseEther("10");

      // Approve tokens
      await token.connect(player1).approve(arena.target, wager);
      await token.connect(player2).approve(arena.target, wager);

      // Create duel
      await expect(arena.connect(player1).createDuel(player2.address, token.target, wager))
        .to.emit(arena, "DuelCreated")
        .withArgs(0, player1.address, player2.address, token.target, wager);

      // Accept duel
      await expect(arena.connect(player2).acceptDuel(0))
        .to.emit(arena, "DuelAccepted");

      // Conclude duel (this would normally be called by an NPC agent)
      await expect(arena.concludeDuel(0, player1.address))
        .to.emit(arena, "DuelConcluded")
        .withArgs(0, player1.address);

      // Check that winner received the total wager
      const finalBalance = await token.balanceOf(player1.address);
      expect(finalBalance).to.be.gt(ethers.parseEther("1000")); // Original + winnings
    });

    it("Should enforce BehaviorController policies", async function () {
      const { arena, token, player1, player2, behaviorController } = await loadFixture(deployNPCSystemFixture);

      const wager = ethers.parseEther("10");

      // Approve and create duel
      await token.connect(player1).approve(arena.target, wager);
      await token.connect(player2).approve(arena.target, wager);
      await arena.connect(player1).createDuel(player2.address, token.target, wager);
      await arena.connect(player2).acceptDuel(0);

      // Deactivate policy
      await behaviorController.deactivatePolicy(arena.target);

      // Should fail when policy is inactive
      await expect(arena.concludeDuel(0, player1.address))
        .to.be.revertedWith("BehaviorController: Action not allowed");
    });
  });

  describe("Quest System", function () {
    it("Should create and complete a quest", async function () {
      const { quest, token, player1, player2 } = await loadFixture(deployNPCSystemFixture);

      const reward = ethers.parseEther("5");
      const metadataUri = "https://ipfs.io/ipfs/QmExampleQuest";

      // Approve tokens
      await token.connect(player1).approve(quest.target, reward);

      // Create quest
      await expect(quest.connect(player1).createQuest(token.target, reward, metadataUri))
        .to.emit(quest, "QuestCreated")
        .withArgs(0, player1.address, token.target, reward);

      // Accept quest
      await expect(quest.connect(player2).acceptQuest(0))
        .to.emit(quest, "QuestAccepted")
        .withArgs(0, player2.address);

      // Complete quest (this would normally be called by an NPC agent)
      await expect(quest.connect(player2).completeQuest(0))
        .to.emit(quest, "QuestCompleted")
        .withArgs(0, player2.address);

      // Check that participant received the reward
      const finalBalance = await token.balanceOf(player2.address);
      expect(finalBalance).to.equal(ethers.parseEther("1005")); // Original + reward
    });
  });

  describe("BehaviorController", function () {
    it("Should enforce rate limits", async function () {
      const { behaviorController, arena, token, player1, player2 } = await loadFixture(deployNPCSystemFixture);

      // Set very restrictive rate limit (1 call per minute)
      const methodSelector = arena.interface.getFunction("concludeDuel").selector;
      await behaviorController.setPolicy(
        arena.target,
        [methodSelector],
        ethers.parseEther("1"),
        1, // 1 call per minute
        10
      );

      const wager = ethers.parseEther("10");

      // Create and accept first duel
      await token.connect(player1).approve(arena.target, wager);
      await token.connect(player2).approve(arena.target, wager);
      await arena.connect(player1).createDuel(player2.address, token.target, wager);
      await arena.connect(player2).acceptDuel(0);

      // First conclude should work
      await arena.concludeDuel(0, player1.address);

      // Create and accept second duel immediately
      await token.connect(player1).approve(arena.target, wager);
      await token.connect(player2).approve(arena.target, wager);
      await arena.connect(player1).createDuel(player2.address, token.target, wager);
      await arena.connect(player2).acceptDuel(1);

      // Second conclude should fail due to rate limit
      await expect(arena.concludeDuel(1, player1.address))
        .to.be.revertedWith("BehaviorController: Action not allowed");
    });

    it("Should track gas usage", async function () {
      const { behaviorController, arena } = await loadFixture(deployNPCSystemFixture);

      const contractAddress = arena.target;
      const methodSelector = arena.interface.getFunction("concludeDuel").selector;
      const gasUsed = 100000;

      await behaviorController.recordCallWithGas(contractAddress, methodSelector, gasUsed);

      const [lastCalled, dailyCount] = await behaviorController.getCallRecord(contractAddress, methodSelector);
      expect(dailyCount).to.equal(1);
      expect(lastCalled).to.be.gt(0);
    });
  });
});

// Mock ERC20 contract for testing
const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
}
`;