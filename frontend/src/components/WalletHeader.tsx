'use client';

import React, { useState } from 'react';
import { Shield, Fingerprint, Copy, Check, Fuel, Key, Sparkles, ExternalLink } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface WalletHeaderProps {
    wallet: AgentWalletClient;
    onOpenPolicyModal: () => void;
}

export const WalletHeader: React.FC<WalletHeaderProps> = ({ wallet, onOpenPolicyModal }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(wallet.smartAccountAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <nav className="border-b-3 border-black bg-white sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-brutal-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Brand Identity & Tags */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neoRed border-2 border-black flex items-center justify-center shadow-brutal-sm select-none transition-transform hover:scale-105 active:scale-95">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 font-sans">
                                Agent<span className="text-neoRed">Safe</span>
                            </span>
                            <span className="text-[10px] uppercase font-black bg-neoYellow border-2 border-black px-2.5 py-0.5 rounded-full shadow-brutal-sm">
                                ERC-4337 v0.7
                            </span>
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-black bg-neoMint border-2 border-black px-2.5 py-0.5 rounded-full shadow-brutal-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Sepolia Live
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-600 hidden sm:block">
                            Owner-Constrained Account Abstraction for Autonomous AI Agents
                        </p>
                    </div>
                </div>

                {/* Right Action Chips & Primary CTA */}
                <div className="flex flex-wrap items-center gap-2.5">
                    
                    {/* Smart Account Address Pill */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 bg-neoSky border-2 border-black px-3 py-1.5 rounded-xl font-mono text-xs font-black text-zinc-900 shadow-brutal-sm hover:bg-sky-200 transition-all select-none"
                        title="Click to copy Smart Account Address"
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 border border-black"></span>
                        <span className="font-sans font-bold text-zinc-700">Account:</span>
                        <span>{wallet.smartAccountAddress.slice(0, 6)}...{wallet.smartAccountAddress.slice(-4)}</span>
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-zinc-700" />}
                    </button>

                    {/* Paymaster Gas Tank */}
                    <div className="hidden sm:flex items-center gap-1.5 bg-neoYellow border-2 border-black px-3 py-1.5 rounded-xl font-mono text-xs font-black text-zinc-900 shadow-brutal-sm">
                        <Fuel className="w-3.5 h-3.5 text-amber-700" />
                        <span className="font-sans font-bold text-zinc-700">Gas Tank:</span>
                        <span className="text-amber-900">${wallet.paymasterGasTankUSD.toFixed(2)}</span>
                    </div>

                    {/* Passkey Owner Chip */}
                    <div className="flex items-center gap-1.5 bg-neoPurple border-2 border-black px-3 py-1.5 rounded-xl font-mono text-xs font-black text-zinc-900 shadow-brutal-sm">
                        <Fingerprint className="w-3.5 h-3.5 text-purple-800" />
                        <span className="font-sans font-bold text-zinc-700 hidden lg:inline">Owner:</span>
                        <span className="text-purple-950">TouchID (P-256)</span>
                    </div>

                    {/* Manage Policy Modal Trigger */}
                    <button
                        onClick={onOpenPolicyModal}
                        className="bg-neoRed text-white border-2 border-black text-xs font-black uppercase px-4 py-2 rounded-xl shadow-brutal hover:bg-red-700 transition-all active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 select-none"
                    >
                        <Key className="w-3.5 h-3.5" />
                        <span>Manage Policy</span>
                    </button>

                </div>

            </div>
        </nav>
    );
};
