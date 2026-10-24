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
        <div className="bg-white border-3 border-black rounded-2xl p-6 sm:p-8 shadow-brutal-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neoMint border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                        <CreditCard className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-black tracking-tight font-sans">
                            Agent-Linked Virtual Debit Card
                        </h2>
                        <p className="text-xs text-zinc-600 font-mono">Programmable Visa Business card bound to smart contract spending policies</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border-2 border-black flex items-center gap-1.5 shadow-brutal-xs ${
                        card.isFrozen ? 'bg-neoRose text-black' : 'bg-neoMint text-black'
                    }`}>
                        {card.isFrozen ? <Lock className="w-3.5 h-3.5 stroke-[2.5]" /> : <Unlock className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>{card.isFrozen ? 'CARD FROZEN' : 'ACTIVE & PROGRAMMABLE'}</span>
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* 1. Physical / 3D Virtual Card Representation (6 cols) */}
                <div className="lg:col-span-6 flex justify-center">
                    <div className="w-full max-w-md aspect-[1.58] rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white p-6 sm:p-7 flex flex-col justify-between border-3 border-black shadow-brutal-xl relative overflow-hidden group select-none">
                        
                        {/* Decorative background grid and chip */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-neoRed/10 rounded-full blur-2xl pointer-events-none"></div>

                        {/* Top Bar of the Card */}
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <span className="text-xs font-mono font-bold tracking-widest text-zinc-400">AGENTWALLET</span>
                                <div className="text-[10px] text-zinc-500 font-mono">CORPORATE DEBIT</div>
                            </div>
                            <span className="font-sans font-black italic tracking-wider text-sm bg-white/10 px-2 py-0.5 rounded border border-white/20">
                                {card.brand}
                            </span>
                        </div>

                        {/* EMV Chip & Contactless */}
                        <div className="flex items-center gap-3 z-10 my-2">
                            <div className="w-10 h-7 rounded bg-amber-400/90 border border-amber-300 flex items-center justify-center">
                                <div className="w-7 h-4 border border-amber-700/50 rounded-sm"></div>
                            </div>
                            <div className="text-zinc-500 text-xs font-mono rotate-90">
                                ))))
                            </div>
                        </div>

                        {/* Card Number */}
                        <div className="z-10 space-y-1">
                            <div className="text-xl sm:text-2xl font-mono font-black tracking-widest text-zinc-100 flex items-center justify-between">
                                <span>{revealDetails ? card.cardNumber : card.maskedNumber}</span>
                                <button
                                    onClick={() => setRevealDetails(!revealDetails)}
                                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                                    title={revealDetails ? 'Hide details' : 'Reveal full card number'}
                                >
                                    {revealDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Bottom Row: Expiry, CVV, Cardholder */}
                        <div className="flex items-end justify-between z-10 font-mono text-xs pt-1 border-t border-zinc-800">
                            <div>
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Cardholder</div>
                                <div className="font-bold text-zinc-200 text-xs truncate max-w-[200px]">{card.holder}</div>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                                <div>
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Expires</div>
                                    <div className="font-bold text-zinc-200">{card.expiry}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest">CVV</div>
                                    <div className="font-bold text-zinc-200">{revealDetails ? card.cvv : '•••'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Frozen Overlay if Card is Frozen */}
                        {card.isFrozen && (
                            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center space-y-2">
                                <Lock className="w-8 h-8 text-neoRose animate-bounce" />
                                <div className="font-sans font-black text-white text-lg tracking-tight">CARD TEMPORARILY FROZEN</div>
                                <p className="text-xs font-mono text-zinc-400 max-w-xs">Transactions declined by PolicyEngine.sol until unfreeze.</p>
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
                            className={`flex-1 py-3 rounded-xl border-2 border-black font-mono font-black text-xs uppercase flex items-center justify-center gap-2 brutal-btn shadow-brutal-sm transition-all ${
                                card.isFrozen
                                    ? 'bg-neoMint hover:bg-emerald-400 text-black'
                                    : 'bg-neoRose hover:bg-rose-400 text-black'
                            }`}
                        >
                            {card.isFrozen ? <Unlock className="w-4 h-4 stroke-[2.5]" /> : <Lock className="w-4 h-4 stroke-[2.5]" />}
                            <span>{card.isFrozen ? 'Unfreeze Card' : 'Freeze Card Immediately'}</span>
                        </button>

                        <button
                            onClick={handleCopy}
                            className="px-4 py-3 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-black font-mono font-bold text-xs flex items-center gap-2 brutal-btn shadow-brutal-sm"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-700 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                            <span>{copied ? 'Copied' : 'Copy Number'}</span>
                        </button>
                    </div>

                    {/* Daily Card Limit Slider */}
                    <div className="bg-[#FFFDF8] border-2 border-black rounded-xl p-4 shadow-brutal-sm space-y-2 font-mono text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-700 font-bold">Virtual Card Daily Cap:</span>
                            <span className="text-black font-black bg-neoSky px-2.5 py-0.5 rounded border border-black text-sm">
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
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
                            <span>$500 (Strict)</span>
                            <span>$10,000 (Enterprise)</span>
                        </div>
                    </div>

                    {/* Security & Feature Guarantee Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                        <div className="bg-white border-2 border-black p-3 rounded-xl shadow-brutal-xs flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 stroke-[2.5]" />
                            <span className="text-zinc-800 font-bold text-[11px]">Zero Fraud Liability Policy</span>
                        </div>
                        <div className="bg-white border-2 border-black p-3 rounded-xl shadow-brutal-xs flex items-center gap-2.5">
                            <Zap className="w-4 h-4 text-amber-700 shrink-0 stroke-[2.5]" />
                            <span className="text-zinc-800 font-bold text-[11px]">2FA SMS / OTP via Agent Inbox</span>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
