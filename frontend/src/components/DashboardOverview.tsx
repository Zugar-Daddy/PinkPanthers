'use client';

import React from 'react';
import { ArrowRight, ArrowUpRight, Bot, CircleAlert, CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import { AgentWalletClient, FleetCategory, formatINR } from '../lib/web3/agentWalletClient';

interface DashboardOverviewProps {
    wallet: AgentWalletClient;
    onSelectAgent: (id: string) => void;
    onOpenSimulator: () => void;
    onOpenActivity: () => void;
    onOpenPolicy: () => void;
}

const categoryStyle: Record<Exclude<FleetCategory, 'all'>, { label: string; color: string }> = {
    finance: { label: 'Finance', color: '#0f766e' },
    ops: { label: 'Operations', color: '#48a795' },
    growth: { label: 'Growth', color: '#e7a258' },
    eng: { label: 'Engineering', color: '#8396c6' },
};
const categoryOrder: Exclude<FleetCategory, 'all'>[] = ['finance', 'ops', 'growth', 'eng'];
const compactINR = (value: number) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ wallet, onSelectAgent, onOpenSimulator, onOpenActivity, onOpenPolicy }) => {
    const agents = wallet.fleet;
    const fleetSpend = agents.reduce((sum, agent) => sum + agent.spentToday, 0);
    const fleetBudget = agents.reduce((sum, agent) => sum + agent.dailyBudget, 0);
    const activeAgents = agents.filter(agent => agent.status === 'active').length;
    const pendingApprovals = wallet.queuedApprovals.filter(request => request.status === 'PENDING').length;
    const categories = categoryOrder.map(category => ({
        category,
        amount: agents.filter(agent => agent.category === category).reduce((sum, agent) => sum + agent.spentToday, 0),
        ...categoryStyle[category],
    }));
    const circumference = 2 * Math.PI * 72;
    let running = 0;

    return (
        <div className="space-y-7">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Account summary">
                <div className="dashboard-kpi dashboard-kpi-primary">
                    <div className="flex items-center justify-between"><span className="dashboard-kpi-label text-white/70">Treasury balance</span><Wallet className="h-5 w-5 text-white/65" /></div>
                    <div className="mt-6 text-[clamp(1.65rem,3vw,2.375rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums">{compactINR(wallet.usdcBalance)}</div>
                    <p className="mt-3 text-xs text-white/65">Simulated account funds</p>
                </div>
                <div className="dashboard-kpi">
                    <div className="flex items-center justify-between"><span className="dashboard-kpi-label">Agent spend today</span><ArrowUpRight className="h-5 w-5 text-stone-400" /></div>
                    <div className="mt-6 text-[clamp(1.65rem,3vw,2.375rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums text-stone-950">{compactINR(fleetSpend)}</div>
                    <p className="mt-3 text-xs text-stone-500">Across {agents.length} visible agents</p>
                </div>
                <div className="dashboard-kpi">
                    <div className="flex items-center justify-between"><span className="dashboard-kpi-label">Active agents</span><Bot className="h-5 w-5 text-stone-400" /></div>
                    <div className="mt-6 text-[clamp(1.65rem,3vw,2.375rem)] font-semibold leading-none tracking-[-0.05em] text-stone-950">{activeAgents}<span className="ml-1 text-lg font-normal text-stone-400">/ {agents.length}</span></div>
                    <p className="mt-3 text-xs text-stone-500">In the visible fleet</p>
                </div>
                <div className="dashboard-kpi">
                    <div className="flex items-center justify-between"><span className="dashboard-kpi-label">Needs approval</span><CircleAlert className="h-5 w-5 text-stone-400" /></div>
                    <div className="mt-6 text-[clamp(1.65rem,3vw,2.375rem)] font-semibold leading-none tracking-[-0.05em] text-stone-950">{pendingApprovals}</div>
                    <p className="mt-3 text-xs text-stone-500">Pending requests</p>
                </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,1fr)]" aria-label="Spending charts">
                <div className="dashboard-panel">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="dashboard-eyebrow">SPENDING ANALYSIS</p><h2 className="dashboard-panel-title">Budget used by agent</h2><p className="dashboard-panel-subtitle">Today’s simulated spend against each agent’s daily limit.</p></div>
                        <div className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">{compactINR(fleetSpend)} of {compactINR(fleetBudget)}</div>
                    </div>
                    <div className="mt-8 space-y-5">
                        {agents.map(agent => {
                            const ratio = agent.dailyBudget > 0 ? Math.min(100, agent.spentToday / agent.dailyBudget * 100) : 0;
                            const selected = wallet.activeAgentId === agent.id;
                            return (
                                <button key={agent.id} onClick={() => onSelectAgent(agent.id)} className="group block w-full rounded-xl text-left focus-visible:outline-offset-4" title={`Select ${agent.name}`}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="flex min-w-0 items-center gap-2.5"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${selected ? 'bg-[#123b32] text-white' : 'bg-stone-100 text-stone-600'}`}>{agent.tag}</span><span className="truncate text-[13px] font-semibold text-stone-800 group-hover:text-emerald-800">{agent.name}</span></span>
                                        <span className="shrink-0 text-xs font-medium tabular-nums text-stone-600">{Math.round(ratio)}% <span className="hidden text-stone-400 sm:inline">· {compactINR(agent.spentToday)} / {compactINR(agent.dailyBudget)}</span></span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full transition-all duration-500 ${ratio >= 80 ? 'bg-amber-500' : 'bg-[#17806a]'}`} style={{ width: `${ratio}%` }} /></div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4 text-xs text-stone-500">
                        <span>Each bar shows the share of that agent’s own daily limit.</span>
                        <span>Click an agent to select it</span>
                    </div>
                </div>

                <div className="dashboard-panel">
                    <p className="dashboard-eyebrow">FLEET MIX</p>
                    <h2 className="dashboard-panel-title">Spend by team</h2>
                    <p className="dashboard-panel-subtitle">Share of today’s spend for the visible agents.</p>
                    <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
                        <div className="relative h-52 w-52 shrink-0">
                            <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`Spend by team, total ${formatINR(fleetSpend)}`}>
                                <circle cx="100" cy="100" r="72" fill="none" stroke="#f1f0ed" strokeWidth="22" />
                                {categories.map(item => {
                                    const fraction = fleetSpend > 0 ? item.amount / fleetSpend : 0;
                                    const offset = running;
                                    running += fraction;
                                    return <circle key={item.category} cx="100" cy="100" r="72" fill="none" stroke={item.color} strokeWidth="22" strokeDasharray={`${fraction * circumference} ${circumference}`} strokeDashoffset={-offset * circumference} transform="rotate(-90 100 100)" />;
                                })}
                            </svg>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xs font-medium text-stone-500">Total spend</span><span className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{compactINR(fleetSpend)}</span></div>
                        </div>
                        <div className="w-full space-y-3">
                            {categories.map(item => <div key={item.category} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2.5 text-stone-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</span><span className="font-semibold tabular-nums text-stone-800">{compactINR(item.amount)}</span></div>)}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3" aria-label="Quick actions">
                <button onClick={onOpenSimulator} className="dashboard-quick-action"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><ShieldCheck className="h-5 w-5" /></span><span className="min-w-0 flex-1 text-left"><strong>Run a simulation</strong><small>See how policy handles an action</small></span><ArrowRight className="h-4 w-4 text-stone-400" /></button>
                <button onClick={onOpenActivity} className="dashboard-quick-action"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-800"><ArrowUpRight className="h-5 w-5" /></span><span className="min-w-0 flex-1 text-left"><strong>Review activity</strong><small>Inspect recent agent actions</small></span><ArrowRight className="h-4 w-4 text-stone-400" /></button>
                <button onClick={onOpenPolicy} className="dashboard-quick-action"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><CreditCard className="h-5 w-5" /></span><span className="min-w-0 flex-1 text-left"><strong>Manage policy</strong><small>Limits, keys, and destinations</small></span><ArrowRight className="h-4 w-4 text-stone-400" /></button>
            </section>
        </div>
    );
};
