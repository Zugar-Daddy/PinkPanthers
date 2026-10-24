'use client';

import React from 'react';
import { Sliders, CheckCircle2, Shield, Lock, FileCode, Check, ExternalLink, ArrowRight } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface AgentKeyPolicyCardProps {
    wallet: AgentWalletClient;
    onEditPolicy: () => void;
}

export const AgentKeyPolicyCard: React.FC<AgentKeyPolicyCardProps> = ({ wallet, onEditPolicy }) => {
    return (
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-brutal space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neoYellow border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                        <Sliders className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-black tracking-tight font-sans">
                            Smart Account Policy Engine
                        </h2>
                        <p className="text-xs text-zinc-600 font-mono">Cryptographically verified on-chain by PolicyEngine.sol</p>
                    </div>
                </div>

                <button
                    onClick={onEditPolicy}
                    className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-white hover:bg-neoYellow text-black text-xs font-mono font-bold shadow-brutal-sm brutal-btn"
                >
                    Configure Policy
                </button>
            </div>

            {/* Core Thresholds Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-[#FFFDF8] border-2 border-black p-4 rounded-xl shadow-brutal-sm space-y-1">
                    <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-wider">Per-Transaction Cap</div>
                    <div className="text-2xl font-black text-black tracking-tight">
                        ${wallet.policy.maxPerTx.toFixed(2)} <span className="text-xs font-bold text-zinc-500">USDC</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-sans">Exceeding this requires Passkey approval</p>
                </div>

                <div className="bg-[#FFFDF8] border-2 border-black p-4 rounded-xl shadow-brutal-sm space-y-1">
                    <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-wider">24h Rolling Budget</div>
                    <div className="text-2xl font-black text-black tracking-tight">
                        ${wallet.policy.dailyBudget.toFixed(2)} <span className="text-xs font-bold text-zinc-500">USDC</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-sans">Resets automatically every 24h window</p>
                </div>

                <div className="bg-[#FFFDF8] border-2 border-black p-4 rounded-xl shadow-brutal-sm space-y-1">
                    <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-wider">Session Key Validity</div>
                    <div className="text-2xl font-black text-amber-700 tracking-tight">
                        {wallet.policy.sessionExpiryHours} Hours
                    </div>
                    <p className="text-[10px] text-zinc-600 font-sans">Enforced by validUntil timestamp</p>
                </div>
            </div>

            {/* Whitelisted Vendor Protocols */}
            <div>
                <div className="text-xs font-black text-black font-mono mb-3 flex items-center justify-between">
                    <span className="tracking-wider">WHITELISTED PROTOCOL TARGETS & ABI SELECTORS</span>
                    <span className="text-[11px] font-bold text-emerald-950 bg-neoMint border-2 border-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-brutal-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> All others blocked
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    {wallet.policy.allowedContracts.map((c, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-white border-2 border-black shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-extrabold text-black flex items-center gap-2 font-sans text-xs">
                                    <span className="w-4 h-4 rounded bg-neoMint border border-black flex items-center justify-center text-black">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                    </span>
                                    {c.name}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-black bg-zinc-100 px-2 py-0.5 rounded-md border border-black">
                                    {c.address.slice(0, 6)}...{c.address.slice(-4)}
                                </span>
                            </div>
                            <div className="text-[11px] text-zinc-600 font-sans font-medium">{c.description}</div>
                            <div className="text-[10px] text-zinc-700 flex items-center gap-1.5 pt-2 border-t border-black/10">
                                <FileCode className="w-3.5 h-3.5 text-black" />
                                <span className="font-bold">Allowed ABI:</span>
                                <span className="bg-neoSky/40 px-1.5 py-0.5 rounded border border-black/30 font-bold text-black">{c.selector}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
