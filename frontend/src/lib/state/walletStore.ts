import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { SimulationReceipt } from './copilotTransactions';

export interface CardDetails {
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

export interface FleetAgentState {
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
    cardDetails: CardDetails;
}

export interface WalletState {
    simulatedTransactions?: SimulationReceipt[];
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
    virtualCard: CardDetails;
    fleet: FleetAgentState[];
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
    if (fs.existsSync(DATA_FILE_PATH)) { fs.chmodSync(DATA_FILE_PATH, 0o600); return DATA_FILE_PATH; }
    if (fs.existsSync(ALT_DATA_FILE_PATH)) { fs.chmodSync(ALT_DATA_FILE_PATH, 0o600); return ALT_DATA_FILE_PATH; }
    const rootData = path.resolve(process.cwd(), '../data');
    if (!fs.existsSync(rootData)) fs.mkdirSync(rootData, { recursive: true });
    const examplePath = path.join(rootData, 'wallet-state.example.json');
    if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, DATA_FILE_PATH, fs.constants.COPYFILE_EXCL);
        fs.chmodSync(DATA_FILE_PATH, 0o600);
    }
    return DATA_FILE_PATH;
}

export function readWalletState(): WalletState {
    const filePath = getDataPath();
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

export function writeWalletState(state: WalletState): void {
    const filePath = getDataPath();
    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
        fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), { encoding: 'utf-8', mode: 0o600 });
        fs.renameSync(tempPath, filePath);
    } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
}

export function withWalletStateLock<T>(work: () => T): T {
    const lockPath = `${getDataPath()}.lock`;
    const start = Date.now();
    while (true) {
        try {
            fs.mkdirSync(lockPath);
            break;
        } catch (error: any) {
            if (error.code !== 'EEXIST') throw error;
            if (Date.now() - start > 5000) throw new Error('Wallet state is busy');
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }
    }
    try {
        return work();
    } finally {
        fs.rmdirSync(lockPath);
    }
}

/**
 * Simulate an Agent Payment against local policy guardrails.
 */
function executeAgentPaymentUnlocked(
    targetName: string,
    targetAddress: string,
    functionCalled: string,
    amount: number,
    description: string,
    agentId?: string
): { status: 'EXECUTED' | 'QUEUED' | 'REVERTED'; reason: string; userOpHash?: string } {
    const state = readWalletState();
    const targetAgentId = agentId || state.activeAgent.id;
    const activeAg = state.fleet.find(a => a.id === targetAgentId);

    if (!activeAg || targetAgentId !== state.activeAgent.id || activeAg.status !== 'active') {
        return { status: 'REVERTED', reason: 'Agent is not the active authorized session' };
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > state.balances.usdc) {
        return { status: 'REVERTED', reason: 'Payment amount must be positive, finite, and within the available balance' };
    }
    if (typeof targetAddress !== 'string' || typeof functionCalled !== 'string') {
        return { status: 'REVERTED', reason: 'Invalid payment target or function' };
    }

    if (!state.activeAgent.sessionActive) {
        return { status: 'REVERTED', reason: 'Agent Session Key is Inactive/Revoked' };
    }

    if (Date.now() > state.activeAgent.sessionExpiresAt) {
        return { status: 'REVERTED', reason: 'Session has expired in local simulation' };
    }

    // 1. Check if THIS SPECIFIC AGENT'S virtual card is frozen
    const agentCard = activeAg.cardDetails || state.virtualCard;
    if (agentCard.isFrozen) {
        return {
            status: 'REVERTED',
            reason: `Virtual Debit Card (${agentCard.maskedNumber}) for ${activeAg.name} is currently FROZEN by Principal`
        };
    }

    // 2. Whitelist Check
    const isContractAllowed = state.policy.allowedContracts.some(c =>
        c.address.toLowerCase() === targetAddress.toLowerCase() &&
        c.selector.match(/\(([^)]+)\)/)?.[1] === functionCalled.split('(')[0]
    );
    const isRecipientAllowed = state.policy.allowedRecipients.some(
        r => r.toLowerCase() === targetAddress.toLowerCase()
    ) && functionCalled === 'transfer()';

    if (!isContractAllowed && !isRecipientAllowed) {
        return { status: 'REVERTED', reason: `Target address not allowlisted: ${targetAddress}` };
    }

    // 3. Per-Tx Cap Check (Scoped to active agent's policy)
    const maxPerTx = activeAg.maxPerTx ?? state.policy.maxPerTx;
    if (amount > maxPerTx) {
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds Per-Transaction Limit (₹${maxPerTx.toLocaleString('en-IN')})`;
        const approval = {
            id: `req-${randomUUID()}`,
            agent: activeAg.name,
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

    // 4. Daily Budget Check (Scoped to active agent's daily allocation)
    const dailyBudget = activeAg.dailyBudget ?? state.policy.dailyBudget;
    if (activeAg.spentToday + amount > dailyBudget) {
        const remaining = Math.max(0, dailyBudget - activeAg.spentToday);
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds 24h Remaining Budget (₹${remaining.toLocaleString('en-IN')} remaining of ₹${dailyBudget.toLocaleString('en-IN')})`;
        const approval = {
            id: `req-${randomUUID()}`,
            agent: activeAg.name,
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
    activeAg.spentToday += amount;
    if (activeAg.cardDetails) {
        activeAg.cardDetails.spentToday += amount;
    }
    activeAg.lastAction = `${functionCalled} · ${targetName} (₹${amount.toLocaleString('en-IN')})`;

    if (activeAg.id === state.activeAgent.id) {
        state.dailySpent = activeAg.spentToday;
        state.virtualCard.spentToday = activeAg.spentToday;
    }

    state.balances.usdc -= amount;
    state.principal.totalFleetSpendToday += amount;

    const opHash = `sim-${randomUUID()}`;
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
        reason: `Simulated in-policy payment: ${description}`,
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
        agentId: activeAg.id,
        agentName: activeAg.name,
        category: activeAg.category,
        tag: activeAg.tag,
        action: functionCalled.split('(')[0],
        vendor: targetName,
        amount,
        timeAgo: 'now',
        timestamp: Date.now()
    });

    writeWalletState(state);
    return { status: 'EXECUTED', reason: 'Payment simulated in local wallet state; no blockchain transaction was submitted', userOpHash: opHash };
}

