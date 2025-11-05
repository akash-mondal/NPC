import axios from 'axios';
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

export class NpcSDK {
    private gatewayUrl: string;
    private apiKey?: string;
    private timeout: number = 30000; // 30 seconds

    constructor(gatewayUrl: string = 'http://localhost:3000') {
        this.gatewayUrl = gatewayUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Set API key for authentication
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }

    /**
     * Set request timeout
     */
    setTimeout(timeout: number): void {
        this.timeout = timeout;
    }

    private async rpcRequest(method: string, params: any): Promise<any> {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (this.apiKey) {
                headers['X-API-Key'] = this.apiKey;
            }

            const response = await axios.post(`${this.gatewayUrl}/rpc`, {
                jsonrpc: '2.0',
                method,
                params,
                id: Date.now()
            }, {
                headers,
                timeout: this.timeout
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message} (Code: ${response.data.error.code})`);
            }

            return response.data.result;
        } catch (error: any) {
            if (error.response) {
                // HTTP error response
                throw new Error(`HTTP ${error.response.status}: ${error.response.data?.error?.message || error.message}`);
            } else if (error.request) {
                // Network error
                throw new Error(`Network error: Unable to reach gateway at ${this.gatewayUrl}`);
            } else {
                // Other error
                throw error;
            }
        }
    }

    private async httpRequest(path: string, options: any = {}): Promise<any> {
        try {
            const headers: Record<string, string> = {};

            if (this.apiKey && options.requireAuth !== false) {
                headers['X-API-Key'] = this.apiKey;
            }

            const response = await axios({
                method: options.method || 'GET',
                url: `${this.gatewayUrl}${path}`,
                headers,
                timeout: this.timeout,
                ...options
            });

            return response.data;
        } catch (error: any) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
            } else if (error.request) {
                throw new Error(`Network error: Unable to reach gateway at ${this.gatewayUrl}`);
            } else {
                throw error;
            }
        }
    }

    // Task Management Methods

    /**
     * Open a new task
     */
    async openTask(params: { type: string; params: any; priority?: 'low' | 'medium' | 'high' }): Promise<TaskResult> {
        return this.rpcRequest('task.open', params);
    }

    /**
     * Get task status
     */
    async getTaskStatus(taskId: string): Promise<TaskResult> {
        return this.rpcRequest('task.status', { taskId });
    }

    /**
     * Update a task
     */
    async updateTask(taskId: string, update: any): Promise<TaskResult> {
        return this.rpcRequest('task.update', { taskId, update });
    }

    /**
     * Finalize a task
     */
    async finalizeTask(taskId: string): Promise<TaskResult> {
        return this.rpcRequest('task.finalize', { taskId });
    }

    /**
     * List all tasks (admin endpoint)
     */
    async listTasks(): Promise<{ totalTasks: number; tasks: TaskResult[] }> {
        return this.httpRequest('/admin/tasks');
    }

    /**
     * Delete a task (admin endpoint)
     */
    async deleteTask(taskId: string): Promise<{ message: string; taskId: string }> {
        return this.httpRequest(`/admin/tasks/${taskId}`, { method: 'DELETE' });
    }

    // Agent Information Methods

    /**
     * Get the agent card
     */
    async getAgentCard(): Promise<AgentCardData> {
        return this.httpRequest('/agent-card', { requireAuth: false });
    }

    /**
     * Get gateway health status
     */
    async getHealth(): Promise<{ status: string; timestamp: string; uptime: number; version: string }> {
        return this.httpRequest('/health', { requireAuth: false });
    }

    /**
     * Get API documentation
     */
    async getDocs(): Promise<any> {
        return this.httpRequest('/docs', { requireAuth: false });
    }

    // Streaming Methods

    /**
     * Watch task progress via Server-Sent Events
     */
    watchTask(taskId: string): EventSource {
        const url = `${this.gatewayUrl}/stream/${taskId}`;
        
        // Note: EventSource doesn't support custom headers in browsers
        // For server-side usage, you might need a different SSE client
        if (typeof EventSource !== 'undefined') {
            return new EventSource(url);
        } else {
            throw new Error('EventSource not available in this environment');
        }
    }

    // Contract Interaction Helpers

    /**
     * Get contract interaction helpers
     */
    contracts() {
        return new ContractHelpers(this);
    }

    // Utility Methods

    /**
     * Generate tools from contract ABI
     */
    static generateToolsFromAbi(contractName: string, abi: any[], contractAddress: string) {
        return AbiToToolGenerator.generateToolsFromAbi(contractName, abi, contractAddress);
    }

    /**
     * Generate example calls from ABI
     */
    static generateExampleCalls(contractName: string, abi: any[]) {
        return AbiToToolGenerator.generateExampleCalls(contractName, abi);
    }

    /**
     * Validate gateway connection
     */
    async validateConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
        const startTime = Date.now();
        
        try {
            await this.getHealth();
            const latency = Date.now() - startTime;
            return { connected: true, latency };
        } catch (error: any) {
            return { connected: false, error: error.message };
        }
    }
}

/**
 * Contract interaction helpers
 */
class ContractHelpers {
    constructor(private sdk: NpcSDK) {}

    /**
     * Create a duel
     */
    async createDuel(params: { opponent: string; wager: string; tokenAddress?: string }): Promise<TaskResult> {
        return this.sdk.openTask({
            type: 'duel',
            params: {
                player2: params.opponent,
                tokenAddress: params.tokenAddress || '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123',
                wager: params.wager
            }
        });
    }

    /**
     * Accept a duel
     */
    async acceptDuel(duelId: number): Promise<TaskResult> {
        return this.sdk.openTask({
            type: 'duel',
            params: {
                action: 'accept',
                duelId
            }
        });
    }

    /**
     * Create a quest
     */
    async createQuest(params: { reward: string; metadataUri: string; tokenAddress?: string }): Promise<TaskResult> {
        return this.sdk.openTask({
            type: 'quest',
            params: {
                tokenAddress: params.tokenAddress || '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123',
                reward: params.reward,
                metadataUri: params.metadataUri
            }
        });
    }

    /**
     * Accept a quest
     */
    async acceptQuest(questId: number): Promise<TaskResult> {
        return this.sdk.openTask({
            type: 'quest',
            params: {
                action: 'accept',
                questId
            }
        });
    }

    /**
     * Register an NPC
     */
    async registerNPC(params: { owner: string; controller: string; metadataUri: string }): Promise<TaskResult> {
        return this.sdk.openTask({
            type: 'npc',
            params: {
                action: 'register',
                ...params
            }
        });
    }

    /**
     * Update NPC controller
     */
    async updateNPCController(npcId: number, newController: string): Promise<TaskResult> {
        return this.sdk.openTask({
            type: 'npc',
            params: {
                action: 'updateController',
                npcId,
                newController
            }
        });
    }
}

// Types are already exported above with the interfaces
