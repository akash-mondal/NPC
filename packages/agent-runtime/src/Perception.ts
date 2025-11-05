import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Somnia testnet provider
const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL);

// Blockscout API base URL for Somnia Shannon testnet
const BLOCKSCOUT_API_URL = process.env.BLOCKSCOUT_API_URL || 'https://shannon-explorer.somnia.network/api';

// Load contract addresses
const addressesPath = path.join(__dirname, '..', '..', 'contracts', 'addresses.json');
let contractAddresses: any = {};
try {
    contractAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
} catch (error) {
    console.warn('Perception: Could not load contract addresses, using empty object');
}

// Load contract ABIs
let arenaAbi: any[] = [];
let questAbi: any[] = [];
let npcRegistryAbi: any[] = [];
let behaviorControllerAbi: any[] = [];

try {
    arenaAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'Arena.sol', 'Arena.json'), 'utf8')).abi;
    questAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'Quest.sol', 'Quest.json'), 'utf8')).abi;
    npcRegistryAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'NPCRegistry.sol', 'NPCRegistry.json'), 'utf8')).abi;
    behaviorControllerAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', 'BehaviorController.sol', 'BehaviorController.json'), 'utf8')).abi;
} catch (error) {
    console.warn('Perception: Could not load contract ABIs:', error);
}

// Initialize contract instances
const arenaContract = contractAddresses.arena ? new ethers.Contract(contractAddresses.arena, arenaAbi, provider) : null;
const questContract = contractAddresses.quest ? new ethers.Contract(contractAddresses.quest, questAbi, provider) : null;
const npcRegistryContract = contractAddresses.npcRegistry ? new ethers.Contract(contractAddresses.npcRegistry, npcRegistryAbi, provider) : null;
const behaviorControllerContract = contractAddresses.behaviorController ? new ethers.Contract(contractAddresses.behaviorController, behaviorControllerAbi, provider) : null;

export interface Observation {
    timestamp: number;
    blockNumber: number;
    networkStatus: {
        latestBlock: number;
        gasPrice: string;
        networkId: string;
    };
    contracts: {
        arena: ContractState;
        quest: ContractState;
        npcRegistry: ContractState;
        behaviorController: ContractState;
    };
    recentEvents: EventSummary[];
    gameState: {
        activeDuels: DuelInfo[];
        openQuests: QuestInfo[];
        registeredNPCs: NPCInfo[];
    };
    marketConditions: {
        tokenPrices: Record<string, string>;
        liquidityLevels: Record<string, string>;
    };
}

interface ContractState {
    address: string;
    isActive: boolean;
    recentTransactions: number;
    lastActivity: number;
}

interface EventSummary {
    contract: string;
    event: string;
    blockNumber: number;
    transactionHash: string;
    relevantData: any;
}

interface DuelInfo {
    id: number;
    players: [string, string];
    wager: string;
    state: string;
    createdAt: number;
}

interface QuestInfo {
    id: number;
    creator: string;
    participant?: string;
    reward: string;
    state: string;
    createdAt: number;
}

interface NPCInfo {
    id: number;
    owner: string;
    controller: string;
    metadataUri: string;
}

export class Perception {
    private lastObservationTime: number = 0;
    private observationCache: Observation | null = null;
    private readonly CACHE_DURATION = 30000; // 30 seconds

    async observe(forceRefresh: boolean = false): Promise<Observation> {
        console.log('Perception: Observing blockchain state...');

        // Use cache if recent and not forcing refresh
        if (!forceRefresh && this.observationCache && 
            (Date.now() - this.lastObservationTime) < this.CACHE_DURATION) {
            console.log('Perception: Using cached observation');
            return this.observationCache;
        }

        try {
            const [
                blockNumber,
                networkStatus,
                contractStates,
                recentEvents,
                gameState,
                marketConditions
            ] = await Promise.all([
                this.getCurrentBlock(),
                this.getNetworkStatus(),
                this.getContractStates(),
                this.getRecentEvents(),
                this.getGameState(),
                this.getMarketConditions()
            ]);

            const observation: Observation = {
                timestamp: Date.now(),
                blockNumber,
                networkStatus,
                contracts: contractStates,
                recentEvents,
                gameState,
                marketConditions
            };

            // Cache the observation
            this.observationCache = observation;
            this.lastObservationTime = Date.now();

            console.log('Perception: Created observation', {
                blockNumber: observation.blockNumber,
                activeDuels: observation.gameState.activeDuels.length,
                openQuests: observation.gameState.openQuests.length,
                recentEvents: observation.recentEvents.length
            });

            return observation;

        } catch (error) {
            console.error('Perception: Error creating observation:', error);
            
            // Return minimal observation on error
            return this.getMinimalObservation();
        }
    }

