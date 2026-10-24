'use client';

import React from 'react';
import { UserCheck, Shield, Sparkles, CheckCircle2, ChevronRight, Zap, ArrowRight, Bot } from 'lucide-react';
import { AgentWalletClient, FleetAgent, FleetCategory } from '../lib/web3/agentWalletClient';

interface PrincipalFleetOverviewProps {
    wallet: AgentWalletClient;
    onSelectAgent: (agentId: string) => void;
}

export const PrincipalFleetOverview: React.FC<PrincipalFleetOverviewProps> = ({ wallet, onSelectAgent }) => {
    const [categoryFilter, setCategoryFilter] = React.useState<FleetCategory>('all');

    const filteredFleet = wallet.fleet.filter(agent => {
        if (categoryFilter === 'all') return true;
        return agent.category === categoryFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
                <div>
                    <div className="text-[11px] font-mono font-semibold tracking-wider uppercase text-emerald-800 mb-1">
                        ILLUSTRATIVE AGENT FLEET ARCHITECTURE
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif text-stone-900 tracking-tight font-normal">
                        One principal. An agent fleet. A unified control plane.
                    </h2>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        11 Active Agents
                    </span>
                    <span className="flex items-center gap-1.5 bg-stone-100 text-stone-700 border border-stone-200 px-3 py-1 rounded-full font-medium">
                        Fleet Spend: ${wallet.totalFleetSpendToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Main Grid: Left is Principal Card (YK), Right is Fleet Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Left Principal Card (4 cols) */}
                <div className="lg:col-span-4 bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-200 space-y-5 relative">
                    <div className="flex items-start justify-between">
                        <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200/70">
                            Master Principal
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-900 to-zinc-950 text-white flex items-center justify-center font-serif text-xl border border-stone-800 shadow-sm">
                            {wallet.principalInitials}
                        </div>
                        <div>
                            <div className="text-lg font-serif font-semibold text-stone-900 leading-tight">
                                {wallet.principalName}
                            </div>
                            <div className="text-xs text-stone-500 font-mono">
                                {wallet.principalRole}
                            </div>
                            <div className="text-[11px] font-mono text-stone-500 mt-1 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-emerald-700" /> 1 Master Key • {wallet.totalAgentsCount} Scoped Agents
                            </div>
                        </div>
                    </div>

                    {/* Spend Today Gauge */}
                    <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-4 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-stone-500 uppercase text-[10px] font-medium tracking-wider">Fleet Spend Today:</span>
                            <span className="text-emerald-700 font-semibold text-[10px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE
                            </span>
                        </div>
                        <div className="text-3xl font-serif font-semibold text-stone-900 tracking-tight">
                            ${wallet.totalFleetSpendToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Visual SVG Mini Trend */}
                        <div className="pt-2">
                            <svg viewBox="0 0 100 24" className="w-full h-8 stroke-stone-800 fill-emerald-50" preserveAspectRatio="none">
                                <path d="M0,24 L0,20 L15,16 L30,19 L45,12 L60,15 L75,8 L90,11 L100,2 L100,24 Z" strokeWidth="1.5" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-stone-50 border border-stone-200/80 p-2.5 rounded-xl">
                            <div className="text-[10px] text-stone-500 uppercase font-medium">Active Sub-Keys</div>
                            <div className="text-base font-semibold text-stone-900">11</div>
                        </div>
                        <div className="bg-stone-50 border border-stone-200/80 p-2.5 rounded-xl">
                            <div className="text-[10px] text-stone-500 uppercase font-medium">Provisioning</div>
                            <div className="text-base font-semibold text-amber-700">1</div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 text-[11px] font-sans text-stone-500">
                        Human master key securely enforced via WebAuthn Passkeys (TouchID / Apple Secure Enclave).
                    </div>
                </div>

                {/* 2. Right Fleet Directory (8 cols) */}
                <div className="lg:col-span-8 bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-stone-700" />
                            <h3 className="text-base font-serif font-semibold text-stone-900">
                                Managed Fleet Directory
                            </h3>
                        </div>

                        {/* Category filter pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {(['all', 'finance', 'ops', 'growth', 'eng'] as FleetCategory[]).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-mono uppercase transition-all ${
                                        categoryFilter === cat
                                            ? 'bg-stone-900 text-white font-medium shadow-xs'
                                            : 'bg-stone-100 hover:bg-stone-200 text-stone-600 font-normal'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Agent Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {filteredFleet.map(agent => {
                            const isSelected = wallet.activeAgentId === agent.id;
                            const pct = Math.min(100, (agent.spentToday / agent.dailyBudget) * 100);

                            return (
                                <div
                                    key={agent.id}
                                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                                        isSelected
                                            ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300 shadow-xs'
                                            : 'bg-stone-50/40 hover:bg-white border-stone-200/80 hover:border-stone-300 shadow-subtle'
                                    }`}
                                >
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-stone-900 text-white font-mono text-xs flex items-center justify-center shrink-0">
                                                    {agent.tag}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-stone-900 font-sans flex items-center gap-1.5">
                                                        <span>{agent.name}</span>
                                                        {isSelected && (
                                                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium">
                                                                SELECTED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-stone-500 font-mono">
                                                        {agent.role}
                                                    </div>
                                                </div>
                                            </div>

                                            <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full border border-stone-200 bg-white text-stone-600">
                                                {agent.category}
                                            </span>
                                        </div>

                                        {/* Spend bar */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-mono">
                                                <span className="text-stone-500">Daily Spend:</span>
                                                <span className="text-stone-900 font-medium">${agent.spentToday.toFixed(2)} / ${agent.dailyBudget.toFixed(2)}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-stone-200/80 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${pct > 80 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                                                    style={{ width: `${pct}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-stone-500 font-sans truncate">
                                            {agent.lastAction}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5 border-t border-stone-200/60">
                                        <span className="text-[10px] font-mono text-stone-400">
                                            Card: {agent.assignedCard}
                                        </span>

                                        <button
                                            onClick={() => onSelectAgent(agent.id)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1 transition ${
                                                isSelected
                                                    ? 'bg-stone-900 text-white'
                                                    : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 shadow-subtle'
                                            }`}
                                        >
                                            <span>{isSelected ? 'Active Agent' : 'Switch Agent'}</span>
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};
