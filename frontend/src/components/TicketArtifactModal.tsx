'use client';

import React from 'react';
import { X, Check, Copy, Bus, Plane, ShoppingBag, Cloud, Bot, ExternalLink, ShieldCheck, QrCode } from 'lucide-react';
import { RealWorldArtifact } from '../lib/sandbox/realWorldApis';
import { formatINR } from '../lib/web3/agentWalletClient';

interface TicketArtifactModalProps {
    artifact: RealWorldArtifact | null;
    userOpHash?: string;
    onClose: () => void;
}

export const TicketArtifactModal: React.FC<TicketArtifactModalProps> = ({ artifact, userOpHash, onClose }) => {
    const [copied, setCopied] = React.useState(false);

    if (!artifact) return null;

    const copyHash = () => {
        if (userOpHash) {
            navigator.clipboard.writeText(userOpHash);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200/90 rounded-2xl max-w-lg w-full p-6 shadow-modal relative overflow-hidden font-sans space-y-5">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h2 className="text-sm font-mono font-semibold tracking-wider uppercase text-stone-900">
                            Verified Real-World Transaction Artifact
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 1. RedBus Ticket */}
                {artifact.type === 'REDBUS' && (
                    <div className="bg-gradient-to-br from-rose-50 via-white to-stone-50 border border-rose-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                                    <Bus className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-rose-950 font-serif tracking-tight">redBus Executive M-Ticket</span>
                                    <div className="text-[10px] text-stone-500 font-mono">PNR: <span className="font-semibold text-rose-700">{artifact.pnr}</span></div>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                {artifact.status}
                            </span>
                        </div>

                        <div className="bg-white/80 border border-rose-100 rounded-xl p-3.5 space-y-2 text-xs">
                            <div className="flex justify-between items-center pb-2 border-b border-rose-100">
                                <div>
                                    <div className="text-[10px] text-stone-400 uppercase font-mono">Route</div>
                                    <div className="font-semibold text-stone-900">{artifact.source} → {artifact.destination}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-stone-400 uppercase font-mono">Operator</div>
                                    <div className="font-medium text-stone-700 text-[11px]">{artifact.operator}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                                <div>
                                    <span className="text-stone-400 text-[10px]">Seats:</span>
                                    <div className="font-semibold text-stone-900">{artifact.seatNumbers.join(', ')}</div>
                                </div>
                                <div>
                                    <span className="text-stone-400 text-[10px]">Boarding Point:</span>
                                    <div className="font-medium text-stone-800 truncate" title={artifact.boardingPoint}>{artifact.boardingPoint}</div>
                                </div>
                                <div>
                                    <span className="text-stone-400 text-[10px]">Departure Time:</span>
                                    <div className="font-semibold text-stone-900">{artifact.boardingTime}</div>
                                </div>
                                <div>
                                    <span className="text-stone-400 text-[10px]">Total Fare:</span>
                                    <div className="font-semibold text-emerald-700 text-sm">{formatINR(artifact.amount)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 pt-1">
                            <span>Passenger: {artifact.passengerName}</span>
                            <span className="text-stone-400">Paid via SafeAgent Visa ···· 8840</span>
                        </div>
                    </div>
                )}

                {/* 2. IndiGo Flight Ticket */}
                {artifact.type === 'INDIGO' && (
                    <div className="bg-gradient-to-br from-sky-50 via-white to-stone-50 border border-sky-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                                    <Plane className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-sky-950 font-serif tracking-tight">IndiGo Boarding Pass</span>
                                    <div className="text-[10px] text-stone-500 font-mono">PNR: <span className="font-semibold text-blue-700">{artifact.pnr}</span></div>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                                {artifact.fareClass}
                            </span>
                        </div>

                        <div className="bg-white/80 border border-sky-100 rounded-xl p-3.5 space-y-2 text-xs">
                            <div className="flex justify-between items-center pb-2 border-b border-sky-100">
                                <div>
                                    <div className="text-[10px] text-stone-400 uppercase font-mono">Flight No.</div>
                                    <div className="font-semibold text-stone-900 text-sm">{artifact.flightNumber}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-stone-400 uppercase font-mono">Sector</div>
                                    <div className="font-semibold text-stone-900">{artifact.fromCity} → {artifact.toCity}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                                <div>
                                    <span className="text-stone-400 text-[10px]">Gate:</span>
                                    <div className="font-semibold text-stone-900">{artifact.gate}</div>
                                </div>
                                <div>
                                    <span className="text-stone-400 text-[10px]">Terminal:</span>
                                    <div className="font-semibold text-stone-900">{artifact.terminal}</div>
                                </div>
                                <div>
                                    <span className="text-stone-400 text-[10px]">Seat:</span>
                                    <div className="font-bold text-blue-700">{artifact.seat}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 pt-1">
                            <span>Passenger: {artifact.passengerName}</span>
                            <span className="font-semibold text-stone-900">{formatINR(artifact.amount)}</span>
                        </div>
                    </div>
                )}

                {/* 3. Blinkit Order */}
                {artifact.type === 'BLINKIT' && (
                    <div className="bg-gradient-to-br from-amber-50 via-white to-stone-50 border border-amber-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center shadow-xs text-xs">
                                    bk
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-stone-900 font-serif tracking-tight">Blinkit 10-Minute Delivery</span>
                                    <div className="text-[10px] text-stone-500 font-mono">Order ID: <span className="font-semibold text-stone-800">{artifact.orderId}</span></div>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                ETA: {artifact.etaMinutes} mins
                            </span>
                        </div>

                        <div className="bg-white/80 border border-amber-100 rounded-xl p-3 text-xs space-y-1.5">
                            <div className="text-[10px] font-mono uppercase text-stone-400 pb-1 border-b border-stone-100">Itemized Items ({artifact.items.length})</div>
                            {artifact.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                    <span className="text-stone-700 truncate pr-2">{item.name}</span>
                                    <span className="font-mono text-stone-900 font-medium shrink-0">{formatINR(item.price)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 pt-1">
                            <span>Delivery Partner: {artifact.riderName}</span>
                            <span className="font-semibold text-emerald-700 text-xs">Total: {formatINR(artifact.amount)}</span>
                        </div>
                    </div>
                )}

                {/* 4. AWS / OpenAI Invoice */}
                {(artifact.type === 'AWS' || artifact.type === 'OPENAI') && (
                    <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-5 shadow-subtle space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-200/70">
                            <div className="flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-stone-700" />
                                <span className="font-semibold text-stone-900">{artifact.type === 'AWS' ? 'Amazon Web Services Invoice' : 'OpenAI Platform Receipt'}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-medium">
                                PAID & SETTLED
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                            <div>Invoice: <span className="text-stone-900 font-semibold">{artifact.invoiceNumber}</span></div>
                            <div>Amount: <span className="text-emerald-700 font-semibold">{formatINR(artifact.amount)}</span></div>
                        </div>
                    </div>
                )}

                {/* 2. Cryptographic Proof Block */}
                <div className="bg-stone-900 text-stone-200 rounded-xl p-3.5 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-[11px] text-stone-400 pb-1.5 border-b border-stone-800">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            ERC-4337 Smart Account Proof
                        </span>
                        <span>EntryPoint v0.7</span>
                    </div>

                    <div className="space-y-1 text-[10px] text-stone-300">
                        <div className="flex justify-between items-center">
                            <span className="text-stone-500">Smart Account:</span>
                            <span className="text-stone-200 font-mono">0x884337bA94D25Ac2c488b394B7f8D44e1D328C39</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-stone-500">Paymaster Gas Sponsorship:</span>
                            <span className="text-emerald-400 font-semibold">100% Free (Gas Tank Active)</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-stone-500">PolicyEngine Guardrail:</span>
                            <span className="text-emerald-400 font-semibold">PASSED_ON_CHAIN</span>
                        </div>
                        {userOpHash && (
                            <div className="flex justify-between items-center pt-1 border-t border-stone-800">
                                <span className="text-stone-500">UserOp Hash:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-amber-400 select-all font-mono">{userOpHash.slice(0, 10)}...{userOpHash.slice(-8)}</span>
                                    <button
                                        onClick={copyHash}
                                        className="p-1 hover:text-white text-stone-400 transition"
                                        title="Copy full hash"
                                    >
                                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Close */}
                <div className="flex justify-end pt-1">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-mono text-xs font-medium shadow-subtle transition"
                    >
                        Close Artifact
                    </button>
                </div>
            </div>
        </div>
    );
};