/**
 * Toggle Virtual Card Freeze for a specific agent (defaults to active agent)
 */
function toggleCardFreezeUnlocked(agentId?: string): boolean {
    const state = readWalletState();
    const targetId = agentId || state.activeAgent.id;
    const ag = state.fleet.find(a => a.id === targetId) || state.fleet[0];

    if (ag && ag.cardDetails) {
        ag.cardDetails.isFrozen = !ag.cardDetails.isFrozen;
        const isFrozen = ag.cardDetails.isFrozen;
        const action = isFrozen ? 'FROZEN' : 'ACTIVE';

        if (ag.id === state.activeAgent.id) {
            state.virtualCard.isFrozen = isFrozen;
        }

        state.inboxMessages.unshift({
            id: `msg-${Date.now()}`,
            sender: 'Card Control System',
            subject: `Virtual Card ${action} (${ag.cardDetails.maskedNumber})`,
            body: `Agent ${ag.name} virtual card (${ag.cardDetails.maskedNumber}) status changed to ${action} by Principal ${state.principal.name}.`,
            timestamp: 'Just now',
            unread: true,
            category: 'alert'
        });

        writeWalletState(state);
        return isFrozen;
    }

    state.virtualCard.isFrozen = !state.virtualCard.isFrozen;
    writeWalletState(state);
    return state.virtualCard.isFrozen;
}

/**
 * Switch Active Fleet Agent & restore their specific card and policy state
 */
function switchActiveAgentUnlocked(agentId: string): WalletState {
    const state = readWalletState();
    const ag = state.fleet.find(a => a.id === agentId);
    if (ag) {
        state.activeAgent.id = ag.id;
        state.activeAgent.name = ag.name;
        state.activeAgent.address = ag.address;
        state.policy.dailyBudget = ag.dailyBudget;
        state.policy.maxPerTx = ag.maxPerTx || 50000;
        state.dailySpent = ag.spentToday;

        if (ag.cardDetails) {
            state.virtualCard = { ...ag.cardDetails };
        } else {
            state.virtualCard.holder = `${ag.name.toUpperCase()} / SAFEAGENT`;
            state.virtualCard.maskedNumber = ag.assignedCard;
            state.virtualCard.dailyLimit = ag.dailyBudget;
            state.virtualCard.spentToday = ag.spentToday;
        }

        writeWalletState(state);
    }
    return state;
}

