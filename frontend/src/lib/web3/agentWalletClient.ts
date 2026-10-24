export function formatINR(val: number): string {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface AgentPolicy {
    dailyBudget: number;       // in INR
    maxPerTx: number;          // in INR
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
    maxPerTx: number;
    spentToday: number;
    status: 'active' | 'provisioning' | 'paused';
    assignedCard: string;
    lastAction: string;
    cardDetails: VirtualCardDetails;
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
    public principalName: string = 'Madhav B.';
    public principalRole: string = 'Chief Executive';
    public principalInitials: string = 'MB';
    public ownerAddress: string = '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
    public passkeyEnabled: boolean = true;
    public passkeyCredentialId: string = "credential-p256-apple-secure-enclave";
    public passkeyDeviceName: string = "TouchID / FaceID (WebAuthn P-256)";
    public totalAgentsCount: number = 12;
    public totalFleetSpendToday: number = 2485400.00;

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
            dailyBudget: 500000,
            maxPerTx: 300000,
            spentToday: 299000,
            status: 'active',
            assignedCard: '4242 0815 ···· 1126',
            lastAction: 'paid invoice · Datadog (₹2,99,000)',
            cardDetails: {
                cardNumber: '4242 0815 9012 1126',
                maskedNumber: '4242 0815 ···· 1126',
                expiry: '08/28',
                cvv: '842',
                holder: 'FINANCE-AGENT-07 / SAFEAGENT',
                isFrozen: false,
                dailyLimit: 500000.00,
                spentToday: 299000.00,
                brand: 'VISA BUSINESS'
            }
        },
        {
            id: 'concierge-08',
            name: 'concierge-08',
            role: 'Concierge & Ops',
            category: 'ops',
            tag: 'CO',
            address: '0xAgent8821bA41c8dF291a82E92aC5718a381920B8821',
            dailyBudget: 50000,
            maxPerTx: 20000,
            spentToday: 14600,
            status: 'active',
            assignedCard: '4242 0815 ···· 8840',
            lastAction: 'paid vendor · Zoom (₹14,600)',
            cardDetails: {
                cardNumber: '4242 0815 3390 8840',
                maskedNumber: '4242 0815 ···· 8840',
                expiry: '11/27',
                cvv: '319',
                holder: 'CONCIERGE-08 / SAFEAGENT',
                isFrozen: false,
                dailyLimit: 50000.00,
                spentToday: 14600.00,
                brand: 'VISA BUSINESS'
            }
        },
        {
            id: 'media-10',
            name: 'media-buyer-10',
            role: 'Growth & Ads',
            category: 'growth',
            tag: 'ME',
            address: '0xAgent4419eD92cA01f8271a39d891A928bA339124419',
            dailyBudget: 250000,
            maxPerTx: 150000,
            spentToday: 108600,
            status: 'active',
            assignedCard: '4242 0815 ···· 3391',
            lastAction: 'bought placement · Google Ads (₹1,08,600)',
            cardDetails: {
                cardNumber: '4242 0815 7712 3391',
                maskedNumber: '4242 0815 ···· 3391',
                expiry: '04/28',
                cvv: '552',
                holder: 'MEDIA-BUYER-10 / SAFEAGENT',
                isFrozen: false,
                dailyLimit: 250000.00,
                spentToday: 108600.00,
                brand: 'VISA BUSINESS'
            }
        },
        {
            id: 'devops-04',
            name: 'devops-bot-04',
            role: 'Cloud & AI Inference',
            category: 'eng',
            tag: 'DE',
            address: '0xAgent7702fB12aC90281bA9281a829188aA910237702',
            dailyBudget: 100000,
            maxPerTx: 50000,
            spentToday: 22000,
            status: 'active',
            assignedCard: '4242 0815 ···· 9102',
            lastAction: 'paid API credit · Replicate (₹22,000)',
            cardDetails: {
                cardNumber: '4242 0815 6601 9102',
                maskedNumber: '4242 0815 ···· 9102',
                expiry: '09/27',
                cvv: '109',
                holder: 'DEVOPS-BOT-04 / SAFEAGENT',
                isFrozen: false,
                dailyLimit: 100000.00,
                spentToday: 22000.00,
                brand: 'VISA BUSINESS'
            }
        },
        {
            id: 'qa-11',
            name: 'qa-tester-11',
            role: 'Testing & CI/CD',
            category: 'eng',
            tag: 'QA',
            address: '0xAgent9923aE11bF99281bA9281a829188aA9923',
            dailyBudget: 25000,
            maxPerTx: 10000,
            spentToday: 9000,
            status: 'active',
            assignedCard: '4242 0815 ···· 4410',
            lastAction: 'paid API credit · BrowserStack (₹9,000)',
            cardDetails: {
                cardNumber: '4242 0815 8821 4410',
                maskedNumber: '4242 0815 ···· 4410',
                expiry: '01/29',
                cvv: '741',
                holder: 'QA-TESTER-11 / SAFEAGENT',
                isFrozen: false,
                dailyLimit: 25000.00,
                spentToday: 9000.00,
                brand: 'VISA BUSINESS'
            }
        },
        {
            id: 'support-02',
            name: 'support-bot-02',
            role: 'Support & Refunds',
            category: 'ops',
            tag: 'SU',
            address: '0xAgent3310cB11aA33281bA9281a829188aA3310',
            dailyBudget: 50000,
            maxPerTx: 25000,
            spentToday: 17500,
            status: 'active',
            assignedCard: '4242 0815 ···· 5521',
            lastAction: 'approved expense · Freshworks (₹17,500)',
            cardDetails: {
                cardNumber: '4242 0815 1109 5521',
                maskedNumber: '4242 0815 ···· 5521',
                expiry: '06/28',
                cvv: '428',
                holder: 'SUPPORT-BOT-02 / SAFEAGENT',
                isFrozen: false,
                dailyLimit: 50000.00,
                spentToday: 17500.00,
                brand: 'VISA BUSINESS'
            }
        }
    ];

    // 4. Virtual Debit Card
    public virtualCard: VirtualCardDetails = {
        cardNumber: '4242 0815 9012 1126',
        maskedNumber: '4242 0815 ···· 1126',
        expiry: '08/28',
        cvv: '842',
        holder: 'AGENT-FINANCE-07 / SAFEAGENT',
        isFrozen: false,
        dailyLimit: 500000.00,
        spentToday: 299000.00,
        brand: 'VISA BUSINESS'
    };

    // 5. Agent Inbox (2FA OTP & Receipts)
    public inboxMessages: InboxMessage[] = [
        {
            id: 'msg-1',
            sender: 'Stripe 3DS Security',
            subject: 'One-Time Passcode (OTP)',
            code: '849201',
            body: 'Use 849201 to authorize ₹2,99,000.00 payment to Datadog on card ···· 1126. Valid for 10 minutes.',
            timestamp: 'Just now',
            unread: true,
            category: '2fa'
        },
        {
            id: 'msg-2',
            sender: 'Datadog Billing',
            subject: 'Invoice #DD-90214 Paid',
            code: undefined,
            body: 'Payment of ₹2,99,000.00 was successfully processed via SafeAgent Smart Account.',
            timestamp: '2m ago',
            unread: false,
            category: 'receipt'
        },
        {
            id: 'msg-3',
            sender: 'OpenAI Platform',
            subject: 'API Credit Balance Top-Up',
            code: undefined,
            body: 'Prepayment of ₹1,500.00 completed successfully. Your credit balance is now ₹6,500.00.',
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
            amount: 299000.00,
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
            amount: 14600.00,
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
            vendor: 'Freshworks',
            amount: 6100.00,
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
            amount: 79400.00,
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
            amount: 22000.00,
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
            amount: 108600.00,
            timeAgo: '4m',
            timestamp: Date.now() - 240000
        }
    ];

    // Balances (in Indian Rupees)
    public usdcBalance: number = 1250000.00;
    public ethBalance: number = 0.45;
    public paymasterGasTankUSD: number = 4850.00; // Gas Tank in INR

    // 24-Hour Policy Spending Accounting
    public dailySpent: number = 2450.00;
    public lastEpochReset: number = Date.now();

    // The 6-Dimension Policy (Enforced in INR)
    public policy: AgentPolicy = {
        dailyBudget: 10000.00,
        maxPerTx: 2500.00,
        sessionExpiryHours: 6,
        allowedContracts: [
            {
                name: 'OpenAI Billing API',
                address: '0x00000000000000000000000000000000000A1A1A',
                selector: '0x12345678 (payInvoice)',
                description: 'Prepay API inference credits for autonomous research'
            },
            {
                name: 'Grocery & Delivery Service (Blinkit/Zepto/Instamart)',
                address: '0x00000000000000000000000000000000000B2B2B',
                selector: '0x87654321 (orderCheckout)',
                description: 'Weekly grocery purchases and automated pantry restocking'
            },
            {
                name: 'Travel & Ticket Booking API (IRCTC/Metro/IndiGo)',
                address: '0x00000000000000000000000000000000000C3C3C',
                selector: '0xabcdef12 (bookTicket)',
                description: 'Metro, train, and flight ticket reservations'
            },
            {
                name: 'Cloud Infrastructure API (AWS/Cloudflare)',
                address: '0x00000000000000000000000000000000000D4D4D',
                selector: '0x4321fedc (topUpCompute)',
                description: 'Serverless compute & edge workers balance top-up'
            },
            {
                name: 'Corporate Catering (Swiggy/Zomato)',
                address: '0x00000000000000000000000000000000000E5E5E',
                selector: '0x99887766 (orderCatering)',
                description: 'Automated team meal & pantry orders'
            },
            {
                name: 'Uniswap V3 Swap Router',
                address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                selector: '0x414bf389 (exactInputSingle)',
                description: 'Automated micro-DCA token swaps'
            },
            {
                name: 'RedBus Intercity Mobility',
                address: '0x00000000000000000000000000000000000F6F6F',
                selector: '0x4b7c89a0 (bookBusTicket)',
                description: 'Intercity Volvo sleeper and multi-axle bus bookings'
            }
        ],
        allowedRecipients: [
            '0x00000000000000000000000000000000000A1A1A',
            '0x00000000000000000000000000000000000B2B2B',
            '0x00000000000000000000000000000000000C3C3C',
            '0x00000000000000000000000000000000000D4D4D',
            '0x00000000000000000000000000000000000E5E5E',
            '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            '0x00000000000000000000000000000000000F6F6F'
        ]
    };

    public queuedApprovals: QueuedApproval[] = [];
    public userOps: UserOperationLog[] = [
        {
            id: 'op-init-1',
            userOpHash: '0x4f8a29c1...9e02',
            timestamp: '11:15 AM',
            targetName: 'OpenAI Billing API',
            targetAddress: '0x0000...A1A1',
            functionCalled: 'payInvoice(amount: 1500)',
            amount: 1500.00,
            gasSponsored: true,
            gasCostUSD: 10.00,
            status: 'EXECUTED',
            validationResult: 'IN_POLICY',
            reason: 'Autonomous top-up of API credits (₹1,500 < ₹2,500 limit). Recorded in local simulation.',
            rawUserOp: {
                sender: '0x884337bA94D25Ac2c488b394B7f8D44e1D328C39',
                nonce: 1,
                callData: '0x1234567800000000000000000000000000000000000000000000000000000000000005dc',
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: '0x9999000011112222333344445555666677778888...',
                signature: '0xAgentSignatureSecp256k1...'
            }
        },
        {
            id: 'op-init-2',
            userOpHash: '0x8b321a0f...77d1',
            timestamp: '11:30 AM',
            targetName: 'Blinkit Grocery Delivery',
            targetAddress: '0x0000...B2B2',
            functionCalled: 'orderCheckout(cartId: 4421, amount: 950)',
            amount: 950.00,
            gasSponsored: true,
            gasCostUSD: 8.00,
            status: 'EXECUTED',
            validationResult: 'IN_POLICY',
            reason: 'Daily grocery re-order (₹950 < ₹2,500 limit). Recorded in local simulation.',
            rawUserOp: {
                sender: '0x884337bA94D25Ac2c488b394B7f8D44e1D328C39',
                nonce: 2,
                callData: '0x8765432100000000000000000000000000000000000000000000000000000000000003b6',
                callGasLimit: '0x186a0',
                verificationGasLimit: '0x249f0',
                paymasterAndData: '0x9999000011112222333344445555666677778888...',
                signature: '0xAgentSignatureSecp256k1...'
            }
        }
    ];

    /**
     * Apply authoritative state from server
     */
    public _applyState(s: any) {
        if (!s) return;
        if (s.balances) {
            this.usdcBalance = s.balances.usdc;
            this.ethBalance = s.balances.eth;
            this.paymasterGasTankUSD = s.balances.paymasterGasTankINR;
        }
        if (s.policy) this.policy = s.policy;
        if (s.fleet) this.fleet = s.fleet;
        if (s.dailySpent !== undefined) this.dailySpent = s.dailySpent;
        if (s.activeAgent) {
            this.activeAgentId = s.activeAgent.id;
            this.agentName = s.activeAgent.name;
            this.agentAddress = s.activeAgent.address;
            this.sessionActive = s.activeAgent.sessionActive;
            this.sessionExpiresAt = s.activeAgent.sessionExpiresAt;
        }
        if (s.virtualCard) {
            this.virtualCard = s.virtualCard;
        } else {
            const ag = this.fleet.find(a => a.id === this.activeAgentId);
            if (ag?.cardDetails) this.virtualCard = { ...ag.cardDetails };
        }
        if (s.inboxMessages) this.inboxMessages = s.inboxMessages;
        if (s.activityStream) this.activityStream = s.activityStream;
        if (s.queuedApprovals) this.queuedApprovals = s.queuedApprovals;
        if (s.userOps) this.userOps = s.userOps;
        if (s.principal?.totalFleetSpendToday !== undefined) {
            this.totalFleetSpendToday = s.principal.totalFleetSpendToday;
        }
    }

    /**
     * Synchronize with the live backend state store
     */
    async syncFromServer(): Promise<boolean> {
        if (typeof window === 'undefined') return false;
        try {
            const res = await fetch('/api/wallet/state');
            const data = await res.json();
            if (data.success && data.state) {
                this._applyState(data.state);
                return true;
            }
        } catch {
            // Ignore offline fallback
        }
        return false;
    }

    /**
     * Switch Active Fleet Agent & load their specific virtual card and policy
     */
    switchAgent(agentId: string) {
        const ag = this.fleet.find(a => a.id === agentId);
        if (ag) {
            this.activeAgentId = ag.id;
            this.agentName = ag.name;
            this.agentAddress = ag.address;
            this.policy.dailyBudget = ag.dailyBudget;
            this.policy.maxPerTx = ag.maxPerTx || 50000;
            this.dailySpent = ag.spentToday;
            if (ag.cardDetails) {
                this.virtualCard = { ...ag.cardDetails };
            } else {
                this.virtualCard.holder = `${ag.name.toUpperCase()} / SAFEAGENT`;
                this.virtualCard.maskedNumber = ag.assignedCard;
                this.virtualCard.dailyLimit = ag.dailyBudget;
                this.virtualCard.spentToday = ag.spentToday;
            }
        }
        if (typeof window !== 'undefined') {
            fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'switch_agent', payload: { agentId } })
            }).then(r => r.json()).then(d => { if (d.success && d.state) this._applyState(d.state); }).catch(() => {});
        }
    }

    /**
     * Toggle Virtual Card Freeze for the active agent
     */
    toggleCardFreeze(): boolean {
        const shouldFreeze = !this.virtualCard.isFrozen;
        this.virtualCard.isFrozen = shouldFreeze;
        const activeAg = this.fleet.find(a => a.id === this.activeAgentId);
        if (activeAg && activeAg.cardDetails) {
            activeAg.cardDetails.isFrozen = shouldFreeze;
        }
        const action = shouldFreeze ? 'FROZEN' : 'ACTIVE';
        this.inboxMessages.unshift({
            id: `msg-${Date.now()}`,
            sender: 'Card Control System',
            subject: `Virtual Card ${action} (${this.virtualCard.maskedNumber})`,
            body: `Agent ${this.agentName} virtual card (${this.virtualCard.maskedNumber}) status changed to ${action} by Principal ${this.principalName}.`,
            timestamp: 'Just now',
            unread: true,
            category: 'alert'
        });
        if (typeof window !== 'undefined') {
            fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_freeze', payload: { agentId: this.activeAgentId } })
            }).then(r => r.json()).then(d => { if (d.success && d.state) this._applyState(d.state); }).catch(() => {});
        }
        return this.virtualCard.isFrozen;
    }

    /**
     * Update Card Daily Limit for the active agent
     */
    updateCardLimit(limit: number) {
        this.virtualCard.dailyLimit = limit;
        this.policy.dailyBudget = limit;
        const activeAg = this.fleet.find(a => a.id === this.activeAgentId);
        if (activeAg) {
            activeAg.dailyBudget = limit;
            if (activeAg.cardDetails) activeAg.cardDetails.dailyLimit = limit;
        }
        if (typeof window !== 'undefined') {
            fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_card_limit', payload: { limit, agentId: this.activeAgentId } })
            }).then(r => r.json()).then(d => { if (d.success && d.state) this._applyState(d.state); }).catch(() => {});
        }
    }

    /**
     * Mark Inbox Messages Read
     */
    markAllInboxRead() {
        this.inboxMessages.forEach(m => m.unread = false);
        if (typeof window !== 'undefined') {
            fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_read', payload: {} })
            }).then(r => r.json()).then(d => { if (d.success && d.state) this._applyState(d.state); }).catch(() => {});
        }
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
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch('/api/wallet/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'submit_payment',
                        payload: { targetName, targetAddress, functionCalled, amount, description: actionDescription }
                    })
                });
                const data = await res.json();
                if (data.success && data.state) {
                    this._applyState(data.state);
                    return data.result;
                }
            } catch {
                // Fallback to local execution if server is unreachable
            }
        }

        return { status: 'REVERTED', reason: 'Wallet state service unavailable; no payment was submitted' };
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
            sender: 'SafeAgent Guardrail Service',
            subject: `TouchID Passkey Required: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${targetName}`,
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
        if (typeof window === 'undefined') return false;
        try {
            const response = await fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve_queued', payload: { id } })
            });
            const result = await response.json();
            if (!response.ok || !result.success) return false;
            this._applyState(result.state);
            return true;
        } catch {
            return false;
        }
    }

    rejectQueued(id: string) {
        const req = this.queuedApprovals.find(q => q.id === id);
        if (req) {
            req.status = 'REJECTED';
        }
        if (typeof window !== 'undefined') {
            fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject_queued', payload: { id } })
            }).then(r => r.json()).then(d => { if (d.success && d.state) this._applyState(d.state); }).catch(() => {});
        }
    }

    issueSubKey(durationHours: number, dailyBudget: number, maxPerTx: number) {
        this.sessionActive = true;
        this.sessionExpiresAt = Date.now() + durationHours * 3600 * 1000;
        this.policy.dailyBudget = dailyBudget;
        this.policy.maxPerTx = maxPerTx;
        this.policy.sessionExpiryHours = durationHours;
        this.dailySpent = 0;
        const activeAg = this.fleet.find(a => a.id === this.activeAgentId);
        if (activeAg) {
            activeAg.dailyBudget = dailyBudget;
            activeAg.maxPerTx = maxPerTx;
            activeAg.spentToday = 0;
            if (activeAg.cardDetails) {
                activeAg.cardDetails.dailyLimit = dailyBudget;
                activeAg.cardDetails.spentToday = 0;
            }
        }
        if (typeof window !== 'undefined') {
            fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_policy', payload: { dailyBudget, maxPerTx, sessionExpiryHours: durationHours } })
            }).then(r => r.json()).then(d => { if (d.success && d.state) this._applyState(d.state); }).catch(() => {});
        }
    }

    revokeSubKey() {
        this.sessionActive = false;
        if (typeof window !== 'undefined') {
            fetch('/api/wallet/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke_key', payload: {} })
            }).then(r => r.json()).then(d => { if (d.success && d.state) this._applyState(d.state); }).catch(() => {});
        }
    }
}

export const agentWalletClient = new AgentWalletClient();
