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

export type FleetCategory = 'all' | 'finance' | 'ops' | 'growth' | 'eng';

export interface FleetAgent {
    id: string;
    name: string;
    role: string;
    category: 'finance' | 'ops' | 'growth' | 'eng';
    tag: string;
    address: string;
    dailyBudget: number;
    spentToday: number;
    status: 'active' | 'provisioning' | 'paused';
    assignedCard: string;
    lastAction: string;
}

export interface VirtualCardDetails {
    cardNumber: string;
    maskedNumber: string;
    expiry: string;
    cvv: string;
    holder: string;
    isFrozen: boolean;
    dailyLimit: number;
    spentToday: number;
    brand: string;
}

export interface InboxMessage {
    id: string;
    sender: string;
    subject: string;
    code?: string;
    body: string;
    timestamp: string;
    unread: boolean;
    category: '2fa' | 'receipt' | 'alert';
}

export interface ActivityStreamEvent {
    id: string;
    agentId: string;
    agentName: string;
    category: 'finance' | 'ops' | 'growth' | 'eng';
    tag: string;
    action: string;
    vendor: string;
    amount: number;
    timeAgo: string;
    timestamp: number;
}

export class AgentWalletClient {
    public smartAccountAddress: string = '0x884337bA94D25Ac2c488b394B7f8D44e1D328C39';
    public entryPointAddress: string = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
    public paymasterAddress: string = '0x9999000011112222333344445555666677778888';

    // 1. Principal Identity (Master Human Admin)
    public principalName: string = 'Yoav K.';
    public principalRole: string = 'Chief Executive';
    public principalInitials: string = 'YK';
    public ownerAddress: string = '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
    public passkeyEnabled: boolean = true;
    public passkeyCredentialId: string = "credential-p256-apple-secure-enclave";
    public passkeyDeviceName: string = "TouchID / FaceID (WebAuthn P-256)";
    public totalAgentsCount: number = 12;
    public totalFleetSpendToday: number = 28284.00;

    // 2. Active Agent Identity
    public activeAgentId: string = 'finance-07';
    public agentName: string = "finance-agent-07";
    public agentAddress: string = '0xAgent92F1c30E682cB72a6A20C57aD7858D0aA4481023';
    public sessionActive: boolean = true;
    public sessionExpiresAt: number = Date.now() + 6 * 3600 * 1000;

    // 3. Multi-Agent Fleet
    public fleet: FleetAgent[] = [
        {
            id: 'finance-07',
            name: 'finance-agent-07',
            role: 'Finance Operations',
            category: 'finance',
            tag: 'FI',
            address: '0xAgent92F1c30E682cB72a6A20C57aD7858D0aA4481023',
            dailyBudget: 5000,
            spentToday: 2990,
            status: 'active',
            assignedCard: '4242 0815 ···· 1126',
            lastAction: 'paid invoice · Datadog ($2,990)'
        },
        {
            id: 'concierge-08',
            name: 'concierge-08',
            role: 'Concierge & Ops',
            category: 'ops',
            tag: 'CO',
            address: '0xAgent8821bA41c8dF291a82E92aC5718a381920B8821',
            dailyBudget: 500,
            spentToday: 146,
            status: 'active',
            assignedCard: '4242 0815 ···· 8840',
            lastAction: 'paid vendor · Zoom ($146)'
        },
        {
            id: 'media-10',
            name: 'media-buyer-10',
            role: 'Growth & Ads',
            category: 'growth',
            tag: 'ME',
            address: '0xAgent4419eD92cA01f8271a39d891A928bA339124419',
            dailyBudget: 2500,
            spentToday: 1086,
            status: 'active',
            assignedCard: '4242 0815 ···· 3391',
            lastAction: 'bought placement · Google Ads ($1,086)'
        },
        {
            id: 'devops-04',
            name: 'devops-bot-04',
            role: 'Cloud & AI Inference',
            category: 'eng',
            tag: 'DE',
            address: '0xAgent7702fB12aC90281bA9281a829188aA910237702',
            dailyBudget: 1000,
            spentToday: 220,
            status: 'active',
            assignedCard: '4242 0815 ···· 9102',
            lastAction: 'paid API credit · Replicate ($220)'
        },
        {
            id: 'qa-11',
            name: 'qa-tester-11',
            role: 'Testing & CI/CD',
            category: 'eng',
            tag: 'QA',
            address: '0xAgent9923aE11bF99281bA9281a829188aA9923',
            dailyBudget: 250,
            spentToday: 90,
            status: 'active',
            assignedCard: '4242 0815 ···· 1126',
            lastAction: 'paid API credit · Replicate ($90)'
        },
        {
            id: 'support-02',
            name: 'support-bot-02',
            role: 'Support & Refunds',
            category: 'ops',
            tag: 'SU',
            address: '0xAgent3310cB11aA33281bA9281a829188aA3310',
            dailyBudget: 500,
            spentToday: 175,
            status: 'active',
            assignedCard: '4242 0815 ···· 8840',
            lastAction: 'approved expense ($175)'
        }
    ];