    private async getCurrentBlock(): Promise<number> {
        try {
            return await provider.getBlockNumber();
        } catch (error) {
            console.error('Perception: Error getting block number:', error);
            return 0;
        }
    }

    private async getNetworkStatus(): Promise<any> {
        try {
            const [latestBlock, gasPrice, network] = await Promise.all([
                provider.getBlockNumber(),
                provider.getFeeData(),
                provider.getNetwork()
            ]);

            return {
                latestBlock,
                gasPrice: gasPrice.gasPrice?.toString() || '0',
                networkId: network.chainId.toString()
            };
        } catch (error) {
            console.error('Perception: Error getting network status:', error);
            return {
                latestBlock: 0,
                gasPrice: '0',
                networkId: 'unknown'
            };
        }
    }

    private async getContractStates(): Promise<any> {
        const states: any = {
            arena: { address: contractAddresses.arena || '', isActive: false, recentTransactions: 0, lastActivity: 0 },
            quest: { address: contractAddresses.quest || '', isActive: false, recentTransactions: 0, lastActivity: 0 },
            npcRegistry: { address: contractAddresses.npcRegistry || '', isActive: false, recentTransactions: 0, lastActivity: 0 },
            behaviorController: { address: contractAddresses.behaviorController || '', isActive: false, recentTransactions: 0, lastActivity: 0 }
        };

        // Check each contract's activity via Blockscout API
        for (const [contractName, contractInfo] of Object.entries(states)) {
            try {
                const info = contractInfo as ContractState;
                const activity = await this.getContractActivity(info.address);
                states[contractName] = {
                    ...info,
                    isActive: activity.isActive,
                    recentTransactions: activity.recentTransactions,
                    lastActivity: activity.lastActivity
                };
            } catch (error) {
                console.error(`Perception: Error getting ${contractName} state:`, error);
            }
        }

        return states;
    }

    private async getContractActivity(address: string): Promise<{ isActive: boolean; recentTransactions: number; lastActivity: number }> {
        if (!address) {
            return { isActive: false, recentTransactions: 0, lastActivity: 0 };
        }

        try {
            // Query Blockscout API for recent transactions
            const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}/transactions`, {
                params: { limit: 10 },
                timeout: 5000
            });

            const transactions = response.data.items || [];
            const recentTransactions = transactions.length;
            const lastActivity = transactions.length > 0 ? 
                new Date(transactions[0].timestamp).getTime() : 0;

            return {
                isActive: recentTransactions > 0,
                recentTransactions,
                lastActivity
            };
        } catch (error) {
            console.error('Perception: Error querying Blockscout:', error);
            return { isActive: false, recentTransactions: 0, lastActivity: 0 };
        }
    }

    private async getRecentEvents(): Promise<EventSummary[]> {
        const events: EventSummary[] = [];

        try {
            // Get recent events from all contracts
            const contracts = [
                { name: 'Arena', contract: arenaContract, address: contractAddresses.arena },
                { name: 'Quest', contract: questContract, address: contractAddresses.quest },
                { name: 'NPCRegistry', contract: npcRegistryContract, address: contractAddresses.npcRegistry },
                { name: 'BehaviorController', contract: behaviorControllerContract, address: contractAddresses.behaviorController }
            ];

            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 100); // Last 100 blocks

            for (const { name, contract, address } of contracts) {
                if (!contract || !address) continue;

                try {
                    // Query events via Blockscout API
                    const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${address}/logs`, {
                        params: {
                            from_block: fromBlock,
                            to_block: currentBlock,
                            limit: 20
                        },
                        timeout: 5000
                    });

