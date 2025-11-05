import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { AgentCard } from './AgentCard';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

app.use(bodyParser.json());
app.use(express.static('public')); // For serving static files

// Simple mock agent runtime for now
class MockAgentRuntime {
    async handleTask(task: any): Promise<any> {
        console.log('MockAgentRuntime: Handling task', task);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            action: task.type || 'unknown',
            result: `Processed ${task.type} task with params: ${JSON.stringify(task.params)}`,
            timestamp: Date.now()
        };
    }
}

const agentRuntime = new MockAgentRuntime();

// Task management
interface Task {
    id: string;
    type: string;
    params: any;
    status: 'submitted' | 'working' | 'completed' | 'failed';
    result?: any;
    error?: string;
    createdAt: number;
    updatedAt: number;
    streamClients: Set<express.Response>;
}

const tasks = new Map<string, Task>();
const apiKeys = new Set<string>();

// Initialize with a default API key for testing
apiKeys.add(process.env.DEFAULT_API_KEY || 'test-api-key-123');

// Security middleware
function authenticateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey || !apiKeys.has(apiKey)) {
        return res.status(401).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Invalid API key' },
            id: null
        });
    }
    
    next();
}

// Rate limiting middleware (simple in-memory implementation)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
    const clientId = (req.ip || 'unknown') + (req.headers['x-api-key'] || '');
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // 100 requests per minute
    
    const current = rateLimits.get(clientId);
    
    if (!current || now > current.resetTime) {
        rateLimits.set(clientId, { count: 1, resetTime: now + windowMs });
        next();
    } else if (current.count < maxRequests) {
        current.count++;
        next();
    } else {
        res.status(429).json({
            jsonrpc: '2.0',
            error: { code: -32002, message: 'Rate limit exceeded' },
            id: null
        });
    }
}

// Initialize Agent Card
const agentCard = new AgentCard(baseUrl);
agentCard.addStreamingTransport(baseUrl);

// Agent Card endpoint (public, no auth required)
app.get('/agent-card', (req, res) => {
    const card = agentCard.getCard();
    res.json(card);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Documentation endpoint
app.get('/docs', (req, res) => {
    res.json({
        title: 'NPC Agent API Documentation',
        version: '1.0.0',
        description: 'A2A-compliant NPC agent for Somnia blockchain games',
        endpoints: {
            'GET /agent-card': 'Get the A2A Agent Card',
            'POST /rpc': 'JSON-RPC 2.0 endpoint for task management',
            'GET /stream/{taskId}': 'Server-Sent Events stream for task updates',
            'GET /health': 'Health check endpoint'
        },
        authentication: 'API key required in X-API-Key header',
        examples: {
            openTask: {
                jsonrpc: '2.0',
                method: 'task.open',
                params: {
                    type: 'duel',
                    params: { opponent: '0x...', wager: '1000000000000000000' }
                },
                id: 1
            }
        }
    });
});

// A2A JSON-RPC endpoint
app.post('/rpc', rateLimit, authenticateApiKey, async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
        return res.status(400).json({ 
            jsonrpc: '2.0', 
            error: { code: -32600, message: 'Invalid Request' }, 
            id 
        });
    }

    let result: any;

    try {
        switch (method) {
            case 'task.open':
                result = await handleTaskOpen(params);
                break;
            case 'task.status':
                result = await handleTaskStatus(params);
                break;
            case 'task.update':
                result = await handleTaskUpdate(params);
                break;
            case 'task.finalize':
                result = await handleTaskFinalize(params);
                break;
            default:
                return res.status(400).json({ 
                    jsonrpc: '2.0', 
                    error: { code: -32601, message: 'Method not found' }, 
                    id 
                });
        }

        res.json({ jsonrpc: '2.0', result, id });

    } catch (error: any) {
        console.error(`RPC Error for method ${method}:`, error);
        res.status(500).json({ 
            jsonrpc: '2.0', 
            error: { 
                code: -32000, 
                message: error.message || 'Internal error',
                data: error.code || null
            }, 
            id 
        });
    }
});

// Task management functions
async function handleTaskOpen(params: any): Promise<any> {
    const taskId = crypto.randomUUID();
    const task: Task = {
        id: taskId,
        type: params.type || 'general',
        params: params.params || {},
        status: 'submitted',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        streamClients: new Set()
    };

    tasks.set(taskId, task);

    console.log(`Opening task ${taskId} with type: ${task.type}`);

    // Start processing the task asynchronously
    processTask(taskId).catch(error => {
        console.error(`Error processing task ${taskId}:`, error);
        updateTaskStatus(taskId, 'failed', undefined, error.message);
    });

    return {
        taskId,
        status: task.status,
        streamUrl: `${baseUrl}/stream/${taskId}`,
        createdAt: task.createdAt
    };
}

