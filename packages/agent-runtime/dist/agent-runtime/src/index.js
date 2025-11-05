"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Referee = exports.Action = exports.Perception = exports.Planner = exports.AgentRuntime = void 0;
require("dotenv/config");
const Planner_1 = require("./Planner");
const Perception_1 = require("./Perception");
const Action_1 = require("./Action");
const Referee_1 = require("./Referee");
class AgentRuntime {
    constructor() {
        console.log('Agent runtime starting...');
        this.perception = new Perception_1.Perception();
        this.planner = new Planner_1.Planner();
        this.action = new Action_1.Action();
        this.referee = new Referee_1.Referee();
    }
    async handleTask(task) {
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
        }
        catch (error) {
            console.error('AgentRuntime: Error handling task:', error);
            throw error;
        }
    }
}
exports.AgentRuntime = AgentRuntime;
// Export all classes
var Planner_2 = require("./Planner");
Object.defineProperty(exports, "Planner", { enumerable: true, get: function () { return Planner_2.Planner; } });
var Perception_2 = require("./Perception");
Object.defineProperty(exports, "Perception", { enumerable: true, get: function () { return Perception_2.Perception; } });
var Action_2 = require("./Action");
Object.defineProperty(exports, "Action", { enumerable: true, get: function () { return Action_2.Action; } });
var Referee_2 = require("./Referee");
Object.defineProperty(exports, "Referee", { enumerable: true, get: function () { return Referee_2.Referee; } });
