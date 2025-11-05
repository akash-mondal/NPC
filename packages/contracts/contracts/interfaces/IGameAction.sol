// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGameAction
 * @dev Interface for game contracts that want to integrate with NPC agents
 * Provides a standardized way for NPCs to interact with any game contract
 */
interface IGameAction {
    /**
     * @dev Execute a game action with the given parameters
     * @param actionType The type of action to execute (e.g., "move", "attack", "trade")
     * @param params ABI-encoded parameters specific to the action
     * @return success Whether the action was executed successfully
     * @return result ABI-encoded result data
     */
    function executeAction(
        string calldata actionType,
        bytes calldata params
    ) external returns (bool success, bytes memory result);

    /**
     * @dev Check if an action is valid before execution
     * @param actionType The type of action to validate
     * @param params ABI-encoded parameters for the action
     * @param actor The address attempting to perform the action
     * @return valid Whether the action would be valid
     * @return reason Human-readable reason if invalid
     */
    function validateAction(
        string calldata actionType,
        bytes calldata params,
        address actor
    ) external view returns (bool valid, string memory reason);

    /**
     * @dev Get available actions for a given actor
     * @param actor The address to get actions for
     * @return actions Array of available action types
     */
    function getAvailableActions(address actor) external view returns (string[] memory actions);

    /**
     * @dev Get the current game state relevant to the actor
     * @param actor The address to get state for
     * @return state ABI-encoded game state data
     */
    function getGameState(address actor) external view returns (bytes memory state);

    /**
     * @dev Event emitted when an action is executed
     * @param actor The address that executed the action
     * @param actionType The type of action executed
     * @param params The parameters used
     * @param success Whether the action succeeded
     * @param result The result data
     */
    event ActionExecuted(
        address indexed actor,
        string actionType,
        bytes params,
        bool success,
        bytes result
    );
}