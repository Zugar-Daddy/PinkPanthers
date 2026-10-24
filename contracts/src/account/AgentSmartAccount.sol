// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAccount.sol";
import "../policy/PolicyEngine.sol";
import "../policy/PendingApprovalQueue.sol";
import "../verifier/P256Verifier.sol";

/**
 * @title AgentSmartAccount
 * @notice ERC-4337 Smart Account enabling autonomous AI agents to spend and trade
 * under strict owner-defined on-chain policies, with WebAuthn Passkey owner authorization.
 */
contract AgentSmartAccount is IAccount, PolicyEngine, PendingApprovalQueue {
    // Standard ERC-4337 EntryPoint address
    address public immutable entryPoint;
    P256Verifier public immutable p256Verifier;

    // Owner credentials
    address public ownerAddress;
    uint256 public passkeyQx;
    uint256 public passkeyQy;
    bool public hasPasskey;

    // Capital Partitioning (Accounting)
    uint256 public freeCapital;
    uint256 public lockedCollateral;

    // Events
    event AgentSubKeyIssued(address indexed agent, uint48 validUntil, uint256 maxPerTx, uint256 dailyBudget);
    event AgentRevoked(address indexed agent);
    event ExecutionExecuted(address indexed target, uint256 value, bytes data);
    event CapitalPartitioned(uint256 freeCapital, uint256 lockedCollateral);
    event OutOfPolicyInterception(address indexed agent, address target, uint256 amount, string reason);

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "Only EntryPoint can call");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == ownerAddress || msg.sender == address(this), "Only owner can call");
        _;
    }

    constructor(
        address _entryPoint,
        address _p256Verifier,
        address _ownerAddress,
        uint256 _passkeyQx,
        uint256 _passkeyQy
    ) {
        entryPoint = _entryPoint;
        p256Verifier = P256Verifier(_p256Verifier);
        ownerAddress = _ownerAddress;
        passkeyQx = _passkeyQx;
        passkeyQy = _passkeyQy;
        hasPasskey = (_passkeyQx != 0 && _passkeyQy != 0);
    }

    receive() external payable {
        freeCapital += msg.value;
    }

    /**
     * @notice Set or update policy for an AI Agent session key
     */
    function setAgentPolicy(
        address agent,
        uint48 validAfter,
        uint48 validUntil,
        uint256 maxPerTx,
        uint256 dailyBudget,
        uint8 maxLeverage,
        bool stopLossRequired
    ) external onlyOwner {
        _setPolicy(agent, validAfter, validUntil, maxPerTx, dailyBudget, maxLeverage, stopLossRequired);
        emit AgentSubKeyIssued(agent, validUntil, maxPerTx, dailyBudget);
    }

    function setContractWhitelist(address agent, address target, bool allowed) external onlyOwner {
        _setContractWhitelist(agent, target, allowed);
    }

    function setSelectorWhitelist(address agent, bytes4 selector, bool allowed) external onlyOwner {
        _setSelectorWhitelist(agent, selector, allowed);
    }

    function setRecipientWhitelist(address agent, address recipient, bool allowed) external onlyOwner {
        _setRecipientWhitelist(agent, recipient, allowed);
    }

    function revokeAgent(address agent) external onlyOwner {
        agentPolicies[agent].isActive = false;
        emit AgentRevoked(agent);
    }

    function toggleEmergencyHalt(address agent, bool halt) external onlyOwner {
        agentPolicies[agent].isEmergencyHalted = halt;
        emit EmergencyHaltToggled(agent, halt);
    }

    /**
     * @notice ERC-4337 validateUserOp
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        // Recover signer from signature
        (bool isOwner, address agentSigner) = _validateSignature(userOpHash, userOp.signature);

        if (isOwner) {
            // Owner has full authorization
            _payPrefund(missingAccountFunds);
            return 0; // Success
        }

        // Validate Agent Session Key and Policy
        if (agentSigner != address(0) && agentPolicies[agentSigner].isActive) {
            // Parse target and value from callData
            (address target, uint256 value, bytes calldata innerData) = _parseCallData(userOp.callData);

            // Validate against PolicyEngine
            try this.checkPolicy(agentSigner, target, value, innerData) returns (bool valid) {
                if (valid) {
                    recordSpend(agentSigner, value);
                    _payPrefund(missingAccountFunds);
                    // Pack validUntil and validAfter
                    uint48 validUntil = agentPolicies[agentSigner].validUntil;
                    uint48 validAfter = agentPolicies[agentSigner].validAfter;
                    return _packValidationData(false, validUntil, validAfter);
                }
            } catch Error(string memory reason) {
                // Policy failed: stage in PendingApprovalQueue for Owner Approval
                _queueRequest(agentSigner, target, value, innerData, reason);
                emit OutOfPolicyInterception(agentSigner, target, value, reason);
                return 1; // SIG_VALIDATION_FAILED
            }
        }

        return 1; // SIG_VALIDATION_FAILED
    }

    function checkPolicy(address agent, address target, uint256 value, bytes calldata data) external view returns (bool) {
        return validateAction(agent, target, value, data, 1, true);
    }

    /**
     * @notice Execute an authorized transaction
     */
    function execute(address target, uint256 value, bytes calldata data) external {
        require(msg.sender == entryPoint || msg.sender == ownerAddress, "Unauthorized");
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit ExecutionExecuted(target, value, data);
    }

    /**
     * @notice Approve and execute an out-of-policy transaction from the approval queue
     */
    function approveQueuedRequest(bytes32 id) external onlyOwner {
        QueuedRequest storage req = requests[id];
        require(req.status == RequestStatus.Pending, "Not pending");

        req.status = RequestStatus.Approved;
        emit RequestApproved(id, msg.sender);

        // Execute transaction
        (bool success, bytes memory result) = req.target.call{value: req.value}(req.callData);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        req.status = RequestStatus.Executed;
        emit RequestExecuted(id);
    }

    function rejectQueuedRequest(bytes32 id) external onlyOwner {
        QueuedRequest storage req = requests[id];
        require(req.status == RequestStatus.Pending, "Not pending");
        req.status = RequestStatus.Rejected;
        emit RequestRejected(id, msg.sender);
    }

    // Internal Helpers
    function _validateSignature(bytes32 hash, bytes calldata sig) internal returns (bool isOwner, address agent) {
        if (sig.length == 65) {
            // Standard ECDSA signature (r, s, v)
            bytes32 r;
            bytes32 s;
            uint8 v;
            assembly {
                r := calldataload(sig.offset)
                s := calldataload(add(sig.offset, 32))
                v := byte(0, calldataload(add(sig.offset, 64)))
            }
            address signer = ecrecover(hash, v, r, s);
            if (signer == ownerAddress) return (true, address(0));
            return (false, signer);
        } else if (hasPasskey && sig.length >= 64) {
            // WebAuthn Passkey P-256 signature
            uint256 r = uint256(bytes32(sig[:32]));
            uint256 s = uint256(bytes32(sig[32:64]));
            if (p256Verifier.verifySignature(hash, r, s, passkeyQx, passkeyQy)) {
                return (true, address(0));
            }
        }
        return (false, address(0));
    }

    function _parseCallData(bytes calldata callData) internal pure returns (address target, uint256 value, bytes calldata innerData) {
        if (callData.length >= 68 && bytes4(callData[:4]) == this.execute.selector) {
            target = address(bytes20(callData[16:36]));
            value = uint256(bytes32(callData[36:68]));
            innerData = callData[68:];
        } else {
            innerData = callData[0:0];
        }
    }

    function _payPrefund(uint256 missingAccountFunds) internal {
        if (missingAccountFunds > 0) {
            (bool success,) = payable(entryPoint).call{value: missingAccountFunds}("");
            require(success, "Prefund failed");
        }
    }

    function _packValidationData(bool sigFailed, uint48 validUntil, uint48 validAfter) internal pure returns (uint256) {
        return (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << (160 + 48));
    }
}
