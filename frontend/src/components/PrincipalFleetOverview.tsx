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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b-2 border-black">
                <div>
                    <div className="text-xs font-mono font-black tracking-widest uppercase text-neoRed mb-1">
                        ILLUSTRATIVE AGENT FLEET ARCHITECTURE
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight font-sans">
                        One principal. An agent fleet. A unified control plane.
                    </h2>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold flex-wrap">
                    <span className="flex items-center gap-1.5 bg-neoMint border-2 border-black px-2.5 py-1 rounded-full shadow-brutal-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse"></span>
                        11 Active Agents
                    </span>
                    <span className="flex items-center gap-1.5 bg-neoYellow border-2 border-black px-2.5 py-1 rounded-full shadow-brutal-xs">
                        Fleet Spend: ${wallet.totalFleetSpendToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Main Grid: Left is Principal Card (YK), Right is Fleet Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Left Principal Card (4 cols) */}
                <div className="lg:col-span-4 bg-white border-3 border-black rounded-2xl p-6 shadow-brutal-lg space-y-5 relative">
                    <div className="flex items-start justify-between">
                        <div className="text-[11px] font-mono font-black uppercase tracking-wider text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-black">
                            Master Principal
                        </div>
                        <span className="w-3 h-3 rounded-full bg-neoMint border border-black"></span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center font-black text-2xl border-2 border-black shadow-brutal-sm">
                            {wallet.principalInitials}
                        </div>
                        <div>
                            <div className="text-lg font-black text-black font-sans leading-tight">
                                {wallet.principalName}
                            </div>
                            <div className="text-xs text-zinc-600 font-mono font-medium">
                                {wallet.principalRole}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 mt-1 flex items-center gap-1">
                                <Shield className="w-3 h-3 text-neoRed" /> 1 Master Key • {wallet.totalAgentsCount} Scoped Agents
                            </div>
                        </div>
                    </div>

                    {/* Spend Today Gauge */}
                    <div className="bg-[#FFFDF8] border-2 border-black rounded-xl p-4 shadow-brutal-sm space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-zinc-600 uppercase text-[10px] font-bold">Fleet Spend Today:</span>
                            <span className="text-emerald-700 font-black text-[10px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE
                            </span>
                        </div>
                        <div className="text-3xl font-black font-mono text-black tracking-tight">
                            ${wallet.totalFleetSpendToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Visual SVG Mini Trend */}
                        <div className="pt-2">
                            <svg viewBox="0 0 100 24" className="w-full h-8 stroke-black fill-neoMint/40" preserveAspectRatio="none">
                                <path d="M0,24 L0,20 L15,16 L30,19 L45,12 L60,15 L75,8 L90,11 L100,2 L100,24 Z" strokeWidth="2" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-zinc-50 border border-black p-2.5 rounded-lg">
                            <div className="text-[9px] text-zinc-500 uppercase font-bold">Active Sub-Keys</div>
                            <div className="text-base font-black text-black">11</div>
                        </div>
                        <div className="bg-zinc-50 border border-black p-2.5 rounded-lg">
                            <div className="text-[9px] text-zinc-500 uppercase font-bold">Provisioning</div>
                            <div className="text-base font-black text-amber-700">1</div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-black/10 text-[11px] font-mono text-zinc-600">
                        Human master key securely enforced via WebAuthn Passkeys (TouchID / Apple Secure Enclave).
                    </div>
                </div>

                {/* 2. Right Fleet Directory (8 cols) */}
                <div className="lg:col-span-8 bg-white border-3 border-black rounded-2xl p-6 shadow-brutal space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-black stroke-[2.5]" />
                            <h3 className="text-base font-black text-black font-sans">
                                Managed Fleet Directory
                            </h3>
                        </div>

                        {/* Category filter pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {(['all', 'finance', 'ops', 'growth', 'eng'] as FleetCategory[]).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase transition-all brutal-btn ${
                                        categoryFilter === cat
                                            ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                            : 'bg-zinc-100 hover:bg-zinc-200 text-black border border-black'
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
                                    className={`p-4 rounded-xl border-2 border-black transition-all shadow-brutal-sm flex flex-col justify-between ${
                                        isSelected ? 'bg-neoYellow/40 ring-2 ring-black' : 'bg-[#FFFDF8] hover:bg-zinc-50'
                                    }`}
                                >
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-lg bg-black text-white font-mono font-black text-xs flex items-center justify-center border border-black shrink-0">
                                                    {agent.tag}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-black font-sans flex items-center gap-1.5">
                                                        <span>{agent.name}</span>
                                                        {isSelected && (
                                                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-neoMint border border-black rounded font-black">
                                                                SELECTED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-600 font-mono">
                                                        {agent.role}
                                                    </div>
                                                </div>
                                            </div>

                                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-black bg-white">
                                                {agent.category}
                                            </span>
                                        </div>

                                        {/* Spend bar */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-mono font-bold">
                                                <span className="text-zinc-600">Daily Spend:</span>
                                                <span className="text-black">${agent.spentToday.toFixed(2)} / ${agent.dailyBudget.toFixed(2)}</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-zinc-200 border border-black rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full border-r border-black ${pct > 80 ? 'bg-neoRed' : 'bg-neoMint'}`}
                                                    style={{ width: `${pct}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-zinc-600 font-sans truncate">
                                            {agent.lastAction}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5 border-t border-black/10">
                                        <span className="text-[10px] font-mono text-zinc-500">
                                            Card: {agent.assignedCard}
                                        </span>

                                        <button
                                            onClick={() => onSelectAgent(agent.id)}
                                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 brutal-btn ${
                                                isSelected
                                                    ? 'bg-black text-white border border-black'
                                                    : 'bg-white hover:bg-neoYellow text-black border border-black shadow-brutal-xs'
                                            }`}
                                        >
                                            <span>{isSelected ? 'Active Agent' : 'Switch Agent'}</span>
                                            <ArrowRight className="w-3 h-3 stroke-[3]" />
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
