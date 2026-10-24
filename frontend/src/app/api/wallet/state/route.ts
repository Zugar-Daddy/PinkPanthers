import { NextRequest, NextResponse } from 'next/server';
import {
    readWalletState,
    writeWalletState,
    executeAgentPayment,
    toggleCardFreeze,
    switchActiveAgent,
    updateCardLimit,
    approveQueuedAction,
    rejectQueuedAction
} from '../../../../lib/state/walletStore';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const state = readWalletState();
        return NextResponse.json({ success: true, state });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Failed to read state' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, payload } = body;

        switch (action) {
            case 'submit_payment': {
                const { targetName, targetAddress, functionCalled, amount, description, agentId } = payload;
                const result = executeAgentPayment(targetName, targetAddress, functionCalled, amount, description, agentId);
                const updatedState = readWalletState();
                return NextResponse.json({ success: true, result, state: updatedState });
            }

            case 'toggle_freeze': {
                const { agentId } = payload || {};
                const isFrozen = toggleCardFreeze(agentId);
                const updatedState = readWalletState();
                return NextResponse.json({ success: true, isFrozen, state: updatedState });
            }

            case 'approve_queued': {
                const { id } = payload;
                const ok = approveQueuedAction(id);
                const updatedState = readWalletState();
                return NextResponse.json({ success: ok, state: updatedState });
            }

            case 'reject_queued': {
                const { id } = payload;
                const ok = rejectQueuedAction(id);
                const updatedState = readWalletState();
                return NextResponse.json({ success: ok, state: updatedState });
            }

            case 'switch_agent': {
                const { agentId } = payload;
                const updatedState = switchActiveAgent(agentId);
                return NextResponse.json({ success: true, state: updatedState });
            }

            case 'update_policy': {
                const { dailyBudget, maxPerTx, sessionExpiryHours } = payload;
                const state = readWalletState();
                state.policy.dailyBudget = dailyBudget;
                state.policy.maxPerTx = maxPerTx;
                state.policy.sessionExpiryHours = sessionExpiryHours;
                state.activeAgent.sessionActive = true;
                state.activeAgent.sessionExpiresAt = Date.now() + sessionExpiryHours * 3600 * 1000;
                const activeAg = state.fleet.find(a => a.id === state.activeAgent.id);
                if (activeAg) {
                    activeAg.dailyBudget = dailyBudget;
                    activeAg.maxPerTx = maxPerTx;
                    if (activeAg.cardDetails) activeAg.cardDetails.dailyLimit = dailyBudget;
                }
                writeWalletState(state);
                return NextResponse.json({ success: true, state });
            }

            case 'revoke_key': {
                const state = readWalletState();
                state.activeAgent.sessionActive = false;
                writeWalletState(state);
                return NextResponse.json({ success: true, state });
            }

            case 'mark_read': {
                const state = readWalletState();
                state.inboxMessages.forEach(m => m.unread = false);
                writeWalletState(state);
                return NextResponse.json({ success: true, state });
            }

            case 'update_card_limit': {
                const { limit, agentId } = payload;
                updateCardLimit(limit, agentId);
                const updatedState = readWalletState();
                return NextResponse.json({ success: true, state: updatedState });
            }

            default:
                return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
    }
}
