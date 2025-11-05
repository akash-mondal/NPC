# Technology Stack

## Build System & Package Management

- **Monorepo**: Lerna-managed workspace with npm workspaces
- **Language**: TypeScript for all packages, Solidity for smart contracts
- **Build Tool**: TypeScript compiler (`tsc`) for compilation

## Core Technologies

### Blockchain & Smart Contracts
- **Network**: Somnia Shannon Testnet (EVM-compatible)
- **Framework**: Hardhat with Viem toolbox for contract development
- **Solidity Version**: 0.8.28 with optimizer enabled for production
- **Dependencies**: OpenZeppelin contracts for security standards
- **Explorer**: Blockscout for transaction verification and indexing

### Agent Runtime
- **Orchestration**: Google Agent Development Kit (ADK) for multi-agent coordination
- **AI/ML**: Google Generative AI (Gemini) via AI Studio API keys
- **Blockchain Interaction**: Ethers.js v6 for Web3 operations
- **Validation**: Zod for schema validation and type safety

### Gateway & API
- **Web Framework**: Express.js for A2A gateway HTTP endpoints
- **Transport**: JSON-RPC 2.0 over HTTPS with Server-Sent Events (SSE)
- **Standards**: A2A (Agent-to-Agent) protocol compliance

### CLI & SDK
- **CLI Framework**: Commander.js for command-line interface
- **HTTP Client**: Axios for REST API interactions

## Package Structure

```
packages/
├── agent-runtime/     # Core ADK-based agent orchestration
├── a2a-gateway/      # HTTP gateway for A2A protocol
├── contracts/        # Solidity smart contracts
├── cli/             # Command-line tools
└── sdk/             # TypeScript SDK for integrations
```

## Common Commands

### Development Setup
```bash
npm run bootstrap    # Install all dependencies
npm run build       # Build all packages
```

### Contract Development
```bash
# In packages/contracts/
npx hardhat compile                    # Compile contracts
npx hardhat test                      # Run tests
npx hardhat run scripts/deploy.ts     # Deploy to network
```

### TypeScript Packages
```bash
# In any TypeScript package/
npm run build       # Compile TypeScript to dist/
```

## Environment Configuration

- **Network Config**: Somnia Shannon testnet RPC and private keys via `.env`
- **API Keys**: Google AI Studio keys for Gemini integration (server-side only)
- **Contract Addresses**: Deployed contract addresses for testnet verification

## Development Patterns

- **Type Safety**: Strict TypeScript with Zod validation
- **Error Handling**: Structured error codes for A2A compatibility
- **Idempotency**: All A2A methods support replay-safe operations
- **Tracing**: ADK workflow tracing for debugging and audit
- **Security**: BehaviorController policies enforce on-chain safety