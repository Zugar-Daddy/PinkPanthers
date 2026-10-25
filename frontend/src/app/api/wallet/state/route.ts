import { NextRequest, NextResponse } from 'next/server';
import { consumeOwnerApproval, normalizeIntent } from '../../../../lib/auth/ownerApproval';
import {
    readWalletState,
    publicWalletState,
    writeWalletState,
    executeAgentPayment,
    toggleCardFreeze,
    switchActiveAgent,
    updateCardLimit,
    approveQueuedAction,
    rejectQueuedAction,
    withWalletStateLock,
    setCardFrozen,
    renewAgentSession
} from '../../../../lib/state/walletStore';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const state = readWalletState();
        return NextResponse.json({ success: true, state: publicWalletState(state) });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Failed to read state' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, payload } = body;

        switch (action) {
            case 'renew_session': {
                if (typeof payload?.agentId !== 'string') return NextResponse.json({ success: false, error: 'Select an agent to renew' }, { status: 400 });
                try {
                    return NextResponse.json({ success: true, state: publicWalletState(renewAgentSession(payload.agentId)) });
                } catch (error: any) {
                    return NextResponse.json({ success: false, error: error?.message || 'Session renewal failed' }, { status: 409 });
                }
            }
            case 'submit_payment': {
                const { targetName, targetAddress, functionCalled, amount, description, agentId } = payload;
                const result = executeAgentPayment(targetName, targetAddress, functionCalled, amount, description, agentId);
                const updatedState = readWalletState();
                return NextResponse.json({ success: true, result, state: publicWalletState(updatedState) });
            }

            case 'toggle_freeze': {
                const { agentId } = payload || {};
                const isFrozen = toggleCardFreeze(agentId);
                const updatedState = readWalletState();
                return NextResponse.json({ success: true, isFrozen, state: publicWalletState(updatedState) });
            }

            case 'set_card_frozen': {
                const { agentId, frozen } = payload || {};
                if (typeof agentId !== 'string' || typeof frozen !== 'boolean') {
                    return NextResponse.json({ success: false, error: 'Invalid card control request' }, { status: 400 });
                }
                const state = setCardFrozen(agentId, frozen);
                return NextResponse.json({ success: true, state: publicWalletState(state) });
            }

            case 'approve_queued': {
                const { id, ownerProof } = payload;
                const ok = approveQueuedAction(id, ownerProof);
                const updatedState = readWalletState();
                return NextResponse.json({ success: ok, state: publicWalletState(updatedState) });
            }

            case 'reject_queued': {
                const { id } = payload;
                const ok = rejectQueuedAction(id);
                const updatedState = readWalletState();
                return NextResponse.json({ success: ok, state: publicWalletState(updatedState) });
            }

            case 'switch_agent': {
                const { agentId } = payload;
                const updatedState = switchActiveAgent(agentId);
                return NextResponse.json({ success: true, state: publicWalletState(updatedState) });
            }

            case 'update_policy': {
                const { dailyBudget, maxPerTx, sessionExpiryHours, agentId, ownerProof } = payload;
                if (![dailyBudget, maxPerTx, sessionExpiryHours].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0) || maxPerTx > dailyBudget || sessionExpiryHours > 24 * 30) {
                    return NextResponse.json({ success: false, error: 'Invalid policy limits' }, { status: 400 });
                }
                const updated = withWalletStateLock(() => {
                    const current = readWalletState();
                    if (agentId !== current.activeAgent.id) throw new Error('Selected agent changed. Reopen policy settings.');
                    consumeOwnerApproval(current, ownerProof, normalizeIntent({ kind: 'policy_update', agentId, dailyBudget, maxPerTx, sessionExpiryHours }));
                    current.policy.dailyBudget = dailyBudget;
                    current.policy.maxPerTx = maxPerTx;
                    current.policy.sessionExpiryHours = sessionExpiryHours;
                    current.virtualCard.dailyLimit = dailyBudget;
                    current.activeAgent.sessionActive = true;
                    current.activeAgent.sessionExpiresAt = Date.now() + sessionExpiryHours * 3600 * 1000;
                    const activeAg = current.fleet.find(a => a.id === current.activeAgent.id);
                    if (activeAg) {
                        activeAg.dailyBudget = dailyBudget;
                        activeAg.maxPerTx = maxPerTx;
                        if (activeAg.cardDetails) activeAg.cardDetails.dailyLimit = dailyBudget;
                    }
                    writeWalletState(current);
                    return current;
                });
                return NextResponse.json({ success: true, state: publicWalletState(updated) });
            }

            case 'revoke_key': {
                const state = withWalletStateLock(() => {
                    const current = readWalletState();
                    current.activeAgent.sessionActive = false;
                    writeWalletState(current);
                    return current;
                });
                return NextResponse.json({ success: true, state: publicWalletState(state) });
            }

            case 'mark_read': {
                const state = withWalletStateLock(() => {
                    const current = readWalletState();
                    current.inboxMessages.forEach(m => m.unread = false);
                    writeWalletState(current);
                    return current;
                });
                return NextResponse.json({ success: true, state: publicWalletState(state) });
            }

            case 'update_card_limit': {
                const { limit, agentId, ownerProof } = payload;
                updateCardLimit(limit, agentId, ownerProof);
                const updatedState = readWalletState();
                return NextResponse.json({ success: true, state: publicWalletState(updatedState) });
            }

            default:
                return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: e?.status === 403 ? 403 : 500 });
    }
}
