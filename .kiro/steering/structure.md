# Project Structure

## Monorepo Organization

This is a Lerna-managed monorepo with npm workspaces. Each package has a specific responsibility in the NPC engine architecture.

## Package Responsibilities

### `packages/agent-runtime/`
**Core agent orchestration using Google ADK**
- `src/AgentRuntimeInterface.ts` - Main runtime interface
- `src/Planner.ts` - Intent decomposition and policy alignment
- `src/Perception.ts` - State assembly from blockchain/explorer
- `src/Action.ts` - ABI-bound execution of planned actions
- `src/Referee.ts` - Transition validation and result attestation
- `src/index.ts` - Main runtime that coordinates all agents

### `packages/a2a-gateway/`
**HTTP gateway implementing A2A protocol**
- Express.js server exposing JSON-RPC 2.0 endpoints
- Agent Card publishing at well-known paths
- Server-Sent Events (SSE) for streaming task updates
- Integration with agent-runtime for task execution

### `packages/contracts/`
**Solidity smart contracts for Somnia testnet**
- `contracts/Arena.sol` - PvP duel template with escrow
- `contracts/Quest.sol` - PvE objective template
- `contracts/BehaviorController.sol` - Policy enforcement and safety
- `contracts/NPCRegistry.sol` - NPC identity and permissions
- `scripts/deploy.ts` - Deployment scripts for testnet
- `test/` - Contract test suites

### `packages/cli/`
**Command-line interface for developers**
- Project scaffolding and initialization
- Contract deployment automation
- Agent Card publishing utilities
- Demo and testing commands

### `packages/sdk/`
**TypeScript SDK for game integrations**
- A2A client libraries
- ABI-to-tool schema generators
- Somnia RPC helpers
- Explorer API clients

## Key Configuration Files

### Root Level
- `lerna.json` - Monorepo configuration
- `package.json` - Workspace definition and scripts
- `.env.example` - Environment variable template

### Contract Configuration
- `packages/contracts/hardhat.config.ts` - Hardhat setup with Somnia network
- `packages/contracts/tsconfig.json` - TypeScript config for contracts

### TypeScript Packages
- Each package has `tsconfig.json` for compilation
- `package.json` with build scripts using `tsc`

## Development Workflow

1. **Root commands** affect all packages (bootstrap, build)
2. **Package-specific work** done in individual package directories
3. **Contract development** uses Hardhat toolchain in `packages/contracts/`
4. **Agent development** focuses on `packages/agent-runtime/`
5. **Integration work** uses `packages/sdk/` and `packages/cli/`

## Naming Conventions

- **Packages**: Scoped with `@npc/` prefix
- **Contracts**: PascalCase (Arena, BehaviorController)
- **TypeScript**: PascalCase for classes, camelCase for functions/variables
- **Files**: PascalCase for classes, kebab-case for utilities

## Import Patterns

- **Internal packages**: Use workspace references (`@npc/sdk`)
- **External deps**: Standard npm imports
- **Contracts**: Import from artifacts after compilation
- **Types**: Export from package index files for clean imports