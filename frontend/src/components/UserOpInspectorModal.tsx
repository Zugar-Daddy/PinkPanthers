'use client';

import React, { useState } from 'react';
import { X, Code, Copy, Check, ShieldCheck } from 'lucide-react';
import { UserOperationLog } from '../lib/web3/agentWalletClient';

interface UserOpInspectorModalProps {
    op: UserOperationLog | null;
    onClose: () => void;
}

export const UserOpInspectorModal: React.FC<UserOpInspectorModalProps> = ({ op, onClose }) => {
    const [copied, setCopied] = useState(false);

    if (!op) return null;

    const formattedJson = JSON.stringify(
        {
            userOpHash: op.userOpHash,
            entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
            userOperation: op.rawUserOp,
            validationResult: op.validationResult,
            gasSponsored: op.gasSponsored
        },
        null,
        2
    );

    const handleCopy = () => {
        navigator.clipboard.writeText(formattedJson);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200/90 rounded-2xl max-w-2xl w-full p-6 shadow-modal relative overflow-hidden font-mono">
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                            <Code className="w-5 h-5 text-stone-700" />
                        </div>
                        <div>
                            <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight font-sans">ERC-4337 PackedUserOperation Inspector</h2>
                            <p className="text-xs text-stone-500 font-sans">Raw protocol payload validated by EntryPoint v0.7</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-mono font-medium flex items-center gap-1.5 shadow-subtle transition"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Preformatted JSON */}
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 overflow-x-auto max-h-96 text-xs text-emerald-400 leading-relaxed shadow-inner">
                    <pre>{formattedJson}</pre>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-stone-500 font-sans">
                    <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full font-mono text-xs font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Validated by PolicyEngine.sol
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-mono text-xs shadow-subtle transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
