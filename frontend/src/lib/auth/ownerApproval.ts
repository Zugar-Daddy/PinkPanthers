import { createHash } from 'crypto';
import type { WalletState } from '../state/walletStore';
import type { OwnerIntent } from './types';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function normalizeIntent(input: any): OwnerIntent {
    if (input?.kind === 'policy_update') {
        const { agentId, dailyBudget, maxPerTx, sessionExpiryHours } = input;
        if (typeof agentId !== 'string' || !agentId || agentId.length > 100 || ![dailyBudget,maxPerTx,sessionExpiryHours].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0) || maxPerTx > dailyBudget || sessionExpiryHours > 720 || dailyBudget > Number.MAX_SAFE_INTEGER / 100) throw new Error('Invalid policy limits');
        return { kind: 'policy_update', agentId, dailyBudget, maxPerTx, sessionExpiryHours };
    }
    if (input?.kind === 'card_limit' && typeof input.agentId === 'string' && input.agentId.length > 0 && input.agentId.length <= 100 && typeof input.limit === 'number' && Number.isFinite(input.limit) && input.limit >= 0 && input.limit <= Number.MAX_SAFE_INTEGER / 100) return { kind: 'card_limit', agentId: input.agentId, limit: input.limit };
    if (input?.kind === 'transaction_override' && typeof input.token === 'string' && input.token.length > 20 && input.token.length <= 12000) return { kind: input.kind, token: input.token };
    if (input?.kind === 'queued_approval') {
        const { id, amount, recipient, agent, action } = input;
        if (typeof id !== 'string' || !id || id.length > 150 || ![recipient, agent, action].every(value => typeof value === 'string' && value.length > 0 && value.length <= 2000) || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new Error('Invalid queued approval details');
        return { kind: 'queued_approval', id, amount, recipient, agent, action };
    }
    throw new Error('Invalid owner approval action');
}
export const intentHash = (intent: OwnerIntent) => hash(JSON.stringify(normalizeIntent(intent)));
/** Consume in the SAME locked state write as the authorized mutation. */
export function consumeOwnerApproval(state: WalletState, proof: unknown, intent: OwnerIntent) {
    if (typeof proof !== 'string' || proof.length > 200) throw Object.assign(new Error('Owner passkey verification is required'), { status: 403 });
    const approval = state.ownerSecurity?.approvals.find(a => a.hash === hash(proof) && a.intentHash === intentHash(intent) && !a.used && a.expiresAt > Date.now());
    if (!approval) throw Object.assign(new Error('Owner approval is invalid, expired, already used, or for a different action'), { status: 403 });
    approval.used = true;
}
