// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IQuestAction
 * @dev Interface for quest-based game contracts
 * Specialized interface for objective-based gameplay
 */
interface IQuestAction {
    struct QuestObjective {
        string objectiveType;
        bytes parameters;
        bool completed;
        uint256 reward;
    }

    /**
     * @dev Start a new quest for the participant
     * @param questType The type of quest to start
     * @param params Quest-specific parameters
     * @return questId The unique identifier for the quest
     */
    function startQuest(
        string calldata questType,
        bytes calldata params
    ) external returns (uint256 questId);

    /**
     * @dev Submit progress on a quest objective
     * @param questId The quest identifier
     * @param objectiveIndex The index of the objective being progressed
     * @param progressData ABI-encoded progress data
     * @return completed Whether the objective is now completed
     */
    function submitProgress(
        uint256 questId,
        uint256 objectiveIndex,
        bytes calldata progressData
    ) external returns (bool completed);

    /**
     * @dev Complete a quest and claim rewards
     * @param questId The quest identifier
     * @return success Whether the quest was successfully completed
     * @return rewards ABI-encoded reward data
     */
    function completeQuest(uint256 questId) external returns (bool success, bytes memory rewards);

    /**
     * @dev Get quest details and current progress
     * @param questId The quest identifier
     * @return questType The type of quest
     * @return objectives Array of quest objectives
     * @return progressData Current progress data
     */
    function getQuestDetails(uint256 questId) external view returns (
        string memory questType,
        QuestObjective[] memory objectives,
        bytes memory progressData
    );

    /**
     * @dev Get available quests for a participant
     * @param participant The address to get quests for
     * @return questTypes Array of available quest types
     */
    function getAvailableQuests(address participant) external view returns (string[] memory questTypes);

    /**
     * @dev Check if a participant can start a specific quest type
     * @param participant The address to check
     * @param questType The quest type to validate
     * @return canStart Whether the participant can start this quest
     * @param reason Human-readable reason if they cannot
     */
    function canStartQuest(
        address participant,
        string calldata questType
    ) external view returns (bool canStart, string memory reason);

    /**
     * @dev Event emitted when a quest is started
     */
    event QuestStarted(
        uint256 indexed questId,
        address indexed participant,
        string questType
    );

    /**
     * @dev Event emitted when progress is made on a quest
     */
    event QuestProgress(
        uint256 indexed questId,
        address indexed participant,
        uint256 objectiveIndex,
        bool completed
    );

    /**
     * @dev Event emitted when a quest is completed
     */
    event QuestCompleted(
        uint256 indexed questId,
        address indexed participant,
        bytes rewards
    );
}