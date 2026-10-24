'use client';

import React from 'react';
import { Activity, Fuel, CheckCircle2, ShieldAlert, ArrowUpRight, Code, Eye } from 'lucide-react';
import { UserOperationLog, formatINR } from '../lib/web3/agentWalletClient';

interface UserOpActivityTableProps {
    userOps: UserOperationLog[];
    onInspectUserOp: (op: UserOperationLog) => void;
}

export const UserOpActivityTable: React.FC<UserOpActivityTableProps> = ({ userOps, onInspectUserOp }) => {
    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover space-y-4 transition-all duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-stone-200/80">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                        <Activity className="w-5 h-5 text-stone-700" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                            Operation history
                        </h2>
                        <p className="text-xs text-stone-500 font-sans">Recent results from the local simulator</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
                    <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Demo records</span>
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
                            className={`p-4 rounded-xl border transition-all shadow-subtle ${
                                isReverted
                                    ? 'bg-rose-50/30 border-rose-200/80'
                                    : isQueued
                                    ? 'bg-amber-50/30 border-amber-200/80'
                                    : 'bg-stone-50/40 hover:bg-white border-stone-200/80'
                            }`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                                            isExecuted
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : isReverted
                                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}
                                    >
                                        {isExecuted ? 'SIMULATED' : isReverted ? 'BLOCKED IN SIMULATION' : 'QUEUED'}
                                    </span>
                                    <span className="font-semibold text-stone-900 text-xs font-sans">{op.targetName}</span>
                                    <span className="min-w-0 break-all text-[11px] text-stone-500 font-mono">({op.functionCalled})</span>
                                </div>

                                <div className="flex items-center gap-3 text-[11px]">
                                    {op.amount > 0 && (
                                        <span className="font-medium text-stone-900 font-mono bg-white px-2 py-0.5 rounded-md border border-stone-200 shadow-subtle">
                                            {formatINR(op.amount)}
                                        </span>
                                    )}
                                    <span className="text-stone-400 font-mono text-[10px]" suppressHydrationWarning>{op.timestamp}</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-stone-600 mb-2.5 font-sans">{op.reason}</p>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-500 pt-2 border-t border-stone-200/60">
                                <div className="flex min-w-0 flex-wrap items-center gap-3">
                                    <span className="min-w-0">UserOp: <span className="font-mono text-stone-800 font-medium break-all">{op.userOpHash}</span></span>
                                    {op.gasSponsored && (
                                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                                            <Fuel className="w-3 h-3 text-emerald-600" /> Estimated gas only
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => onInspectUserOp(op)}
                                    className="flex items-center gap-1.5 text-stone-700 hover:text-stone-900 font-medium font-mono transition-colors"
                                >
                                    <Code className="w-3.5 h-3.5 text-stone-500" />
                                    <span>Inspect Demo Data</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
