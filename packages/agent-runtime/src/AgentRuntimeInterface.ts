export interface AgentRuntimeInterface {
    handleTask(task: any): Promise<any>;
}
