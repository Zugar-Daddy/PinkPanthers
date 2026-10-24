'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, CircleAlert, LockKeyhole, Play, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { AgentWalletClient, formatINR } from '../lib/web3/agentWalletClient';

type SimulationResult = { status: 'EXECUTED' | 'QUEUED' | 'REVERTED'; reason: string };
interface AgentActionSimulatorProps {
    wallet: AgentWalletClient;
    onExecuteAction: (targetName: string, targetAddress: string, functionCalled: string, amount: number, description: string) => Promise<SimulationResult>;
}
type Scenario = 'allowed' | 'approval' | 'blocked' | 'custom';

const scenarios: { id: Scenario; title: string; detail: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'allowed', title: 'Within policy', detail: 'An approved payment under the limit', icon: Check },
    { id: 'approval', title: 'Over the limit', detail: 'A payment that needs owner approval', icon: CircleAlert },
    { id: 'blocked', title: 'Unknown destination', detail: 'A payment to an unapproved address', icon: ShieldAlert },
    { id: 'custom', title: 'Custom amount', detail: 'Choose a vendor and test your own value', icon: SlidersHorizontal },
];

export const AgentActionSimulator: React.FC<AgentActionSimulatorProps> = ({ wallet, onExecuteAction }) => {
    const [scenario, setScenario] = useState<Scenario>('allowed');
    const [vendorIndex, setVendorIndex] = useState(0);
    const [customAmount, setCustomAmount] = useState('1200');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const agent = wallet.fleet.find(item => item.id === wallet.activeAgentId);
    const limit = agent?.maxPerTx ?? wallet.policy.maxPerTx;
    const budget = agent?.dailyBudget ?? wallet.policy.dailyBudget;
    const spent = agent?.spentToday ?? wallet.dailySpent;
    const remaining = Math.max(0, budget - spent);
    const allowedVendor = wallet.policy.allowedContracts[Math.min(vendorIndex, wallet.policy.allowedContracts.length - 1)];
    const safeAmount = Math.max(1, Math.min(1200, limit, remaining));
    const amount = scenario === 'approval' ? limit + 500 : scenario === 'blocked' ? 500 : scenario === 'custom' ? Number(customAmount) : safeAmount;
    const targetName = scenario === 'blocked' ? 'Unknown destination' : allowedVendor?.name ?? 'Approved vendor';
    const targetAddress = scenario === 'blocked' ? '0x9999999999999999999999999999999999999999' : allowedVendor?.address ?? '';
    const functionName = allowedVendor?.selector.match(/\(([^)]+)\)/)?.[1] ?? 'payInvoice';
    const functionCalled = `${functionName}(uint256 ${amount})`;
    const blocked = scenario === 'blocked' || !wallet.sessionActive || (agent?.cardDetails.isFrozen ?? wallet.virtualCard.isFrozen);
    const approval = !blocked && (amount > limit || amount > remaining);
    const prediction = blocked ? 'Blocked' : approval ? 'Needs approval' : 'Within policy';
    const predictionStyle = blocked ? 'bg-rose-50 text-rose-700 ring-rose-200' : approval ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200';

    const run = async () => {
        if (!Number.isFinite(amount) || amount <= 0 || !targetAddress || running) return;
        setRunning(true);
        setResult(null);
        try {
            const nextResult = await onExecuteAction(targetName, targetAddress, functionCalled, amount, `Dashboard simulation: ${scenario} scenario`);
            setResult(nextResult);
        } catch {
            setResult({ status: 'REVERTED', reason: 'Simulation could not run. Please try again.' });
        } finally {
            setRunning(false);
        }
    };

    return (
        <section className="dashboard-panel" aria-labelledby="simulation-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="dashboard-eyebrow">SIMULATION LAB</p><h2 id="simulation-heading" className="dashboard-panel-title">Test an agent action</h2><p className="dashboard-panel-subtitle">Choose a scenario, review the policy check, then run it in the local simulator.</p></div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600"><LockKeyhole className="h-3.5 w-3.5" /> Demo only</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {scenarios.map(item => {
                    const Icon = item.icon;
                    return <button key={item.id} onClick={() => { setScenario(item.id); setResult(null); }} className={`rounded-2xl border p-4 text-left transition ${scenario === item.id ? 'border-[#17806a] bg-emerald-50/60 shadow-[0_0_0_2px_rgba(23,128,106,.12)]' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'}`} aria-pressed={scenario === item.id}>
                        <Icon className={`h-5 w-5 ${scenario === item.id ? 'text-emerald-800' : 'text-stone-500'}`} />
                        <strong className="mt-4 block text-sm text-stone-900">{item.title}</strong>
                        <span className="mt-1 block text-xs leading-5 text-stone-500">{item.detail}</span>
                    </button>;
                })}
            </div>

            <div className="mt-5 grid gap-5 rounded-2xl border border-stone-200 bg-[#fafaf8] p-5 lg:grid-cols-[minmax(0,1fr)_minmax(290px,.8fr)] lg:p-6">
                <div>
                    <h3 className="text-sm font-semibold text-stone-900">Action details</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div><span className="dashboard-field-label">Agent</span><div className="dashboard-field-value">{agent?.name ?? wallet.agentName}</div></div>
                        <div><span className="dashboard-field-label">Amount</span><div className="dashboard-field-value">{Number.isFinite(amount) && amount > 0 ? formatINR(amount) : 'Enter an amount'}</div></div>
                        {scenario === 'custom' ? <>
                            <label className="sm:col-span-2"><span className="dashboard-field-label">Approved destination</span><select value={vendorIndex} onChange={event => { setVendorIndex(Number(event.target.value)); setResult(null); }} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-emerald-700">{wallet.policy.allowedContracts.map((vendor, index) => <option value={index} key={vendor.address}>{vendor.name}</option>)}</select></label>
                            <label className="sm:col-span-2"><span className="dashboard-field-label">Amount in INR</span><input type="number" min="1" step="0.01" value={customAmount} onChange={event => { setCustomAmount(event.target.value); setResult(null); }} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-emerald-700" /></label>
                        </> : <div className="sm:col-span-2"><span className="dashboard-field-label">Destination</span><div className="dashboard-field-value">{targetName}</div></div>}
                    </div>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-stone-900">Policy preview</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${predictionStyle}`}>{prediction}</span></div>
                    <div className="mt-4 space-y-3 text-xs text-stone-600">
                        <div className="flex justify-between gap-2"><span>Per action limit</span><strong className="text-stone-900">{formatINR(limit)}</strong></div>
                        <div className="flex justify-between gap-2"><span>Remaining today</span><strong className="text-stone-900">{formatINR(remaining)}</strong></div>
                        <div className="flex justify-between gap-2"><span>Destination</span><strong className="text-stone-900">{scenario === 'blocked' ? 'Not approved' : 'Approved'}</strong></div>
                    </div>
                    <div className="mt-5 border-t border-stone-100 pt-4">
                        <p className="text-xs font-semibold text-stone-800">Daily budget impact</p>
                        <div className="mt-3 space-y-3 text-[11px] text-stone-500">
                            <div><div className="mb-1.5 flex justify-between"><span>Current</span><span>{formatINR(spent)}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-stone-400" style={{ width: `${budget > 0 ? Math.min(100, spent / budget * 100) : 0}%` }} /></div></div>
                            <div><div className="mb-1.5 flex justify-between"><span>If completed</span><span>{Number.isFinite(amount) && amount > 0 ? formatINR(spent + amount) : '—'}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${spent + amount > budget ? 'bg-amber-500' : 'bg-[#17806a]'}`} style={{ width: `${budget > 0 && Number.isFinite(amount) && amount > 0 ? Math.min(100, (spent + amount) / budget * 100) : 0}%` }} /></div></div>
                        </div>
                    </div>
                    <button onClick={run} disabled={running || !Number.isFinite(amount) || amount <= 0 || !targetAddress} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#123b32] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0b2d25] disabled:cursor-not-allowed disabled:bg-stone-300"><Play className="h-4 w-4" /> {running ? 'Running simulation…' : 'Run simulation'} <ArrowRight className="h-4 w-4" /></button>
                </div>
            </div>

            {result && <div role="status" className={`mt-4 rounded-xl border p-4 text-sm ${result.status === 'EXECUTED' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : result.status === 'QUEUED' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}><strong className="block">{result.status === 'EXECUTED' ? 'Simulation completed' : result.status === 'QUEUED' ? 'Owner approval requested' : 'Action blocked'}</strong><span className="mt-1 block">{result.reason}</span></div>}
        </section>
    );
};
