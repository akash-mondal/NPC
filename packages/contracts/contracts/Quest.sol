// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BehaviorController.sol";

contract Quest is ReentrancyGuard {

    enum QuestState { OPEN, IN_PROGRESS, COMPLETED }

    BehaviorController public behaviorController;

    struct QuestData {
        address creator;
        address participant;
        IERC20 token;
        uint256 reward;
        QuestState state;
        uint256 createdAt;
        uint256 completedAt;
        string metadataUri;
    }

    mapping(uint256 => QuestData) private _quests;
    uint256 private _nextQuestId;

    event QuestCreated(uint256 indexed questId, address indexed creator, address token, uint256 reward);
    event QuestAccepted(uint256 indexed questId, address indexed participant);
    event QuestCompleted(uint256 indexed questId, address indexed participant);

    constructor(address _behaviorController) {
        behaviorController = BehaviorController(_behaviorController);
    }

    function createQuest(address tokenAddress, uint256 reward, string calldata metadataUri) external nonReentrant returns (uint256) {
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(msg.sender) >= reward, "Insufficient balance");
        require(token.allowance(msg.sender, address(this)) >= reward, "Insufficient allowance");

        token.transferFrom(msg.sender, address(this), reward);

        uint256 questId = _nextQuestId++;
        _quests[questId] = QuestData({
            creator: msg.sender,
            participant: address(0),
            token: token,
            reward: reward,
            state: QuestState.OPEN,
            createdAt: block.timestamp,
            completedAt: 0,
            metadataUri: metadataUri
        });

        emit QuestCreated(questId, msg.sender, tokenAddress, reward);
        return questId;
    }

    function acceptQuest(uint256 questId) external nonReentrant {
        QuestData storage quest = _quests[questId];
        require(quest.state == QuestState.OPEN, "Quest not open");
        quest.participant = msg.sender;
        quest.state = QuestState.IN_PROGRESS;

        emit QuestAccepted(questId, msg.sender);
    }

    function completeQuest(uint256 questId) external nonReentrant {
        require(behaviorController.isAllowed(address(this), this.completeQuest.selector), "BehaviorController: Action not allowed");
        behaviorController.recordCall(address(this), this.completeQuest.selector);

        QuestData storage quest = _quests[questId];
        require(quest.state == QuestState.IN_PROGRESS, "Quest not in progress");
        require(msg.sender == quest.participant, "Not your quest");

        quest.state = QuestState.COMPLETED;
        quest.completedAt = block.timestamp;

        quest.token.transfer(quest.participant, quest.reward);

        emit QuestCompleted(questId, quest.participant);
    }

    function getQuest(uint256 questId) external view returns (QuestData memory) {
        return _quests[questId];
    }
}
