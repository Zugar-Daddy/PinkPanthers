// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SocialRecoveryModule
 * @notice 3-of-5 Guardian Social Recovery with a 48-hour delay timelock and Biometric Owner Veto.
 * Allows recovery of a hijacked or lost smart account while protecting against malicious guardian collusion.
 */
contract SocialRecoveryModule {
    // Recovery constants
    uint256 public constant GUARDIAN_COUNT = 5;
    uint256 public constant RECOVERY_THRESHOLD = 3;
    uint256 public constant RECOVERY_DELAY = 48 hours;

    // Smart account binding
    address public accountOwner;
    address[5] public guardians;
    mapping(address => bool) public isGuardian;

    // Active Recovery Proposal State
    struct RecoveryRequest {
        address proposedNewOwner;
        uint256 approvalCount;
        uint256 executionTime;
        bool isActive;
        bool isExecuted;
    }

    RecoveryRequest public activeRecovery;
    mapping(address => bool) public hasApproved;

    // Events
    event RecoveryProposed(address indexed guardian, address indexed proposedNewOwner, uint256 approvalCount);
    event RecoveryThresholdReached(address indexed proposedNewOwner, uint256 executeAfter);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
    event RecoveryVetoed(address indexed owner, address indexed cancelledProposal);
    event GuardianAdded(address indexed guardian);

    modifier onlyAccountOwner() {
        require(msg.sender == accountOwner, "Only account owner can veto");
        _;
    }

    modifier onlyGuardian() {
        require(isGuardian[msg.sender], "Only verified guardian");
        _;
    }

    constructor(address _owner, address[5] memory _guardians) {
        require(_owner != address(0), "Invalid owner");
        accountOwner = _owner;

        for (uint256 i = 0; i < 5; i++) {
            require(_guardians[i] != address(0), "Invalid guardian");
            require(!isGuardian[_guardians[i]], "Duplicate guardian");
            guardians[i] = _guardians[i];
            isGuardian[_guardians[i]] = true;
            emit GuardianAdded(_guardians[i]);
        }
    }

    /**
     * @notice A guardian initiates or supports a recovery proposal for a new owner.
     * When 3 of 5 guardians approve, a 48-hour timelock countdown begins.
     */
    function supportRecovery(address proposedNewOwner) external onlyGuardian {
        require(proposedNewOwner != address(0), "Invalid new owner");
        require(proposedNewOwner != accountOwner, "Cannot propose existing owner");

        // If proposing a different owner than current active unexecuted proposal, reset
        if (activeRecovery.isActive && activeRecovery.proposedNewOwner != proposedNewOwner) {
            require(!activeRecovery.isExecuted, "Already executed");
            _resetApprovals();
        }

        require(!hasApproved[msg.sender], "Guardian already approved");
        hasApproved[msg.sender] = true;

        if (!activeRecovery.isActive) {
            activeRecovery = RecoveryRequest({
                proposedNewOwner: proposedNewOwner,
                approvalCount: 1,
                executionTime: 0,
                isActive: true,
                isExecuted: false
            });
            emit RecoveryProposed(msg.sender, proposedNewOwner, 1);
        } else {
            activeRecovery.approvalCount += 1;
            emit RecoveryProposed(msg.sender, proposedNewOwner, activeRecovery.approvalCount);
        }

        // Threshold reached (3 of 5)
        if (activeRecovery.approvalCount >= RECOVERY_THRESHOLD && activeRecovery.executionTime == 0) {
            activeRecovery.executionTime = block.timestamp + RECOVERY_DELAY;
            emit RecoveryThresholdReached(proposedNewOwner, activeRecovery.executionTime);
        }
    }

    /**
     * @notice Finalize recovery after the 48-hour delay has elapsed without an owner veto.
     */
    function executeRecovery() external {
        require(activeRecovery.isActive, "No active recovery");
        require(activeRecovery.approvalCount >= RECOVERY_THRESHOLD, "Quorum not reached");
        require(block.timestamp >= activeRecovery.executionTime, "48-hour timelock delay pending");
        require(!activeRecovery.isExecuted, "Recovery already finalized");

        activeRecovery.isExecuted = true;
        address oldOwner = accountOwner;
        accountOwner = activeRecovery.proposedNewOwner;

        emit RecoveryExecuted(oldOwner, activeRecovery.proposedNewOwner);
        _resetApprovals();
    }

    /**
     * @notice Owner Veto: The legitimate master owner can immediately cancel any pending recovery.
     * Prevents hostile takeovers by rogue guardian collusions.
     */
    function vetoRecovery() external onlyAccountOwner {
        require(activeRecovery.isActive, "No recovery to veto");
        address cancelled = activeRecovery.proposedNewOwner;
        _resetApprovals();
        emit RecoveryVetoed(msg.sender, cancelled);
    }

    function _resetApprovals() internal {
        for (uint256 i = 0; i < 5; i++) {
            hasApproved[guardians[i]] = false;
        }
        delete activeRecovery;
    }

    function getGuardians() external view returns (address[5] memory) {
        return guardians;
    }
}