    // 4. Virtual Debit Card
    public virtualCard: VirtualCardDetails = {
        cardNumber: '4242 0815 9012 1126',
        maskedNumber: '4242 0815 ···· 1126',
        expiry: '08/28',
        cvv: '842',
        holder: 'AGENT-FINANCE-07 / AGENTWALLET',
        isFrozen: false,
        dailyLimit: 5000.00,
        spentToday: 2990.00,
        brand: 'VISA BUSINESS'
    };

    // 5. Agent Inbox (2FA OTP & Receipts)
    public inboxMessages: InboxMessage[] = [
        {
            id: 'msg-1',
            sender: 'Stripe 3DS Security',
            subject: 'One-Time Passcode (OTP)',
            code: '849201',
            body: 'Use 849201 to authorize $2,990.00 payment to Datadog on card ···· 1126. Valid for 10 minutes.',
            timestamp: 'Just now',
            unread: true,
            category: '2fa'
        },
        {
            id: 'msg-2',
            sender: 'Datadog Billing',
            subject: 'Invoice #DD-90214 Paid',
            code: undefined,
            body: 'Payment of $2,990.00 was successfully processed via AgentWallet Smart Account.',
            timestamp: '2m ago',
            unread: false,
            category: 'receipt'
        },
        {
            id: 'msg-3',
            sender: 'OpenAI Platform',
            subject: 'API Credit Balance Top-Up',
            code: undefined,
            body: 'Prepayment of $15.00 completed successfully. Your credit balance is now $65.00.',
            timestamp: '15m ago',
            unread: false,
            category: 'receipt'
        },
        {
            id: 'msg-4',
            sender: 'Visa Fraud Prevention',
            subject: 'Card Control Policy Activated',
            code: undefined,
            body: 'Agent virtual card ···· 1126 successfully bound to PolicyEngine.sol guardrails.',
            timestamp: '1h ago',
            unread: false,
            category: 'alert'
        }
    ];

    // 6. Live Streaming Activity Feed
    public activityStream: ActivityStreamEvent[] = [
        {
            id: 'stream-1',
            agentId: 'finance-07',
            agentName: 'finance-agent-07',
            category: 'finance',
            tag: 'FI',
            action: 'paid invoice',
            vendor: 'Datadog',
            amount: 2990.00,
            timeAgo: 'now',
            timestamp: Date.now()
        },
        {
            id: 'stream-2',
            agentId: 'concierge-08',
            agentName: 'concierge-08',
            category: 'ops',
            tag: 'CO',
            action: 'paid vendor',
            vendor: 'Zoom',
            amount: 146.00,
            timeAgo: '11s',
            timestamp: Date.now() - 11000
        },
        {
            id: 'stream-3',
            agentId: 'support-02',
            agentName: 'support-bot-02',
            category: 'ops',
            tag: 'SU',
            action: 'approved expense',
            vendor: 'Intercom',
            amount: 61.00,
            timeAgo: '27s',
            timestamp: Date.now() - 27000
        },
        {
            id: 'stream-4',
            agentId: 'media-10',
            agentName: 'media-buyer-10',
            category: 'growth',
            tag: 'ME',
            action: 'renewed credit',
            vendor: 'LinkedIn Ads',
            amount: 794.00,
            timeAgo: '54s',
            timestamp: Date.now() - 54000
        },
        {
            id: 'stream-5',
            agentId: 'devops-04',
            agentName: 'devops-bot-04',
            category: 'eng',
            tag: 'DE',
            action: 'paid API credit',
            vendor: 'Replicate',
            amount: 220.00,
            timeAgo: '2m',
            timestamp: Date.now() - 120000
        },
        {
            id: 'stream-6',
            agentId: 'media-10',
            agentName: 'media-buyer-10',
            category: 'growth',
            tag: 'ME',
            action: 'bought placement',
            vendor: 'Google Ads',
            amount: 1086.00,
            timeAgo: '4m',
            timestamp: Date.now() - 240000
        }
    ];

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
     * Switch Active Fleet Agent
     */
    switchAgent(agentId: string) {
        const ag = this.fleet.find(a => a.id === agentId);
        if (ag) {
            this.activeAgentId = ag.id;
            this.agentName = ag.name;
            this.agentAddress = ag.address;
            this.policy.dailyBudget = ag.dailyBudget;
            this.dailySpent = ag.spentToday;
            this.virtualCard.holder = `${ag.name.toUpperCase()} / AGENTWALLET`;
            this.virtualCard.maskedNumber = ag.assignedCard;
        }
    }

