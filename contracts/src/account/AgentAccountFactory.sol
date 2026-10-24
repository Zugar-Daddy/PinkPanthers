// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentSmartAccount.sol";

/**
 * @title AgentAccountFactory
 * @notice Factory for deploying AgentSmartAccount contracts with deterministic CREATE2 addresses.
 */
contract AgentAccountFactory {
    address public immutable entryPoint;
    address public immutable p256Verifier;

    event AccountCreated(address indexed account, address indexed owner, uint256 passkeyQx, uint256 passkeyQy);

    constructor(address _entryPoint, address _p256Verifier) {
        entryPoint = _entryPoint;
        p256Verifier = _p256Verifier;
    }

    function createAccount(
        address ownerAddress,
        uint256 passkeyQx,
        uint256 passkeyQy,
        uint256 salt
    ) external returns (AgentSmartAccount account) {
        bytes32 finalSalt = keccak256(abi.encodePacked(ownerAddress, passkeyQx, passkeyQy, salt));
        address payable addr = payable(getAddress(ownerAddress, passkeyQx, passkeyQy, salt));

        if (addr.code.length > 0) {
            return AgentSmartAccount(addr);
        }

        account = new AgentSmartAccount{salt: finalSalt}(
            entryPoint,
            p256Verifier,
            ownerAddress,
            passkeyQx,
            passkeyQy
        );

        emit AccountCreated(address(account), ownerAddress, passkeyQx, passkeyQy);
    }

    function getAddress(
        address ownerAddress,
        uint256 passkeyQx,
        uint256 passkeyQy,
        uint256 salt
    ) public view returns (address) {
        bytes32 finalSalt = keccak256(abi.encodePacked(ownerAddress, passkeyQx, passkeyQy, salt));
        bytes memory bytecode = abi.encodePacked(
            type(AgentSmartAccount).creationCode,
            abi.encode(entryPoint, p256Verifier, ownerAddress, passkeyQx, passkeyQy)
        );
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            finalSalt,
            keccak256(bytecode)
        )))));
    }
}
