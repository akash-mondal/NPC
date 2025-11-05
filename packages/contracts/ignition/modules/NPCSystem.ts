import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NPCSystemModule = buildModule("NPCSystemModule", (m) => {
  // Get deployer account
  const deployer = m.getAccount(0);

  // Deploy BehaviorController first
  const behaviorController = m.contract("BehaviorController", [deployer]);

  // Deploy NPCRegistry
  const npcRegistry = m.contract("NPCRegistry", [deployer]);

  // Deploy Arena with BehaviorController address
  const arena = m.contract("Arena", [behaviorController]);

  // Deploy Quest with BehaviorController address
  const quest = m.contract("Quest", [behaviorController]);

  // Deploy GameActionAdapter
  const gameActionAdapter = m.contract("GameActionAdapter", [behaviorController, deployer]);

  // Deploy MockERC20 for testing (1M tokens with 18 decimals)
  const mockToken = m.contract("MockERC20", [
    "Test Token",
    "TEST", 
    "1000000000000000000000000" // 1M tokens as string
  ]);

  return {
    behaviorController,
    npcRegistry,
    arena,
    quest,
    gameActionAdapter,
    mockToken,
  };
});

export default NPCSystemModule;