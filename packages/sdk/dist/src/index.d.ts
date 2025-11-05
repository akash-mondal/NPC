import { AbiToToolGenerator } from './AbiToToolGenerator';
export { AbiToToolGenerator };
export interface TaskResult {
    taskId: string;
    status: 'submitted' | 'working' | 'completed' | 'failed';
    type?: string;
    createdAt?: number;
    updatedAt?: number;
    result?: any;
    error?: string;
    streamUrl?: string;
}
export interface AgentCardData {
    id: string;
    name: string;
    version: string;
    description: string;
    capabilities: any[];
    transport: any[];
    security: any[];
    skills: string[];
    tags: string[];
    a2aVersion: string;
}
export declare class NpcSDK {
    private gatewayUrl;
    private apiKey?;
    private timeout;
    constructor(gatewayUrl?: string);
    /**
     * Set API key for authentication
     */
    setApiKey(apiKey: string): void;
    /**
     * Set request timeout
     */
    setTimeout(timeout: number): void;
    private rpcRequest;
    private httpRequest;
    /**
     * Open a new task
     */
    openTask(params: {
        type: string;
        params: any;
        priority?: 'low' | 'medium' | 'high';
    }): Promise<TaskResult>;
    /**
     * Get task status
     */
    getTaskStatus(taskId: string): Promise<TaskResult>;
    /**
     * Update a task
     */
    updateTask(taskId: string, update: any): Promise<TaskResult>;
    /**
     * Finalize a task
     */
    finalizeTask(taskId: string): Promise<TaskResult>;
    /**
     * List all tasks (admin endpoint)
     */
    listTasks(): Promise<{
        totalTasks: number;
        tasks: TaskResult[];
    }>;
    /**
     * Delete a task (admin endpoint)
     */
    deleteTask(taskId: string): Promise<{
        message: string;
        taskId: string;
    }>;
    /**
     * Get the agent card
     */
    getAgentCard(): Promise<AgentCardData>;
    /**
     * Get gateway health status
     */
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        version: string;
    }>;
    /**
     * Get API documentation
     */
    getDocs(): Promise<any>;
    /**
     * Watch task progress via Server-Sent Events
     */
    watchTask(taskId: string): EventSource;
    /**
     * Get contract interaction helpers
     */
    contracts(): ContractHelpers;
    /**
     * Generate tools from contract ABI
     */
    static generateToolsFromAbi(contractName: string, abi: any[], contractAddress: string): import("./AbiToToolGenerator").ToolSchema[];
    /**
     * Generate example calls from ABI
     */
    static generateExampleCalls(contractName: string, abi: any[]): Record<string, any>;
    /**
     * Validate gateway connection
     */
    validateConnection(): Promise<{
        connected: boolean;
        latency?: number;
        error?: string;
    }>;
}
/**
 * Contract interaction helpers
 */
declare class ContractHelpers {
    private sdk;
    constructor(sdk: NpcSDK);
    /**
     * Create a duel
     */
    createDuel(params: {
        opponent: string;
        wager: string;
        tokenAddress?: string;
    }): Promise<TaskResult>;
    /**
     * Accept a duel
     */
    acceptDuel(duelId: number): Promise<TaskResult>;
    /**
     * Create a quest
     */
    createQuest(params: {
        reward: string;
        metadataUri: string;
        tokenAddress?: string;
    }): Promise<TaskResult>;
    /**
     * Accept a quest
     */
    acceptQuest(questId: number): Promise<TaskResult>;
    /**
     * Register an NPC
     */
    registerNPC(params: {
        owner: string;
        controller: string;
        metadataUri: string;
    }): Promise<TaskResult>;
    /**
     * Update NPC controller
     */
    updateNPCController(npcId: number, newController: string): Promise<TaskResult>;
}