function updateCardLimitUnlocked(limit: number, agentId?: string): void {
    if (!Number.isFinite(limit) || limit < 0) throw new Error('Invalid card limit');
    const state = readWalletState();
    const targetId = agentId || state.activeAgent.id;
    const ag = state.fleet.find(a => a.id === targetId);

    if (ag) {
        ag.dailyBudget = limit;
        if (ag.cardDetails) ag.cardDetails.dailyLimit = limit;
    }

    if (!agentId || agentId === state.activeAgent.id) {
        state.virtualCard.dailyLimit = limit;
        state.policy.dailyBudget = limit;
    }

    writeWalletState(state);
}

function approveQueuedActionUnlocked(id: string): boolean {
    const state = readWalletState();
    const req = state.queuedApprovals.find(q => q.id === id);
    if (!req || req.status !== 'PENDING' || !Number.isFinite(req.amount) || req.amount <= 0 || req.amount > state.balances.usdc) return false;
    req.status = 'APPROVED';

    state.balances.usdc -= req.amount;
    const spendingAgent = state.fleet.find(agent => agent.name === req.agent);
    if (spendingAgent) {
        spendingAgent.spentToday += req.amount;
        spendingAgent.cardDetails.spentToday += req.amount;
        if (spendingAgent.id === state.activeAgent.id) {
            state.dailySpent = spendingAgent.spentToday;
            state.virtualCard.spentToday = spendingAgent.spentToday;
        }
    } else {
        state.dailySpent += req.amount;
    }
    state.principal.totalFleetSpendToday += req.amount;

    const opHash = `sim-${randomUUID()}`;
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
        reason: `Owner approved local simulation; no blockchain transaction was submitted`,
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

function rejectQueuedActionUnlocked(id: string): boolean {
    const state = readWalletState();
    const req = state.queuedApprovals.find(q => q.id === id);
    if (!req || req.status !== 'PENDING') return false;
    req.status = 'REJECTED';
    state.queuedApprovals = state.queuedApprovals.filter(q => q.id !== id);
    writeWalletState(state);
    return true;
}

function queueAgentApprovalUnlocked(targetName: string, targetAddress: string, amount: number, reason: string): string {
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER) throw new Error('Invalid approval amount');
    if (typeof targetName !== 'string' || !targetName.trim() || typeof targetAddress !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(targetAddress)) throw new Error('Invalid approval target');
    const state = readWalletState();
    const id = `req-${randomUUID()}`;
    state.queuedApprovals.unshift({
        id, agent: state.activeAgent.name, targetName, targetAddress, amount,
        actionName: 'ownerOverride', reason: String(reason || 'Owner approval requested').slice(0, 1000),
        timestamp: new Date().toISOString(), status: 'PENDING'
    });
    writeWalletState(state);
    return id;
}

function setCardFrozenUnlocked(agentId: string, frozen: boolean): WalletState {
    if (typeof frozen !== 'boolean') throw new Error('Invalid card state');
    const state = readWalletState();
    const agent = state.fleet.find(item => item.id === agentId);
    if (!agent) throw new Error('Unknown agent');
    if (agent.cardDetails.isFrozen !== frozen) {
        toggleCardFreezeUnlocked(agentId);
        return readWalletState();
    }
    return state;
}

export const executeAgentPayment = (...args: Parameters<typeof executeAgentPaymentUnlocked>) => withWalletStateLock(() => executeAgentPaymentUnlocked(...args));
export const toggleCardFreeze = (...args: Parameters<typeof toggleCardFreezeUnlocked>) => withWalletStateLock(() => toggleCardFreezeUnlocked(...args));
export const switchActiveAgent = (...args: Parameters<typeof switchActiveAgentUnlocked>) => withWalletStateLock(() => switchActiveAgentUnlocked(...args));
export const updateCardLimit = (...args: Parameters<typeof updateCardLimitUnlocked>) => withWalletStateLock(() => updateCardLimitUnlocked(...args));
export const approveQueuedAction = (...args: Parameters<typeof approveQueuedActionUnlocked>) => withWalletStateLock(() => approveQueuedActionUnlocked(...args));
export const rejectQueuedAction = (...args: Parameters<typeof rejectQueuedActionUnlocked>) => withWalletStateLock(() => rejectQueuedActionUnlocked(...args));
export const queueAgentApproval = (...args: Parameters<typeof queueAgentApprovalUnlocked>) => withWalletStateLock(() => queueAgentApprovalUnlocked(...args));
export const setCardFrozen = (...args: Parameters<typeof setCardFrozenUnlocked>) => withWalletStateLock(() => setCardFrozenUnlocked(...args));
