'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Search, Sparkles } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

type Listing = { title: string; merchant: string; price: number | null; currency: string | null; priceEvidence: string | null; url: string; sourceTitle: string };
type Plan = { action: 'RESEARCH' | 'CARD_FREEZE' | 'CARD_UNFREEZE' | 'UNSUPPORTED'; summary: string; agentId?: string; options: Listing[]; missingDetails: string[]; researchedAt: string | null; cached?: boolean };

const examples = [
    'Find bananas available for delivery in Bengaluru',
    'Find flights from Delhi to Bengaluru next Friday',
    'Compare 27 inch 4K monitors under ₹30,000',
    'Find an AWS support plan for a small startup',
    'Freeze the concierge card'
];

function priceLabel(item: Listing) {
    if (item.price === null || !item.currency) return 'Check current price at merchant';
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency }).format(item.price); }
    catch { return `${item.price} ${item.currency}`; }
}

export function LiveOmniAgentCopilot({ wallet }: { wallet: AgentWalletClient }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [agentId, setAgentId] = useState(wallet.activeAgentId);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [planQuery, setPlanQuery] = useState('');
    const pendingLookup = useRef<AbortController | null>(null);
    useEffect(() => () => { const pending = pendingLookup.current; pendingLookup.current = null; pending?.abort(); }, []);

    const research = async (request = query, refresh = false) => {
        const text = request.trim();
        if (!text || loading) return;
        const controller = new AbortController();
        pendingLookup.current = controller;
        setQuery(text); setLoading(true); setError(''); setNotice('');
        if (!refresh) setPlan(null);
        try {
            const response = await fetch('/api/copilot/plan', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text, refresh }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Live research failed');
            if (pendingLookup.current === controller) {
                setPlan(result); setPlanQuery(text); setAgentId(result.agentId || wallet.activeAgentId);
            }
        } catch (cause: any) {
            if (pendingLookup.current === controller) {
                if (controller.signal.aborted) setNotice('Lookup cancelled.');
                else setError(cause?.message || 'Unable to research this request');
            }
        } finally {
            if (pendingLookup.current === controller) { pendingLookup.current = null; setLoading(false); }
        }
    };

    const approveCardAction = async () => {
        if (!plan || (plan.action !== 'CARD_FREEZE' && plan.action !== 'CARD_UNFREEZE')) return;
        setLoading(true); setError('');
        try {
            const frozen = plan.action === 'CARD_FREEZE';
            const response = await fetch('/api/wallet/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_card_frozen', payload: { agentId, frozen } }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Card update failed');
            await wallet.syncFromServer();
            setNotice(`Card ${frozen ? 'frozen' : 'unfrozen'} in local wallet state for ${agentId}.`); setPlan(null);
        } catch (cause: any) { setError(cause?.message || 'Card update failed'); }
        finally { setLoading(false); }
    };

    return <section className="rounded-[24px] border border-stone-200/90 bg-white p-6 shadow-card space-y-5 font-sans sm:p-8">
        <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><Sparkles className="h-5 w-5" /></div>
            <div><h2 className="text-xl font-serif font-medium text-stone-950">Ask your copilot</h2>
                <p className="mt-1 text-sm text-stone-600">Ask for any product, trip, or service. The AI searches live sources and prepares options for your review.</p>
                <p className="mt-1 text-xs text-stone-500">Review sourced options here, then complete checkout at the merchant.</p></div>
        </div>
        <form onSubmit={event => { event.preventDefault(); void research(); }} className="flex gap-2">
            <input aria-label="Task for your copilot" value={query} onChange={event => setQuery(event.target.value)} disabled={loading} placeholder="What would you like to find or do?" className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-700" />
            <button type="submit" disabled={loading || !query.trim()} className="flex items-center gap-2 rounded-xl bg-[#123b32] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Search className="h-4 w-4" /> {loading ? 'Working…' : 'Research'}</button>
        </form>
        <div className="flex flex-wrap gap-2">{examples.map(example => <button key={example} type="button" disabled={loading} onClick={() => void research(example)} className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:border-emerald-400 hover:text-emerald-900">{example}</button>)}</div>
        {loading && <div className="flex items-center gap-3 text-sm text-stone-600"><p role="status">{pendingLookup.current ? 'Checking live prices…' : 'Updating card…'}</p>
            {pendingLookup.current && <button type="button" onClick={() => pendingLookup.current?.abort()} className="underline">Cancel lookup</button>}
        </div>}
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
        {plan && <div className="space-y-4 border-t border-stone-200 pt-5">
            <p className="text-sm text-stone-800">{plan.summary}</p>
            {plan.missingDetails?.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>Details to confirm:</strong> {plan.missingDetails.join(' · ')}</p>}
            {plan.action === 'RESEARCH' && <>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500"><p>{plan.cached ? 'Recent result · ' : ''}Sources checked {plan.researchedAt ? new Date(plan.researchedAt).toLocaleString() : 'just now'}. Prices and availability can change. No order or payment has been placed.</p>
                    <button type="button" disabled={loading} onClick={() => void research(planQuery, true)} className="underline disabled:opacity-50">Refresh prices</button>
                </div>
                {plan.options.length === 0 && <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">No verifiable listing was found. Add a location, date, quantity, or product variant and try again.</p>}
                <div className="grid gap-3 md:grid-cols-2">{plan.options.map((item, index) => <article key={`${item.url}-${index}`} className="rounded-xl border border-stone-200 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{item.merchant}</p><h3 className="font-semibold text-stone-900">{item.title}</h3>
                    <p className="text-sm font-semibold text-emerald-800">{priceLabel(item)}</p>
                    {item.priceEvidence && <p className="text-xs text-stone-600">Cited research excerpt: “{item.priceEvidence}”</p>}
                    <p className="text-xs text-stone-500">Source: {item.sourceTitle} · {new URL(item.url).hostname}</p>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => setNotice(`Opened ${item.merchant} for your review. Complete checkout on the merchant site.`)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#123b32] px-3 py-2 text-xs font-semibold text-white">Approve and view listing <ExternalLink className="h-3.5 w-3.5" /></a>
                </article>)}</div>
            </>}
            {(plan.action === 'CARD_FREEZE' || plan.action === 'CARD_UNFREEZE') && <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                <p className="text-sm text-stone-700">Review the card and approve this local card control action.</p>
                <select aria-label="Agent card" value={agentId} onChange={event => setAgentId(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">{wallet.fleet.map(agent => <option key={agent.id} value={agent.id}>{agent.name} · {agent.cardDetails.maskedNumber}</option>)}</select>
                <div><button type="button" disabled={loading} onClick={() => void approveCardAction()} className="rounded-lg bg-[#123b32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve {plan.action === 'CARD_FREEZE' ? 'freeze' : 'unfreeze'}</button></div>
            </div>}
            {plan.action === 'UNSUPPORTED' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">This action needs a connected merchant, bank, or payment provider. No transaction was attempted.</p>}
        </div>}
    </section>;
}
