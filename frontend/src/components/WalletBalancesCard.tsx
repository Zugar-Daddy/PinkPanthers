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
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-card hover:shadow-card-hover transition-all duration-200">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
                
                {/* 1. Primary Treasury Balances */}
                <div className="space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-mono font-medium border border-stone-200/80">
                        <Coins className="w-3.5 h-3.5 text-stone-600" />
                        <span>Smart Account Treasury</span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-3 pt-0.5">
                        <div className="text-4xl sm:text-5xl font-serif font-semibold text-stone-900 tracking-tight">
                            ${wallet.usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                            USDC
                        </span>
                        <span className="text-stone-500 font-mono text-sm font-medium">
                            + {wallet.ethBalance} ETH
                        </span>
                    </div>

                    <p className="text-xs font-sans text-stone-500 flex items-center gap-2 pt-0.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        On-chain funds held in ERC-4337 Smart Account • Gas sponsored by Paymaster
                    </p>
                </div>

                {/* 2. 24-Hour Spending Meter */}
                <div className="w-full lg:max-w-xs bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="uppercase text-[10px] font-semibold text-stone-500 tracking-wider">24h Budget Spent:</span>
                        <span className="text-xs font-semibold text-stone-900">
                            ${wallet.dailySpent.toFixed(2)} <span className="text-stone-400 font-normal">/ ${wallet.policy.dailyBudget.toFixed(2)}</span>
                        </span>
                    </div>

                    {/* Clean Rounded Progress Bar */}
                    <div className="w-full h-2.5 bg-stone-200/80 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                dailyBudgetPct > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(100, dailyBudgetPct)}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-stone-500 text-[11px]">In-Policy Headroom:</span>
                        <span className="bg-white border border-stone-200 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-stone-700 shadow-subtle">
                            ${remainingBudget.toFixed(2)} USDC
                        </span>
                    </div>
                </div>

                {/* 3. Active Agent Sub-Key Card */}
                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-50/80 border border-stone-200/80 p-4 sm:p-5 rounded-2xl">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-900 font-sans">{wallet.agentName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-medium uppercase">
                                ACTIVE
                            </span>
                        </div>
                        <div className="text-[11px] font-mono text-stone-600">
                            Sub-Key: <span className="font-semibold text-stone-900">{wallet.agentAddress.slice(0, 10)}...{wallet.agentAddress.slice(-4)}</span>
                        </div>
                        <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>Auto-revocation in 6 hours (validUntil)</span>
                        </div>
                    </div>

                    <button
                        onClick={onRevokeKey}
                        className="bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200/80 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-subtle flex items-center gap-1.5 self-end sm:self-auto select-none"
                        title="Immediately revoke the agent's session key"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Revoke</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
