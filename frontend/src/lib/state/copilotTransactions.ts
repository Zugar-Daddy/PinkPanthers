import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { readWalletState, withWalletStateLock, writeWalletState, WalletState } from './walletStore';

export type TransactionQuote = {
    id: string; kind: 'PURCHASE' | 'TRANSFER'; agentId: string; title: string; recipient: string;
    amountMinor: number; currency: 'INR'; quantity: number; sourceUrl?: string; researchedAt?: string;
    expiresAt: number;
};
export type SimulationReceipt = TransactionQuote & {
    status: 'SIMULATED'; completedAt: string; balanceAfter: number; fingerprint: string;
};
const TTL = 5 * 60 * 1000;
const devSecrets = globalThis as typeof globalThis & { __safeAgentDevSigningSecret?: string };
function secret() {
    const value = process.env.WALLET_ADMIN_TOKEN;
    if (value) return value;
    if (process.env.NODE_ENV === 'development') {
        return devSecrets.__safeAgentDevSigningSecret ||= randomBytes(32).toString('hex');
    }
    throw new Error('Wallet authentication must be configured before simulated checkout');
}
function digest(value: string) { return createHmac('sha256', secret()).update(value).digest('hex'); }
export function minorUnits(amount: number): number {
    const minor = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(minor) || minor <= 0 || Math.abs(amount * 100 - minor) > 0.00001) throw new Error('Amount must be positive INR with at most two decimal places');
    return minor;
}
export function commandId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(value);
}
export function signQuote(input: Omit<TransactionQuote, 'id' | 'expiresAt'>, requestId: string, query: string, option: number) {
    if (!commandId(requestId)) throw new Error('A valid command ID is required');
    const quote: TransactionQuote = { ...input, id: `sim-${digest(JSON.stringify([requestId, query, option])).slice(0, 32)}`, expiresAt: Date.now() + TTL };
    const payload = Buffer.from(JSON.stringify(quote)).toString('base64url');
    return { quote, token: `${payload}.${digest(payload)}` };
}
function readQuote(token: unknown): TransactionQuote {
    if (typeof token !== 'string' || token.length > 12000) throw new Error('Invalid transaction quote');
    const [payload, signature, extra] = token.split('.');
    const expected = digest(payload || '');
    if (extra || !signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid transaction signature');
    const quote = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!['PURCHASE', 'TRANSFER'].includes(quote.kind) || quote.currency !== 'INR' || !Number.isSafeInteger(quote.amountMinor) || quote.amountMinor <= 0 || !Number.isInteger(quote.quantity) || quote.quantity < 1 || quote.quantity > 100 || !Number.isFinite(quote.expiresAt)) throw new Error('Invalid transaction quote');
    return quote;
}

