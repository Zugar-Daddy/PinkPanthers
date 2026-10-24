'use client';

import React from 'react';
import { Activity, Fuel, CheckCircle2, ShieldAlert, ArrowUpRight, Code, Eye } from 'lucide-react';
import { UserOperationLog } from '../lib/web3/agentWalletClient';

interface UserOpActivityTableProps {
    userOps: UserOperationLog[];
    onInspectUserOp: (op: UserOperationLog) => void;
}

export const UserOpActivityTable: React.FC<UserOpActivityTableProps> = ({ userOps, onInspectUserOp }) => {
    return (
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neoSky border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                        <Activity className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-black tracking-tight font-sans">
                            ERC-4337 UserOperation Log
                        </h2>
                        <p className="text-xs text-zinc-600 font-mono">On-chain validation and bundler execution history</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-black bg-neoMint border-2 border-black px-3 py-1 rounded-full shadow-brutal-sm">
                    <Fuel className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Gasless via Paymaster</span>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3 font-mono text-xs max-h-80 overflow-y-auto pr-1">
                {userOps.map((op) => {
                    const isExecuted = op.status === 'EXECUTED';
                    const isReverted = op.status === 'REVERTED_ON_CHAIN';
                    const isQueued = op.status === 'QUEUED_FOR_APPROVAL';

                    return (
                        <div
                            key={op.id}
                            className={`p-4 rounded-xl border-2 border-black shadow-brutal-sm transition-all ${
                                isReverted
                                    ? 'bg-[#FFF0F2]'
                                    : isQueued
                                    ? 'bg-[#FEF9C3]'
                                    : 'bg-white'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-black border border-black ${
                                            isExecuted
                                                ? 'bg-neoMint text-black'
                                                : isReverted
                                                ? 'bg-neoRose text-black'
                                                : 'bg-neoYellow text-black'
                                        }`}
                                    >
                                        {op.status}
                                    </span>
                                    <span className="font-black text-black text-xs font-sans">{op.targetName}</span>
                                    <span className="text-[11px] text-zinc-600 font-mono">({op.functionCalled})</span>
                                </div>

                                <div className="flex items-center gap-3 text-[11px]">
                                    {op.amount > 0 && (
                                        <span className="font-black text-black font-mono bg-zinc-100 px-2 py-0.5 rounded border border-black">
                                            ${op.amount.toFixed(2)} USDC
                                        </span>
                                    )}
                                    <span className="text-zinc-500 font-mono text-[10px]">{op.timestamp}</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-zinc-700 mb-2.5 font-sans font-medium">{op.reason}</p>

                            <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-2 border-t border-black/10">
                                <div className="flex items-center gap-3">
                                    <span>UserOp: <span className="font-bold text-black">{op.userOpHash}</span></span>
                                    {op.gasSponsored && (
                                        <span className="text-emerald-800 font-bold flex items-center gap-1">
                                            <Fuel className="w-3 h-3 stroke-[2.5]" /> Gas Sponsored ($0.10)
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => onInspectUserOp(op)}
                                    className="flex items-center gap-1.5 text-black hover:text-neoRed font-bold font-mono transition-colors"
                                >
                                    <Code className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Inspect Raw UserOp</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
