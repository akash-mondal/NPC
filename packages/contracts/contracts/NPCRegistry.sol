// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract NPCRegistry is Ownable {
    struct NPC {
        uint256 id;
        address owner;
        address controller;
        string metadataUri;
        // Further permission fields can be added here
    }

    mapping(uint256 => NPC) private _npcs;
    uint256 private _nextTokenId;

    event NPCRegistered(uint256 indexed npcId, address indexed owner, address controller);
    event NPCUpdated(uint256 indexed npcId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerNPC(address owner, address controller, string calldata metadataUri) external returns (uint256) {
        uint256 npcId = _nextTokenId++;
        _npcs[npcId] = NPC({
            id: npcId,
            owner: owner,
            controller: controller,
            metadataUri: metadataUri
        });

        emit NPCRegistered(npcId, owner, controller);
        return npcId;
    }

    function getNPC(uint256 npcId) external view returns (NPC memory) {
        return _npcs[npcId];
    }

    function updateNPCController(uint256 npcId, address newController) external {
        require(_npcs[npcId].owner == msg.sender || owner() == msg.sender, "Not owner");
        _npcs[npcId].controller = newController;
        emit NPCUpdated(npcId);
    }

    function updateNPCMetadata(uint256 npcId, string calldata newMetadataUri) external {
        require(_npcs[npcId].owner == msg.sender || owner() == msg.sender, "Not owner");
        _npcs[npcId].metadataUri = newMetadataUri;
        emit NPCUpdated(npcId);
    }
}
