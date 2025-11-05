import 'dotenv/config';
import { Planner } from './Planner';
import { Perception } from './Perception';
import { Action } from './Action';
import { Referee } from './Referee';
import { AgentRuntimeInterface } from './AgentRuntimeInterface';

export class AgentRuntime implements AgentRuntimeInterface {
    private perception: Perception;
    private planner: Planner;
    private action: Action;
    private referee: Referee;

    constructor() {
        console.log('Agent runtime starting...');
        this.perception = new Perception();
        this.planner = new Planner();
        this.action = new Action();
        this.referee = new Referee();
    }

    async handleTask(task: any): Promise<any> {
        console.log('AgentRuntime: Handling new task', task);

        try {
            // 1. Perception gathers state from the blockchain
            const observation = await this.perception.observe();

            // 2. Planner decides on an action based on the observation and task
            const plan = await this.planner.plan(observation, task.type);

            // 3. Action executes the plan
            const executionResult = await this.action.execute(plan);

            // 4. Referee validates the result
            const finalResult = await this.referee.validate(executionResult);

            console.log('AgentRuntime: Task handled successfully.', finalResult);
            return finalResult;
        } catch (error) {
            console.error('AgentRuntime: Error handling task:', error);
            throw error;
        }
    }
}

// Export all classes
export { Planner } from './Planner';
export { Perception } from './Perception';
export { Action } from './Action';
export { Referee } from './Referee';
