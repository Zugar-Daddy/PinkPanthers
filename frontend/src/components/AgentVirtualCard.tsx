'use client';

import React, { useState } from 'react';
import { CreditCard, Lock, Unlock, Eye, EyeOff, ShieldCheck, Copy, Check, Sliders, AlertTriangle, Zap } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface AgentVirtualCardProps {
    wallet: AgentWalletClient;
    onToggleFreeze: () => void;
    onUpdateLimit: (limit: number) => void;
}

export const AgentVirtualCard: React.FC<AgentVirtualCardProps> = ({ wallet, onToggleFreeze, onUpdateLimit }) => {
    const [revealDetails, setRevealDetails] = useState(false);
    const [copied, setCopied] = useState(false);
    const card = wallet.virtualCard;

    const handleCopy = () => {
        navigator.clipboard.writeText(card.cardNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-card hover:shadow-card-hover space-y-6 transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                        <CreditCard className="w-5 h-5 text-stone-700" />
                    </div>
                    <div>
                        <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                            Agent-Linked Virtual Debit Card
                        </h2>
                        <p className="text-xs text-stone-500 font-sans">Programmable Visa Business card bound to smart contract spending policies</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium border flex items-center gap-1.5 ${
                        card.isFrozen ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                        {card.isFrozen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{card.isFrozen ? 'CARD FROZEN' : 'ACTIVE & PROGRAMMABLE'}</span>
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* 1. Physical / 3D Virtual Card Representation (6 cols) */}
                <div className="lg:col-span-6 flex justify-center">
                    <div className="w-full max-w-md aspect-[1.58] rounded-2xl bg-gradient-to-br from-stone-900 via-zinc-900 to-black text-white p-6 sm:p-7 flex flex-col justify-between border border-stone-800/90 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] relative overflow-hidden group select-none">
                        
                        {/* Decorative background ambient highlight */}
                        <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Top Bar of the Card */}
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <span className="text-xs font-mono font-semibold tracking-widest text-stone-300">SAFEAGENT</span>
                                <div className="text-[10px] text-stone-500 font-mono tracking-wider">CORPORATE PLATINUM</div>
                            </div>
                            <span className="font-sans font-bold italic tracking-wider text-sm bg-white/10 px-2.5 py-0.5 rounded border border-white/20 text-stone-100">
                                {card.brand}
                            </span>
                        </div>

                        {/* EMV Chip & Contactless */}
                        <div className="flex items-center gap-3.5 z-10 my-2">
                            <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200/80 shadow-sm flex items-center justify-center">
                                <div className="w-7 h-4 border border-amber-800/40 rounded-sm"></div>
                            </div>
                            <div className="text-stone-400 text-xs font-mono rotate-90">
                                ))))
                            </div>
                        </div>

                        {/* Card Number */}
                        <div className="z-10 space-y-1">
                            <div className="text-xl sm:text-2xl font-mono font-medium tracking-widest text-stone-100 flex items-center justify-between">
                                <span>{revealDetails ? card.cardNumber : card.maskedNumber}</span>
                                <button
                                    onClick={() => setRevealDetails(!revealDetails)}
                                    className="p-1.5 text-stone-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                                    title={revealDetails ? 'Hide details' : 'Reveal full card number'}
                                >
                                    {revealDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Bottom Row: Expiry, CVV, Cardholder */}
                        <div className="flex items-end justify-between z-10 font-mono text-xs pt-2 border-t border-stone-800/80">
                            <div>
                                <div className="text-[9px] text-stone-400 uppercase tracking-widest">Cardholder</div>
                                <div className="font-medium text-stone-200 text-xs truncate max-w-[200px]">{card.holder}</div>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                                <div>
                                    <div className="text-[9px] text-stone-400 uppercase tracking-widest">Expires</div>
                                    <div className="font-medium text-stone-200">{card.expiry}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-stone-400 uppercase tracking-widest">CVV</div>
                                    <div className="font-medium text-stone-200">{revealDetails ? card.cvv : '•••'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Frozen Overlay if Card is Frozen */}
                        {card.isFrozen && (
                            <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center space-y-2">
                                <Lock className="w-8 h-8 text-rose-400" />
                                <div className="font-serif font-semibold text-white text-lg tracking-tight">CARD TEMPORARILY FROZEN</div>
                                <p className="text-xs font-sans text-stone-400 max-w-xs">Transactions declined by PolicyEngine.sol until unfreeze.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Interactive Card Controls (6 cols) */}
                <div className="lg:col-span-6 space-y-4">
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleFreeze}
                            className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-medium uppercase flex items-center justify-center gap-2 transition-all shadow-sm ${
                                card.isFrozen
                                    ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                                    : 'bg-white hover:bg-stone-50 text-stone-800 border border-stone-200'
                            }`}
                        >
                            {card.isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            <span>{card.isFrozen ? 'Unfreeze Card' : 'Freeze Card Immediately'}</span>
                        </button>

                        <button
                            onClick={handleCopy}
                            className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-mono text-xs font-medium flex items-center gap-2 shadow-subtle transition"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-400" />}
                            <span>{copied ? 'Copied' : 'Copy Number'}</span>
                        </button>
                    </div>

                    {/* Daily Card Limit Slider */}
                    <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-4 space-y-2 font-mono text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-stone-600 font-medium">Virtual Card Daily Cap:</span>
                            <span className="text-stone-900 font-semibold bg-white px-2.5 py-0.5 rounded-full border border-stone-200 text-sm shadow-subtle">
                                ${card.dailyLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={500}
                            max={10000}
                            step={500}
                            value={card.dailyLimit}
                            onChange={(e) => onUpdateLimit(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                            <span>$500 (Strict)</span>
                            <span>$10,000 (Enterprise)</span>
                        </div>
                    </div>

                    {/* Security & Feature Guarantee Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                        <div className="bg-white border border-stone-200/80 p-3 rounded-xl shadow-subtle flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="text-stone-700 font-medium text-[11px] font-sans">Zero Fraud Liability Policy</span>
                        </div>
                        <div className="bg-white border border-stone-200/80 p-3 rounded-xl shadow-subtle flex items-center gap-2.5">
                            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-stone-700 font-medium text-[11px] font-sans">2FA SMS / OTP via Agent Inbox</span>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
