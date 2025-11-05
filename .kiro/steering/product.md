# Product Overview

NPC (Non Playable Contract) is a genre-agnostic, A2A-native, ADK-orchestrated agentic NPC engine for Somnia blockchain that enables autonomous NPCs in games and applications.

## Core Purpose

- **Autonomous NPCs**: Create intelligent, blockchain-native NPCs that can perceive game state, make decisions, and execute verifiable on-chain transactions
- **Interoperability**: NPCs expose A2A Agent Cards and implement standard task lifecycles for cross-agent communication
- **Safety**: All actions are ABI-bound with strict preconditions and policy enforcement via BehaviorController
- **Verifiability**: Every interaction emits on-chain events viewable on Blockscout explorer

## Key Features

- **BYO Contract Integration**: Implement minimal interfaces to integrate with existing game contracts
- **Template Contracts**: Ready-to-use Arena and Quest contracts for rapid prototyping
- **Multi-Agent Runtime**: ADK-composed agents (Planner, Perception, Action, Referee) with tracing and guardrails
- **Gemini Integration**: Uses Google AI Studio API keys for planning and structured function calling
- **Somnia Shannon Testnet**: Deployed and verified contracts on Somnia's EVM-compatible testnet

## Target Users

- **Game Developers**: Integrate NPCs into existing games or use templates for new projects
- **Systems Designers**: Define behaviors and fairness rules without genre lock-in
- **Players/Creators**: Instantiate NPCs with custom skills and transparent on-chain receipts

## Success Metrics

- Time-to-first-NPC: Under 15 minutes from init to running duel/quest
- Zero unauthorized contract calls under default BehaviorController policies
- A2A conformance for interoperability with external agents