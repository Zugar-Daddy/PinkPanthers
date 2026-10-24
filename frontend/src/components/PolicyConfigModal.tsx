'use client';

import React, { useState } from 'react';
import { X, Sliders, Key, Fingerprint, Trash2, Check, Shield } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface PolicyConfigModalProps {
    wallet: AgentWalletClient;
    isOpen: boolean;
    onClose: () => void;
    onUpdatePolicy: (dailyBudget: number, maxPerTx: number, durationHours: number) => void;
    onRevokeKey: () => void;
}

export const PolicyConfigModal: React.FC<PolicyConfigModalProps> = ({
    wallet,
    isOpen,
    onClose,
    onUpdatePolicy,
    onRevokeKey
}) => {
    const [dailyBudget, setDailyBudget] = useState(wallet.policy.dailyBudget);
    const [maxPerTx, setMaxPerTx] = useState(wallet.policy.maxPerTx);
    const [durationHours, setDurationHours] = useState(wallet.policy.sessionExpiryHours);
    const [isSaved, setIsSaved] = useState(false);

    if (!isOpen) return null;

    const handleSave = () => {
        onUpdatePolicy(dailyBudget, maxPerTx, durationHours);
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
            onClose();
        }, 600);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border-3 border-black rounded-2xl max-w-lg w-full p-6 shadow-brutal-xl relative">
                
                <div className="flex items-center justify-between pb-3.5 mb-5 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neoYellow border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                            <Sliders className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-black tracking-tight font-sans">Agent Policy Controls</h2>
                            <p className="text-xs text-zinc-600 font-mono">Owner-enforced on-chain spending guardrails</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 text-black brutal-btn shadow-brutal-xs"
                    >
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>

                <div className="space-y-4 mb-6 text-xs font-mono">
                    {/* Per-Transaction Limit Slider */}
                    <div className="bg-[#FFFDF8] border-2 border-black p-3.5 rounded-xl shadow-brutal-xs">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-700 font-bold">Max Per-Transaction Limit:</span>
                            <span className="text-black font-black bg-neoSky px-2 py-0.5 rounded border border-black">${maxPerTx.toFixed(2)} USDC</span>
                        </div>
                        <input
                            type="range"
                            min={5}
                            max={100}
                            step={5}
                            value={maxPerTx}
                            onChange={(e) => setMaxPerTx(parseFloat(e.target.value))}
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600 font-bold mt-1.5">
                            <span>$5 (Micro-orders)</span>
                            <span>$100 (High-tier limit)</span>
                        </div>
                    </div>

                    {/* Daily Budget Slider */}
                    <div className="bg-[#FFFDF8] border-2 border-black p-3.5 rounded-xl shadow-brutal-xs">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-700 font-bold">24-Hour Rolling Budget:</span>
                            <span className="text-black font-black bg-neoMint px-2 py-0.5 rounded border border-black">${dailyBudget.toFixed(2)} USDC</span>
                        </div>
                        <input
                            type="range"
                            min={25}
                            max={500}
                            step={25}
                            value={dailyBudget}
                            onChange={(e) => setDailyBudget(parseFloat(e.target.value))}
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600 font-bold mt-1.5">
                            <span>$25/day</span>
                            <span>$500/day</span>
                        </div>
                    </div>

                    {/* Session Expiry Hours */}
                    <div className="bg-[#FFFDF8] border-2 border-black p-3.5 rounded-xl shadow-brutal-xs">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-700 font-bold">Session Sub-Key Validity:</span>
                            <span className="text-black font-black bg-neoYellow px-2 py-0.5 rounded border border-black">{durationHours} Hours</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 pt-1">
                            {[1, 6, 12, 24].map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => setDurationHours(h)}
                                    className={`py-2 rounded-xl border-2 border-black font-mono font-bold text-xs transition-all brutal-btn ${
                                        durationHours === h
                                            ? 'bg-neoYellow text-black shadow-brutal-xs'
                                            : 'bg-white text-zinc-700 hover:bg-zinc-50'
                                    }`}
                                >
                                    {h}h
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Whitelist Display */}
                <div className="bg-[#FFFDF8] border-2 border-black rounded-xl p-3.5 mb-5 text-[11px] font-mono space-y-1.5 shadow-brutal-xs">
                    <div className="text-black font-black mb-1">ACTIVE CONTRACT WHITELIST RULES</div>
                    <div className="text-zinc-800 flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-neoMint border border-black flex items-center justify-center text-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        <span>OpenAI Billing API: <span className="font-bold text-black">0x0000...A1A1</span></span>
                    </div>
                    <div className="text-zinc-800 flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-neoMint border border-black flex items-center justify-center text-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        <span>Grocery Delivery: <span className="font-bold text-black">0x0000...B2B2</span></span>
                    </div>
                    <div className="text-zinc-800 flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-neoMint border border-black flex items-center justify-center text-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        <span>Travel / Tickets API: <span className="font-bold text-black">0x0000...C3C3</span></span>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => {
                            onRevokeKey();
                            onClose();
                        }}
                        className="px-4 py-2.5 rounded-xl border-2 border-black hover:bg-neoRose text-black text-xs font-mono font-bold flex items-center gap-1.5 brutal-btn shadow-brutal-xs transition-all"
                    >
                        <Trash2 className="w-4 h-4 stroke-[2.5]" />
                        <span>Revoke Sub-Key</span>
                    </button>

                    <button
                        onClick={handleSave}
                        className="flex-1 py-2.5 rounded-xl bg-black hover:bg-neoRed text-white font-mono font-black text-xs flex items-center justify-center gap-2 border-2 border-black brutal-btn shadow-brutal-sm transition-all"
                    >
                        {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : <Fingerprint className="w-4 h-4 stroke-[2.5]" />}
                        <span>{isSaved ? 'Updated on Chain!' : 'Sign & Update with TouchID'}</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
