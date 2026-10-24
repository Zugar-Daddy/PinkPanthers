'use client';

import React, { useState } from 'react';
import { Shield, Copy, Check, KeyRound, Inbox, PlugZap } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface WalletHeaderProps {
    wallet: AgentWalletClient;
    onOpenPolicyModal: () => void;
    onOpenInbox: () => void;
    onOpenMcp: () => void;
}

export const WalletHeader: React.FC<WalletHeaderProps> = ({ wallet, onOpenPolicyModal, onOpenInbox, onOpenMcp }) => {
    const [copied, setCopied] = useState(false);
    const unreadCount = wallet.inboxMessages.filter(message => message.unread).length;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(wallet.smartAccountAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#faf9f6]/90 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#123b32] text-white shadow-sm">
                        <Shield className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div>
                        <div className="text-[17px] font-semibold leading-5 tracking-[-0.04em] text-stone-950">SafeAgent</div>
                        <div className="mt-0.5 text-[11px] font-medium text-stone-500">Treasury workspace</div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleCopy} className="header-action font-mono" title="Copy smart account address" aria-label="Copy smart account address">
                        <span className="hidden text-stone-500 sm:inline">Account</span>
                        <span className="font-semibold text-stone-800">{wallet.smartAccountAddress.slice(0, 6)}…{wallet.smartAccountAddress.slice(-4)}</span>
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5 text-stone-500" />}
                    </button>
                    <button onClick={onOpenInbox} className="header-action" title="Open inbox">
                        <Inbox className="h-4 w-4" /> <span className="hidden sm:inline">Inbox</span>
                        {unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#123b32] px-1 text-[10px] font-semibold text-white">{unreadCount}</span>}
                    </button>
                    <button onClick={onOpenMcp} className="header-action" title="Open integrations"><PlugZap className="h-4 w-4" /><span className="hidden sm:inline">Integrations</span></button>
                    <button onClick={onOpenPolicyModal} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#123b32] px-3.5 text-xs font-semibold text-white transition hover:bg-[#0b2d25] sm:px-4">
                        <KeyRound className="h-4 w-4" /> Manage policy
                    </button>
                </div>
            </div>
        </header>
    );
};
