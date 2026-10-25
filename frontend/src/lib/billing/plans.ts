export type PlanId = 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type GasRefill = { id: string; amount: number; surcharge: number; balanceAfter: number; createdAt: string; status: 'SIMULATED' };
export type BillingState = { plan: PlanId; cycle: BillingCycle; selectedAt?: string; refills: GasRefill[] };
export const REFILL_AMOUNTS = [1000, 5000, 10000] as const;
export const PLANS = {
    starter: { name: 'Starter / Developer', monthly: 4999, annual: 49990, gas: 1500, gateway: 150, agents: 3,
        features: ['Up to 3 autonomous agents', 'Basic policy templates', 'Standard execution speed'] },
    growth: { name: 'Growth / Business', monthly: 19999, annual: 199990, gas: 7000, gateway: 599, agents: 15,
        features: ['Up to 15 autonomous agents', 'Custom PolicyEngine guardrails', 'High-frequency agent execution', '3-of-5 guardian social recovery', 'Sub-key rotation manager'] },
    enterprise: { name: 'Enterprise Sovereign', features: ['Unlimited fleet agents', 'Dedicated Paymaster smart contracts', 'Custom Razorpay corporate routing', 'Biometric TouchID passkey escalation queue', 'Private RPC nodes', '99.9% SLA target'] }
} as const;
export function economics(plan: 'starter' | 'growth', cycle: BillingCycle) {
    const p = PLANS[plan];
    const price = cycle === 'annual' ? p.annual : p.monthly;
    const gas = p.gas * (cycle === 'annual' ? 12 : 1);
    const gateway = p.gateway * (cycle === 'annual' ? 10 : 1);
    return { price, gas, gateway, platform: price - gas - gateway, savings: p.monthly * 12 - p.annual };
}
export const estimatedActions = (amount: number) => Math.floor(amount * 15);
export function gasMode(gwei: number): 'normal' | 'elevated' | 'congested' {
    return gwei < 15 ? 'normal' : gwei > 50 ? 'congested' : 'elevated';
}
export function waterfall(spend: number) {
    const treasury = Math.round(spend * 100 * .825);
    const platform = Math.round(spend * 100 * .115);
    const external = Math.round(spend * 100 * .038);
    return [treasury, platform, external, Math.round(spend * 100) - treasury - platform - external].map(value => value / 100);
}
