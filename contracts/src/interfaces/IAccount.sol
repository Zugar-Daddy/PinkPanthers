// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev ERC-4337 UserOperation struct (v0.7 specification)
 */
struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}

/**
 * @dev ERC-4337 IAccount interface
 */
interface IAccount {
    /**
     * @notice Validate user's signature and nonce
     * @param userOp the operation that is about to be executed.
     * @param userOpHash hash of the user's operation data.
     * @param missingAccountFunds missing funds on the account's deposit in the entrypoint.
     * @return validationData packaged ValidationData structure (authorizer, validUntil, validAfter)
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}
