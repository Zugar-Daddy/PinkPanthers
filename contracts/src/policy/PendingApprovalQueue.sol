// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PendingApprovalQueue
 * @notice Holds out-of-policy transactions and emergency margin requests
 * requiring human Owner/Admin biometric approval.
 */
contract PendingApprovalQueue {
    enum RequestStatus { Pending, Approved, Rejected, Executed }

    struct QueuedRequest {
        bytes32 id;
        address agent;
        address target;
        uint256 value;
        bytes callData;
        string reason;             // e.g. "Exceeded Daily Budget ($350 > $100)"
        uint48 createdAt;
        RequestStatus status;
    }

    mapping(bytes32 => QueuedRequest) public requests;
    bytes32[] public allRequestIds;

    event RequestQueued(bytes32 indexed id, address indexed agent, address target, uint256 value, string reason);
    event RequestApproved(bytes32 indexed id, address indexed approver);
    event RequestRejected(bytes32 indexed id, address indexed rejecter);
    event RequestExecuted(bytes32 indexed id);

    function _queueRequest(
        address agent,
        address target,
        uint256 value,
        bytes calldata callData,
        string memory reason
    ) internal returns (bytes32 id) {
        id = keccak256(abi.encodePacked(agent, target, value, callData, block.timestamp, allRequestIds.length));
        requests[id] = QueuedRequest({
            id: id,
            agent: agent,
            target: target,
            value: value,
            callData: callData,
            reason: reason,
            createdAt: uint48(block.timestamp),
            status: RequestStatus.Pending
        });
        allRequestIds.push(id);
        emit RequestQueued(id, agent, target, value, reason);
    }

    function getRequest(bytes32 id) external view returns (QueuedRequest memory) {
        return requests[id];
    }

    function getPendingCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < allRequestIds.length; i++) {
            if (requests[allRequestIds[i]].status == RequestStatus.Pending) {
                count++;
            }
        }
    }
}
