export declare class AgentRuntime {
    constructor();
    handleTask(task: any): Promise<any>;
}

export declare class Planner {
    constructor();
    plan(observation: any, goal?: string): Promise<any>;
}

export declare class Perception {
    constructor();
    observe(forceRefresh?: boolean): Promise<any>;
}

export declare class Action {
    constructor();
    execute(plan: any): Promise<any>;
}

export declare class Referee {
    constructor();
    validate(executionResult: any): Promise<any>;
}