export interface AgentPolicy {
    dailyBudget: number;       // in USD
    maxPerTx: number;          // in USD
    sessionExpiryHours: number;
    allowedContracts: { name: string; address: string; selector: string; description: string }[];
    allowedRecipients: string[];
}

export interface QueuedApproval {
    id: string;
    agent: string;
    targetName: string;
    targetAddress: string;
    amount: number;
    actionName: string;
    reason: string;
    timestamp: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface UserOperationLog {
    id: string;
    userOpHash: string;
    timestamp: string;
    targetName: string;
    targetAddress: string;
    functionCalled: string;
    amount: number;
    gasSponsored: boolean;
    gasCostUSD: number;
    status: 'EXECUTED' | 'REVERTED_ON_CHAIN' | 'QUEUED_FOR_APPROVAL';
    validationResult: 'IN_POLICY' | 'OUT_OF_POLICY' | 'MALICIOUS_BLOCKED' | 'EXPIRED_BLOCKED';
    reason: string;
    rawUserOp: {
        sender: string;
        nonce: number;
        callData: string;
        callGasLimit: string;
        verificationGasLimit: string;
        paymasterAndData: string;
        signature: string;
    };
}

export class AgentWalletClient {
    public smartAccountAddress: string = '0x884337bA94D25Ac2c488b394B7f8D44e1D328C39';
    public entryPointAddress: string = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
    public paymasterAddress: string = '0x9999000011112222333344445555666677778888';

    // Owner Identity
    public ownerAddress: string = '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
    public passkeyEnabled: boolean = true;
    public passkeyCredentialId: string = "credential-p256-apple-secure-enclave";
    public passkeyDeviceName: string = "TouchID / FaceID (WebAuthn P-256)";

    // Delegated Agent Session Key
    public agentName: string = "Autonomous Task & Shopping Agent";
    public agentAddress: string = '0xAgent92F1c30E682cB72a6A20C57aD7858D0aA4481023';
    public sessionActive: boolean = true;
    public sessionExpiresAt: number = Date.now() + 6 * 3600 * 1000;

    // Balances
    public usdcBalance: number = 1250.00;
    public ethBalance: number = 0.45;
    public paymasterGasTankUSD: number = 48.50;

    // 24-Hour Policy Spending Accounting
    public dailySpent: number = 24.50;
    public lastEpochReset: number = Date.now();

    // The 6-Dimension Policy
    public policy: AgentPolicy = {
        dailyBudget: 100.00,
        maxPerTx: 25.00,
        sessionExpiryHours: 6,
        allowedContracts: [
            {
                name: 'OpenAI Billing API',
                address: '0x00000000000000000000000000000000000A1A1A',
                selector: '0x12345678 (payInvoice)',
                description: 'Prepay API inference credits for autonomous research'
            },
            {
                name: 'Grocery & Delivery Service (Instacart/Blinkit)',
                address: '0x00000000000000000000000000000000000B2B2B',
                selector: '0x87654321 (orderCheckout)',
                description: 'Weekly grocery purchases and automated re-orders'
            },
            {
                name: 'Travel & Ticket Booking API',
                address: '0x00000000000000000000000000000000000C3C3C',
                selector: '0x99887766 (bookTicket)',
                description: 'Metro, train, and flight ticket reservations'
            },
            {
                name: 'Uniswap V3 Swap Router',
                address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                selector: '0x414bf389 (exactInputSingle)',
                description: 'Automated micro-DCA token swaps'
            }
        ],
        allowedRecipients: [
            '0x00000000000000000000000000000000000A1A1A',
            '0x00000000000000000000000000000000000B2B2B',
            '0x00000000000000000000000000000000000C3C3C',
            '0xE592427A0AEce92De3Edee1F18E0157C05861564'
        ]
    };

