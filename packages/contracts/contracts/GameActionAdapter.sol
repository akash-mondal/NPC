// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IGameAction.sol";
import "./BehaviorController.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GameActionAdapter
 * @dev Adapter contract that wraps external game contracts to provide IGameAction interface
 * Allows NPCs to interact with any game contract through a standardized interface
 */
contract GameActionAdapter is IGameAction, Ownable {
    BehaviorController public behaviorController;
    
    // Mapping from action type to target contract and function selector
    struct ActionMapping {
        address targetContract;
        bytes4 functionSelector;
        bool requiresApproval;
        uint256 gasCost;
    }
    
    mapping(string => ActionMapping) public actionMappings;
    mapping(address => bool) public authorizedCallers;
    
    event ActionMappingSet(string actionType, address targetContract, bytes4 functionSelector);
    event ActionExecutedViaAdapter(address indexed actor, string actionType, bool success);

    constructor(address _behaviorController, address initialOwner) Ownable(initialOwner) {
        behaviorController = BehaviorController(_behaviorController);
    }

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    /**
     * @dev Set up an action mapping to an external contract
     * @param actionType The action type identifier
     * @param targetContract The external contract address
     * @param functionSelector The function selector to call
     * @param requiresApproval Whether this action requires BehaviorController approval
     * @param gasCost Estimated gas cost for this action
     */
    function setActionMapping(
        string calldata actionType,
        address targetContract,
        bytes4 functionSelector,
        bool requiresApproval,
        uint256 gasCost
    ) external onlyOwner {
        actionMappings[actionType] = ActionMapping({
            targetContract: targetContract,
            functionSelector: functionSelector,
            requiresApproval: requiresApproval,
            gasCost: gasCost
        });
        
        emit ActionMappingSet(actionType, targetContract, functionSelector);
    }

    /**
     * @dev Authorize an address to execute actions through this adapter
     * @param caller The address to authorize
     */
    function authorizeAddress(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }

    /**
     * @dev Revoke authorization for an address
     * @param caller The address to revoke
     */
    function revokeAuthorization(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }

    /**
     * @dev Execute a game action through the adapter
     */
    function executeAction(
        string calldata actionType,
        bytes calldata params
    ) external onlyAuthorized returns (bool success, bytes memory result) {
        ActionMapping memory actionMapping = actionMappings[actionType];
        require(actionMapping.targetContract != address(0), "Action type not mapped");

        // Check BehaviorController approval if required
        if (actionMapping.requiresApproval) {
            require(
                behaviorController.isAllowed(actionMapping.targetContract, actionMapping.functionSelector),
                "Action not allowed by BehaviorController"
            );
            
            require(
                behaviorController.checkRateLimit(actionMapping.targetContract, actionMapping.functionSelector),
                "Rate limit exceeded"
            );
        }

        // Execute the action on the target contract
        (success, result) = actionMapping.targetContract.call(
            abi.encodePacked(actionMapping.functionSelector, params)
        );

        // Record the call in BehaviorController if it was approved
        if (actionMapping.requiresApproval && success) {
            behaviorController.recordCall(actionMapping.targetContract, actionMapping.functionSelector);
        }

        emit ActionExecutedViaAdapter(msg.sender, actionType, success);
        emit ActionExecuted(msg.sender, actionType, params, success, result);
    }

    /**
     * @dev Validate an action before execution
     */
    function validateAction(
        string calldata actionType,
        bytes calldata params,
        address actor
    ) external view returns (bool valid, string memory reason) {
        ActionMapping memory actionMapping = actionMappings[actionType];
        
        if (actionMapping.targetContract == address(0)) {
            return (false, "Action type not mapped");
        }

        if (!authorizedCallers[actor] && actor != owner()) {
            return (false, "Actor not authorized");
        }

        if (actionMapping.requiresApproval) {
            if (!behaviorController.isAllowed(actionMapping.targetContract, actionMapping.functionSelector)) {
                return (false, "Action not allowed by BehaviorController");
            }
            
            if (!behaviorController.checkRateLimit(actionMapping.targetContract, actionMapping.functionSelector)) {
                return (false, "Rate limit exceeded");
            }
        }

        // Try to validate with the target contract if it supports validation
        try this.callTargetValidation(actionMapping.targetContract, actionType, params, actor) returns (bool targetValid, string memory targetReason) {
            return (targetValid, targetReason);
        } catch {
            // If target doesn't support validation, assume valid if other checks passed
            return (true, "Validation passed");
        }
    }

    /**
     * @dev Helper function to call validation on target contract
     */
    function callTargetValidation(
        address target,
        string calldata actionType,
        bytes calldata params,
        address actor
    ) external view returns (bool valid, string memory reason) {
        // This will revert if the target doesn't implement validateAction
        return IGameAction(target).validateAction(actionType, params, actor);
    }

    /**
     * @dev Get available actions (returns all mapped action types)
     */
    function getAvailableActions(address actor) external view returns (string[] memory actions) {
        // This is a simplified implementation
        // In a real scenario, you'd maintain a list of action types
        // For now, return empty array - should be populated based on mappings
        return new string[](0);
    }

    /**
     * @dev Get game state by aggregating from mapped contracts
     */
    function getGameState(address actor) external view returns (bytes memory state) {
        // This is a simplified implementation
        // In practice, you'd aggregate state from all mapped contracts
        return abi.encode(actor, block.timestamp);
    }

    /**
     * @dev Get action mapping details
     */
    function getActionMapping(string calldata actionType) external view returns (ActionMapping memory) {
        return actionMappings[actionType];
    }
}