'use client';

import React from 'react';
import { Sliders, CheckCircle2, Shield, Lock, FileCode, Check, ExternalLink, ArrowRight } from 'lucide-react';
import { AgentWalletClient, formatINR } from '../lib/web3/agentWalletClient';

interface AgentKeyPolicyCardProps {
    wallet: AgentWalletClient;
    onEditPolicy: () => void;
}

export const AgentKeyPolicyCard: React.FC<AgentKeyPolicyCardProps> = ({ wallet, onEditPolicy }) => {
    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover space-y-5 transition-all duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-stone-200/80">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                        <Sliders className="w-5 h-5 text-stone-700" />
                    </div>
                    <div>
                        <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                            Spending policy
                        </h2>
                        <p className="text-xs text-stone-500 font-sans">Policy settings used by the local simulator</p>
                    </div>
                </div>

                <button
                    onClick={onEditPolicy}
                    className="px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-mono font-medium shadow-subtle transition"
                >
                    Edit policy
                </button>
            </div>

            {/* Core Thresholds Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-stone-50/70 border border-stone-200/80 p-4 rounded-xl space-y-1">
                    <div className="text-stone-500 text-[10px] uppercase font-medium tracking-wider">Per-Transaction Cap</div>
                    <div className="text-xl font-serif font-semibold text-stone-900 tracking-tight tabular-nums">
                        {formatINR(wallet.policy.maxPerTx)}
                    </div>
                    <p className="text-[10px] text-stone-500 font-sans">Exceeding this requires Passkey approval</p>
                </div>

                <div className="bg-stone-50/70 border border-stone-200/80 p-4 rounded-xl space-y-1">
                    <div className="text-stone-500 text-[10px] uppercase font-medium tracking-wider">24h Rolling Budget</div>
                    <div className="text-xl font-serif font-semibold text-stone-900 tracking-tight tabular-nums">
                        {formatINR(wallet.policy.dailyBudget)}
                    </div>
                    <p className="text-[10px] text-stone-500 font-sans">Resets automatically every 24h window</p>
                </div>

                <div className="bg-stone-50/70 border border-stone-200/80 p-4 rounded-xl space-y-1">
                    <div className="text-stone-500 text-[10px] uppercase font-medium tracking-wider">Session Key Validity</div>
                    <div className="text-xl font-serif font-semibold text-amber-700 tracking-tight">
                        {wallet.policy.sessionExpiryHours} Hours
                    </div>
                    <p className="text-[10px] text-stone-500 font-sans">Enforced by validUntil timestamp</p>
                </div>
            </div>

            {/* Whitelisted Vendor Protocols */}
            <div>
                <div className="text-xs font-mono font-semibold text-stone-900 mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="tracking-wider">APPROVED DESTINATIONS</span>
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All others blocked
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    {wallet.policy.allowedContracts.map((c, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-stone-50/40 hover:bg-white border border-stone-200/80 hover:border-stone-300 transition-all space-y-2 shadow-subtle">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="min-w-0 font-semibold text-stone-900 flex items-center gap-2 font-sans text-xs">
                                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
                                        <Check className="w-2.5 h-2.5" />
                                    </span>
                                    {c.name}
                                </span>
                                <span className="text-[10px] font-mono font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/60">
                                    {c.address.slice(0, 6)}...{c.address.slice(-4)}
                                </span>
                            </div>
                            <div className="text-[11px] text-stone-500 font-sans">{c.description}</div>
                            <div className="text-[10px] text-stone-600 flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-200/60">
                                <FileCode className="w-3.5 h-3.5 text-stone-400" />
                                <span className="font-medium">Allowed ABI:</span>
                                <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 font-mono">{c.selector}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
