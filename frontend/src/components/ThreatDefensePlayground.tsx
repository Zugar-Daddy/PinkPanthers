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
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover space-y-5 transition-all duration-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                        <Bug className="w-5 h-5 text-stone-700" />
                    </div>
                    <div>
                        <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                            Security Threat & Misbehavior Sandbox
                        </h2>
                        <p className="text-xs text-stone-500 font-sans">Prove smart-contract defense against leaked keys & jailbreaks</p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Defense Verified
                </span>
            </div>

            {/* 4 Threat Trigger Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Stolen Key */}
                <button
                    onClick={onTriggerDrain}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-rose-50/40 hover:border-rose-200 text-left transition-all shadow-subtle flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                            <Skull className="w-4 h-4 text-rose-600 transition-transform group-hover:scale-105" />
                            <span>Leaked Key Drain</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-sans">Hacker steals sub-key and attempts full wallet drain.</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-stone-600 bg-white px-2 py-0.5 rounded-full border border-stone-200/70 mt-3 w-fit shadow-subtle">
                        Defense: Recipient Allowlist
                    </span>
                </button>

                {/* 2. Prompt Injection */}
                <button
                    onClick={onTriggerPromptInjection}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-purple-50/40 hover:border-purple-200 text-left transition-all shadow-subtle flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                            <Terminal className="w-4 h-4 text-purple-600 transition-transform group-hover:scale-105" />
                            <span>Prompt Injection</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-sans">Jailbreak prompts agent to call malicious contract.</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-stone-600 bg-white px-2 py-0.5 rounded-full border border-stone-200/70 mt-3 w-fit shadow-subtle">
                        Defense: Target Allowlist
                    </span>
                </button>

                {/* 3. Overspend */}
                <button
                    onClick={onTriggerOverspend}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-amber-50/40 hover:border-amber-200 text-left transition-all shadow-subtle flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                            <AlertOctagon className="w-4 h-4 text-amber-600 transition-transform group-hover:scale-105" />
                            <span>Budget Overspend</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-sans">Agent attempts ₹25,000 purchase on ₹2,500 limit.</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-stone-600 bg-white px-2 py-0.5 rounded-full border border-stone-200/70 mt-3 w-fit shadow-subtle">
                        Defense: TouchID Escalation
                    </span>
                </button>

                {/* 4. Expired Key */}
                <button
                    onClick={onTriggerExpired}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-emerald-50/40 hover:border-emerald-200 text-left transition-all shadow-subtle flex flex-col justify-between group"
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                            <ZapOff className="w-4 h-4 text-emerald-700 transition-transform group-hover:scale-105" />
                            <span>Expired Session Call</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-sans">Agent calls smart account after validity period.</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-stone-600 bg-white px-2 py-0.5 rounded-full border border-stone-200/70 mt-3 w-fit shadow-subtle">
                        Defense: Time Bounds
                    </span>
                </button>
            </div>

            {/* Audit Trail Log */}
            <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono font-medium text-stone-700 pb-2 border-b border-stone-200/60">
                    <span className="uppercase text-[10px] tracking-wider text-stone-500">SECURITY EVENT AUDIT TRAIL</span>
                    <span className="text-emerald-800 text-[10px] font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">IN SIMULATION VERIFIED</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs">
                    {threatLogs.length === 0 ? (
                        <div className="text-stone-400 py-3 text-center text-xs font-sans">Click any scenario above to verify in local simulation smart wallet defenses</div>
                    ) : (
                        threatLogs.map((log) => (
                            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 rounded-lg bg-white border border-stone-200/80 gap-2 shadow-subtle">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-stone-400 text-[10px]">{log.time}</span>
                                    <span className="font-semibold text-stone-900 font-sans text-xs">{log.attackType}</span>
                                    <span className="text-stone-500 text-[11px]">→ {log.defenseMechanism}</span>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <span className="text-rose-700 font-medium text-[11px]">{log.result}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-50 border border-rose-200 text-rose-800 font-medium font-mono">
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