                    const logs = response.data.items || [];
                    for (const log of logs) {
                        events.push({
                            contract: name,
                            event: log.decoded?.method_call || 'Unknown',
                            blockNumber: parseInt(log.block_number),
                            transactionHash: log.transaction_hash,
                            relevantData: log.decoded?.parameters || {}
                        });
                    }
                } catch (error) {
                    console.error(`Perception: Error getting ${name} events:`, error);
                }
            }

            // Sort by block number (most recent first)
            events.sort((a, b) => b.blockNumber - a.blockNumber);
            
            return events.slice(0, 50); // Limit to 50 most recent events

        } catch (error) {
            console.error('Perception: Error getting recent events:', error);
            return [];
        }
    }

    private async getGameState(): Promise<any> {
        const gameState = {
            activeDuels: [] as DuelInfo[],
            openQuests: [] as QuestInfo[],
            registeredNPCs: [] as NPCInfo[]
        };

        try {
            // Get active duels
            if (arenaContract) {
                // This is a simplified approach - in practice you'd query events or use a subgraph
                // For now, we'll try to get some basic state
                try {
                    // Attempt to get recent duel events
                    const duelEvents = await this.getContractEvents(contractAddresses.arena, 'DuelCreated', 100);
                    for (const event of duelEvents) {
                        gameState.activeDuels.push({
                            id: parseInt(event.args?.duelId || '0'),
                            players: [event.args?.player1 || '', event.args?.player2 || ''],
                            wager: event.args?.wager?.toString() || '0',
                            state: 'PENDING', // Would need to query actual state
                            createdAt: event.blockNumber || 0
                        });
                    }
                } catch (error) {
                    console.error('Perception: Error getting duel state:', error);
                }
            }

            // Get open quests
            if (questContract) {
                try {
                    const questEvents = await this.getContractEvents(contractAddresses.quest, 'QuestCreated', 100);
                    for (const event of questEvents) {
                        gameState.openQuests.push({
                            id: parseInt(event.args?.questId || '0'),
                            creator: event.args?.creator || '',
                            reward: event.args?.reward?.toString() || '0',
                            state: 'OPEN', // Would need to query actual state
                            createdAt: event.blockNumber || 0
                        });
                    }
                } catch (error) {
                    console.error('Perception: Error getting quest state:', error);
                }
            }

            // Get registered NPCs
            if (npcRegistryContract) {
                try {
                    const npcEvents = await this.getContractEvents(contractAddresses.npcRegistry, 'NPCRegistered', 100);
                    for (const event of npcEvents) {
                        gameState.registeredNPCs.push({
                            id: parseInt(event.args?.npcId || '0'),
                            owner: event.args?.owner || '',
                            controller: event.args?.controller || '',
                            metadataUri: '' // Would need additional query
                        });
                    }
                } catch (error) {
                    console.error('Perception: Error getting NPC state:', error);
                }
            }

        } catch (error) {
            console.error('Perception: Error getting game state:', error);
        }

        return gameState;
    }

    private async getContractEvents(contractAddress: string, eventName: string, blockRange: number): Promise<any[]> {
        try {
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - blockRange);

            // Use Blockscout API to get events
            const response = await axios.get(`${BLOCKSCOUT_API_URL}/v2/addresses/${contractAddress}/logs`, {
                params: {
                    from_block: fromBlock,
                    to_block: currentBlock,
                    topic0: ethers.id(`${eventName}(...)`), // Event signature
                    limit: 50
                },
                timeout: 5000
            });

            return response.data.items || [];
        } catch (error) {
            console.error(`Perception: Error getting ${eventName} events:`, error);
            return [];
        }
    }

    private async getMarketConditions(): Promise<any> {
        // Placeholder for market data - in a real implementation you'd query
        // DEX prices, liquidity pools, etc.
        return {
            tokenPrices: {},
            liquidityLevels: {}
        };
    }

    private getMinimalObservation(): Observation {
        return {
            timestamp: Date.now(),
            blockNumber: 0,
            networkStatus: {
                latestBlock: 0,
                gasPrice: '0',
                networkId: 'unknown'
            },
            contracts: {
                arena: { address: '', isActive: false, recentTransactions: 0, lastActivity: 0 },
                quest: { address: '', isActive: false, recentTransactions: 0, lastActivity: 0 },
                npcRegistry: { address: '', isActive: false, recentTransactions: 0, lastActivity: 0 },
                behaviorController: { address: '', isActive: false, recentTransactions: 0, lastActivity: 0 }
            },
            recentEvents: [],
            gameState: {
                activeDuels: [],
                openQuests: [],
                registeredNPCs: []
            },
            marketConditions: {
                tokenPrices: {},
                liquidityLevels: {}
            }
        };
    }

    /**
     * Get a focused observation for a specific task type
     */
    async observeForTask(taskType: 'duel' | 'quest' | 'general'): Promise<Observation> {
        const fullObservation = await this.observe();

        // Filter and focus the observation based on task type
        switch (taskType) {
            case 'duel':
                return {
                    ...fullObservation,
                    gameState: {
                        ...fullObservation.gameState,
                        openQuests: [], // Not relevant for duels
                        registeredNPCs: fullObservation.gameState.registeredNPCs.slice(0, 5) // Limit for context
                    },
                    recentEvents: fullObservation.recentEvents.filter(e => e.contract === 'Arena')
                };
            case 'quest':
                return {
                    ...fullObservation,
                    gameState: {
                        ...fullObservation.gameState,
                        activeDuels: [], // Not relevant for quests
                        registeredNPCs: fullObservation.gameState.registeredNPCs.slice(0, 5)
                    },
                    recentEvents: fullObservation.recentEvents.filter(e => e.contract === 'Quest')
                };
            default:
                return fullObservation;
        }
    }
}
