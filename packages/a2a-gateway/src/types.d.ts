declare module '@npc/agent-runtime' {
  export class AgentRuntime {
    constructor();
    handleTask(task: any): Promise<any>;
  }
}