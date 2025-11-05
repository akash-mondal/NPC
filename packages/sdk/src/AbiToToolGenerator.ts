import { ethers } from 'ethers';

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  preconditions?: string[];
  sideEffects?: string[];
}

export class AbiToToolGenerator {
  /**
   * Generate Gemini function-calling schemas from contract ABI
   */
  static generateToolsFromAbi(
    contractName: string,
    abi: any[],
    contractAddress: string
  ): ToolSchema[] {
    const tools: ToolSchema[] = [];

    // Filter for functions (not events or constructors)
    const functions = abi.filter(item => item.type === 'function');

    for (const func of functions) {
      // Skip view functions for write operations, include them for read operations
      const isWriteFunction = func.stateMutability !== 'view' && func.stateMutability !== 'pure';
      
      const tool: ToolSchema = {
        name: `${contractName}_${func.name}`,
        description: this.generateFunctionDescription(contractName, func),
        parameters: {
          type: 'object',
          properties: this.generateParameterProperties(func.inputs),
          required: func.inputs.map((input: any) => input.name)
        }
      };

      // Add preconditions and side effects for write functions
      if (isWriteFunction) {
        tool.preconditions = this.generatePreconditions(func);
        tool.sideEffects = this.generateSideEffects(contractName, func);
      }

      tools.push(tool);
    }

    return tools;
  }

  private static generateFunctionDescription(contractName: string, func: any): string {
    const action = func.stateMutability === 'view' || func.stateMutability === 'pure' ? 'Query' : 'Execute';
    return `${action} ${func.name} function on ${contractName} contract. ${this.inferFunctionPurpose(func)}`;
  }

  private static inferFunctionPurpose(func: any): string {
    const name = func.name.toLowerCase();
    
    if (name.includes('create')) return 'Creates a new entity or initiates a process.';
    if (name.includes('accept')) return 'Accepts or confirms a pending action.';
    if (name.includes('complete') || name.includes('finalize')) return 'Completes or finalizes an ongoing process.';
    if (name.includes('register')) return 'Registers a new entity in the system.';
    if (name.includes('update')) return 'Updates existing entity data.';
    if (name.includes('get') || name.includes('query')) return 'Retrieves information from the contract.';
    if (name.includes('conclude')) return 'Concludes a process and determines outcomes.';
    
    return 'Performs a contract operation.';
  }

  private static generateParameterProperties(inputs: any[]): Record<string, any> {
    const properties: Record<string, any> = {};

    for (const input of inputs) {
      properties[input.name] = {
        type: this.mapSolidityTypeToJsonSchema(input.type),
        description: this.generateParameterDescription(input)
      };

      // Add format hints for addresses
      if (input.type === 'address') {
        properties[input.name].pattern = '^0x[a-fA-F0-9]{40}$';
      }

      // Add constraints for numeric types
      if (input.type.startsWith('uint')) {
        properties[input.name].minimum = 0;
      }
    }

    return properties;
  }

  private static mapSolidityTypeToJsonSchema(solidityType: string): string {
    if (solidityType === 'address' || solidityType === 'string' || solidityType.includes('bytes')) {
      return 'string';
    }
    if (solidityType.startsWith('uint') || solidityType.startsWith('int')) {
      return 'number';
    }
    if (solidityType === 'bool') {
      return 'boolean';
    }
    if (solidityType.includes('[]')) {
      return 'array';
    }
    return 'string'; // Default fallback
  }

  private static generateParameterDescription(input: any): string {
    const name = input.name.toLowerCase();
    const type = input.type;

    if (type === 'address') {
      if (name.includes('owner')) return 'Ethereum address of the owner';
      if (name.includes('player') || name.includes('participant')) return 'Ethereum address of the player/participant';
      if (name.includes('token')) return 'Contract address of the ERC20 token';
      if (name.includes('controller')) return 'Ethereum address of the controller';
      return 'Ethereum address parameter';
    }

    if (type.startsWith('uint') && (name.includes('id') || name.includes('Id'))) {
      return 'Unique identifier number';
    }

    if (type.startsWith('uint') && (name.includes('amount') || name.includes('wager') || name.includes('reward'))) {
      return 'Amount in token units (consider decimals)';
    }

    if (name.includes('uri') || name.includes('metadata')) {
      return 'URI pointing to metadata (IPFS or HTTP)';
    }

    return `${input.name} parameter of type ${type}`;
  }

  private static generatePreconditions(func: any): string[] {
    const preconditions: string[] = [];
    const name = func.name.toLowerCase();

    // Common preconditions based on function patterns
    if (name.includes('create') && func.inputs.some((i: any) => i.name.includes('wager') || i.name.includes('reward'))) {
      preconditions.push('Caller must have sufficient token balance');
      preconditions.push('Caller must have approved token allowance to contract');
    }

    if (name.includes('accept')) {
      preconditions.push('Target entity must be in pending/open state');
      preconditions.push('Caller must be authorized to accept');
    }

    if (name.includes('complete') || name.includes('conclude')) {
      preconditions.push('Entity must be in active/in-progress state');
      preconditions.push('BehaviorController must allow this action');
    }

    // Always add BehaviorController check for state-changing functions
    preconditions.push('Function must be allowed by BehaviorController policy');

    return preconditions;
  }

  private static generateSideEffects(contractName: string, func: any): string[] {
    const sideEffects: string[] = [];
    const name = func.name.toLowerCase();

    if (name.includes('create')) {
      sideEffects.push(`Creates new ${contractName.toLowerCase()} entity`);
      sideEffects.push('Transfers tokens to contract (escrow)');
      sideEffects.push('Emits creation event');
    }

    if (name.includes('accept')) {
      sideEffects.push('Changes entity state to active');
      sideEffects.push('May transfer additional tokens');
      sideEffects.push('Emits acceptance event');
    }

    if (name.includes('complete') || name.includes('conclude')) {
      sideEffects.push('Finalizes entity state');
      sideEffects.push('Transfers tokens to winner/participant');
      sideEffects.push('Emits completion event');
      sideEffects.push('Records call in BehaviorController');
    }

    return sideEffects;
  }

  /**
   * Generate example function calls for few-shot learning
   */
  static generateExampleCalls(contractName: string, abi: any[]): Record<string, any> {
    const examples: Record<string, any> = {};
    
    const functions = abi.filter(item => item.type === 'function');
    
    for (const func of functions) {
      const toolName = `${contractName}_${func.name}`;
      examples[toolName] = this.generateExampleParameters(func);
    }

    return examples;
  }

  private static generateExampleParameters(func: any): any {
    const example: any = {};

    for (const input of func.inputs) {
      switch (input.type) {
        case 'address':
          if (input.name.includes('token')) {
            example[input.name] = '0xA0b86a33E6441b8dB4B2f4C8b1d4c5e6f7890123'; // Example token address
          } else {
            example[input.name] = '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d'; // Example user address
          }
          break;
        case 'uint256':
          if (input.name.includes('Id')) {
            example[input.name] = 1;
          } else if (input.name.includes('wager') || input.name.includes('reward')) {
            example[input.name] = 1000000000000000000; // 1 token (18 decimals)
          } else {
            example[input.name] = 100;
          }
          break;
        case 'string':
          if (input.name.includes('uri') || input.name.includes('metadata')) {
            example[input.name] = 'https://ipfs.io/ipfs/QmExample...';
          } else {
            example[input.name] = 'example string';
          }
          break;
        case 'bool':
          example[input.name] = true;
          break;
        default:
          example[input.name] = null;
      }
    }

    return example;
  }
}