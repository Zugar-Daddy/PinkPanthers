'use client';

import React, { useState } from 'react';
import { Shield, Fingerprint, Copy, Check, Fuel, Key, Sparkles, ExternalLink } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface WalletHeaderProps {
    wallet: AgentWalletClient;
    onOpenPolicyModal: () => void;
    onOpenInbox: () => void;
    onOpenMcp: () => void;
}

export const WalletHeader: React.FC<WalletHeaderProps> = ({
    wallet,
    onOpenPolicyModal,
    onOpenInbox,
    onOpenMcp
}) => {
    const [copied, setCopied] = useState(false);
    const unreadCount = wallet.inboxMessages.filter(m => m.unread).length;

    const handleCopy = () => {
        navigator.clipboard.writeText(wallet.smartAccountAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-40 px-4 sm:px-8 py-3.5 transition-all">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Brand Identity & Tags */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-emerald-200 flex items-center justify-center shadow-sm select-none border border-emerald-700/40">
                        <Shield className="w-5 h-5 text-emerald-300 stroke-[2.2]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl sm:text-2xl font-serif tracking-tight text-stone-900 font-semibold">
                                Safe<span className="text-emerald-700 font-sans font-bold">Agent</span>
                            </span>
                            <span className="text-[10px] tracking-wider uppercase font-mono font-semibold bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 rounded-full">
                                ERC-4337 v0.7
                            </span>
                            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Sepolia Live
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-stone-500 hidden sm:block">
                            Autonomous AI Financial Infrastructure • Agent Sub-Keys • Virtual Cards
                        </p>
                    </div>
                </div>

                {/* Right Action Chips & Primary CTA */}
                <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Smart Account Address Pill */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200/90 px-3 py-1.5 rounded-xl font-mono text-xs text-stone-700 transition shadow-subtle select-none"
                        title="Click to copy Smart Account Address"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="font-sans font-medium text-stone-500 hidden lg:inline">Vault:</span>
                        <span className="font-semibold text-stone-900">{wallet.smartAccountAddress.slice(0, 6)}...{wallet.smartAccountAddress.slice(-4)}</span>
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                    </button>

                    {/* Paymaster Gas Tank */}
                    <div className="hidden xl:flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-xl font-mono text-xs text-amber-900">
                        <Fuel className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-sans font-medium text-amber-700/80">Gas Tank:</span>
                        <span className="font-semibold text-amber-950">${wallet.paymasterGasTankUSD.toFixed(2)}</span>
                    </div>

                    {/* Agent Inbox (2FA OTP) Button */}
                    <button
                        onClick={onOpenInbox}
                        className="flex items-center gap-1.5 bg-white hover:bg-stone-50 border border-stone-200/90 px-3 py-1.5 rounded-xl font-sans text-xs font-medium text-stone-800 shadow-subtle relative select-none transition"
                        title="Agent Comms: 2FA SMS & Receipts"
                    >
                        <span>Inbox</span>
                        {unreadCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] font-bold font-mono flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* MCP Hub Button */}
                    <button
                        onClick={onOpenMcp}
                        className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200/90 px-3 py-1.5 rounded-xl font-sans text-xs font-medium text-stone-800 shadow-subtle select-none transition"
                        title="Model Context Protocol Config & Tester"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        <span>MCP Hub</span>
                    </button>

                    {/* Passkey Owner Chip */}
                    <div className="hidden lg:flex items-center gap-1.5 bg-stone-100/80 border border-stone-200/70 px-3 py-1.5 rounded-xl font-mono text-xs text-stone-700">
                        <Fingerprint className="w-3.5 h-3.5 text-stone-600" />
                        <span className="text-stone-800 font-medium">TouchID (P-256)</span>
                    </div>

                    {/* Manage Policy Modal Trigger */}
                    <button
                        onClick={onOpenPolicyModal}
                        className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium px-4 py-1.5 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5 select-none"
                    >
                        <Key className="w-3.5 h-3.5 text-stone-300" />
                        <span>Policy</span>
                    </button>

                </div>

            </div>
        </nav>
    );
};

