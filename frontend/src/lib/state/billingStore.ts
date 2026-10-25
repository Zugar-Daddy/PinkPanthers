import { readWalletState, writeWalletState, withWalletStateLock } from './walletStore';
import { BillingState, BillingCycle, PlanId, REFILL_AMOUNTS, GasRefill } from '../billing/plans';
const initial = (): BillingState => ({ plan: 'starter', cycle: 'monthly', refills: [] });
export function readBilling(): BillingState { return readWalletState().billing || initial(); }
export function selectDemoPlan(plan: PlanId, cycle: BillingCycle) {
    if (!['starter', 'growth', 'enterprise'].includes(plan) || !['monthly', 'annual'].includes(cycle)) throw new Error('Select a valid plan and billing period');
    return withWalletStateLock(() => {
        const state = readWalletState();
        const billing = state.billing || initial();
        state.billing = { ...billing, plan, cycle: plan === 'enterprise' ? 'annual' : cycle, selectedAt: new Date().toISOString() };
        writeWalletState(state);
        return state.billing;
    });
}
export function refillGasTank(amount: number, id: string): GasRefill {
    if (!(REFILL_AMOUNTS as readonly number[]).includes(amount)) throw new Error('Choose a refill of INR 1,000, 5,000 or 10,000');
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(id)) throw new Error('Invalid refill request ID');
    return withWalletStateLock(() => {
        const state = readWalletState();
        const billing = state.billing || initial();
        const previous = billing.refills.find(refill => refill.id === id);
        if (previous) {
            if (previous.amount !== amount) throw new Error('This refill ID was already used for a different amount');
            return previous;
        }
        const current = Math.round(state.balances.paymasterGasTankINR * 100);
        const next = current + amount * 100;
        if (!Number.isFinite(state.balances.paymasterGasTankINR) || current < 0 || !Number.isSafeInteger(next)) throw new Error('Gas tank balance is invalid or too large');
        const receipt: GasRefill = { id, amount, surcharge: 0, balanceAfter: next / 100, createdAt: new Date().toISOString(), status: 'SIMULATED' };
        state.balances.paymasterGasTankINR = receipt.balanceAfter;
        billing.refills.unshift(receipt); state.billing = billing;
        state.inboxMessages.unshift({ id: `gas-${id}`, sender: 'SafeAgent gas tank', subject: `Simulated UPI refill: INR ${amount.toLocaleString('en-IN')}`,
            body: `Added INR ${amount.toLocaleString('en-IN')} to the simulated gas tank. UPI surcharge: INR 0.00. No real UPI charge or on-chain deposit. Reference: ${id}.`, timestamp: receipt.createdAt, unread: true, category: 'receipt' });
        state.activityStream.unshift({ id: `gas-${id}`, agentId: 'treasury', agentName: 'Treasury', category: 'finance', tag: 'GAS', action: 'Simulated gas tank refill', vendor: 'UPI demo', amount, timeAgo: 'now', timestamp: Date.now() });
        writeWalletState(state);
        return receipt;
    });
}
