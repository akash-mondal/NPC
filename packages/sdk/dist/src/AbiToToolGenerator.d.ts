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
export declare class AbiToToolGenerator {
    /**
     * Generate Gemini function-calling schemas from contract ABI
     */
    static generateToolsFromAbi(contractName: string, abi: any[], contractAddress: string): ToolSchema[];
    private static generateFunctionDescription;
    private static inferFunctionPurpose;
    private static generateParameterProperties;
    private static mapSolidityTypeToJsonSchema;
    private static generateParameterDescription;
    private static generatePreconditions;
    private static generateSideEffects;
    /**
     * Generate example function calls for few-shot learning
     */
    static generateExampleCalls(contractName: string, abi: any[]): Record<string, any>;
    private static generateExampleParameters;
}
