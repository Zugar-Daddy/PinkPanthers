export type OwnerIntent =
    | { kind: 'policy_update'; agentId: string; dailyBudget: number; maxPerTx: number; sessionExpiryHours: number }
    | { kind: 'card_limit'; agentId: string; limit: number }
    | { kind: 'transaction_override'; token: string }
    | { kind: 'queued_approval'; id: string; amount: number; recipient: string; agent: string; action: string };
export type OwnerSecurity = {
    credential?: { id: string; publicKey: string; counter: number; rpId: string; userId: string };
    challenges: { id: string; challenge: string; type: 'register' | 'authenticate'; origin: string; rpId: string; expiresAt: number; intent?: OwnerIntent; userId: string }[];
    approvals: { hash: string; intentHash: string; expiresAt: number; used?: boolean }[];
};
