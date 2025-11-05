// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BehaviorController.sol";

contract Arena is ReentrancyGuard {

    enum DuelState { PENDING, ACTIVE, CONCLUDED }

    BehaviorController public behaviorController;

    struct Duel {
        address[2] players;
        IERC20 token;
        uint256 wager;
        address winner;
        DuelState state;
        uint256 createdAt;
        uint256 concludedAt;
    }

    mapping(uint256 => Duel) private _duels;
    uint256 private _nextDuelId;

    event DuelCreated(uint256 indexed duelId, address indexed player1, address indexed player2, address token, uint256 wager);
    event DuelConcluded(uint256 indexed duelId, address indexed winner);

    constructor(address _behaviorController) {
        behaviorController = BehaviorController(_behaviorController);
    }

    function createDuel(address player2, address tokenAddress, uint256 wager) external nonReentrant returns (uint256) {
        require(player2 != msg.sender, "Cannot duel yourself");
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(msg.sender) >= wager, "Insufficient balance");
        require(token.allowance(msg.sender, address(this)) >= wager, "Insufficient allowance");

        token.transferFrom(msg.sender, address(this), wager);

        uint256 duelId = _nextDuelId++;
        _duels[duelId] = Duel({
            players: [msg.sender, player2],
            token: token,
            wager: wager,
            winner: address(0),
            state: DuelState.PENDING,
            createdAt: block.timestamp,
            concludedAt: 0
        });

        emit DuelCreated(duelId, msg.sender, player2, tokenAddress, wager);
        return duelId;
    }

    function acceptDuel(uint256 duelId) external nonReentrant {
        Duel storage duel = _duels[duelId];
        require(duel.state == DuelState.PENDING, "Duel not pending");
        require(msg.sender == duel.players[1], "Not your duel");
        require(duel.token.balanceOf(msg.sender) >= duel.wager, "Insufficient balance");
        require(duel.token.allowance(msg.sender, address(this)) >= duel.wager, "Insufficient allowance");

        duel.token.transferFrom(msg.sender, address(this), duel.wager);
        duel.state = DuelState.ACTIVE;
    }

    function concludeDuel(uint256 duelId, address winner) external nonReentrant {
        require(behaviorController.isAllowed(address(this), this.concludeDuel.selector), "BehaviorController: Action not allowed");
        behaviorController.recordCall(address(this), this.concludeDuel.selector);

        Duel storage duel = _duels[duelId];
        require(duel.state == DuelState.ACTIVE, "Duel not active");
        require(winner == duel.players[0] || winner == duel.players[1], "Invalid winner");

        duel.winner = winner;
        duel.state = DuelState.CONCLUDED;
        duel.concludedAt = block.timestamp;

        uint256 totalWager = duel.wager * 2;
        duel.token.transfer(winner, totalWager);

        emit DuelConcluded(duelId, winner);
    }

    function getDuel(uint256 duelId) external view returns (Duel memory) {
        return _duels[duelId];
    }
}
