'use client';

import React, { useState } from 'react';
import { X, Sliders, Key, Fingerprint, Trash2, Check, Shield } from 'lucide-react';
import { AgentWalletClient, formatINR } from '../lib/web3/agentWalletClient';

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

    // Sync state whenever modal opens or active agent / policy changes
    React.useEffect(() => {
        if (isOpen) {
            setDailyBudget(wallet.policy.dailyBudget);
            setMaxPerTx(wallet.policy.maxPerTx);
            setDurationHours(wallet.policy.sessionExpiryHours);
        }
    }, [isOpen, wallet.activeAgentId, wallet.policy.dailyBudget, wallet.policy.maxPerTx, wallet.policy.sessionExpiryHours]);

    if (!isOpen) return null;

    const maxSliderPerTx = Math.max(300000, maxPerTx * 1.5);
    const maxSliderDailyBudget = Math.max(500000, dailyBudget * 1.5);

    const handleSave = () => {
        onUpdatePolicy(dailyBudget, maxPerTx, durationHours);
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
            onClose();
        }, 600);
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200/90 rounded-2xl max-w-lg w-full p-6 shadow-modal relative">
                
                <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                            <Sliders className="w-5 h-5 text-stone-700" />
                        </div>
                        <div>
                            <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">Agent Policy Controls</h2>
                            <p className="text-xs text-stone-500 font-sans">Owner-enforced in local simulation spending guardrails for <span className="font-semibold text-stone-700">{wallet.agentName}</span></p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4 mb-6 text-xs font-mono">
                    {/* Per-Transaction Limit Slider */}
                    <div className="bg-stone-50/70 border border-stone-200/80 p-3.5 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-stone-600 font-medium font-sans text-xs">Max Per-Transaction Limit:</span>
                            <span className="text-stone-900 font-semibold bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle">{formatINR(maxPerTx)}</span>
                        </div>
                        <input
                            type="range"
                            min={500}
                            max={maxSliderPerTx}
                            step={500}
                            value={maxPerTx}
                            onChange={(e) => setMaxPerTx(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400 mt-1.5 font-mono">
                            <span>₹500 (Micro-orders)</span>
                            <span>{formatINR(maxSliderPerTx)} (Tier limit)</span>
                        </div>
                    </div>

                    {/* Daily Budget Slider */}
                    <div className="bg-stone-50/70 border border-stone-200/80 p-3.5 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-stone-600 font-medium font-sans text-xs">24-Hour Rolling Budget:</span>
                            <span className="text-stone-900 font-semibold bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle">{formatINR(dailyBudget)}</span>
                        </div>
                        <input
                            type="range"
                            min={2500}
                            max={maxSliderDailyBudget}
                            step={2500}
                            value={dailyBudget}
                            onChange={(e) => setDailyBudget(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400 mt-1.5 font-mono">
                            <span>₹2,500/day</span>
                            <span>{formatINR(maxSliderDailyBudget)}/day</span>
                        </div>
                    </div>

                    {/* Session Expiry Hours */}
                    <div className="bg-stone-50/70 border border-stone-200/80 p-3.5 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-stone-600 font-medium font-sans text-xs">Session Sub-Key Validity:</span>
                            <span className="text-stone-900 font-semibold bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle">{durationHours} Hours</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 pt-1">
                            {[1, 6, 12, 24].map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => setDurationHours(h)}
                                    className={`py-1.5 rounded-lg border font-mono text-xs transition ${
                                        durationHours === h
                                            ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 font-medium'
                                    }`}
                                >
                                    {h}h
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Whitelist Display */}
                <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-3.5 mb-5 text-[11px] font-mono space-y-1.5">
                    <div className="text-stone-800 font-medium text-xs font-sans mb-1">Active Contract Whitelist Rules</div>
                    <div className="text-stone-600 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px]">
                            <Check className="w-2.5 h-2.5" />
                        </span>
                        <span>OpenAI Billing API: <span className="font-semibold text-stone-900">0x0000...A1A1</span></span>
                    </div>
                    <div className="text-stone-600 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px]">
                            <Check className="w-2.5 h-2.5" />
                        </span>
                        <span>Grocery Delivery: <span className="font-semibold text-stone-900">0x0000...B2B2</span></span>
                    </div>
                    <div className="text-stone-600 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px]">
                            <Check className="w-2.5 h-2.5" />
                        </span>
                        <span>Travel / Tickets API: <span className="font-semibold text-stone-900">0x0000...C3C3</span></span>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => {
                            onRevokeKey();
                            onClose();
                        }}
                        className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Revoke Sub-Key</span>
                    </button>

                    <button
                        onClick={handleSave}
                        className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition"
                    >
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>{isSaved ? 'Policy updated' : 'Save policy'}</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
