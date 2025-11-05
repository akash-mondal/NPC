"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load contract addresses
const addressesPath = path_1.default.join(__dirname, '..', '..', 'contracts', 'addresses.json');
const contractAddresses = JSON.parse(fs_1.default.readFileSync(addressesPath, 'utf8'));
// Load contract ABIs
const npcRegistryAbi = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'NPCRegistry.sol', 'NPCRegistry.json'), 'utf8')).abi;
const behaviorControllerAbi = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'BehaviorController.sol', 'BehaviorController.json'), 'utf8')).abi;
const arenaAbi = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'Arena.sol', 'Arena.json'), 'utf8')).abi;
const questAbi = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'Quest.sol', 'Quest.json'), 'utf8')).abi;
// Placeholder for a signer
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL);
const signer = new ethers_1.ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', provider);
// Initialize contract instances with signer
const npcRegistryContract = new ethers_1.ethers.Contract(contractAddresses.npcRegistry, npcRegistryAbi, signer);
const behaviorControllerContract = new ethers_1.ethers.Contract(contractAddresses.behaviorController, behaviorControllerAbi, signer);
const arenaContract = new ethers_1.ethers.Contract(contractAddresses.arena, arenaAbi, signer);
const questContract = new ethers_1.ethers.Contract(contractAddresses.quest, questAbi, signer);
class Action {
    constructor() {
        this.gasTracker = new Map();
    }
    async execute(plan) {
        console.log('Action: Executing plan', plan);
        // Handle observation-only actions
        if (plan.action === 'observe') {
            return {
                success: true,
                action: 'observe',
                result: 'Observation completed'
            };
        }
        let transactionResponse;
        const startGas = await provider.getBalance(signer.address);
        try {
            // Pre-execution validation
            const validation = await this.validateExecution(plan);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Validation failed: ${validation.reason}`,
                    action: plan.action
                };
            }
            // Execute based on action type
            transactionResponse = await this.executeContractCall(plan);
            // Wait for transaction confirmation
            const receipt = await transactionResponse.wait();
            const endGas = await provider.getBalance(signer.address);
            const gasUsed = startGas - endGas;
            // Record the call in BehaviorController
            await this.recordCallInBehaviorController(plan, gasUsed);
            const result = {
                transactionHash: transactionResponse.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                success: true,
                action: plan.action,
                params: plan.params
            };
            console.log('Action: Execution result', result);
            return result;
        }
        catch (error) {
            console.error('Action: Error executing plan', error);
            // Try to record failed attempt if we have enough info
            if (plan.action && plan.action !== 'observe') {
                try {
                    await this.recordFailedCall(plan, error.message);
                }
                catch (recordError) {
                    console.error('Action: Failed to record failed call:', recordError);
                }
            }
            return {
                success: false,
                error: error.message,
                action: plan.action,
                params: plan.params
            };
        }
    }
    async validateExecution(plan) {
        if (!plan.action || plan.action === 'observe') {
            return { valid: true };
        }
        try {
            // Extract contract and method information
            const actionInfo = this.parseActionName(plan.action);
            if (!actionInfo) {
                return { valid: false, reason: 'Invalid action format' };
            }
            const { contractAddress, methodSelector } = actionInfo;
            // Check BehaviorController permissions
            const isAllowed = await behaviorControllerContract.isAllowed(contractAddress, methodSelector);
            if (!isAllowed) {
                return { valid: false, reason: 'Action not allowed by BehaviorController' };
            }
            // Check rate limits
            const rateLimitOk = await behaviorControllerContract.checkRateLimit(contractAddress, methodSelector);
            if (!rateLimitOk) {
                return { valid: false, reason: 'Rate limit exceeded' };
            }
            // Check gas budget
            const remainingGas = await behaviorControllerContract.getRemainingGasBudget(contractAddress);
            if (remainingGas === 0n) {
                return { valid: false, reason: 'Gas budget exhausted' };
            }
            return { valid: true };
        }
        catch (error) {
            console.error('Action: Validation error:', error);
            return { valid: false, reason: `Validation error: ${error}` };
        }
    }
    parseActionName(actionName) {
        try {
            const [contractName, methodName] = actionName.split('_');
            // Load contract addresses
            const addressesPath = path_1.default.join(__dirname, '..', '..', 'contracts', 'addresses.json');
            const contractAddresses = JSON.parse(fs_1.default.readFileSync(addressesPath, 'utf8'));
            const contractAddress = contractAddresses[contractName.toLowerCase()];
            if (!contractAddress) {
                return null;
            }
            // Generate method selector (first 4 bytes of keccak256 hash)
            // This is a simplified version - in production you'd want more robust ABI parsing
            const methodSelector = ethers_1.ethers.id(`${methodName}(...)`).slice(0, 10);
            return { contractAddress, methodSelector };
        }
        catch (error) {
            console.error('Action: Error parsing action name:', error);
            return null;
        }
    }
    async executeContractCall(plan) {
        const [contractName, methodName] = plan.action.split('_');
        switch (contractName) {
            case 'NPCRegistry':
                return this.executeNPCRegistryCall(methodName, plan.params);
            case 'Arena':
                return this.executeArenaCall(methodName, plan.params);
            case 'Quest':
                return this.executeQuestCall(methodName, plan.params);
            case 'BehaviorController':
                return this.executeBehaviorControllerCall(methodName, plan.params);
            default:
                throw new Error(`Unknown contract: ${contractName}`);
        }
    }
    async executeNPCRegistryCall(methodName, params) {
        switch (methodName) {
            case 'registerNPC':
                return npcRegistryContract.registerNPC(params.owner, params.controller, params.metadataUri);
            case 'updateNPCController':
                return npcRegistryContract.updateNPCController(params.npcId, params.newController);
            case 'updateNPCMetadata':
                return npcRegistryContract.updateNPCMetadata(params.npcId, params.newMetadataUri);
            default:
                throw new Error(`Unknown NPCRegistry method: ${methodName}`);
        }
    }
    async executeArenaCall(methodName, params) {
        switch (methodName) {
            case 'createDuel':
                return arenaContract.createDuel(params.player2, params.tokenAddress, params.wager);
            case 'acceptDuel':
                return arenaContract.acceptDuel(params.duelId);
            case 'concludeDuel':
                return arenaContract.concludeDuel(params.duelId, params.winner);
            default:
                throw new Error(`Unknown Arena method: ${methodName}`);
        }
    }
    async executeQuestCall(methodName, params) {
        switch (methodName) {
            case 'createQuest':
                return questContract.createQuest(params.tokenAddress, params.reward, params.metadataUri);
            case 'acceptQuest':
                return questContract.acceptQuest(params.questId);
            case 'completeQuest':
                return questContract.completeQuest(params.questId);
            default:
                throw new Error(`Unknown Quest method: ${methodName}`);
        }
    }
    async executeBehaviorControllerCall(methodName, params) {
        switch (methodName) {
            case 'setPolicy':
                return behaviorControllerContract.setPolicy(params.contractAddress, params.allowedMethods, params.gasBudget, params.callRateLimit, params.dailyCallLimit);
            default:
                throw new Error(`Unknown BehaviorController method: ${methodName}`);
        }
    }
    async recordCallInBehaviorController(plan, gasUsed) {
        try {
            const actionInfo = this.parseActionName(plan.action);
            if (!actionInfo)
                return;
            const { contractAddress, methodSelector } = actionInfo;
            // Record the call with gas usage
            await behaviorControllerContract.recordCallWithGas(contractAddress, methodSelector, gasUsed.toString());
            console.log(`Action: Recorded call ${plan.action} with gas ${gasUsed}`);
        }
        catch (error) {
            console.error('Action: Error recording call in BehaviorController:', error);
        }
    }
    async recordFailedCall(plan, errorMessage) {
        // In a production system, you might want to record failed attempts
        // for monitoring and debugging purposes
        console.log(`Action: Failed call recorded - ${plan.action}: ${errorMessage}`);
    }
    /**
     * Simulate a transaction before executing it
     */
    async simulate(plan) {
        try {
            if (plan.action === 'observe') {
                return { success: true, gasEstimate: '0' };
            }
            // This would use eth_call or similar to simulate the transaction
            // For now, return a basic simulation result
            return {
                success: true,
                gasEstimate: '100000' // Placeholder gas estimate
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Get current gas usage statistics
     */
    getGasUsageStats() {
        return Object.fromEntries(this.gasTracker);
    }
}
exports.Action = Action;
