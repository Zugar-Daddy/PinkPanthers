'use client';

import React, { useState } from 'react';
import { Mail, X, Check, Copy, KeyRound, Receipt, AlertCircle, Bell } from 'lucide-react';
import { AgentWalletClient, InboxMessage } from '../lib/web3/agentWalletClient';

interface AgentInboxModalProps {
    wallet: AgentWalletClient;
    isOpen: boolean;
    onClose: () => void;
    onMarkAllRead: () => void;
}

export const AgentInboxModal: React.FC<AgentInboxModalProps> = ({ wallet, isOpen, onClose, onMarkAllRead }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | '2fa' | 'receipt' | 'alert'>('all');

    if (!isOpen) return null;

    const handleCopy = (id: string, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const filteredMessages = wallet.inboxMessages.filter(m => {
        if (filter === 'all') return true;
        return m.category === filter;
    });

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border-3 border-black rounded-2xl max-w-xl w-full p-6 shadow-brutal-xl relative overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neoSky border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                            <Mail className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-black tracking-tight font-sans flex items-center gap-2">
                                <span>Agent Communications Inbox</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neoMint border border-black font-bold">
                                    LIVE 2FA / OTP
                                </span>
                            </h2>
                            <p className="text-xs text-zinc-600 font-mono">Agent-linked phone (+1 415 555 0173) & email comms</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 text-black brutal-btn shadow-brutal-xs"
                    >
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>

                {/* Filter and Mark Read */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                        {(['all', '2fa', 'receipt', 'alert'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase transition-all ${
                                    filter === f
                                        ? 'bg-black text-white border border-black'
                                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onMarkAllRead}
                        className="text-xs font-mono text-zinc-600 hover:text-black font-bold underline"
                    >
                        Mark all as read
                    </button>
                </div>

                {/* Message List */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {filteredMessages.length === 0 ? (
                        <div className="py-8 text-center text-xs font-mono text-zinc-500">
                            No messages found in this category
                        </div>
                    ) : (
                        filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                className={`p-4 rounded-xl border-2 border-black shadow-brutal-xs space-y-2 transition-all ${
                                    msg.unread ? 'bg-[#FFFDF8]' : 'bg-white opacity-85'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {msg.category === '2fa' ? (
                                            <div className="w-7 h-7 rounded-lg bg-neoYellow border border-black flex items-center justify-center text-black">
                                                <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </div>
                                        ) : msg.category === 'receipt' ? (
                                            <div className="w-7 h-7 rounded-lg bg-neoMint border border-black flex items-center justify-center text-black">
                                                <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </div>
                                        ) : (
                                            <div className="w-7 h-7 rounded-lg bg-neoRose border border-black flex items-center justify-center text-black">
                                                <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </div>
                                        )}

                                        <div>
                                            <div className="text-xs font-black text-black font-sans flex items-center gap-1.5">
                                                <span>{msg.sender}</span>
                                                {msg.unread && (
                                                    <span className="w-2 h-2 rounded-full bg-neoRed border border-black"></span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-bold text-zinc-700 font-sans">
                                                {msg.subject}
                                            </div>
                                        </div>
                                    </div>

                                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                        {msg.timestamp}
                                    </span>
                                </div>

                                <p className="text-[11px] text-zinc-600 font-sans">
                                    {msg.body}
                                </p>

                                {/* If 2FA OTP code is present */}
                                {msg.code && (
                                    <div className="bg-zinc-100 border border-black rounded-lg p-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-mono">
                                            <span className="text-[10px] uppercase font-bold text-zinc-500">Security Code:</span>
                                            <span className="text-base font-black tracking-widest text-black bg-white px-2 py-0.5 rounded border border-black">
                                                {msg.code}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(msg.id, msg.code!)}
                                            className="px-2.5 py-1 rounded-md bg-black text-white text-xs font-mono font-bold flex items-center gap-1 brutal-btn shadow-brutal-xs"
                                        >
                                            {copiedId === msg.id ? <Check className="w-3 h-3 text-neoMint" /> : <Copy className="w-3 h-3" />}
                                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-600">Simulating live agent SMS & webhook receipts</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-black hover:bg-neoRed text-white font-bold brutal-btn shadow-brutal-xs transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
