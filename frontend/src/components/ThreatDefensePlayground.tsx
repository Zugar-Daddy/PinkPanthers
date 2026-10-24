'use client';

import React from 'react';
import { ShieldAlert, Bug, Skull, Terminal, ZapOff, CheckCircle2, AlertOctagon, ShieldCheck } from 'lucide-react';

interface ThreatDefensePlaygroundProps {
    onTriggerDrain: () => void;
    onTriggerPromptInjection: () => void;
    onTriggerOverspend: () => void;
    onTriggerExpired: () => void;
    threatLogs: { id: string; time: string; attackType: string; result: string; defenseMechanism: string }[];
}

export const ThreatDefensePlayground: React.FC<ThreatDefensePlaygroundProps> = ({
    onTriggerDrain,
    onTriggerPromptInjection,
    onTriggerOverspend,
    onTriggerExpired,
    threatLogs
}) => {
    return (
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-brutal space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neoRose border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                        <Bug className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-black tracking-tight font-sans">
                            Security Threat & Misbehavior Sandbox
                        </h2>
                        <p className="text-xs text-zinc-600 font-mono">Prove smart-contract defense against leaked keys & jailbreaks</p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-black bg-neoMint border-2 border-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-brutal-sm">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" /> 100% Defense Verified
                </span>
            </div>

            {/* 4 Threat Trigger Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Stolen Key */}
                <button
                    onClick={onTriggerDrain}
                    className="p-4 rounded-xl border-2 border-black bg-[#FFF0F2] text-left transition-all shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 flex flex-col justify-between brutal-btn group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black text-black mb-1.5">
                            <Skull className="w-4 h-4 text-neoRed stroke-[2.5] group-hover:scale-110 transition-transform" />
                            <span>Leaked Key Drain</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 font-sans font-medium">Hacker steals sub-key and attempts full wallet drain.</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-black bg-white px-2 py-0.5 rounded border border-black mt-3 w-fit">
                        Defense: Recipient Allowlist
                    </span>
                </button>

                {/* 2. Prompt Injection */}
                <button
                    onClick={onTriggerPromptInjection}
                    className="p-4 rounded-xl border-2 border-black bg-[#F3F0FF] text-left transition-all shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 flex flex-col justify-between brutal-btn group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black text-black mb-1.5">
                            <Terminal className="w-4 h-4 text-purple-700 stroke-[2.5] group-hover:scale-110 transition-transform" />
                            <span>Prompt Injection</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 font-sans font-medium">Jailbreak prompts agent to call malicious contract.</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-black bg-white px-2 py-0.5 rounded border border-black mt-3 w-fit">
                        Defense: Target Allowlist
                    </span>
                </button>

                {/* 3. Overspend */}
                <button
                    onClick={onTriggerOverspend}
                    className="p-4 rounded-xl border-2 border-black bg-[#FEF9C3] text-left transition-all shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 flex flex-col justify-between brutal-btn group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black text-black mb-1.5">
                            <AlertOctagon className="w-4 h-4 text-amber-700 stroke-[2.5] group-hover:scale-110 transition-transform" />
                            <span>Budget Overspend</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 font-sans font-medium">Agent attempts $250 purchase on $25 limit.</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-black bg-white px-2 py-0.5 rounded border border-black mt-3 w-fit">
                        Defense: TouchID Escalation
                    </span>
                </button>

                {/* 4. Expired Key */}
                <button
                    onClick={onTriggerExpired}
                    className="p-4 rounded-xl border-2 border-black bg-[#F0FDF4] text-left transition-all shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 flex flex-col justify-between brutal-btn group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black text-black mb-1.5">
                            <ZapOff className="w-4 h-4 text-emerald-800 stroke-[2.5] group-hover:scale-110 transition-transform" />
                            <span>Expired Session Call</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 font-sans font-medium">Agent calls smart account after validity period.</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-black bg-white px-2 py-0.5 rounded border border-black mt-3 w-fit">
                        Defense: Time Bounds
                    </span>
                </button>
            </div>

            {/* Audit Trail Log */}
            <div className="bg-[#FFFDF8] border-2 border-black rounded-xl p-4 shadow-brutal-sm">
                <div className="flex items-center justify-between text-xs font-mono font-black text-black mb-2.5 pb-2 border-b-2 border-black">
                    <span>SECURITY EVENT AUDIT TRAIL</span>
                    <span className="text-zinc-600 font-medium">ON-CHAIN VERIFIED</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs">
                    {threatLogs.length === 0 ? (
                        <div className="text-zinc-500 py-3 text-center text-xs font-sans">Click any scenario above to verify on-chain smart wallet defenses</div>
                    ) : (
                        threatLogs.map((log) => (
                            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 rounded-lg bg-white border-2 border-black gap-2 shadow-brutal-xs">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-zinc-500 text-[10px]">{log.time}</span>
                                    <span className="font-black text-black font-sans">{log.attackType}</span>
                                    <span className="text-zinc-600 text-[11px]">→ {log.defenseMechanism}</span>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <span className="text-rose-700 font-bold text-[11px]">{log.result}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-neoRose border border-black text-black font-black">
                                        BLOCKED
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
