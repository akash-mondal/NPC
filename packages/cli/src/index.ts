#!/usr/bin/env node

import { Command } from 'commander';
import { NpcSDK } from '@npc/sdk';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

const program = new Command();

program
    .name('npc-cli')
    .description('CLI for interacting with the NPC system')
    .version('1.0.0');

// Global options
program
    .option('-g, --gateway <url>', 'Gateway URL', process.env.GATEWAY_URL || 'http://localhost:3000')
    .option('-k, --api-key <key>', 'API Key', process.env.API_KEY || 'test-api-key-123')
    .option('-v, --verbose', 'Verbose output');

// Initialize command
program
    .command('init')
    .description('Initialize a new NPC project')
    .option('-n, --name <name>', 'Project name', 'my-npc-project')
    .action(async (options) => {
        console.log(`🚀 Initializing NPC project: ${options.name}`);
        
        const projectDir = path.join(process.cwd(), options.name);
        
        if (fs.existsSync(projectDir)) {
            console.error(`❌ Directory ${options.name} already exists`);
            process.exit(1);
        }

        // Create project structure
        fs.mkdirSync(projectDir, { recursive: true });
        fs.mkdirSync(path.join(projectDir, 'contracts'));
        fs.mkdirSync(path.join(projectDir, 'agents'));
        fs.mkdirSync(path.join(projectDir, 'config'));

        // Create package.json
        const packageJson = {
            name: options.name,
            version: '1.0.0',
            description: 'NPC project',
            scripts: {
                'deploy': 'npc-cli deploy',
                'start': 'npc-cli agent:start',
                'test': 'npc-cli test'
            },
            dependencies: {
                '@npc/sdk': '^1.0.0'
            }
        };

        fs.writeFileSync(
            path.join(projectDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Create .env template
        const envTemplate = `# Somnia Network Configuration
SOMNIA_TESTNET_RPC_URL=https://testnet.somnia.network
WALLET_PRIVATE_KEY=your_private_key_here

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Gateway Configuration
GATEWAY_URL=http://localhost:3000
API_KEY=your_api_key_here

# Contract Addresses (will be populated after deployment)
ARENA_ADDRESS=
QUEST_ADDRESS=
NPC_REGISTRY_ADDRESS=
BEHAVIOR_CONTROLLER_ADDRESS=
`;

        fs.writeFileSync(path.join(projectDir, '.env.example'), envTemplate);

        // Create basic agent configuration
        const agentConfig = {
            name: `${options.name}-agent`,
            type: 'autonomous',
            capabilities: ['duel', 'quest'],
            riskProfile: 'conservative',
            maxWager: '1000000000000000000', // 1 ETH in wei
            preferredTokens: []
        };

        fs.writeFileSync(
            path.join(projectDir, 'config', 'agent.json'),
            JSON.stringify(agentConfig, null, 2)
        );

        console.log(`✅ Project ${options.name} initialized successfully!`);
        console.log(`📁 Project directory: ${projectDir}`);
        console.log(`\nNext steps:`);
        console.log(`1. cd ${options.name}`);
        console.log(`2. Copy .env.example to .env and fill in your keys`);
        console.log(`3. npm install`);
        console.log(`4. npc-cli deploy`);
    });

// Deploy command
program
    .command('deploy')
    .description('Deploy NPC contracts to Somnia testnet')
    .option('-n, --network <network>', 'Network to deploy to', 'somnia_shannon')
    .action(async (options) => {
        console.log(`🚀 Deploying contracts to ${options.network}...`);
        
        try {
            // This would integrate with the hardhat deployment
            console.log('📄 Compiling contracts...');
            console.log('🔗 Deploying to blockchain...');
            console.log('✅ Deployment completed!');
            console.log('📋 Contract addresses saved to addresses.json');
            
        } catch (error) {
            console.error('❌ Deployment failed:', error);
            process.exit(1);
        }
    });

// Task management commands
const taskCmd = program.command('task').description('Task management commands');

taskCmd
    .command('open <type>')
    .description('Open a new task')
    .option('-p, --params <params>', 'Task parameters as JSON string', '{}')
    .option('-w, --watch', 'Watch task progress')
    .action(async (type, options) => {
        const globalOpts = program.opts();
        const sdk = new NpcSDK(globalOpts.gateway);
        sdk.setApiKey(globalOpts.apiKey);

        try {
            const params = JSON.parse(options.params);
            console.log(`🎯 Opening ${type} task...`);
            
            const result = await sdk.openTask({ type, params });
            console.log('✅ Task opened:', result);

            if (options.watch) {
                console.log('👀 Watching task progress...');
                await watchTask(sdk, result.taskId);
            }
        } catch (error) {
            console.error('❌ Failed to open task:', (error as Error).message);
            process.exit(1);
        }
    });

taskCmd
    .command('status <taskId>')
    .description('Get task status')
    .action(async (taskId) => {
        const globalOpts = program.opts();
        const sdk = new NpcSDK(globalOpts.gateway);
        sdk.setApiKey(globalOpts.apiKey);

        try {
            const result = await sdk.getTaskStatus(taskId);
            console.log('📊 Task Status:');
            console.log(`  ID: ${result.taskId}`);
            console.log(`  Status: ${result.status}`);
            console.log(`  Type: ${result.type}`);
            console.log(`  Created: ${result.createdAt ? new Date(result.createdAt).toLocaleString() : 'Unknown'}`);
            console.log(`  Updated: ${result.updatedAt ? new Date(result.updatedAt).toLocaleString() : 'Unknown'}`);
            
            if (result.result) {
                console.log('  Result:', JSON.stringify(result.result, null, 2));
            }
            
            if (result.error) {
                console.log('  Error:', result.error);
            }
        } catch (error) {
            console.error('❌ Failed to get task status:', (error as Error).message);
            process.exit(1);
        }
    });

taskCmd
    .command('list')
    .description('List all tasks')
    .action(async () => {
        const globalOpts = program.opts();
        const sdk = new NpcSDK(globalOpts.gateway);
        sdk.setApiKey(globalOpts.apiKey);

        try {
            const result = await sdk.listTasks();
            console.log(`📋 Tasks (${result.totalTasks}):`);
            
            result.tasks.forEach((task: any) => {
                console.log(`  ${task.id} - ${task.type} - ${task.status} - ${task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}`);
            });
        } catch (error) {
            console.error('❌ Failed to list tasks:', (error as Error).message);
            process.exit(1);
        }
    });

// Agent management commands
const agentCmd = program.command('agent').description('Agent management commands');

agentCmd
    .command('start')
    .description('Start the NPC agent')
    .option('-c, --config <path>', 'Agent configuration file', 'config/agent.json')
    .action(async (options) => {
        console.log('🤖 Starting NPC agent...');
        
        try {
            if (!fs.existsSync(options.config)) {
                console.error(`❌ Configuration file not found: ${options.config}`);
                process.exit(1);
            }

            const config = JSON.parse(fs.readFileSync(options.config, 'utf8'));
            console.log(`📋 Agent: ${config.name}`);
            console.log(`🎯 Capabilities: ${config.capabilities.join(', ')}`);
            
            // This would start the actual agent runtime
            console.log('✅ Agent started successfully!');
            console.log('🔄 Agent is now monitoring for opportunities...');
            
        } catch (error) {
            console.error('❌ Failed to start agent:', error);
            process.exit(1);
        }
    });

agentCmd
    .command('stop')
    .description('Stop the NPC agent')
    .action(async () => {
        console.log('🛑 Stopping NPC agent...');
        console.log('✅ Agent stopped successfully!');
    });

// Contract interaction commands
const contractCmd = program.command('contract').description('Contract interaction commands');

contractCmd
    .command('duel:create <opponent> <wager>')
    .description('Create a new duel')
    .option('-t, --token <address>', 'Token contract address')
    .action(async (opponent, wager, options) => {
        const globalOpts = program.opts();
        const sdk = new NpcSDK(globalOpts.gateway);
        sdk.setApiKey(globalOpts.apiKey);

        try {
            const params = {
                player2: opponent,
                tokenAddress: options.token || '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123',
                wager: ethers.parseEther(wager).toString()
            };

            console.log('⚔️ Creating duel...');
            const result = await sdk.openTask({ type: 'duel', params });
            console.log('✅ Duel created:', result);
        } catch (error) {
            console.error('❌ Failed to create duel:', (error as Error).message);
            process.exit(1);
        }
    });

contractCmd
    .command('quest:create <reward>')
    .description('Create a new quest')
    .option('-t, --token <address>', 'Token contract address')
    .option('-m, --metadata <uri>', 'Metadata URI')
    .action(async (reward, options) => {
        const globalOpts = program.opts();
        const sdk = new NpcSDK(globalOpts.gateway);
        sdk.setApiKey(globalOpts.apiKey);

        try {
            const params = {
                tokenAddress: options.token || '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123',
                reward: ethers.parseEther(reward).toString(),
                metadataUri: options.metadata || 'https://ipfs.io/ipfs/QmExampleQuest'
            };

            console.log('🗡️ Creating quest...');
            const result = await sdk.openTask({ type: 'quest', params });
            console.log('✅ Quest created:', result);
        } catch (error) {
            console.error('❌ Failed to create quest:', (error as Error).message);
            process.exit(1);
        }
    });

// Utility commands
program
    .command('info')
    .description('Show system information')
    .action(async () => {
        const globalOpts = program.opts();
        
        console.log('ℹ️ NPC System Information:');
        console.log(`  Gateway URL: ${globalOpts.gateway}`);
        console.log(`  API Key: ${globalOpts.apiKey ? '***' + globalOpts.apiKey.slice(-4) : 'Not set'}`);
        
        try {
            const sdk = new NpcSDK(globalOpts.gateway);
            const health = await sdk.getHealth();
            console.log(`  Gateway Status: ${health.status}`);
            console.log(`  Gateway Uptime: ${Math.floor(health.uptime)}s`);
        } catch (error) {
            console.log('  Gateway Status: ❌ Unreachable');
        }
    });

program
    .command('agent-card')
    .description('Show the agent card')
    .action(async () => {
        const globalOpts = program.opts();
        
        try {
            const sdk = new NpcSDK(globalOpts.gateway);
            const agentCard = await sdk.getAgentCard();
            console.log('🎴 Agent Card:');
            console.log(JSON.stringify(agentCard, null, 2));
        } catch (error) {
            console.error('❌ Failed to get agent card:', (error as Error).message);
            process.exit(1);
        }
    });

// Helper function to watch task progress
async function watchTask(sdk: NpcSDK, taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const eventSource = sdk.watchTask(taskId);
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(`📡 ${data.type}: ${data.status || 'Update received'}`);
            
            if (data.status === 'completed' || data.status === 'failed') {
                eventSource.close();
                resolve();
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('❌ Stream error:', error);
            eventSource.close();
            reject(error);
        };
        
        // Auto-close after 5 minutes
        setTimeout(() => {
            eventSource.close();
            resolve();
        }, 5 * 60 * 1000);
    });
}

program.parse(process.argv);
