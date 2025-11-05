# GEMINI.md

This file provides a comprehensive overview of the "Non Playable Contract" (NPC) project, designed to serve as a foundational context for AI-driven development and analysis.

## Directory Overview

This directory contains the complete design and specification documents for the **Non Playable Contract (NPC)** project. NPC is a sophisticated, genre-agnostic engine for creating autonomous, on-chain Non-Playable Characters for games built on the Somnia blockchain.

The core purpose of the project is to standardize how autonomous agents perceive game states, make safe and intelligent decisions, interoperate with other agents, and execute verifiable transactions on Somnia's EVM-compatible testnet. It leverages a powerful combination of technologies to achieve this, including Google's Agent Development Kit (ADK) for orchestration, the Agent-to-Agent (A2A) protocol for interoperability, and the Gemini API for advanced planning and tool-calling capabilities.

This is a documentation-centric project that describes a software architecture in great detail, likely for a hackathon or as a blueprint for implementation.

## Key Files

The directory contains a set of detailed documents covering all aspects of the NPC project:

*   `product-overview.txt`: Outlines the project's purpose, goals, target personas (game developers, system designers, players), and high-level capabilities. It defines what the NPC engine is, what it is not, and the functional/non-functional requirements.

*   `architecture.txt`: Provides a deep dive into the system's technical architecture. It describes the three main layers: the on-chain contracts on the Somnia blockchain, the off-chain agent runtime built with ADK, and the A2A gateway for communication. It also details data flow, state management, and deployment topology.

*   `protocols-tooling.txt`: Specifies the exact protocols, libraries, and developer tools that form the project's technical stack. This file explains *why* specific technologies like ADK, A2A, and Gemini function-calling were chosen and how they work together to create a deterministic, interoperable, and safe system.

*   `security.txt`: Defines the end-to-end security model for the NPC engine. It covers threat modeling, authentication/authorization via A2A, on-chain policy enforcement, secure key management for the Gemini API, and strategies for ensuring fairness and preventing cheating in games.

*   `docs.txt`: A comprehensive list of hyperlinks to external documentation for all the core technologies used in the project. This includes links to Somnia network information, Blockscout explorer APIs, the A2A protocol specification, Google's ADK and Gemini API documentation, and various EVM-related tools and libraries.

## Usage

The contents of this directory are intended to be used as a complete reference for understanding and implementing the NPC engine. The information is structured to guide developers and architects through the project's conceptual, technical, and security foundations.

**Primary uses include:**

*   **Onboarding:** New developers or contributors can read these documents to rapidly understand the project's goals, architecture, and technology stack.
*   **Implementation Blueprint:** The detailed specifications can be used as a guide for writing the actual code for the on-chain contracts, the agent runtime, and the A2A gateway.
*   **Security Review:** The `security.txt` file provides a basis for security audits and for implementing robust safety measures.
*   **Reference:** The `docs.txt` file serves as a centralized hub for accessing official documentation for all external dependencies.
