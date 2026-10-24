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
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200/90 rounded-2xl max-w-xl w-full p-6 shadow-modal relative overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                            <Mail className="w-5 h-5 text-stone-700" />
                        </div>
                        <div>
                            <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight flex items-center gap-2">
                                <span>Agent Communications Inbox</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                                    LIVE 2FA / OTP
                                </span>
                            </h2>
                            <p className="text-xs text-stone-500 font-sans">Agent-linked phone (+1 415 555 0173) & email comms</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter and Mark Read */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                        {(['all', '2fa', 'receipt', 'alert'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 rounded-full text-xs font-mono uppercase transition-all ${
                                    filter === f
                                        ? 'bg-stone-900 text-white font-medium shadow-xs'
                                        : 'bg-stone-100 hover:bg-stone-200 text-stone-600 font-normal'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onMarkAllRead}
                        className="text-xs font-mono text-stone-500 hover:text-stone-900 transition"
                    >
                        Mark all as read
                    </button>
                </div>

                {/* Message List */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {filteredMessages.length === 0 ? (
                        <div className="py-8 text-center text-xs font-mono text-stone-400">
                            No messages found in this category
                        </div>
                    ) : (
                        filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                className={`p-4 rounded-xl border space-y-2 transition-all ${
                                    msg.unread ? 'bg-stone-50/70 border-stone-300 shadow-subtle' : 'bg-white border-stone-200/70 opacity-90'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {msg.category === '2fa' ? (
                                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                                                <KeyRound className="w-3.5 h-3.5" />
                                            </div>
                                        ) : msg.category === 'receipt' ? (
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                                                <Receipt className="w-3.5 h-3.5" />
                                            </div>
                                        ) : (
                                            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                            </div>
                                        )}

                                        <div>
                                            <div className="text-xs font-semibold text-stone-900 font-sans flex items-center gap-1.5">
                                                <span>{msg.sender}</span>
                                                {msg.unread && (
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-medium text-stone-600 font-sans">
                                                {msg.subject}
                                            </div>
                                        </div>
                                    </div>

                                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                                        {msg.timestamp}
                                    </span>
                                </div>

                                <p className="text-[11px] text-stone-500 font-sans">
                                    {msg.body}
                                </p>

                                {/* If 2FA OTP code is present */}
                                {msg.code && (
                                    <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-mono">
                                            <span className="text-[10px] uppercase font-medium text-stone-500">Security Code:</span>
                                            <span className="text-base font-semibold tracking-widest text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle">
                                                {msg.code}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(msg.id, msg.code!)}
                                            className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-medium flex items-center gap-1 transition shadow-subtle"
                                        >
                                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-400">Simulating live agent SMS & webhook receipts</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-subtle transition"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
