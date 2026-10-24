import fs from 'fs';
import path from 'path';

export interface WalletState {
    smartAccountAddress: string;
    entryPointAddress: string;
    paymasterAddress: string;
    principal: {
        name: string;
        role: string;
        initials: string;
        ownerAddress: string;
        passkeyEnabled: boolean;
        passkeyCredentialId: string;
        passkeyDeviceName: string;
        totalAgentsCount: number;
        totalFleetSpendToday: number;
    };
    balances: {
        usdc: number;
        eth: number;
        paymasterGasTankINR: number;
    };
    activeAgent: {
        id: string;
        name: string;
        address: string;
        sessionActive: boolean;
        sessionExpiresAt: number;
    };
    policy: {
        dailyBudget: number;
        maxPerTx: number;
        sessionExpiryHours: number;
        allowedContracts: { name: string; address: string; selector: string; description: string }[];
        allowedRecipients: string[];
    };
    dailySpent: number;
    lastEpochReset: number;
    virtualCard: {
        cardNumber: string;
        maskedNumber: string;
        expiry: string;
        cvv: string;
        holder: string;
        isFrozen: boolean;
        dailyLimit: number;
        spentToday: number;
        brand: string;
    };
    fleet: {
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
    }[];
    inboxMessages: {
        id: string;
        sender: string;
        subject: string;
        code?: string;
        body: string;
        timestamp: string;
        unread: boolean;
        category: '2fa' | 'receipt' | 'alert';
    }[];
    activityStream: {
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
    }[];
    queuedApprovals: {
        id: string;
        agent: string;
        targetName: string;
        targetAddress: string;
        amount: number;
        actionName: string;
        reason: string;
        timestamp: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
    }[];
    userOps: {
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
    }[];
}

const DATA_FILE_PATH = path.resolve(process.cwd(), '../data/wallet-state.json');
const ALT_DATA_FILE_PATH = path.resolve(process.cwd(), 'data/wallet-state.json');

function getDataPath(): string {
    if (fs.existsSync(DATA_FILE_PATH)) return DATA_FILE_PATH;
    if (fs.existsSync(ALT_DATA_FILE_PATH)) return ALT_DATA_FILE_PATH;
    // Fallback: create in data/ relative to project root
    const rootData = path.resolve(process.cwd(), '../data');
    if (!fs.existsSync(rootData)) fs.mkdirSync(rootData, { recursive: true });
    return DATA_FILE_PATH;
}

