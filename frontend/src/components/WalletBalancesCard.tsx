'use client';

import React from 'react';
import { ArrowUpRight, Clock3, LockKeyhole, Wallet2 } from 'lucide-react';
import { AgentWalletClient, formatINR } from '../lib/web3/agentWalletClient';

interface WalletBalancesCardProps {
    wallet: AgentWalletClient;
    onRevokeKey: () => void;
}

export const WalletBalancesCard: React.FC<WalletBalancesCardProps> = ({ wallet, onRevokeKey }) => {
    const dailyBudgetPct = wallet.policy.dailyBudget > 0 ? Math.min(100, (wallet.dailySpent / wallet.policy.dailyBudget) * 100) : 0;
    const remainingBudget = Math.max(0, wallet.policy.dailyBudget - wallet.dailySpent);

    return (
        <section className="overflow-hidden rounded-[28px] bg-[#123b32] text-white shadow-[0_20px_50px_-30px_rgba(13,54,43,.65)]">
            <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
                <div className="relative px-6 py-7 sm:px-9 sm:py-9 lg:px-10">
                    <div className="pointer-events-none absolute -right-16 -top-32 h-80 w-80 rounded-full border border-white/10" />
                    <div className="pointer-events-none absolute -right-5 -top-20 h-64 w-64 rounded-full border border-white/10" />
                    <div className="relative">
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-100/80"><Wallet2 className="h-4 w-4" /> Treasury balance</div>
                        <div className="mt-5 font-serif text-5xl font-medium tracking-[-0.05em] sm:text-6xl">{formatINR(wallet.usdcBalance)}</div>
                        <p className="mt-3 text-sm text-emerald-100/75">Simulated account balance <span className="px-2 text-white/30">·</span> {wallet.ethBalance} ETH for network fees</p>
                        <div className="mt-9 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15"><span className="h-1.5 w-1.5 rounded-full bg-[#a8e5be]" /> {wallet.agentName} selected</span>
                            <span className="text-xs text-emerald-100/70">Smart account · ERC-4337</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="bg-[#19473d] px-6 py-6 sm:px-8 lg:px-9">
                        <div className="flex items-start justify-between gap-4">
                            <div><p className="text-xs font-medium text-emerald-100/70">Available in 24h budget</p><p className="mt-2 text-2xl font-semibold tracking-tight">{formatINR(remainingBudget)}</p></div>
                            <ArrowUpRight className="h-4 w-4 text-emerald-100/60" />
                        </div>
                        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#b8e3c5]" style={{ width: `${dailyBudgetPct}%` }} /></div>
                        <p className="mt-2 text-xs text-emerald-100/65">{formatINR(wallet.dailySpent)} used of {formatINR(wallet.policy.dailyBudget)}</p>
                    </div>
                    <div className="bg-[#19473d] px-6 py-6 sm:px-8 lg:px-9">
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-100/70"><Clock3 className="h-4 w-4" /> Agent access</div>
                        <p className="mt-2 text-lg font-semibold">{wallet.agentName}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate font-mono text-xs text-emerald-100/65">{wallet.agentAddress.slice(0, 10)}…{wallet.agentAddress.slice(-4)}</span>
                            <button onClick={onRevokeKey} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/25 px-2.5 py-1.5 text-xs font-medium transition hover:bg-white/10" title="Revoke the selected agent key"><LockKeyhole className="h-3.5 w-3.5" /> Revoke key</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
