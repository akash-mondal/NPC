# NPC Project TODO List

This file outlines the steps to complete the full implementation of the Non Playable Contract (NPC) project.

## Phase 1: Core Infrastructure and Configuration

- [x] **Configuration Management:**
    - [x] Create a `.env.example` file in the root of the project.
    - [x] Add `.env` to the `.gitignore` file.
    - [x] Install `dotenv` package to load environment variables.
- [x] **Deployment Scripts:**
    - [x] Create a Hardhat script to deploy the smart contracts.
    - [x] The script should save the deployed contract addresses to a JSON file.

## Phase 2: Contract and Gateway Integration

- [x] **Secure Contracts:**
    - [x] Update `BehaviorController` to have a secure way to record calls.
    - [x] Update `Arena` and `Quest` contracts to be controlled by the `BehaviorController`.
- [x] **Integrate Gateway and Agent Runtime:**
    - [x] Connect the `a2a-gateway` to the `agent-runtime`.
    - [x] When a task is received by the gateway, it should trigger the agent workflow.

## Phase 3: Agent Implementation (The "Brain")

- [x] **`Perception` Agent:**
    - [x] Implement logic to read data from the deployed smart contracts.
- [ ] **`Action` Agent:**
    - [ ] Implement logic to send transactions to the smart contracts.
- [ ] **`Planner` Agent:**
    - [ ] Implement logic to use the Gemini API to generate plans.
    - [ ] Create tools (functions) for the model to call.
- [ ] **`Referee` Agent:**
    - [ ] Implement logic to validate game rules.

## Phase 4: Tooling and Finalization

- [ ] **ABI-to-Tool Generator:**
    - [ ] Create a script to generate `FunctionTool` definitions from a contract ABI.
- [ ] **SDK and CLI:**
    - [ ] Expand the SDK with more features.
    - [ ] Expand the CLI with more commands.
- [ ] **Testing:**
    - [ ] Add basic tests for the contracts and the agent runtime.

