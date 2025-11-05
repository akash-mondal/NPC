import { LlmAgent, FunctionTool, Gemini } from '@google/adk';
import { AbiToToolGenerator, ToolSchema } from '../../sdk/src/AbiToToolGenerator';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Use the Gemini class from the ADK with correct model
const model = new Gemini({ 
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp' // Latest model supported by A2A
});

export class Planner extends LlmAgent {
    private contractTools: FunctionTool[] = [];
    private toolSchemas: ToolSchema[] = [];

    constructor() {
        super({ 
            name: 'Planner',
            model,
            tools: [] 
        });
        
        this.initializeTools();
    }

    private async initializeTools() {
        try {
            // Load contract addresses and ABIs
            const addressesPath = path.join(__dirname, '..', '..', 'contracts', 'addresses.json');
            const contractAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

            // Load ABIs for each contract
            const contracts = [
                { name: 'Arena', address: contractAddresses.arena },
                { name: 'Quest', address: contractAddresses.quest },
                { name: 'NPCRegistry', address: contractAddresses.npcRegistry },
                { name: 'BehaviorController', address: contractAddresses.behaviorController }
            ];

            for (const contract of contracts) {
                const abiPath = path.join(
                    __dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 
                    `${contract.name}.sol`, `${contract.name}.json`
                );
                
                if (fs.existsSync(abiPath)) {
                    const contractArtifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
                    const tools = AbiToToolGenerator.generateToolsFromAbi(
                        contract.name,
                        contractArtifact.abi,
                        contract.address
                    );
                    
                    this.toolSchemas.push(...tools);
                    
                    // Convert to ADK FunctionTool format
                    for (const tool of tools) {
                        const functionTool = new FunctionTool({
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.parameters as any,
                            execute: async (params: any) => {
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
            
        } catch (error) {
            console.error('Planner: Error initializing tools:', error);
        }
    }

    private async executeContractFunction(contractName: string, toolName: string, params: any): Promise<any> {
        // This is a placeholder - the actual execution will be handled by the Action agent
        // The Planner just returns the plan for the Action agent to execute
        return {
            contractName,
            functionName: toolName.replace(`${contractName}_`, ''),
            params,
            needsExecution: true
        };
    }

    async plan(observation: any, goal?: string): Promise<any> {
        console.log('Planner: Received observation', observation);
        console.log('Planner: Goal:', goal);

        try {
            // Create a planning prompt with available tools
            const toolDescriptions = this.toolSchemas.map(tool => 
                `${tool.name}: ${tool.description}`
            ).join('\n');

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
            const response = await (this.model as any).generate({
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
            } else {
                // Model provided text response, try to parse it
                plan = this.parseTextualPlan(response.text, observation, goal);
            }

            console.log('Planner: Generated plan', plan);
            return plan;

        } catch (error) {
            console.error('Planner: Error generating plan:', error);
            
            // Fallback to simple rule-based planning
            return this.fallbackPlan(observation, goal);
        }
    }

    private parseTextualPlan(text: string, observation: any, goal?: string): any {
        // Simple text parsing for when the model doesn't use function calls
        // This is a fallback mechanism
        
        if (text.toLowerCase().includes('duel') || text.toLowerCase().includes('arena')) {
            return {
                action: 'Arena_createDuel',
                params: {
                    player2: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d', // Example address
                    tokenAddress: '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123', // Example token
                    wager: ethers.parseEther('0.1').toString()
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
                    reward: ethers.parseEther('0.05').toString(),
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

    private fallbackPlan(observation: any, goal?: string): any {
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
    getAvailableTools(): ToolSchema[] {
        return this.toolSchemas;
    }

    /**
     * Validate a plan against current policies
     */
    async validatePlan(plan: any, behaviorController: any): Promise<{ valid: boolean; reason?: string }> {
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