    public queuedApprovals: QueuedApproval[] = [];
    public userOps: UserOperationLog[] = [
        {
            id: 'op-init-1',
            userOpHash: '0x4f8a29c1...9e02',
            timestamp: new Date(Date.now() - 1800000).toLocaleTimeString(),
            targetName: 'OpenAI Billing API',
            targetAddress: '0x0000...A1A1',
            functionCalled: 'payInvoice(amount: 15)',
            amount: 15.00,
            gasSponsored: true,
            gasCostUSD: 0.12,
            status: 'EXECUTED',
            validationResult: 'IN_POLICY',
            reason: 'Autonomous top-up of API credits ($15 < $25 limit). Verified on-chain.',
            rawUserOp: {
                sender: '0x884337bA94D25Ac2c488b394B7f8D44e1D328C39',
                nonce: 1,
                callData: '0x12345678000000000000000000000000000000000000000000000000000000000000000f',
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: '0x9999000011112222333344445555666677778888...',
                signature: '0xAgentSignatureSecp256k1...'
            }
        },
        {
            id: 'op-init-2',
            userOpHash: '0x8b321a0f...77d1',
            timestamp: new Date(Date.now() - 900000).toLocaleTimeString(),
            targetName: 'Grocery Delivery Service',
            targetAddress: '0x0000...B2B2',
            functionCalled: 'orderCheckout(cartId: 4421, amount: 9.5)',
            amount: 9.50,
            gasSponsored: true,
            gasCostUSD: 0.08,
            status: 'EXECUTED',
            validationResult: 'IN_POLICY',
            reason: 'Daily grocery re-order ($9.50 < $25 limit). Verified on-chain.',
            rawUserOp: {
                sender: '0x884337bA94D25Ac2c488b394B7f8D44e1D328C39',
                nonce: 2,
                callData: '0x876543210000000000000000000000000000000000000000000000000000000000000009',
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: '0x9999000011112222333344445555666677778888...',
                signature: '0xAgentSignatureSecp256k1...'
            }
        }
    ];

    /**
     * Submit an Agent Action
     */
    async submitAgentAction(
        targetName: string,
        targetAddress: string,
        functionCalled: string,
        amount: number,
        actionDescription: string
    ): Promise<{ status: 'EXECUTED' | 'QUEUED' | 'REVERTED'; reason: string }> {
        if (!this.sessionActive) {
            this._logFailedOp(targetName, targetAddress, functionCalled, amount, 'EXPIRED_BLOCKED', 'Session Key is Revoked or Inactive');
            return { status: 'REVERTED', reason: 'Agent Session Key is Inactive/Revoked' };
        }

        if (Date.now() > this.sessionExpiresAt) {
            this._logFailedOp(targetName, targetAddress, functionCalled, amount, 'EXPIRED_BLOCKED', 'Session Key has Expired (validUntil timestamp passed)');
            return { status: 'REVERTED', reason: 'Session Expired on-chain (validUntil < block.timestamp)' };
        }

        // Check 1: Target Whitelist
        const isContractAllowed = this.policy.allowedContracts.some(
            c => c.address.toLowerCase() === targetAddress.toLowerCase()
        );
        const isRecipientAllowed = this.policy.allowedRecipients.some(
            r => r.toLowerCase() === targetAddress.toLowerCase()
        );

        if (!isContractAllowed && !isRecipientAllowed) {
            this._logFailedOp(targetName, targetAddress, functionCalled, amount, 'MALICIOUS_BLOCKED', `REVERT: Target ${targetAddress} not on approved contract whitelist`);
            return { status: 'REVERTED', reason: `Target address not allowlisted: ${targetAddress}` };
        }

        // Check 2: Per-Transaction Limit
        if (amount > this.policy.maxPerTx) {
            const reason = `Amount ($${amount.toFixed(2)}) exceeds Per-Transaction Limit ($${this.policy.maxPerTx.toFixed(2)})`;
            this._queueForApproval(targetName, targetAddress, functionCalled, amount, reason);
            return { status: 'QUEUED', reason };
        }

        // Check 3: Daily Rolling Budget
        if (this.dailySpent + amount > this.policy.dailyBudget) {
            const remaining = Math.max(0, this.policy.dailyBudget - this.dailySpent);
            const reason = `Amount ($${amount.toFixed(2)}) exceeds 24-Hour Remaining Budget ($${remaining.toFixed(2)} remaining of $${this.policy.dailyBudget.toFixed(2)})`;
            this._queueForApproval(targetName, targetAddress, functionCalled, amount, reason);
            return { status: 'QUEUED', reason };
        }

        // In-Policy Success!
        this.dailySpent += amount;
        this.usdcBalance -= amount;

        const opHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        this.userOps.unshift({
            id: `op-${Date.now()}`,
            userOpHash: `${opHash.slice(0, 8)}...${opHash.slice(-6)}`,
            timestamp: new Date().toLocaleTimeString(),
            targetName,
            targetAddress,
            functionCalled,
            amount,
            gasSponsored: true,
            gasCostUSD: 0.10,
            status: 'EXECUTED',
            validationResult: 'IN_POLICY',
            reason: `Autonomous in-policy payment: ${actionDescription}`,
            rawUserOp: {
                sender: this.smartAccountAddress,
                nonce: this.userOps.length + 1,
                callData: `0x${functionCalled.slice(0, 8)}...`,
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: `${this.paymasterAddress}...`,
                signature: '0xAgentECDSA...'
            }
        });

        return { status: 'EXECUTED', reason: 'Autonomous transaction executed within policy' };
    }

