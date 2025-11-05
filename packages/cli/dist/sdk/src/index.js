"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NpcSDK = exports.AbiToToolGenerator = void 0;
const axios_1 = __importDefault(require("axios"));
const AbiToToolGenerator_1 = require("./AbiToToolGenerator");
Object.defineProperty(exports, "AbiToToolGenerator", { enumerable: true, get: function () { return AbiToToolGenerator_1.AbiToToolGenerator; } });
class NpcSDK {
    constructor(gatewayUrl = 'http://localhost:3000') {
        this.timeout = 30000; // 30 seconds
        this.gatewayUrl = gatewayUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    /**
     * Set API key for authentication
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * Set request timeout
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }
    async rpcRequest(method, params) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            if (this.apiKey) {
                headers['X-API-Key'] = this.apiKey;
            }
            const response = await axios_1.default.post(`${this.gatewayUrl}/rpc`, {
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
        }
        catch (error) {
            if (error.response) {
                // HTTP error response
                throw new Error(`HTTP ${error.response.status}: ${error.response.data?.error?.message || error.message}`);
            }
            else if (error.request) {
                // Network error
                throw new Error(`Network error: Unable to reach gateway at ${this.gatewayUrl}`);
            }
            else {
                // Other error
                throw error;
            }
        }
    }
    async httpRequest(path, options = {}) {
        try {
            const headers = {};
            if (this.apiKey && options.requireAuth !== false) {
                headers['X-API-Key'] = this.apiKey;
            }
            const response = await (0, axios_1.default)({
                method: options.method || 'GET',
                url: `${this.gatewayUrl}${path}`,
                headers,
                timeout: this.timeout,
                ...options
            });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
            }
            else if (error.request) {
                throw new Error(`Network error: Unable to reach gateway at ${this.gatewayUrl}`);
            }
            else {
                throw error;
            }
        }
    }
    // Task Management Methods
    /**
     * Open a new task
     */
    async openTask(params) {
        return this.rpcRequest('task.open', params);
    }
    /**
     * Get task status
     */
    async getTaskStatus(taskId) {
        return this.rpcRequest('task.status', { taskId });
    }
    /**
     * Update a task
     */
    async updateTask(taskId, update) {
        return this.rpcRequest('task.update', { taskId, update });
    }
    /**
     * Finalize a task
     */
    async finalizeTask(taskId) {
        return this.rpcRequest('task.finalize', { taskId });
    }
    /**
     * List all tasks (admin endpoint)
     */
    async listTasks() {
        return this.httpRequest('/admin/tasks');
    }
    /**
     * Delete a task (admin endpoint)
     */
    async deleteTask(taskId) {
        return this.httpRequest(`/admin/tasks/${taskId}`, { method: 'DELETE' });
    }
    // Agent Information Methods
    /**
     * Get the agent card
     */
    async getAgentCard() {
        return this.httpRequest('/agent-card', { requireAuth: false });
    }
    /**
     * Get gateway health status
     */
    async getHealth() {
        return this.httpRequest('/health', { requireAuth: false });
    }
    /**
     * Get API documentation
     */
    async getDocs() {
        return this.httpRequest('/docs', { requireAuth: false });
    }
    // Streaming Methods
    /**
     * Watch task progress via Server-Sent Events
     */
    watchTask(taskId) {
        const url = `${this.gatewayUrl}/stream/${taskId}`;
        // Note: EventSource doesn't support custom headers in browsers
        // For server-side usage, you might need a different SSE client
        if (typeof EventSource !== 'undefined') {
            return new EventSource(url);
        }
        else {
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
    static generateToolsFromAbi(contractName, abi, contractAddress) {
        return AbiToToolGenerator_1.AbiToToolGenerator.generateToolsFromAbi(contractName, abi, contractAddress);
    }
    /**
     * Generate example calls from ABI
     */
    static generateExampleCalls(contractName, abi) {
        return AbiToToolGenerator_1.AbiToToolGenerator.generateExampleCalls(contractName, abi);
    }
    /**
     * Validate gateway connection
     */
    async validateConnection() {
        const startTime = Date.now();
        try {
            await this.getHealth();
            const latency = Date.now() - startTime;
            return { connected: true, latency };
        }
        catch (error) {
            return { connected: false, error: error.message };
        }
    }
}
exports.NpcSDK = NpcSDK;
/**
 * Contract interaction helpers
 */
class ContractHelpers {
    constructor(sdk) {
        this.sdk = sdk;
    }
    /**
     * Create a duel
     */
    async createDuel(params) {
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
    async acceptDuel(duelId) {
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
    async createQuest(params) {
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
    async acceptQuest(questId) {
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
    async registerNPC(params) {
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
    async updateNPCController(npcId, newController) {
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
