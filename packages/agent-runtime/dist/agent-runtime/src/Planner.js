"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
const adk_1 = require("@google/adk");
const AbiToToolGenerator_1 = require("../../sdk/src/AbiToToolGenerator");
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Use the Gemini class from the ADK with correct model
const model = new adk_1.Gemini({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp' // Latest model supported by A2A
});
class Planner extends adk_1.LlmAgent {
    constructor() {
        super({
            name: 'Planner',
            model,
            tools: []
        });
        this.contractTools = [];
        this.toolSchemas = [];
        this.initializeTools();
    }
    async initializeTools() {
        try {
            // Load contract addresses and ABIs
            const addressesPath = path_1.default.join(__dirname, '..', '..', 'contracts', 'addresses.json');
            const contractAddresses = JSON.parse(fs_1.default.readFileSync(addressesPath, 'utf8'));
            // Load ABIs for each contract
            const contracts = [
                { name: 'Arena', address: contractAddresses.arena },
                { name: 'Quest', address: contractAddresses.quest },
                { name: 'NPCRegistry', address: contractAddresses.npcRegistry },
                { name: 'BehaviorController', address: contractAddresses.behaviorController }
            ];
            for (const contract of contracts) {
                const abiPath = path_1.default.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', `${contract.name}.sol`, `${contract.name}.json`);
                if (fs_1.default.existsSync(abiPath)) {
                    const contractArtifact = JSON.parse(fs_1.default.readFileSync(abiPath, 'utf8'));
                    const tools = AbiToToolGenerator_1.AbiToToolGenerator.generateToolsFromAbi(contract.name, contractArtifact.abi, contract.address);
                    this.toolSchemas.push(...tools);
                    // Convert to ADK FunctionTool format
                    for (const tool of tools) {
                        const functionTool = new adk_1.FunctionTool({
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.parameters,
                            execute: async (params) => {
                                return this.executeContractFunction(contract.name, tool.name, params);
                            }
                        });
                        this.contractTools.push(functionTool);
                    }
                }
            }
            // Update the agent's tools
            this.tools = this.contractTools;
            console.log(`Planner: Initialized ${this.contractTools.length} contract tools`);
        }
        catch (error) {
            console.error('Planner: Error initializing tools:', error);
        }
    }
    async executeContractFunction(contractName, toolName, params) {
        // This is a placeholder - the actual execution will be handled by the Action agent
        // The Planner just returns the plan for the Action agent to execute
        return {
            contractName,
            functionName: toolName.replace(`${contractName}_`, ''),
            params,
            needsExecution: true
        };
    }
    async plan(observation, goal) {
        console.log('Planner: Received observation', observation);
        console.log('Planner: Goal:', goal);
        try {
            // Create a planning prompt with available tools
            const toolDescriptions = this.toolSchemas.map(tool => `${tool.name}: ${tool.description}`).join('\n');
            const prompt = `
You are an autonomous NPC agent planning actions based on the current game state.

Current Observation:
${JSON.stringify(observation, null, 2)}

Goal: ${goal || 'Participate actively in the game'}

Available Tools:
${toolDescriptions}

Based on the observation and goal, plan the next action. Consider:
1. Safety: Only use actions that are allowed by BehaviorController
2. Strategy: Choose actions that advance toward the goal
3. Risk: Consider potential losses and gains
4. Timing: Ensure actions are appropriate for the current game state

Respond with a specific action plan including the tool to use and parameters.
`;
            // Use the model to generate a plan
            const response = await this.model.generate({
                prompt,
                tools: this.contractTools
            });
            // Parse the response to extract the planned action
            let plan;
            if (response.functionCalls && response.functionCalls.length > 0) {
                // Model chose to use a function tool
                const functionCall = response.functionCalls[0];
                plan = {
                    action: functionCall.name,
                    params: functionCall.args,
                    reasoning: response.text || 'AI-generated plan',
                    toolUsed: true
                };
            }
            else {
                // Model provided text response, try to parse it
                plan = this.parseTextualPlan(response.text, observation, goal);
            }
            console.log('Planner: Generated plan', plan);
            return plan;
        }
        catch (error) {
            console.error('Planner: Error generating plan:', error);
            // Fallback to simple rule-based planning
            return this.fallbackPlan(observation, goal);
        }
    }
    parseTextualPlan(text, observation, goal) {
        // Simple text parsing for when the model doesn't use function calls
        // This is a fallback mechanism
        if (text.toLowerCase().includes('duel') || text.toLowerCase().includes('arena')) {
            return {
                action: 'Arena_createDuel',
                params: {
                    player2: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d', // Example address
                    tokenAddress: '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123', // Example token
                    wager: ethers_1.ethers.parseEther('0.1').toString()
                },
                reasoning: text,
                toolUsed: false
            };
        }
        if (text.toLowerCase().includes('quest')) {
            return {
                action: 'Quest_createQuest',
                params: {
                    tokenAddress: '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123',
                    reward: ethers_1.ethers.parseEther('0.05').toString(),
                    metadataUri: 'https://ipfs.io/ipfs/QmExampleQuest'
                },
                reasoning: text,
                toolUsed: false
            };
        }
        // Default observation action
        return {
            action: 'observe',
            params: {},
            reasoning: 'Continuing to observe the game state',
            toolUsed: false
        };
    }
    fallbackPlan(observation, goal) {
        // Simple rule-based fallback planning
        console.log('Planner: Using fallback planning');
        // If there are active duels, try to participate
        if (observation.activeDuels && observation.activeDuels.length > 0) {
            return {
                action: 'Arena_acceptDuel',
                params: {
                    duelId: observation.activeDuels[0].id || 0
                },
                reasoning: 'Fallback: Accepting available duel',
                toolUsed: false
            };
        }
        // If there are open quests, try to accept one
        if (observation.openQuests && observation.openQuests.length > 0) {
            return {
                action: 'Quest_acceptQuest',
                params: {
                    questId: observation.openQuests[0].id || 0
                },
                reasoning: 'Fallback: Accepting available quest',
                toolUsed: false
            };
        }
        // Default: just observe
        return {
            action: 'observe',
            params: {},
            reasoning: 'Fallback: No immediate actions available',
            toolUsed: false
        };
    }
    /**
     * Get available tools for external inspection
     */
    getAvailableTools() {
        return this.toolSchemas;
    }
    /**
     * Validate a plan against current policies
     */
    async validatePlan(plan, behaviorController) {
        if (plan.action === 'observe') {
            return { valid: true };
        }
        // Extract contract and method from action name
        const [contractName, methodName] = plan.action.split('_');
        // This would need to be implemented with actual BehaviorController integration
        // For now, return true for basic validation
        return { valid: true };
    }
}
exports.Planner = Planner;