/** A local ledger entry only: never sends money, merchant orders, or blockchain calls. */
export function executeSimulation(token: unknown): SimulationReceipt {
    const quote = readQuote(token);
    // Exclude validity window: retries may refresh a quote, but may never change its financial terms.
    const { expiresAt, researchedAt, ...terms } = quote;
    const fingerprint = digest(JSON.stringify(terms));
    return withWalletStateLock(() => {
        const state = readWalletState();
        const existing = state.simulatedTransactions?.find(item => item.id === quote.id);
        if (existing) {
            if (existing.fingerprint !== fingerprint) throw new Error('This command already completed with different terms. Start a new request.');
            return existing;
        }
        if (Date.now() > expiresAt) throw new Error('This quote expired. Refresh prices before buying.');
        const agent = state.fleet.find(item => item.id === quote.agentId);
        if (!agent || agent.id !== state.activeAgent.id) throw new Error('Selected agent session changed. Run the request again for the current agent.');
        if (agent.status !== 'active') throw new Error('The selected agent is paused or provisioning. Select an active agent session before spending.');
        if (!state.activeAgent.sessionActive || !Number.isFinite(state.activeAgent.sessionExpiresAt) || Date.now() >= state.activeAgent.sessionExpiresAt) throw new Error('Agent session expired or inactive. Use Renew session in the copilot, then retry the transaction.');
        const card = agent.cardDetails || state.virtualCard;
        if (card.isFrozen || state.virtualCard.isFrozen) throw new Error('The selected agent card is frozen');
        const balance = Math.round(state.balances.usdc * 100);
        if (!Number.isSafeInteger(balance) || quote.amountMinor > balance) throw new Error('Insufficient simulated wallet balance');
        const amount = quote.amountMinor / 100;
        const limits = [agent.maxPerTx, state.policy.maxPerTx, agent.dailyBudget, state.policy.dailyBudget, card.dailyLimit, agent.spentToday, card.spentToday];
        if (limits.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Wallet spending policy is invalid');
        if (amount > Math.min(agent.maxPerTx, state.policy.maxPerTx)) throw new Error('Transaction exceeds the per-transaction limit. Update the agent policy to authorize this amount.');
        if (Math.round(agent.spentToday * 100) + quote.amountMinor > Math.round(Math.min(agent.dailyBudget, state.policy.dailyBudget) * 100) || Math.round(card.spentToday * 100) + quote.amountMinor > Math.round(card.dailyLimit * 100)) throw new Error('Transaction exceeds the remaining daily budget or card limit');
        state.balances.usdc = (balance - quote.amountMinor) / 100;
        agent.spentToday = (Math.round(agent.spentToday * 100) + quote.amountMinor) / 100;
        card.spentToday = (Math.round(card.spentToday * 100) + quote.amountMinor) / 100;
        state.dailySpent = agent.spentToday;
        state.virtualCard.spentToday = card.spentToday;
        state.principal.totalFleetSpendToday = (Math.round(state.principal.totalFleetSpendToday * 100) + quote.amountMinor) / 100;
        agent.lastAction = `Simulated ${quote.kind.toLowerCase()} · ${quote.title}`;
        const receipt: SimulationReceipt = { ...quote, status: 'SIMULATED', completedAt: new Date().toISOString(), balanceAfter: state.balances.usdc, fingerprint };
        (state.simulatedTransactions ||= []).unshift(receipt);
        state.userOps.unshift({
            id: quote.id, userOpHash: quote.id, timestamp: receipt.completedAt, targetName: quote.title,
            targetAddress: quote.sourceUrl || quote.recipient, functionCalled: quote.kind === 'PURCHASE' ? 'simulatedPurchase()' : 'simulatedTransfer()',
            amount, gasSponsored: false, gasCostUSD: 0, status: 'EXECUTED', validationResult: 'IN_POLICY',
            reason: `Simulation only: ${quote.quantity} × ${quote.title}. No real order, booking, or funds transfer. Receipt ${quote.id}.`,
            rawUserOp: { sender: state.smartAccountAddress, nonce: state.userOps.length + 1, callData: '0x', callGasLimit: '0x0', verificationGasLimit: '0x0', paymasterAndData: '0x', signature: '0x' }
        });
        state.activityStream.unshift({ id: quote.id, agentId: agent.id, agentName: agent.name, category: agent.category, tag: agent.tag,
            action: `Simulated ${quote.kind.toLowerCase()}`, vendor: quote.recipient, amount, timeAgo: 'now', timestamp: Date.now() });
        state.inboxMessages.unshift({ id: quote.id, sender: 'Simulated wallet', subject: `Simulated ${quote.kind.toLowerCase()} receipt`,
            body: `${quote.title} · ₹${amount.toFixed(2)} deducted from simulated balance. Recipient: ${quote.recipient}. Receipt: ${quote.id}. No real order, booking, or funds transfer.`, timestamp: receipt.completedAt, unread: true, category: 'receipt' });
        writeWalletState(state);
        return receipt;
    });
}

const prefix = '(?:(?:please|can you|could you|i want you to)\\s+)?';
export function purchaseRequested(query: string) { return new RegExp(`^${prefix}(?:buy|purchase|order|book)\\b`, 'i').test(query.trim()); }
export function transferRequested(query: string) { return new RegExp(`^${prefix}(?:transfer|send|pay)\\b`, 'i').test(query.trim()); }
/** Parse only explicit amounts and recipients, with no model-invented payment destinations. */
export function transferPlan(query: string, state: WalletState, requestId?: string, preview = false) {
    if (!transferRequested(query)) return null;
    const match = query.match(new RegExp(`^${prefix}(?:transfer|send|pay)\\s+(?:(?:₹|INR|Rs\\.?)\\s*)?(\\d[\\d,]*(?:\\.\\d{1,2})?)\\s*(?:(?:INR|rupees)\\s+)?to\\s+(.+?)\\s*[.!]?$`, 'i'));
    const missing = 'Specify one amount and recipient, for example “transfer ₹500 to alex@upi” or “send ₹500 to 0x…”. Only simulated INR is supported.';
    if (!match) return { action: 'TRANSFER', summary: missing, options: [], missingDetails: [missing], researchedAt: null };
    const amount = Number(match[1].replace(/,/g, ''));
    const supplied = match[2].trim();
    const member = state.fleet.find(agent => agent.name.toLowerCase() === supplied.toLowerCase());
    const recipient = member?.address || supplied;
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient) && !/^[a-zA-Z0-9._-]{2,100}@[a-zA-Z][a-zA-Z0-9.-]{1,60}$/.test(recipient)) return { action: 'TRANSFER', summary: missing, options: [], missingDetails: ['Use a complete wallet address, UPI ID, or an exact fleet agent name.'], researchedAt: null };
    const amountMinor = minorUnits(amount);
    const transaction = requestId ? signQuote({ kind: 'TRANSFER', agentId: state.activeAgent.id, title: `Transfer to ${supplied}`, recipient, amountMinor, quantity: 1, currency: 'INR' }, requestId, query, 0) : undefined;
    return { action: 'TRANSFER', summary: `Simulated transfer of ₹${amount.toFixed(2)} to ${supplied}.`, options: [], missingDetails: [], researchedAt: null, transaction, autoExecute: !preview && !!transaction };
}

export function attachPurchaseQuotes(plan: any, query: string, state: WalletState, requestId?: string, preview = false) {
    if (plan.action !== 'RESEARCH' || !requestId) return plan;
    // One listing is one sale unit (e.g. a pack, service plan or ticket). Never guess a multiplier.
    const options = plan.options.map((item: any, index: number) => {
        if (item.price === null || item.currency !== 'INR') return item;
        let amountMinor;
        try { amountMinor = minorUnits(item.price); } catch { return item; }
        const transaction = signQuote({ kind: 'PURCHASE', agentId: state.activeAgent.id, title: item.title, recipient: item.merchant, amountMinor, quantity: 1, currency: 'INR', sourceUrl: item.url, researchedAt: plan.researchedAt }, requestId, query, index);
        return { ...item, transaction };
    });
    const cap = query.match(/(?:under|up to|maximum|max|less than|budget(?: of)?)\s*(₹|INR|Rs\.?|\$|USD|€|EUR|£|GBP)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(INR|USD|EUR|GBP)?/i);
    const withinCap = !cap || (!/USD|EUR|GBP|\$|€|£/i.test(`${cap[1] || ''}${cap[3] || ''}`) && options[0]?.price <= Number(cap[2].replace(/,/g, '')));
    const autoExecute = !preview && purchaseRequested(query) && plan.readyToBuy === true && !plan.missingDetails.length && !!options[0]?.transaction && withinCap;
    return { ...plan, options, autoExecute, transaction: autoExecute ? options[0].transaction : undefined };
}
