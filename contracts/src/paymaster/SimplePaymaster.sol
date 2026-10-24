// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IPaymaster.sol";
import "../interfaces/IEntryPoint.sol";

/**
 * @title SimplePaymaster
 * @notice ERC-4337 Paymaster sponsoring gas for AgentSmartAccount transactions
 * with strict anti-spam daily gas quotas per agent that cannot be drained.
 */
contract SimplePaymaster is IPaymaster {
    IEntryPoint public immutable entryPoint;
    address public owner;

    mapping(address => bool) public sponsoredAccounts;

    // Anti-Spam Gas Quota Protection
    mapping(address => uint256) public agentDailyGasSpent;
    mapping(address => uint256) public agentLastGasEpoch;
    uint256 public constant MAX_DAILY_GAS_PER_AGENT = 0.005 ether; // 50,000 to 100,000 gas units worth

    event GasSponsored(address indexed sender, uint256 actualGasCost);
    event AccountWhitelisted(address indexed account, bool sponsored);
    event GasQuotaExceeded(address indexed agent, uint256 attemptedCost, uint256 dailySpent);

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

        // Check 1: Account must be whitelisted
        if (!sponsoredAccounts[userOp.sender]) {
            return ("", 1); // Reject sponsorship
        }

        // Check 2: Anti-Spam Daily Gas Quota
        uint256 currentSpent = agentDailyGasSpent[userOp.sender];
        if (block.timestamp > agentLastGasEpoch[userOp.sender] + 1 days) {
            currentSpent = 0; // Epoch reset
        }

        if (currentSpent + maxCost > MAX_DAILY_GAS_PER_AGENT) {
            return ("", 1); // Quota exceeded: reject gas sponsorship to protect paymaster tank
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

            if (block.timestamp > agentLastGasEpoch[sender] + 1 days) {
                agentDailyGasSpent[sender] = actualGasCost;
                agentLastGasEpoch[sender] = block.timestamp;
            } else {
                agentDailyGasSpent[sender] += actualGasCost;
            }

            emit GasSponsored(sender, actualGasCost);
        }
    }
}
