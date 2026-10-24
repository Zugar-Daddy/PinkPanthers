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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border-3 border-black rounded-2xl max-w-2xl w-full p-6 shadow-brutal-xl relative overflow-hidden font-mono">
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neoPurple border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                            <Code className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-black tracking-tight font-sans">ERC-4337 PackedUserOperation Inspector</h2>
                            <p className="text-xs text-zinc-600 font-mono">Raw protocol payload validated by EntryPoint v0.7</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="px-3 py-1.5 rounded-xl border-2 border-black bg-white hover:bg-neoYellow text-black text-xs font-mono font-bold flex items-center gap-1.5 brutal-btn shadow-brutal-xs"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-800" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 text-black brutal-btn shadow-brutal-xs"
                        >
                            <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                    </div>
                </div>

                {/* Preformatted JSON */}
                <div className="bg-zinc-950 border-2 border-black rounded-xl p-4 overflow-x-auto max-h-96 text-xs text-emerald-400 leading-relaxed shadow-brutal">
                    <pre>{formattedJson}</pre>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-zinc-600 font-sans">
                    <span className="flex items-center gap-1.5 text-emerald-950 bg-neoMint border-2 border-black px-3 py-1 rounded-full font-mono text-xs font-bold shadow-brutal-xs">
                        <ShieldCheck className="w-4 h-4 stroke-[2.5]" /> Validated by PolicyEngine.sol
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-black hover:bg-neoRed text-white font-mono font-bold text-xs border-2 border-black brutal-btn shadow-brutal-xs transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
