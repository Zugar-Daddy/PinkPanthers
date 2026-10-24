'use client';

import React from 'react';
import { DollarSign, Clock, ShieldCheck, Trash2, Coins, ArrowUpRight } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface WalletBalancesCardProps {
    wallet: AgentWalletClient;
    onRevokeKey: () => void;
}

export const WalletBalancesCard: React.FC<WalletBalancesCardProps> = ({ wallet, onRevokeKey }) => {
    const dailyBudgetPct = (wallet.dailySpent / wallet.policy.dailyBudget) * 100;
    const remainingBudget = Math.max(0, wallet.policy.dailyBudget - wallet.dailySpent);

    return (
        <div className="bg-white border-3 border-black rounded-2xl p-6 sm:p-8 shadow-brutal-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
                
                {/* 1. Primary Treasury Balances */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-neoSky border-2 border-black px-3 py-1 rounded-full font-black text-xs uppercase shadow-brutal-sm text-zinc-900">
                        <Coins className="w-3.5 h-3.5" />
                        <span>Smart Account Treasury</span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-3 pt-1">
                        <div className="text-4xl sm:text-5xl font-black text-zinc-950 font-mono tracking-tight">
                            ${wallet.usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-black bg-neoMint border-2 border-black px-2.5 py-1 rounded-lg uppercase tracking-wide text-emerald-950 shadow-brutal-sm font-mono">
                            USDC
                        </span>
                        <span className="text-zinc-600 font-mono text-base font-bold">
                            + {wallet.ethBalance} ETH
                        </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-zinc-700 flex items-center gap-1.5 pt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black animate-pulse"></span>
                        On-chain funds held in ERC-4337 Smart Account • Gas sponsored by Paymaster
                    </p>
                </div>

                {/* 2. 24-Hour Spending Meter */}
                <div className="w-full lg:max-w-xs bg-amber-50/80 border-2 border-black rounded-2xl p-4 shadow-brutal-sm space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-mono font-bold text-zinc-900">
                        <span className="uppercase text-[11px] font-black text-zinc-700">24h Budget Spent:</span>
                        <span className="text-sm font-black">
                            ${wallet.dailySpent.toFixed(2)} / <span className="text-zinc-500 font-bold">${wallet.policy.dailyBudget.toFixed(2)}</span>
                        </span>
                    </div>

                    {/* Progress Bar with Neo-Brutalist Frame */}
                    <div className="w-full h-4 bg-white border-2 border-black rounded-lg overflow-hidden shadow-inner">
                        <div
                            className={`h-full border-r-2 border-black transition-all duration-500 ${
                                dailyBudgetPct > 80 ? 'bg-neoRed' : dailyBudgetPct > 50 ? 'bg-neoYellow' : 'bg-neoMint'
                            }`}
                            style={{ width: `${Math.min(100, dailyBudgetPct)}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-zinc-600 text-[11px]">Remaining In-Policy:</span>
                        <span className="bg-neoMint border border-black px-2 py-0.5 rounded text-[11px] font-black text-emerald-950 shadow-brutal-sm">
                            ${remainingBudget.toFixed(2)} USDC
                        </span>
                    </div>
                </div>

                {/* 3. Active Agent Sub-Key Card */}
                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-yellow-50 border-2 border-black p-4 sm:p-5 rounded-2xl shadow-brutal-sm">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black animate-pulse"></span>
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-950">{wallet.agentName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neoMint border border-black font-black uppercase shadow-brutal-sm">
                                ACTIVE
                            </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-700">
                            Sub-Key: <span className="font-bold text-zinc-950">{wallet.agentAddress.slice(0, 10)}...{wallet.agentAddress.slice(-4)}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-700 flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Auto-revocation in 6 hours (validUntil)</span>
                        </div>
                    </div>

                    <button
                        onClick={onRevokeKey}
                        className="bg-neoRed hover:bg-red-700 text-white border-2 border-black px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-brutal-sm transition-all active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 self-end sm:self-auto select-none"
                        title="Immediately revoke the agent's session key"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
