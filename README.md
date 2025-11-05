# NPC (Non Playable Contract) 🎮⛓️

A genre-agnostic, A2A-native, ADK-orchestrated agentic NPC engine for Somnia blockchain that enables autonomous NPCs in games and applications.

## 🚀 Live Deployment

**Somnia Shannon Testnet Contracts:**
- **BehaviorController**: [`0x680930364Be2D733ac9286D3930635e7a27703E7`](https://shannon-explorer.somnia.network/address/0x680930364Be2D733ac9286D3930635e7a27703E7)
- **NPCRegistry**: [`0x0d042408f1E6835E45f4DEb9E0c1662032E6d99C`](https://shannon-explorer.somnia.network/address/0x0d042408f1E6835E45f4DEb9E0c1662032E6d99C)
- **Arena**: [`0x8874BdDD83553f6ca333e37932B9C6c5Af82Ab0F`](https://shannon-explorer.somnia.network/address/0x8874BdDD83553f6ca333e37932B9C6c5Af82Ab0F)
- **Quest**: [`0x5d07DF9a6c61b6183Ce08E268486358Eb4f993a2`](https://shannon-explorer.somnia.network/address/0x5d07DF9a6c61b6183Ce08E268486358Eb4f993a2)
- **GameActionAdapter**: [`0x9ec9a0f795949DC1F83C7FD8E7ba5d2Cf6D16CF4`](https://shannon-explorer.somnia.network/address/0x9ec9a0f795949DC1F83C7FD8E7ba5d2Cf6D16CF4)
- **MockToken**: [`0x6F30b8B34D042eF9f9bcFE0716CD44B607EA7845`](https://shannon-explorer.somnia.network/address/0x6F30b8B34D042eF9f9bcFE0716CD44B607EA7845)

**A2A Gateway**: Running on port 8080
- **Agent Card**: http://localhost:8080/agent-card
- **Health Check**: http://localhost:8080/health
- **Documentation**: http://localhost:8080/docs

## 🏗️ Architecture

### Core Components

1. **Smart Contracts** (Solidity)
   - `BehaviorController`: Policy enforcement and safety guardrails
   - `NPCRegistry`: NPC identity and ownership management
   - `Arena`: PvP duel template with escrow
   - `Quest`: PvE objective template
   - `GameActionAdapter`: Interface for external game integration

2. **Agent Runtime** (TypeScript + ADK + Gemini)
   - `Planner`: AI-powered decision making using Gemini 2.0-flash-exp
   - `Perception`: Blockchain state observation via Blockscout API
   - `Action`: ABI-bound contract execution with safety checks
   - `Referee`: Result validation and attestation

3. **A2A Gateway** (Express.js)
   - JSON-RPC 2.0 endpoints for task management
   - Server-Sent Events (SSE) for real-time updates
   - Agent Card publishing for discoverability
   - Rate limiting and authentication

4. **SDK & CLI** (TypeScript)
   - ABI-to-tool schema generation
   - Contract interaction helpers
   - Command-line interface for developers

## 🎯 Key Features

- **🤖 Autonomous NPCs**: AI-powered agents that perceive, plan, and act on-chain
- **🔗 A2A Protocol**: Standard agent-to-agent communication and discovery
- **🛡️ Safety First**: BehaviorController enforces policies and rate limits
- **🎮 Genre Agnostic**: Adapter pattern supports any game type
- **📊 Verifiable**: All actions recorded on Somnia with explorer links
- **⚡ Real-time**: SSE streaming for live task updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Somnia Shannon testnet STT tokens ([Faucet](https://cloud.google.com/application/web3/faucet/somnia/shannon))
- Gemini API key ([Google AI Studio](https://ai.google.dev))

### Installation

```bash
# Clone and install
git clone <repository-url>
cd npc
npm run bootstrap
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your keys
```

### Deploy Contracts

```bash
cd packages/contracts
npx hardhat ignition deploy ignition/modules/NPCSystem.ts --network somnia_shannon
```

### Start A2A Gateway

```bash
cd packages/a2a-gateway
PORT=8080 node dist/index.js
```

## 📡 API Usage

### Create a Duel Task

```bash
curl -X POST http://localhost:8080/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "jsonrpc": "2.0",
    "method": "task.open",
    "params": {
      "type": "duel",
      "params": {
        "opponent": "0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d",
        "wager": "1000000000000000000",
        "tokenAddress": "0x6F30b8B34D042eF9f9bcFE0716CD44B607EA7845"
      }
    },
    "id": 1
  }'
```

### Check Task Status

```bash
curl -X POST http://localhost:8080/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-123" \
  -d '{
    "jsonrpc": "2.0",
    "method": "task.status",
    "params": {
      "taskId": "your-task-id"
    },
    "id": 2
  }'
```

### Stream Task Updates

```bash
curl -N http://localhost:8080/stream/your-task-id
```

## 🏛️ Project Structure

```
packages/
├── agent-runtime/     # ADK-based agent orchestration
├── a2a-gateway/      # HTTP gateway for A2A protocol  
├── contracts/        # Solidity smart contracts
├── cli/             # Command-line tools
└── sdk/             # TypeScript SDK for integrations
```

## 🔧 Development

### Build All Packages
```bash
npm run build
```

### Run Tests
```bash
cd packages/contracts
npx hardhat test
```

### Deploy to Different Networks
```bash
# Somnia Shannon Testnet
npx hardhat ignition deploy ignition/modules/NPCSystem.ts --network somnia_shannon

# Local development
npx hardhat ignition deploy ignition/modules/NPCSystem.ts --network hardhatMainnet
```

## 🌐 Integration Examples

### BYO Contract Integration

```solidity
// Your game contract
contract MyGame is IGameAction {
    function executeAction(
        string calldata actionType,
        bytes calldata params
    ) external returns (bool success, bytes memory result) {
        // Your game logic here
        return (true, abi.encode("Action completed"));
    }
}
```

### SDK Usage

```typescript
import { NpcSDK } from '@npc/sdk';

const sdk = new NpcSDK('http://localhost:8080');
sdk.setApiKey('your-api-key');

// Create a quest
const result = await sdk.contracts().createQuest({
    reward: '1000000000000000000',
    metadataUri: 'https://ipfs.io/ipfs/QmExample'
});
```

## 🔐 Security

- **BehaviorController**: Enforces allowlists, rate limits, and gas budgets
- **API Authentication**: API keys and scoped tokens
- **ABI-bound Tools**: Strict schema validation prevents malicious calls
- **Two-stage Gating**: AI selection + deterministic validation

## 📚 Documentation

- **A2A Protocol**: [a2a-protocol.org](https://a2a-protocol.org/latest/specification/)
- **Google ADK**: [ADK Documentation](https://google.github.io/adk-docs/)
- **Somnia Network**: [Somnia Docs](https://docs.somnia.network)
- **Gemini API**: [Google AI Studio](https://ai.google.dev)

## 🎮 Use Cases

- **PvP Duels**: Autonomous NPCs that challenge players
- **PvE Quests**: Dynamic objective generation and completion
- **Market Making**: NPCs that provide liquidity and trading
- **Social NPCs**: Conversational agents with on-chain memory
- **Game Masters**: NPCs that orchestrate complex scenarios

## 🏆 Hackathon Compliance

✅ **Deployed dApp**: Live contracts on Somnia Shannon testnet  
✅ **Public Code**: Open source repository with complete implementation  
✅ **Verifiable**: All transactions visible on Blockscout explorer  
✅ **Original**: Novel combination of A2A + ADK + Somnia + Gemini  
✅ **Technical Complexity**: Multi-agent orchestration with AI planning  
✅ **Complete**: End-to-end working system with CLI, SDK, and gateway  
✅ **Usable**: Simple API for developers to integrate NPCs  

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Somnia Network** for the EVM-compatible blockchain
- **Google** for ADK orchestration and Gemini AI
- **A2A Protocol** for agent interoperability standards
- **OpenZeppelin** for secure smart contract libraries

---

**Built with ❤️ for the future of autonomous gaming on Somnia** 🎮⛓️