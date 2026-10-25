'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Search, Sparkles } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';
import { OwnerVerificationModal } from './OwnerVerificationModal';

type Transaction = { token: string; quote: { id: string } };
type Receipt = { id: string; kind: string; title: string; recipient: string; amountMinor: number; balanceAfter: number; completedAt: string; ownerOverride?: boolean };
type Listing = { title: string; merchant: string; price: number | null; currency: string | null; priceEvidence: string | null; url: string; sourceTitle: string; transaction?: Transaction };
type Plan = { action: 'RESEARCH' | 'TRANSFER' | 'CARD_FREEZE' | 'CARD_UNFREEZE' | 'UNSUPPORTED'; summary: string; agentId?: string; options: Listing[]; missingDetails: string[]; researchedAt: string | null; cached?: boolean; autoExecute?: boolean; transaction?: Transaction };

const examples = [
    'Buy me a 1 kg pack of bananas in Bengaluru under ₹150',
    'Transfer ₹500 to alex@upi',
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
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [retryTransaction, setRetryTransaction] = useState<Transaction | null>(null);
    const [ownerApproval, setOwnerApproval] = useState<{ transaction: Transaction; details: string[] } | null>(null);
    const [stage, setStage] = useState('');
    const busy = useRef(false);
    const sessionNeedsRenewal = !wallet.sessionActive || !Number.isFinite(wallet.sessionExpiresAt) || wallet.sessionExpiresAt <= Date.now() || error.includes('Agent session expired or inactive');
    const command = useRef<{ query: string; id: string } | null>(null);
    const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    const loadReceipts = async () => {
        try {
            const response = await fetch('/api/copilot/transactions', { cache: 'no-store' });
            if (response.ok) { const data = await response.json(); setReceipts(data.receipts || []); }
        } catch { /* The current receipt remains visible if history cannot refresh. */ }
    };
    useEffect(() => { void loadReceipts(); }, []);
    function requestId(text: string) {
        if (!command.current) {
            try { command.current = JSON.parse(sessionStorage.getItem('copilot-simulation-command') || 'null'); } catch { /* Storage is optional. */ }
        }
        if (command.current?.query !== text || !command.current?.id) command.current = { query: text, id: crypto.randomUUID() };
        try { sessionStorage.setItem('copilot-simulation-command', JSON.stringify(command.current)); } catch { /* In-memory retry still works. */ }
        return command.current!.id;
    }
    const execute = async (transaction: Transaction, ownerProof?: string) => {
        setStage('Completing simulated transaction…'); setError(''); setRetryTransaction(transaction);
        const response = await fetch('/api/copilot/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: transaction.token, ownerProof }) });
        const result = await response.json();
        if (result.code === 'OWNER_APPROVAL_REQUIRED') setOwnerApproval({ transaction, details: [result.review.title, `Recipient: ${result.review.recipient}`, `Amount: ${money(result.review.amount)}`, `Agent: ${result.review.agentId}`, result.review.reason, 'Approve only this simulated transaction. Your standing policy stays unchanged.'] });
        if (!response.ok) throw new Error(result.error || 'Simulated transaction failed');
        setReceipt(result.receipt); setRetryTransaction(null); setOwnerApproval(null);
        setNotice('Completed using your simulated wallet. No real order, booking, or funds transfer was made.');
        await wallet.syncFromServer(); await loadReceipts();
    };
    const buy = async (transaction: Transaction) => {
        if (busy.current) return;
        busy.current = true; setLoading(true);
        try { await execute(transaction); }
        catch (cause: any) { setError(cause?.message || 'Could not confirm completion. Retry the same transaction safely.'); }
        finally { busy.current = false; setLoading(false); }
    };
    const renewSession = async () => {
        if (busy.current) return;
        busy.current = true; setLoading(true); setStage('Renewing agent session…'); setError(''); setNotice('');
        try {
            const response = await fetch('/api/wallet/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'renew_session', payload: { agentId: wallet.activeAgentId } }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Session renewal failed');
            await wallet.syncFromServer();
            setNotice(`Session renewed until ${new Date(result.state.activeAgent.sessionExpiresAt).toLocaleString()}. Retry your transaction; if its quote has expired, refresh prices first.`);
        } catch (cause: any) { setError(cause?.message || 'Session renewal failed'); }
        finally { busy.current = false; setLoading(false); }
    };
    function newRequest() {
        command.current = null;
        try { sessionStorage.removeItem('copilot-simulation-command'); } catch { /* Storage is optional. */ }
        setOwnerApproval(null); setPlan(null); setReceipt(null); setQuery(''); setError(''); setNotice(''); setRetryTransaction(null);
    }
    const pendingLookup = useRef<AbortController | null>(null);
    useEffect(() => () => { const pending = pendingLookup.current; pendingLookup.current = null; pending?.abort(); }, []);

    const research = async (request = query, refresh = false) => {
        const text = request.trim();
        if (!text || busy.current) return;
        busy.current = true;
        const controller = new AbortController();
        pendingLookup.current = controller;
        setOwnerApproval(null); setQuery(text); setLoading(true); setStage('Preparing your request…'); setError(''); setNotice(''); setRetryTransaction(null);
        if (!refresh) { setPlan(null); setReceipt(null); }
        try {
            const response = await fetch('/api/copilot/plan', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text, refresh, requestId: requestId(text) }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Live research failed');
            if (pendingLookup.current === controller && !controller.signal.aborted) {
                setPlan(result); setPlanQuery(text); setAgentId(result.agentId || wallet.activeAgentId);
                pendingLookup.current = null;
                if (!refresh && result.autoExecute && result.transaction) await execute(result.transaction);
            }
        } catch (cause: any) {
            if (controller.signal.aborted) setNotice('Lookup cancelled.');
            else setError(cause?.message || 'Unable to complete this request');
        } finally {
            if (pendingLookup.current === controller) pendingLookup.current = null;
            busy.current = false; setLoading(false);
        }
    };

    const approveCardAction = async () => {
        if (!plan || busy.current || (plan.action !== 'CARD_FREEZE' && plan.action !== 'CARD_UNFREEZE')) return;
        busy.current = true; setLoading(true); setStage('Updating card…'); setError('');
        try {
            const frozen = plan.action === 'CARD_FREEZE';
            const response = await fetch('/api/wallet/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_card_frozen', payload: { agentId, frozen } }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Card update failed');
            await wallet.syncFromServer();
            setNotice(`Card ${frozen ? 'frozen' : 'unfrozen'} in local wallet state for ${agentId}.`); setPlan(null);
        } catch (cause: any) { setError(cause?.message || 'Card update failed'); }
        finally { busy.current = false; setLoading(false); }
    };

    return <section className="min-w-0 rounded-[24px] border border-stone-200/90 bg-white p-5 shadow-card space-y-5 font-sans sm:p-8">
        {ownerApproval && <OwnerVerificationModal intent={{ kind: 'transaction_override', token: ownerApproval.transaction.token }} title="Approve this spending-limit exception" details={ownerApproval.details} onClose={() => setOwnerApproval(null)} onVerified={async proof => {
            if (busy.current) throw new Error('Another copilot action is still running. Try again.');
            busy.current = true; setLoading(true);
            try { await execute(ownerApproval.transaction, proof); }
            finally { busy.current = false; setLoading(false); }
        }} />}
        <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><Sparkles className="h-5 w-5" /></div>
            <div className="min-w-0"><h2 className="text-xl font-serif font-medium text-stone-950">Ask your copilot</h2>
                <p className="mt-1 text-sm text-stone-600">Say “buy” to purchase a matching live listing, or “transfer ₹500 to alex@upi” to send simulated funds. Say “find” or “compare” to research.</p>
                <p className="mt-1 text-xs text-stone-500">Simulation mode · {money(wallet.usdcBalance)} available · Transactions deduct simulated INR only. No real purchases, delivery, bookings, or bank transfers.</p></div>
        </div>
        {sessionNeedsRenewal && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 space-y-2">
            <p>The selected agent’s spending session has expired or is inactive. Renew it for {wallet.policy.sessionExpiryHours} hours to enable simulated purchases and transfers.</p>
            <button type="button" disabled={loading} onClick={() => void renewSession()} className="rounded-lg bg-[#123b32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Renew session</button>
        </div>}
        <form onSubmit={event => { event.preventDefault(); void research(); }} className="flex flex-wrap gap-2">
            <input aria-label="Task for your copilot" value={query} maxLength={600} onChange={event => setQuery(event.target.value)} disabled={loading} placeholder="What would you like to find or do?" className="min-w-0 basis-full flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-700 sm:basis-0" />
            <button type="submit" disabled={loading || !query.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123b32] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"><Search className="h-4 w-4" /> {loading ? 'Working…' : 'Run'}</button>
        </form>
        <div className="flex flex-wrap gap-2">{examples.map(example => <button key={example} type="button" disabled={loading} onClick={() => setQuery(example)} className="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:border-emerald-400 hover:text-emerald-900">{example}</button>)}</div>
        {loading && <div className="flex items-center gap-3 text-sm text-stone-600"><p role="status">{stage}</p>
            {pendingLookup.current && <button type="button" onClick={() => pendingLookup.current?.abort()} className="underline">Cancel lookup</button>}
        </div>}
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
        {retryTransaction && !loading && <button type="button" onClick={() => void buy(retryTransaction)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Retry same simulated transaction</button>}
        {receipt && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm text-emerald-950">
            <h3 className="font-semibold">Simulated {receipt.kind === 'PURCHASE' ? 'purchase' : 'transfer'} completed</h3>
            {receipt.ownerOverride && <p className="text-xs font-medium">Owner verified · One-time policy exception · Standing limits unchanged</p>}
            <p>{receipt.title}</p><p className="break-all">Recipient: {receipt.recipient}</p>
            <p>Deducted: <strong>{money(receipt.amountMinor / 100)}</strong> · Balance after transaction: <strong>{money(receipt.balanceAfter)}</strong></p>
            <p className="break-all text-xs">Receipt {receipt.id} · {new Date(receipt.completedAt).toLocaleString()}</p>
            <p className="text-xs">{receipt.kind === 'PURCHASE' ? 'Amount covers the cited listing only; merchant shipping and checkout taxes are not calculated. No fulfillment is arranged.' : 'This records a simulated outgoing transfer. The recipient receives no real funds.'}</p>
            <button type="button" disabled={loading} onClick={newRequest} className="underline">Start a new request</button>
        </div>}
        {plan && !receipt && <div className="space-y-4 border-t border-stone-200 pt-5">
            <p className="text-sm text-stone-800">{plan.summary}</p>
            {plan.missingDetails?.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>Details to confirm:</strong> {plan.missingDetails.join(' · ')}</p>}
            {plan.action === 'RESEARCH' && <>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500"><p>{plan.cached ? 'Recent result · ' : ''}Sources checked {plan.researchedAt ? new Date(plan.researchedAt).toLocaleString() : 'just now'}. Quotes expire after five minutes. Only cited INR prices can be used for simulated checkout.</p>
                    <button type="button" disabled={loading} onClick={() => void research(planQuery, true)} className="underline disabled:opacity-50">Refresh prices</button>
                </div>
                {plan.options.length === 0 && <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">No verifiable listing was found. Add a location, date, quantity, or product variant and try again.</p>}
                {!plan.autoExecute && plan.options.length > 0 && <p className="text-sm text-stone-600">Choose one listing below to buy the displayed sale unit using your simulated wallet.</p>}
                <div className="grid gap-3 lg:grid-cols-2">{plan.options.map((item, index) => <article key={`${item.url}-${index}`} className="min-w-0 rounded-xl border border-stone-200 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{item.merchant}</p><h3 className="font-semibold text-stone-900">{item.title}</h3>
                    <p className="text-sm font-semibold text-emerald-800">{priceLabel(item)}</p>
                    {item.priceEvidence && <p className="text-xs text-stone-600">Cited research excerpt: “{item.priceEvidence}”</p>}
                    <p className="text-xs text-stone-500">Source: {item.sourceTitle} · {new URL(item.url).hostname}</p>
                    <div className="flex flex-wrap items-center gap-3">
                        {item.transaction && <button type="button" disabled={loading} onClick={() => void buy(item.transaction!)} className="rounded-lg bg-[#123b32] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Buy with simulated wallet</button>}
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs underline">View source <ExternalLink className="h-3.5 w-3.5" /></a>
                    </div>
                </article>)}</div>
            </>}
            {plan.action === 'TRANSFER' && plan.transaction && !plan.autoExecute && <button type="button" disabled={loading} onClick={() => void buy(plan.transaction!)} className="rounded-lg bg-[#123b32] px-4 py-2 text-sm text-white">Complete simulated transfer</button>}
            {(plan.action === 'CARD_FREEZE' || plan.action === 'CARD_UNFREEZE') && <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                <p className="text-sm text-stone-700">Review the card and approve this local card control action.</p>
                <select aria-label="Agent card" value={agentId} onChange={event => setAgentId(event.target.value)} className="max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">{wallet.fleet.map(agent => <option key={agent.id} value={agent.id}>{agent.name} · {agent.cardDetails.maskedNumber}</option>)}</select>
                <div><button type="button" disabled={loading} onClick={() => void approveCardAction()} className="rounded-lg bg-[#123b32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve {plan.action === 'CARD_FREEZE' ? 'freeze' : 'unfreeze'}</button></div>
            </div>}
            {plan.action === 'UNSUPPORTED' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Supported actions are live research, simulated listing purchases, simulated INR transfers, and card controls. No transaction was attempted.</p>}
        </div>}
        {receipts.length > 0 && <details className="border-t border-stone-200 pt-4 text-sm"><summary className="cursor-pointer font-semibold text-stone-800">Recent simulated receipts</summary>
            <ul className="mt-3 space-y-3">{receipts.map(item => <li key={item.id} className="rounded-lg border border-stone-200 p-3"><p>{item.title} · {money(item.amountMinor / 100)}</p><p className="break-all text-xs text-stone-500">{new Date(item.completedAt).toLocaleString()} · {item.id}</p></li>)}</ul>
        </details>}
    </section>;
}