    private _queueForApproval(
        targetName: string,
        targetAddress: string,
        functionCalled: string,
        amount: number,
        reason: string
    ) {
        const queued: QueuedApproval = {
            id: `REQ-${Date.now()}`,
            agent: this.agentAddress,
            targetName,
            targetAddress,
            amount,
            actionName: functionCalled,
            reason,
            timestamp: new Date().toLocaleTimeString(),
            status: 'PENDING'
        };
        this.queuedApprovals.unshift(queued);

        const opHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        this.userOps.unshift({
            id: `op-queued-${Date.now()}`,
            userOpHash: `${opHash.slice(0, 8)}...${opHash.slice(-6)}`,
            timestamp: new Date().toLocaleTimeString(),
            targetName,
            targetAddress,
            functionCalled,
            amount,
            gasSponsored: false,
            gasCostUSD: 0,
            status: 'QUEUED_FOR_APPROVAL',
            validationResult: 'OUT_OF_POLICY',
            reason: `Policy Intercepted: ${reason}. Staged in PendingApprovalQueue for Owner Passkey approval.`,
            rawUserOp: {
                sender: this.smartAccountAddress,
                nonce: this.userOps.length + 1,
                callData: `0x${functionCalled.slice(0, 8)}...`,
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: '0x',
                signature: '0xAgentSignatureStaged...'
            }
        });
    }

    private _logFailedOp(
        targetName: string,
        targetAddress: string,
        functionCalled: string,
        amount: number,
        validationResult: 'MALICIOUS_BLOCKED' | 'EXPIRED_BLOCKED',
        reason: string
    ) {
        const opHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        this.userOps.unshift({
            id: `op-blocked-${Date.now()}`,
            userOpHash: `${opHash.slice(0, 8)}...${opHash.slice(-6)}`,
            timestamp: new Date().toLocaleTimeString(),
            targetName,
            targetAddress,
            functionCalled,
            amount,
            gasSponsored: false,
            gasCostUSD: 0,
            status: 'REVERTED_ON_CHAIN',
            validationResult,
            reason: `Smart Account Policy Revert: ${reason}. 0 funds moved.`,
            rawUserOp: {
                sender: this.smartAccountAddress,
                nonce: this.userOps.length + 1,
                callData: `0x${functionCalled.slice(0, 8)}...`,
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: '0x',
                signature: '0xBlockedInvalidSignature...'
            }
        });
    }

    /**
     * Admin Biometric Passkey Approval
     */
    async approveQueued(id: string): Promise<boolean> {
        const req = this.queuedApprovals.find(q => q.id === id);
        if (!req) return false;

        req.status = 'APPROVED';
        this.usdcBalance -= req.amount;

        const opHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        this.userOps.unshift({
            id: `op-passkey-${Date.now()}`,
            userOpHash: `${opHash.slice(0, 8)}...${opHash.slice(-6)}`,
            timestamp: new Date().toLocaleTimeString(),
            targetName: req.targetName,
            targetAddress: req.targetAddress,
            functionCalled: req.actionName,
            amount: req.amount,
            gasSponsored: false,
            gasCostUSD: 0.15,
            status: 'EXECUTED',
            validationResult: 'IN_POLICY',
            reason: `Owner Biometric TouchID Passkey Override executed for request ${id} ($${req.amount.toFixed(2)})`,
            rawUserOp: {
                sender: this.smartAccountAddress,
                nonce: this.userOps.length + 1,
                callData: '0xApproved...',
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: '0x',
                signature: '0xOwnerPasskeyP256Verified...'
            }
        });

        return true;
    }

    rejectQueued(id: string) {
        const req = this.queuedApprovals.find(q => q.id === id);
        if (req) {
            req.status = 'REJECTED';
        }
    }

    issueSubKey(durationHours: number, dailyBudget: number, maxPerTx: number) {
        this.sessionActive = true;
        this.sessionExpiresAt = Date.now() + durationHours * 3600 * 1000;
        this.policy.dailyBudget = dailyBudget;
        this.policy.maxPerTx = maxPerTx;
        this.policy.sessionExpiryHours = durationHours;
        this.dailySpent = 0;
    }

    revokeSubKey() {
        this.sessionActive = false;
    }
}

export const agentWalletClient = new AgentWalletClient();
