// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IPaymaster.sol";
import "../interfaces/IEntryPoint.sol";

/**
 * @title SimplePaymaster
 * @notice ERC-4337 Paymaster that sponsors gas fees for AgentSmartAccount transactions,
 * enabling completely gasless autonomous AI execution.
 */
contract SimplePaymaster is IPaymaster {
    IEntryPoint public immutable entryPoint;
    address public owner;

    mapping(address => bool) public sponsoredAccounts;

    event GasSponsored(address indexed sender, uint256 maxCost);
    event AccountWhitelisted(address indexed account, bool sponsored);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _entryPoint) {
        entryPoint = IEntryPoint(_entryPoint);
        owner = msg.sender;
    }

    function setSponsoredAccount(address account, bool sponsored) external onlyOwner {
        sponsoredAccounts[account] = sponsored;
        emit AccountWhitelisted(account, sponsored);
    }

    function deposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /* userOpHash */,
        uint256 maxCost
    ) external view returns (bytes memory context, uint256 validationData) {
        require(msg.sender == address(entryPoint), "Only EntryPoint");
        // Verify sender is authorized for sponsorship
        if (!sponsoredAccounts[userOp.sender]) {
            return ("", 1); // Reject if not sponsored
        }
        return (abi.encode(userOp.sender, maxCost), 0); // Sponsor gas
    }

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 /* actualUserOpFeePerGas */
    ) external {
        require(msg.sender == address(entryPoint), "Only EntryPoint");
        if (mode != PostOpMode.postOpReverted) {
            (address sender, ) = abi.decode(context, (address, uint256));
            emit GasSponsored(sender, actualGasCost);
        }
    }
}
