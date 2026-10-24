// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PolicyEngine
 * @notice Enforces smart contract spending limits, contract/method allowlists,
 * derivative leverage caps, daily rolling budgets, and session timeouts for AI agents.
 */
contract PolicyEngine {
    struct SessionPolicy {
        bool isActive;
        uint48 validAfter;
        uint48 validUntil;
        uint256 maxPerTx;           // Max collateral or value per single transaction (in wei / smallest unit)
        uint256 dailyBudget;        // Max cumulative collateral/spend per 24-hour rolling period
        uint256 currentDailySpent;  // Total spent in current 24-hour period
        uint48 lastEpochTimestamp;  // Timestamp marking start of current 24h epoch
        uint8 maxLeverage;          // Maximum allowed leverage (e.g. 3 = 3x)
        bool stopLossRequired;      // Whether every derivative order must include a stop-loss
        bool isEmergencyHalted;     // Circuit breaker triggered by drawdown
    }

    // Agent Address => SessionPolicy
    mapping(address => SessionPolicy) public agentPolicies;

    // Agent Address => Target Contract => Allowed (Whitelist)
    mapping(address => mapping(address => bool)) public allowedContracts;

    // Agent Address => Function Selector (bytes4) => Allowed (Whitelist)
    mapping(address => mapping(bytes4 => bool)) public allowedSelectors;

    // Agent Address => Recipient Address => Allowed (Whitelist)
    mapping(address => mapping(address => bool)) public allowedRecipients;

    // Events
    event PolicyConfigured(address indexed agent, uint256 maxPerTx, uint256 dailyBudget, uint8 maxLeverage, uint48 validUntil);
    event PolicySpent(address indexed agent, uint256 amount, uint256 newDailyTotal);
    event ContractWhitelistUpdated(address indexed agent, address indexed target, bool allowed);
    event SelectorWhitelistUpdated(address indexed agent, bytes4 indexed selector, bool allowed);
    event RecipientWhitelistUpdated(address indexed agent, address indexed recipient, bool allowed);
    event EmergencyHaltToggled(address indexed agent, bool halted);

    error PolicyExpired(uint48 validUntil, uint256 currentTimestamp);
    error PolicyNotYetValid(uint48 validAfter, uint256 currentTimestamp);
    error PolicyHalted();
    error TargetNotAllowed(address target);
    error SelectorNotAllowed(bytes4 selector);
    error RecipientNotAllowed(address recipient);
    error PerTxLimitExceeded(uint256 amount, uint256 maxPerTx);
    error DailyBudgetExceeded(uint256 attempted, uint256 remaining);
    error LeverageCapExceeded(uint8 requested, uint8 maxAllowed);
    error StopLossMissing();

    /**
     * @notice Configure policy for a delegated AI Agent
     */
    function _setPolicy(
        address agent,
        uint48 validAfter,
        uint48 validUntil,
        uint256 maxPerTx,
        uint256 dailyBudget,
        uint8 maxLeverage,
        bool stopLossRequired
    ) internal {
        require(validUntil > validAfter, "Invalid validity period");
        require(maxLeverage >= 1, "Min leverage 1x");

        SessionPolicy storage p = agentPolicies[agent];
        p.isActive = true;
        p.validAfter = validAfter;
        p.validUntil = validUntil;
        p.maxPerTx = maxPerTx;
        p.dailyBudget = dailyBudget;
        p.currentDailySpent = 0;
        p.lastEpochTimestamp = uint48(block.timestamp);
        p.maxLeverage = maxLeverage;
        p.stopLossRequired = stopLossRequired;
        p.isEmergencyHalted = false;

        emit PolicyConfigured(agent, maxPerTx, dailyBudget, maxLeverage, validUntil);
    }

    /**
     * @notice Whitelist target contracts for an agent
     */
    function _setContractWhitelist(address agent, address target, bool allowed) internal {
        allowedContracts[agent][target] = allowed;
        emit ContractWhitelistUpdated(agent, target, allowed);
    }

    /**
     * @notice Whitelist function selectors for an agent
     */
    function _setSelectorWhitelist(address agent, bytes4 selector, bool allowed) internal {
        allowedSelectors[agent][selector] = allowed;
        emit SelectorWhitelistUpdated(agent, selector, allowed);
    }

    /**
     * @notice Whitelist recipients for an agent
     */
    function _setRecipientWhitelist(address agent, address recipient, bool allowed) internal {
        allowedRecipients[agent][recipient] = allowed;
        emit RecipientWhitelistUpdated(agent, recipient, allowed);
    }

    /**
     * @notice Validate if an action by an agent conforms to policy. Reverts if out-of-policy.
     */
    function validateAction(
        address agent,
        address target,
        uint256 value,
        bytes memory callData,
        uint8 requestedLeverage,
        bool hasStopLoss
    ) public view returns (bool) {
        SessionPolicy storage p = agentPolicies[agent];
        if (!p.isActive) return false;
        if (p.isEmergencyHalted) revert PolicyHalted();
        if (block.timestamp < p.validAfter) revert PolicyNotYetValid(p.validAfter, block.timestamp);
        if (block.timestamp > p.validUntil) revert PolicyExpired(p.validUntil, block.timestamp);

        // Check Target Contract
        if (!allowedContracts[agent][target] && !allowedRecipients[agent][target]) {
            revert TargetNotAllowed(target);
        }

        // Check Selector if calldata is present
        if (callData.length >= 4) {
            bytes4 sel;
            assembly { sel := mload(add(callData, 32)) }
            if (!allowedSelectors[agent][sel]) {
                revert SelectorNotAllowed(sel);
            }
        }

        // Check Per-Tx Limit
        if (value > p.maxPerTx) {
            revert PerTxLimitExceeded(value, p.maxPerTx);
        }

        // Check Daily Budget with 24h rolling epoch
        uint256 currentSpent = p.currentDailySpent;
        if (block.timestamp > p.lastEpochTimestamp + 1 days) {
            currentSpent = 0; // Epoch reset
        }
        if (currentSpent + value > p.dailyBudget) {
            revert DailyBudgetExceeded(value, p.dailyBudget > currentSpent ? p.dailyBudget - currentSpent : 0);
        }

        // Check Leverage Cap
        if (requestedLeverage > p.maxLeverage) {
            revert LeverageCapExceeded(requestedLeverage, p.maxLeverage);
        }

        // Check Stop Loss Mandate
        if (p.stopLossRequired && !hasStopLoss) {
            revert StopLossMissing();
        }

        return true;
    }

    /**
     * @notice Record spend after successful execution
     */
    function recordSpend(address agent, uint256 amount) internal {
        SessionPolicy storage p = agentPolicies[agent];
        if (block.timestamp > p.lastEpochTimestamp + 1 days) {
            p.currentDailySpent = amount;
            p.lastEpochTimestamp = uint48(block.timestamp);
        } else {
            p.currentDailySpent += amount;
        }
        emit PolicySpent(agent, amount, p.currentDailySpent);
    }
}