    /**
     * Toggle Virtual Card Freeze
     */
    toggleCardFreeze(): boolean {
        this.virtualCard.isFrozen = !this.virtualCard.isFrozen;
        const action = this.virtualCard.isFrozen ? 'FROZEN' : 'ACTIVE';
        this.inboxMessages.unshift({
            id: `msg-${Date.now()}`,
            sender: 'Card Control System',
            subject: `Virtual Card ${action}`,
            body: `Agent virtual card ···· 1126 status changed to ${action} by Principal ${this.principalName}.`,
            timestamp: 'Just now',
            unread: true,
            category: 'alert'
        });
        return this.virtualCard.isFrozen;
    }

    /**
     * Update Card Daily Limit
     */
    updateCardLimit(limit: number) {
        this.virtualCard.dailyLimit = limit;
    }

    /**
     * Mark Inbox Messages Read
     */
    markAllInboxRead() {
        this.inboxMessages.forEach(m => m.unread = false);
    }

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

        // Check if virtual card is frozen if this is a card/checkout action
        if (this.virtualCard.isFrozen && (functionCalled.includes('orderCheckout') || functionCalled.includes('bookTicket'))) {
            this._logFailedOp(targetName, targetAddress, functionCalled, amount, 'MALICIOUS_BLOCKED', 'Virtual Card is FROZEN by Principal');
            return { status: 'REVERTED', reason: 'Virtual Card is currently FROZEN' };
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
        this.totalFleetSpendToday += amount;

        // Update active agent record
        const activeAg = this.fleet.find(a => a.id === this.activeAgentId);
        if (activeAg) {
            activeAg.spentToday += amount;
            activeAg.lastAction = `${functionCalled} · ${targetName} ($${amount.toFixed(2)})`;
        }

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

        // Add to live activity stream
        this.activityStream.unshift({
            id: `stream-${Date.now()}`,
            agentId: this.activeAgentId,
            agentName: this.agentName,
            category: activeAg ? activeAg.category : 'finance',
            tag: activeAg ? activeAg.tag : 'AG',
            action: functionCalled.split('(')[0],
            vendor: targetName,
            amount,
            timeAgo: 'now',
            timestamp: Date.now()
        });

        // Add receipt to inbox
        this.inboxMessages.unshift({
            id: `msg-${Date.now()}`,
            sender: `${targetName} System`,
            subject: `Payment Receipt: $${amount.toFixed(2)}`,
            body: `Agent ${this.agentName} completed autonomous payment of $${amount.toFixed(2)} for ${actionDescription}.`,
            timestamp: 'Just now',
            unread: true,
            category: 'receipt'
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

        // Add 2FA OTP requirement alert to inbox
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        this.inboxMessages.unshift({
            id: `msg-otp-${Date.now()}`,
            sender: 'AgentWallet Guardrail Service',
            subject: `TouchID Passkey Required: $${amount.toFixed(2)} to ${targetName}`,
            code: otpCode,
            body: `Transaction exceeds spending cap: ${reason}. Request staged (#${queued.id}). Owner biometric authorization required.`,
            timestamp: 'Just now',
            unread: true,
            category: '2fa'
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
        this.totalFleetSpendToday += req.amount;

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

        // Add receipt to inbox
        this.inboxMessages.unshift({
            id: `msg-appr-${Date.now()}`,
            sender: 'Principal Passkey Authenticator',
            subject: `Out-of-Policy Request ${id} APPROVED`,
            body: `Biometric TouchID approved $${req.amount.toFixed(2)} to ${req.targetName}. Funds executed on-chain.`,
            timestamp: 'Just now',
            unread: true,
            category: 'receipt'
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