async function handleTaskStatus(params: any): Promise<any> {
    const { taskId } = params;
    
    if (!taskId) {
        throw new Error('taskId is required');
    }

    const task = tasks.get(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    return {
        taskId: task.id,
        status: task.status,
        type: task.type,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        result: task.result,
        error: task.error
    };
}

async function handleTaskUpdate(params: any): Promise<any> {
    const { taskId, update } = params;
    
    if (!taskId) {
        throw new Error('taskId is required');
    }

    const task = tasks.get(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    if (task.status === 'completed' || task.status === 'failed') {
        throw new Error('Cannot update completed or failed task');
    }

    // Update task parameters
    task.params = { ...task.params, ...update };
    task.updatedAt = Date.now();

    // Broadcast update to stream clients
    broadcastToStreamClients(taskId, {
        type: 'update',
        taskId,
        update,
        timestamp: task.updatedAt
    });

    return {
        taskId: task.id,
        status: task.status,
        updatedAt: task.updatedAt
    };
}

async function handleTaskFinalize(params: any): Promise<any> {
    const { taskId } = params;
    
    if (!taskId) {
        throw new Error('taskId is required');
    }

    const task = tasks.get(taskId);
    if (!task) {
        throw new Error('Task not found');
    }

    // Force completion if still working
    if (task.status === 'working' || task.status === 'submitted') {
        updateTaskStatus(taskId, 'completed', { forcedFinalization: true });
    }

    return {
        taskId: task.id,
        status: task.status,
        result: task.result,
        error: task.error,
        finalizedAt: task.updatedAt
    };
}

// Task processing
async function processTask(taskId: string): Promise<void> {
    const task = tasks.get(taskId);
    if (!task) return;

    updateTaskStatus(taskId, 'working');

    try {
        // Execute the task using the agent runtime
        const result = await agentRuntime.handleTask({
            type: task.type,
            params: task.params,
            taskId: taskId
        });

        updateTaskStatus(taskId, 'completed', result);

    } catch (error: any) {
        console.error(`Task ${taskId} failed:`, error);
        updateTaskStatus(taskId, 'failed', undefined, error.message);
    }
}

function updateTaskStatus(
    taskId: string, 
    status: Task['status'], 
    result?: any, 
    error?: string
): void {
    const task = tasks.get(taskId);
    if (!task) return;

    task.status = status;
    task.updatedAt = Date.now();
    
    if (result !== undefined) {
        task.result = result;
    }
    
    if (error) {
        task.error = error;
    }

    // Broadcast to stream clients
    broadcastToStreamClients(taskId, {
        type: 'status',
        taskId,
        status,
        result,
        error,
        timestamp: task.updatedAt
    });

    console.log(`Task ${taskId} status updated to: ${status}`);
}

function broadcastToStreamClients(taskId: string, data: any): void {
    const task = tasks.get(taskId);
    if (!task) return;

    const message = `id: ${Date.now()}\nevent: update\ndata: ${JSON.stringify(data)}\n\n`;
    
    task.streamClients.forEach(client => {
        try {
            client.write(message);
        } catch (error) {
            console.error('Error writing to stream client:', error);
            task.streamClients.delete(client);
        }
    });
}

// SSE endpoint for streaming updates
app.get('/stream/:taskId', (req, res) => {
    const { taskId } = req.params;
    
    const task = tasks.get(taskId);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection message
    res.write(`id: ${Date.now()}\nevent: connected\ndata: ${JSON.stringify({
        type: 'connected',
        taskId,
        status: task.status,
        timestamp: Date.now()
    })}\n\n`);

    // Add client to task's stream clients
    task.streamClients.add(res);

    // Send current task status
    res.write(`id: ${Date.now()}\nevent: status\ndata: ${JSON.stringify({
        type: 'status',
        taskId: task.id,
        status: task.status,
        result: task.result,
        error: task.error,
        timestamp: task.updatedAt
    })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
        task.streamClients.delete(res);
        console.log(`Stream client disconnected from task ${taskId}`);
    });

    req.on('error', (error) => {
        console.error(`Stream error for task ${taskId}:`, error);
        task.streamClients.delete(res);
    });
});

// Admin endpoints (for development/debugging)
app.get('/admin/tasks', authenticateApiKey, (req, res) => {
    const taskList = Array.from(tasks.values()).map(task => ({
        id: task.id,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        streamClients: task.streamClients.size
    }));

    res.json({
        totalTasks: tasks.size,
        tasks: taskList
    });
});

app.delete('/admin/tasks/:taskId', authenticateApiKey, (req, res) => {
    const { taskId } = req.params;
    const task = tasks.get(taskId);
    
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    // Close all stream connections
    task.streamClients.forEach(client => {
        try {
            client.end();
        } catch (error) {
            console.error('Error closing stream client:', error);
        }
    });

    tasks.delete(taskId);
    res.json({ message: 'Task deleted', taskId });
});

// Cleanup old tasks periodically
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [taskId, task] of tasks.entries()) {
        if (now - task.createdAt > maxAge) {
            // Close stream connections
            task.streamClients.forEach(client => {
                try {
                    client.end();
                } catch (error) {
                    console.error('Error closing stream client during cleanup:', error);
                }
            });
            
            tasks.delete(taskId);
            console.log(`Cleaned up old task: ${taskId}`);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    
    // Close all stream connections
    tasks.forEach(task => {
        task.streamClients.forEach(client => {
            try {
                client.end();
            } catch (error) {
                console.error('Error closing stream client during shutdown:', error);
            }
        });
    });
    
    process.exit(0);
});

app.listen(port, () => {
    console.log(`🚀 A2A Gateway listening on port ${port}`);
    console.log(`📋 Agent Card available at: ${baseUrl}/agent-card`);
    console.log(`📚 Documentation available at: ${baseUrl}/docs`);
    console.log(`💚 Health check available at: ${baseUrl}/health`);
});
