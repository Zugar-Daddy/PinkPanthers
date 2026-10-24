'use client';

import React from 'react';
import { UserCheck, Shield, Sparkles, CheckCircle2, ChevronRight, Zap, ArrowRight, Bot } from 'lucide-react';
import { AgentWalletClient, FleetAgent, FleetCategory, formatINR } from '../lib/web3/agentWalletClient';

interface PrincipalFleetOverviewProps {
    wallet: AgentWalletClient;
    onSelectAgent: (agentId: string) => void;
    onOpenPaymaster: () => void;
}

export const PrincipalFleetOverview: React.FC<PrincipalFleetOverviewProps> = ({ wallet, onSelectAgent, onOpenPaymaster }) => {
    const [categoryFilter, setCategoryFilter] = React.useState<FleetCategory>('all');
    const visibleFleetSpend = wallet.fleet.reduce((total, agent) => total + agent.spentToday, 0);

    const filteredFleet = wallet.fleet.filter(agent => {
        if (categoryFilter === 'all') return true;
        return agent.category === categoryFilter;
    });

    return (
        <div className="space-y-6">
            <button type="button" onClick={onOpenPaymaster} className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left flex items-center justify-between gap-4 hover:bg-emerald-100 transition">
                <div><span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Detailed agent · Payroll</span>
                    <h2 className="mt-1 text-xl font-serif text-emerald-950">{wallet.fleet.find(agent => agent.id === 'paymaster-01')?.name || 'PayMaster'}</h2>
                    <p className="mt-1 text-sm text-emerald-900">15 employees. Editable leave and salary rules. AI payslips and automatic simulated payouts.</p>
                </div><span className="shrink-0 text-sm font-semibold text-emerald-900">Open agent →</span>
            </button>
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
                <div>
                    <div className="text-[11px] font-mono font-semibold tracking-wider uppercase text-emerald-800 mb-1">
                        AGENTS
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif text-stone-900 tracking-tight font-normal">
                        Your team of agents
                    </h2>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        {wallet.fleet.filter(agent => agent.status === 'active').length} active
                    </span>
                    <span className="flex items-center gap-1.5 bg-stone-100 text-stone-700 border border-stone-200 px-3 py-1 rounded-full font-medium">
                        Shown agents: {formatINR(visibleFleetSpend)}
                    </span>
                </div>
            </div>

            {/* Main Grid: Left is Principal Card (MB), Right is Fleet Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* 1. Left Principal Card (4 cols) */}
                <div className="xl:col-span-4 min-w-0 bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-200 space-y-5 relative">
                    <div className="flex items-start justify-between">
                        <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200/70">
                            Account owner
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
                                <Shield className="w-3.5 h-3.5 text-emerald-700" /> Owner of this workspace
                            </div>
                        </div>
                    </div>

                    {/* Spend Today Gauge */}
                    <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-4 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-stone-500 uppercase text-[10px] font-medium tracking-wider">Spent today</span>
                        </div>
                        <div className="text-3xl font-serif font-semibold text-stone-900 tracking-tight">
                            {formatINR(visibleFleetSpend)}
                        </div>

                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-stone-50 border border-stone-200/80 p-2.5 rounded-xl">
                            <div className="text-[10px] text-stone-500 uppercase font-medium">Active agents</div>
                            <div className="text-base font-semibold text-stone-900">{wallet.fleet.filter(agent => agent.status === 'active').length}</div>
                        </div>
                        <div className="bg-stone-50 border border-stone-200/80 p-2.5 rounded-xl">
                            <div className="text-[10px] text-stone-500 uppercase font-medium">Provisioning</div>
                            <div className="text-base font-semibold text-amber-700">{wallet.fleet.filter(agent => agent.status === 'provisioning').length}</div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 text-[11px] font-sans text-stone-500">
                        Manage agent permissions and spending from the policy panel.
                    </div>
                </div>

                {/* 2. Right Fleet Directory (8 cols) */}
                <div className="xl:col-span-8 min-w-0 bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-stone-700" />
                            <h3 className="text-base font-serif font-semibold text-stone-900">
                                Agent directory
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
                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3.5">
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
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-stone-900 text-white font-mono text-xs flex items-center justify-center shrink-0">
                                                    {agent.tag}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-semibold text-stone-900 font-sans flex items-center gap-1.5">
                                                        {agent.id === 'paymaster-01' ? <button type="button" onClick={onOpenPaymaster} className="underline underline-offset-2">{agent.name}</button> : <span>{agent.name}</span>}
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
                                            <div className="flex flex-wrap justify-between gap-1 text-[10px] font-mono">
                                                <span className="text-stone-500">Daily Spend:</span>
                                                <span className="text-stone-900 font-medium">{formatINR(agent.spentToday)} / {formatINR(agent.dailyBudget)}</span>
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

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-200/60">
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-400">
                                            <span>Card: {agent.assignedCard}</span>
                                            {agent.cardDetails?.isFrozen && (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold tracking-wider">
                                                    FROZEN
                                                </span>
                                            )}
                                        </div>

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
