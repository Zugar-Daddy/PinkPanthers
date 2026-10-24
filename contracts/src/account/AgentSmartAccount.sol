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
    address public recoveryModule;

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

    function setRecoveryModule(address module) external onlyOwner {
        require(module != address(0) && recoveryModule == address(0), "Recovery module already set");
        recoveryModule = module;
    }

    function recoverOwner(address newOwner) external {
        require(msg.sender == recoveryModule && newOwner != address(0), "Unauthorized recovery");
        ownerAddress = newOwner;
        hasPasskey = false;
        passkeyQx = 0;
        passkeyQy = 0;
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

        // Agent signatures authorize only these two explicitly decoded methods.
        if (agentSigner != address(0) && agentPolicies[agentSigner].isActive && !agentPolicies[agentSigner].isEmergencyHalted) {
            if (userOp.callData.length < 4) return 1;
            bytes4 selector = bytes4(userOp.callData[:4]);
            if (selector == this.execute.selector) {
                (address declaredAgent, address target, uint256 value, bytes memory innerData) =
                    abi.decode(userOp.callData[4:], (address, address, uint256, bytes));
                if (declaredAgent != agentSigner) return 1;
                try this.checkPolicy(agentSigner, target, value, innerData) returns (bool valid) {
                    if (!valid) return 1;
                } catch {
                    return 1;
                }
            } else if (selector == this.queueOutOfPolicyRequest.selector) {
                (address declaredAgent,,,) = abi.decode(userOp.callData[4:], (address, address, uint256, bytes));
                if (declaredAgent != agentSigner) return 1;
            } else {
                return 1;
            }
            _payPrefund(missingAccountFunds);
            return _packValidationData(false, agentPolicies[agentSigner].validUntil, agentPolicies[agentSigner].validAfter);
        }

        return 1; // SIG_VALIDATION_FAILED
    }

    function checkPolicy(address agent, address target, uint256 value, bytes memory data) external view returns (bool) {
        // Generic contract calls can move tokens or encode recipients outside ETH value.
        // Agent execution is restricted to plain native transfers until method-specific
        // parsers for those assets are implemented.
        require(data.length == 0 && target.code.length == 0 && allowedRecipients[agent][target], "Unsupported agent call");
        return validateAction(agent, target, value, data, 1, true);
    }

    /**
     * @notice Execute an authorized transaction
     */
    function execute(address agent, address target, uint256 value, bytes calldata data) external {
        require(msg.sender == entryPoint || msg.sender == ownerAddress, "Unauthorized");
        if (agent != address(0)) {
            require(msg.sender == entryPoint, "Agent execution requires EntryPoint");
            require(this.checkPolicy(agent, target, value, data), "Agent policy failed");
        }
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        if (agent != address(0)) recordSpend(agent, value);
        emit ExecutionExecuted(target, value, data);
    }

    function queueOutOfPolicyRequest(address agent, address target, uint256 value, bytes calldata data) external onlyEntryPoint {
        // An active signed agent may submit this call as its UserOperation.
        // The rejected execution itself cannot persist writes made during validation.
        require(agentPolicies[agent].isActive && !agentPolicies[agent].isEmergencyHalted, "Inactive agent");
        _queueRequest(agent, target, value, data, "Agent requested owner approval");
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