export function readWalletState(): WalletState {
    const filePath = getDataPath();
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

export function writeWalletState(state: WalletState): void {
    const filePath = getDataPath();
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Execute an Agent Payment against the on-chain PolicyEngine guardrails
 */
export function executeAgentPayment(
    targetName: string,
    targetAddress: string,
    functionCalled: string,
    amount: number,
    description: string
): { status: 'EXECUTED' | 'QUEUED' | 'REVERTED'; reason: string; userOpHash?: string } {
    const state = readWalletState();

    if (!state.activeAgent.sessionActive) {
        return { status: 'REVERTED', reason: 'Agent Session Key is Inactive/Revoked' };
    }

    if (Date.now() > state.activeAgent.sessionExpiresAt) {
        return { status: 'REVERTED', reason: 'Session Expired on-chain (validUntil < block.timestamp)' };
    }

    if (state.virtualCard.isFrozen && (functionCalled.includes('orderCheckout') || functionCalled.includes('bookTicket') || functionCalled.includes('payInvoice'))) {
        return { status: 'REVERTED', reason: 'Virtual Card is currently FROZEN by Principal' };
    }

    // 1. Whitelist Check
    const isContractAllowed = state.policy.allowedContracts.some(
        c => c.address.toLowerCase() === targetAddress.toLowerCase()
    );
    const isRecipientAllowed = state.policy.allowedRecipients.some(
        r => r.toLowerCase() === targetAddress.toLowerCase()
    );

    if (!isContractAllowed && !isRecipientAllowed) {
        return { status: 'REVERTED', reason: `Target address not allowlisted: ${targetAddress}` };
    }

    // 2. Per-Tx Cap Check
    if (amount > state.policy.maxPerTx) {
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds Per-Transaction Limit (₹${state.policy.maxPerTx.toLocaleString('en-IN')})`;
        const approval = {
            id: `req-${Date.now()}`,
            agent: state.activeAgent.name,
            targetName,
            targetAddress,
            amount,
            actionName: functionCalled,
            reason,
            timestamp: new Date().toLocaleTimeString(),
            status: 'PENDING' as const
        };
        state.queuedApprovals.unshift(approval);
        writeWalletState(state);
        return { status: 'QUEUED', reason };
    }

    // 3. Daily Budget Check
    if (state.dailySpent + amount > state.policy.dailyBudget) {
        const remaining = Math.max(0, state.policy.dailyBudget - state.dailySpent);
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds 24h Remaining Budget (₹${remaining.toLocaleString('en-IN')} remaining of ₹${state.policy.dailyBudget.toLocaleString('en-IN')})`;
        const approval = {
            id: `req-${Date.now()}`,
            agent: state.activeAgent.name,
            targetName,
            targetAddress,
            amount,
            actionName: functionCalled,
            reason,
            timestamp: new Date().toLocaleTimeString(),
            status: 'PENDING' as const
        };
        state.queuedApprovals.unshift(approval);
        writeWalletState(state);
        return { status: 'QUEUED', reason };
    }

    // Success: Execute Payment In-Policy
    state.dailySpent += amount;
    state.balances.usdc -= amount;
    state.principal.totalFleetSpendToday += amount;

    const activeAg = state.fleet.find(a => a.id === state.activeAgent.id);
    if (activeAg) {
        activeAg.spentToday += amount;
        activeAg.lastAction = `${functionCalled} · ${targetName} (₹${amount.toLocaleString('en-IN')})`;
    }

    const opHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    state.userOps.unshift({
        id: `op-${Date.now()}`,
        userOpHash: `${opHash.slice(0, 8)}...${opHash.slice(-6)}`,
        timestamp: new Date().toLocaleTimeString(),
        targetName,
        targetAddress,
        functionCalled,
        amount,
        gasSponsored: true,
        gasCostUSD: 10.00,
        status: 'EXECUTED',
        validationResult: 'IN_POLICY',
        reason: `Autonomous in-policy payment: ${description}`,
        rawUserOp: {
            sender: state.smartAccountAddress,
            nonce: state.userOps.length + 1,
            callData: `0x${functionCalled.slice(0, 8)}...`,
            callGasLimit: '0x186a0',
            verificationGasLimit: '0x249f0',
            paymasterAndData: `${state.paymasterAddress}...`,
            signature: '0xAgentSignatureSecp256k1...'
        }
    });

    state.activityStream.unshift({
        id: `stream-${Date.now()}`,
        agentId: state.activeAgent.id,
        agentName: state.activeAgent.name,
        category: activeAg ? activeAg.category : 'finance',
        tag: activeAg ? activeAg.tag : 'AG',
        action: functionCalled.split('(')[0],
        vendor: targetName,
        amount,
        timeAgo: 'now',
        timestamp: Date.now()
    });

    writeWalletState(state);
    return { status: 'EXECUTED', reason: 'In-policy payment executed via ERC-4337 Smart Account', userOpHash: opHash };
}

export function toggleCardFreeze(): boolean {
    const state = readWalletState();
    state.virtualCard.isFrozen = !state.virtualCard.isFrozen;
    const action = state.virtualCard.isFrozen ? 'FROZEN' : 'ACTIVE';
    state.inboxMessages.unshift({
        id: `msg-${Date.now()}`,
        sender: 'Card Control System',
        subject: `Virtual Card ${action}`,
        body: `Agent virtual card ···· 1126 status changed to ${action} by Principal ${state.principal.name}.`,
        timestamp: 'Just now',
        unread: true,
        category: 'alert'
    });
    writeWalletState(state);
    return state.virtualCard.isFrozen;
}

export function approveQueuedAction(id: string): boolean {
    const state = readWalletState();
    const req = state.queuedApprovals.find(q => q.id === id);
    if (!req) return false;
    req.status = 'APPROVED';

    state.balances.usdc -= req.amount;
    state.dailySpent += req.amount;
    state.principal.totalFleetSpendToday += req.amount;

    const opHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    state.userOps.unshift({
        id: `op-appr-${Date.now()}`,
        userOpHash: `${opHash.slice(0, 8)}...${opHash.slice(-6)}`,
        timestamp: new Date().toLocaleTimeString(),
        targetName: req.targetName,
        targetAddress: req.targetAddress,
        functionCalled: req.actionName,
        amount: req.amount,
        gasSponsored: true,
        gasCostUSD: 10.00,
        status: 'EXECUTED',
        validationResult: 'OUT_OF_POLICY',
        reason: `Passkey Biometric Authorized by Principal ${state.principal.name}`,
        rawUserOp: {
            sender: state.smartAccountAddress,
            nonce: state.userOps.length + 1,
            callData: `0x${req.actionName.slice(0, 8)}...`,
            callGasLimit: '0x186a0',
            verificationGasLimit: '0x249f0',
            paymasterAndData: `${state.paymasterAddress}...`,
            signature: '0xOwnerPasskeyP256Sig...'
        }
    });

    state.queuedApprovals = state.queuedApprovals.filter(q => q.id !== id);
    writeWalletState(state);
    return true;
}

export function rejectQueuedAction(id: string): boolean {
    const state = readWalletState();
    const req = state.queuedApprovals.find(q => q.id === id);
    if (!req) return false;
    req.status = 'REJECTED';
    state.queuedApprovals = state.queuedApprovals.filter(q => q.id !== id);
    writeWalletState(state);
    return true;
}
