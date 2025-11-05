// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract BehaviorController is AccessControl {

    bytes32 public constant TRUSTED_CALLER_ROLE = keccak256("TRUSTED_CALLER_ROLE");
    bytes32 public constant POLICY_MANAGER_ROLE = keccak256("POLICY_MANAGER_ROLE");

    struct Policy {
        mapping(bytes4 => bool) methodAllowlist;
        uint256 gasBudget;
        uint256 callRateLimit; // calls per minute
        uint256 dailyCallLimit; // calls per day
        bool isActive;
    }

    struct CallRecord {
        uint256 lastCalled;
        uint256 dailyCount;
        uint256 lastDayReset;
    }

    mapping(address => Policy) private _policies;
    mapping(address => mapping(bytes4 => CallRecord)) private _callRecords;
    mapping(address => uint256) private _totalGasUsed;

    event PolicySet(address indexed contractAddress, uint256 gasBudget, uint256 callRateLimit);
    event PolicyActivated(address indexed contractAddress);
    event PolicyDeactivated(address indexed contractAddress);
    event CallRecorded(address indexed contractAddress, bytes4 indexed methodSignature, uint256 gasUsed);
    event RateLimitExceeded(address indexed contractAddress, bytes4 indexed methodSignature);

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(POLICY_MANAGER_ROLE, defaultAdmin);
    }

    function setPolicy(
        address contractAddress,
        bytes4[] calldata allowedMethods,
        uint256 gasBudget,
        uint256 callRateLimit,
        uint256 dailyCallLimit
    ) external onlyRole(POLICY_MANAGER_ROLE) {
        Policy storage policy = _policies[contractAddress];
        
        // Clear existing allowlist
        // Note: In production, you might want a more efficient way to clear
        
        for (uint i = 0; i < allowedMethods.length; i++) {
            policy.methodAllowlist[allowedMethods[i]] = true;
        }
        policy.gasBudget = gasBudget;
        policy.callRateLimit = callRateLimit;
        policy.dailyCallLimit = dailyCallLimit;
        policy.isActive = true;

        emit PolicySet(contractAddress, gasBudget, callRateLimit);
    }

    function activatePolicy(address contractAddress) external onlyRole(POLICY_MANAGER_ROLE) {
        _policies[contractAddress].isActive = true;
        emit PolicyActivated(contractAddress);
    }

    function deactivatePolicy(address contractAddress) external onlyRole(POLICY_MANAGER_ROLE) {
        _policies[contractAddress].isActive = false;
        emit PolicyDeactivated(contractAddress);
    }

    function isAllowed(address contractAddress, bytes4 methodSignature) external view returns (bool) {
        Policy storage policy = _policies[contractAddress];
        return policy.isActive && policy.methodAllowlist[methodSignature];
    }

    function checkGasBudget(address contractAddress) external view returns (uint256) {
        return _policies[contractAddress].gasBudget;
    }

    function getRemainingGasBudget(address contractAddress) external view returns (uint256) {
        Policy storage policy = _policies[contractAddress];
        uint256 used = _totalGasUsed[contractAddress];
        return policy.gasBudget > used ? policy.gasBudget - used : 0;
    }

    function checkRateLimit(address contractAddress, bytes4 methodSignature) external view returns (bool) {
        Policy storage policy = _policies[contractAddress];
        if (!policy.isActive || policy.callRateLimit == 0) {
            return policy.isActive; // no rate limit if policy active, false if inactive
        }

        CallRecord storage record = _callRecords[contractAddress][methodSignature];
        
        // Check minute-based rate limit
        uint256 timeSinceLastCall = block.timestamp - record.lastCalled;
        bool minuteRateOk = timeSinceLastCall > (60 / policy.callRateLimit);
        
        // Check daily limit
        bool dailyLimitOk = true;
        if (policy.dailyCallLimit > 0) {
            // Reset daily count if it's a new day
            if (block.timestamp >= record.lastDayReset + 1 days) {
                dailyLimitOk = true; // Will be reset in recordCall
            } else {
                dailyLimitOk = record.dailyCount < policy.dailyCallLimit;
            }
        }
        
        return minuteRateOk && dailyLimitOk;
    }

    function recordCall(address contractAddress, bytes4 methodSignature) external onlyRole(TRUSTED_CALLER_ROLE) {
        recordCallWithGas(contractAddress, methodSignature, 0);
    }

    function recordCallWithGas(
        address contractAddress, 
        bytes4 methodSignature, 
        uint256 gasUsed
    ) public onlyRole(TRUSTED_CALLER_ROLE) {
        CallRecord storage record = _callRecords[contractAddress][methodSignature];
        
        // Update last called time
        record.lastCalled = block.timestamp;
        
        // Update daily count (reset if new day)
        if (block.timestamp >= record.lastDayReset + 1 days) {
            record.dailyCount = 1;
            record.lastDayReset = block.timestamp;
        } else {
            record.dailyCount++;
        }
        
        // Update gas usage
        _totalGasUsed[contractAddress] += gasUsed;
        
        emit CallRecorded(contractAddress, methodSignature, gasUsed);
    }

    function getCallRecord(address contractAddress, bytes4 methodSignature) 
        external view returns (uint256 lastCalled, uint256 dailyCount, uint256 lastDayReset) {
        CallRecord storage record = _callRecords[contractAddress][methodSignature];
        return (record.lastCalled, record.dailyCount, record.lastDayReset);
    }

    function getPolicyDetails(address contractAddress) 
        external view returns (uint256 gasBudget, uint256 callRateLimit, uint256 dailyCallLimit, bool isActive) {
        Policy storage policy = _policies[contractAddress];
        return (policy.gasBudget, policy.callRateLimit, policy.dailyCallLimit, policy.isActive);
    }

    function grantTrustedCallerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(TRUSTED_CALLER_ROLE, account);
    }

    function revokeTrustedCallerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(TRUSTED_CALLER_ROLE, account);
    }
}
