export interface SecurityScheme {
  type: 'apiKey' | 'oauth2' | 'bearer';
  name?: string;
  in?: 'header' | 'query';
  description?: string;
  flows?: any;
}

export interface Transport {
  type: 'http' | 'websocket';
  url: string;
  methods?: string[];
}

export interface Capability {
  name: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
}

export interface AgentCardData {
  // Core Identity
  id: string;
  name: string;
  version: string;
  description: string;
  
  // Capabilities
  capabilities: Capability[];
  
  // Transport & Communication
  transport: Transport[];
  
  // Security
  security: SecurityScheme[];
  
  // Skills & Metadata
  skills: string[];
  tags: string[];
  
  // A2A Compliance
  a2aVersion: string;
  
  // Optional metadata
  author?: string;
  license?: string;
  homepage?: string;
  documentation?: string;
}

export class AgentCard {
  private data: AgentCardData;

  constructor(baseUrl: string, npcId?: string) {
    this.data = {
      id: npcId || `npc-agent-${Date.now()}`,
      name: 'NPC Agent',
      version: '1.0.0',
      description: 'Autonomous NPC agent for Somnia blockchain games using ADK orchestration and Gemini AI',
      
      capabilities: [
        {
          name: 'task.open',
          description: 'Open a new task for the NPC to execute',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['duel', 'quest', 'custom'] },
              params: { type: 'object' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' }
            },
            required: ['type', 'params']
          },
          outputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              status: { type: 'string', enum: ['submitted', 'working', 'completed', 'failed'] },
              streamUrl: { type: 'string' }
            }
          }
        },
        {
          name: 'task.status',
          description: 'Get the current status of a task',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' }
            },
            required: ['taskId']
          }
        },
        {
          name: 'task.update',
          description: 'Update a task with new parameters or instructions',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              update: { type: 'object' }
            },
            required: ['taskId', 'update']
          }
        },
        {
          name: 'task.finalize',
          description: 'Finalize a task and get final results',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' }
            },
            required: ['taskId']
          }
        }
      ],
      
      transport: [
        {
          type: 'http',
          url: `${baseUrl}/rpc`,
          methods: ['POST']
        }
      ],
      
      security: [
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key for authentication'
        },
        {
          type: 'bearer',
          description: 'Bearer token for scoped task access'
        }
      ],
      
      skills: [
        'blockchain-interaction',
        'smart-contract-execution',
        'game-state-perception',
        'strategic-planning',
        'risk-assessment',
        'multi-agent-coordination'
      ],
      
      tags: [
        'npc',
        'gaming',
        'blockchain',
        'somnia',
        'autonomous-agent',
        'adk',
        'gemini-ai'
      ],
      
      a2aVersion: '1.0',
      
      author: 'NPC Engine Team',
      license: 'MIT',
      documentation: `${baseUrl}/docs`
    };
  }

  /**
   * Get the complete Agent Card as JSON
   */
  getCard(): AgentCardData {
    return { ...this.data };
  }

  /**
   * Update agent capabilities based on deployed contracts
   */
  updateCapabilities(contractCapabilities: Capability[]): void {
    // Add contract-specific capabilities while keeping core task management
    const coreCapabilities = this.data.capabilities.filter(cap => cap.name.startsWith('task.'));
    this.data.capabilities = [...coreCapabilities, ...contractCapabilities];
  }

  /**
   * Add streaming endpoint for SSE
   */
  addStreamingTransport(baseUrl: string): void {
    this.data.transport.push({
      type: 'websocket',
      url: `${baseUrl}/stream/{taskId}`,
      methods: ['GET']
    });
  }

  /**
   * Validate Agent Card against A2A specification
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!this.data.id) errors.push('Missing required field: id');
    if (!this.data.name) errors.push('Missing required field: name');
    if (!this.data.version) errors.push('Missing required field: version');
    if (!this.data.capabilities || this.data.capabilities.length === 0) {
      errors.push('Missing required field: capabilities');
    }
    if (!this.data.transport || this.data.transport.length === 0) {
      errors.push('Missing required field: transport');
    }

    // Validate capabilities
    for (const cap of this.data.capabilities) {
      if (!cap.name) errors.push(`Capability missing name: ${JSON.stringify(cap)}`);
      if (!cap.description) errors.push(`Capability ${cap.name} missing description`);
    }

    // Validate transport
    for (const transport of this.data.transport) {
      if (!transport.type) errors.push('Transport missing type');
      if (!transport.url) errors.push('Transport missing URL');
    }

    // Validate security schemes
    for (const security of this.data.security) {
      if (!security.type) errors.push('Security scheme missing type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate Agent Card for specific NPC with contract addresses
   */
  static forNPC(
    npcId: string,
    baseUrl: string,
    contractAddresses: Record<string, string>
  ): AgentCard {
    const card = new AgentCard(baseUrl, npcId);
    
    // Add contract-specific metadata
    card.data.description += ` (NPC ID: ${npcId})`;
    card.data.skills.push('contract-integration');
    
    // Add contract addresses to metadata
    (card.data as any).contracts = contractAddresses;
    
    return card;
  }
}