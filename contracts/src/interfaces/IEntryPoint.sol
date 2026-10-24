// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IAccount.sol";

interface IEntryPoint {
    function depositTo(address account) external payable;
    function getDepositInfo(address account) external view returns (uint112 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime);
    function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;
    function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);
}
