'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, CheckCircle2, Coins, CreditCard, Loader2, PieChart, Receipt, ShieldCheck, X, Zap } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';
import { BillingCycle, BillingState, economics, estimatedActions, GasRefill, PlanId, PLANS, REFILL_AMOUNTS } from '../lib/billing/plans';
import { panelButton, panelCard, rupees } from './businessStyles';

function GasTankRefillModal({ wallet, onClose, onRefilled }: { wallet: AgentWalletClient; onClose: () => void; onRefilled: (billing: BillingState) => void }) {
    const [amount, setAmount] = useState<number>(1000);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState<GasRefill | null>(null);
    const [retrying, setRetrying] = useState(false);
    const command = useRef<{ id: string; amount: number } | null>(null);
    const busy = useRef(false);
    const dialog = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem('gas-tank-refill-pending') || 'null');
            if (saved && typeof saved.id === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(saved.id) && (REFILL_AMOUNTS as readonly number[]).includes(saved.amount)) { command.current = saved; setAmount(saved.amount); setRetrying(true); }
        } catch { /* A fresh in-memory command works without storage. */ }
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
        closeButton.current?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, []);
    const pay = async () => {
        if (busy.current) return;
        busy.current = true; setPending(true); setError('');
        const request = command.current || { id: crypto.randomUUID(), amount };
        command.current = request; setRetrying(true);
        try { sessionStorage.setItem('gas-tank-refill-pending', JSON.stringify(request)); } catch { /* Idempotency still works for retries in this modal. */ }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch('/api/billing', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refill', amount: request.amount, requestId: request.id }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Simulated refill failed');
            wallet._applyState(result.state); onRefilled(result.billing); setReceipt(result.receipt);
            command.current = null; setRetrying(false);
            try { sessionStorage.removeItem('gas-tank-refill-pending'); } catch { /* Storage is optional. */ }
        } catch (cause: any) {
            setError(controller.signal.aborted ? 'Confirmation timed out. Retry this same refill safely; it can only be credited once.' : cause?.message || 'Unable to confirm refill. Retry the same request.');
        } finally { clearTimeout(timer); busy.current = false; setPending(false); }
    };
    const handleKey = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape' && !busy.current) { event.preventDefault(); onClose(); }
        if (event.key !== 'Tab') return;
        const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), [tabindex="0"]');
        if (!nodes?.length) { event.preventDefault(); dialog.current?.focus(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-stone-900/40 p-4 backdrop-blur-md" onMouseDown={e => { if (e.target === e.currentTarget && !busy.current) onClose(); }}>
        <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="refill-title" onKeyDown={handleKey} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200/90 bg-white p-6 text-stone-900 shadow-modal sm:p-7">
            <div className="flex items-start justify-between gap-3"><div><span className="inline-block rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium tracking-wide text-emerald-800">UPI / Razorpay-style demo</span><h3 id="refill-title" className="mt-3 text-2xl font-serif font-semibold tracking-tight">Refill your gas tank</h3></div><button ref={closeButton} type="button" aria-label="Close refill dialog" disabled={pending} onClick={onClose} className="rounded-xl border border-stone-200 bg-white p-2 disabled:opacity-40"><X size={18} /></button></div>
            <p className="mt-3 text-sm text-stone-600">Simulated checkout. No UPI payment, Razorpay charge, bank transfer or on-chain deposit will be made.</p>
            {receipt ? <div role="status" className="mt-5 space-y-4"><div className="rounded-xl border border-stone-200 bg-emerald-50 p-4"><CheckCircle2 size={28} /><h4 className="mt-2 text-xl font-serif font-semibold tracking-tight">Gas credits added</h4><p className="mt-1">{rupees(receipt.amount)} credited once to the simulated tank.</p><p className="mt-2 text-sm">Balance after this refill: <strong>{rupees(receipt.balanceAfter)}</strong></p></div><p className="break-all text-xs">Receipt {receipt.id} · {new Date(receipt.createdAt).toLocaleString()}</p><button onClick={onClose} className={`${panelButton} w-full bg-[#123b32] text-white`}>Done</button></div> : <>
                <p className="mt-5 text-xs font-semibold uppercase">Choose credit amount</p>
                <div className="mt-2 grid grid-cols-3 gap-3" role="group" aria-label="Refill amount">{REFILL_AMOUNTS.map(value => <button key={value} type="button" disabled={pending || retrying} aria-pressed={amount === value} onClick={() => setAmount(value)} className={`${panelButton} !px-1 ${amount === value ? 'bg-emerald-50' : 'bg-white'}`}>{rupees(value)}</button>)}</div>
                <dl className="mt-5 space-y-3 rounded-xl border border-stone-200 bg-white p-4 text-sm"><div className="flex justify-between"><dt>Gas credits</dt><dd className="font-semibold">{rupees(amount)}</dd></div><div className="flex justify-between"><dt>Razorpay UPI surcharge (demo)</dt><dd className="font-semibold">₹0.00</dd></div><div className="flex justify-between border-t border-stone-200 pt-3"><dt className="font-medium">Simulated payment total</dt><dd className="font-semibold">{rupees(amount)}</dd></div></dl>
                <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4"><p className="text-xs font-medium uppercase">Estimated actions unlocked</p><p className="mt-1 text-2xl font-serif font-semibold tracking-tight">~{estimatedActions(amount).toLocaleString('en-IN')} UserOperations</p><p className="mt-2 text-xs">Base / Polygon illustration at ~₹0.067 per action. L1/blob spikes, operation complexity and FX changes reduce actual capacity.</p></div>
                {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                {retrying && !pending && <p className="mt-3 text-xs">A refill is awaiting confirmation. Retry uses its original amount and receipt ID to prevent duplicate credit.</p>}
                <button type="button" disabled={pending} onClick={() => void pay()} className={`${panelButton} mt-5 w-full bg-[#123b32] text-white`}>{pending ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}{pending ? 'Confirming simulated payment…' : retrying ? 'Retry same UPI simulation' : 'Pay via UPI'}</button>
            </>}
        </div>
    </div>;
}

export function BusinessModelPanel({ wallet }: { wallet: AgentWalletClient }) {
    const [cycle, setCycle] = useState<BillingCycle>('monthly');
    const [preview, setPreview] = useState<PlanId>('growth');
    const [billing, setBilling] = useState<BillingState | null>(null);
    const [modal, setModal] = useState(false);
    const [pending, setPending] = useState<PlanId | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const selecting = useRef(false);
    const selectionVersion = useRef(0);
    useEffect(() => {
        const controller = new AbortController();
        const version = selectionVersion.current;
        void fetch('/api/billing', { cache: 'no-store', signal: controller.signal }).then(async response => {
            const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to load selected plan');
            if (!controller.signal.aborted && selectionVersion.current === version) { setBilling(result.billing); if (result.billing.selectedAt) { setPreview(result.billing.plan); setCycle(result.billing.cycle); } }
        }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
        return () => controller.abort();
    }, []);
    const select = async (plan: PlanId) => {
        if (selecting.current) return;
        selectionVersion.current++;
        selecting.current = true; setPending(plan); setError(''); setNotice('');
        try {
            const response = await fetch('/api/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select_plan', plan, cycle }) });
            const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save plan');
            setBilling(result.billing); setPreview(plan);
            if (plan === 'enterprise') setCycle('annual');
            setNotice(`${PLANS[plan].name} saved as your demo plan. No subscription charged, credits granted or fleet limits changed.`);
        } catch (cause: any) { setError(cause?.message || 'Unable to select plan'); }
        finally { selecting.current = false; setPending(null); }
    };
    const allocation = preview === 'enterprise' ? null : economics(preview, cycle);
    return <div className="space-y-6 text-stone-900">
        <header className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-card sm:p-7">
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800"><Coins size={15} /> Software + sponsored gas</div>
            <h2 className="text-2xl font-serif font-medium leading-tight tracking-tight text-stone-950">Plans for your agent fleet</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">Predictable enterprise INR billing powered by gas-abstracted Paymaster infrastructure.</p>
            <p className="mt-3 text-xs leading-relaxed text-stone-400">Proposed commercial plans · Interactive pricing demo · Selecting a plan does not activate paid services or advertised enterprise integrations.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="inline-flex rounded-xl border border-stone-200 bg-stone-100/70 p-1" role="group" aria-label="Billing period">{(['monthly', 'annual'] as const).map(value => <button key={value} type="button" disabled={!!pending} aria-pressed={cycle === value} onClick={() => setCycle(value)} className={`rounded-lg border px-5 py-2 text-sm font-medium transition-colors ${cycle === value ? 'border-stone-200 bg-white text-stone-900 shadow-subtle' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>{value === 'monthly' ? 'Monthly' : 'Annual'}</button>)}</div><span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">Annual: ~16.7% discount / 2 months free</span></div>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-stone-200 bg-emerald-50 p-3 text-sm font-semibold">{notice}</p>}
        <div className="grid gap-6 xl:grid-cols-3">{(['starter', 'growth', 'enterprise'] as const).map(plan => {
            const p = PLANS[plan]; const quoted = plan === 'enterprise'; const popular = plan === 'growth';
            const current = billing?.plan === plan && (quoted || billing.cycle === cycle);
            const metered = quoted ? null : PLANS[plan as 'starter' | 'growth'];
            return <article key={plan} className={`flex min-w-0 flex-col rounded-2xl border bg-white p-6 shadow-card ${popular ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-stone-200/90'}`}>
                <div className="min-h-7">{popular ? <span className="inline-block rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium tracking-wide text-emerald-800">Recommended</span> : <span className={`text-[10px] font-medium uppercase tracking-[0.1em] ${quoted ? 'text-emerald-800' : 'text-stone-500'}`}>{quoted ? 'Dedicated infrastructure' : 'Build & validate'}</span>}</div>
                <h3 className="mt-3 text-xl font-serif font-semibold tracking-tight">{p.name}</h3>
                <div className="my-5 min-h-24">{metered ? <><p className="break-words text-3xl font-serif font-semibold tracking-tight tabular-nums">{rupees(cycle === 'annual' ? metered.annual : metered.monthly)}</p><p className="mt-1 text-xs text-stone-500">/ {cycle === 'annual' ? 'year' : 'month'}</p>{cycle === 'annual' && <p className="mt-2 text-xs leading-relaxed text-stone-500">{rupees(metered.annual / 12)}/mo equivalent · Save {rupees(metered.monthly * 12 - metered.annual)}/year</p>}</> : <><p className="text-2xl font-serif font-semibold tracking-tight">Custom Enterprise Quote</p><p className="mt-2 text-sm">Annual contract</p></>}</div>
                <ul className="mb-6 space-y-3 text-sm leading-relaxed text-stone-600">{p.features.map(feature => <li key={feature} className="flex items-start gap-2"><Check size={17} className="mt-0.5 shrink-0 text-emerald-700" /><span>{feature}</span></li>)}</ul>
                <div className={`mt-auto rounded-xl border border-stone-200 p-4 ${popular ? 'bg-emerald-50/40' : 'bg-stone-50/70'}`}><p className="flex items-center gap-2 text-xs font-semibold uppercase"><Zap size={15} /> Pre-funded gas tank</p>{metered ? <><p className="mt-2 text-xl font-serif font-semibold tracking-tight">{rupees(metered.gas)} / month</p><p className="mt-1 text-xs">Sponsored gas allowance included{cycle === 'annual' ? `; ${rupees(metered.gas * 12)} over 12 months` : ''}.</p></> : <><p className="mt-2 font-semibold">Dynamic auto-refill pool</p><p className="mt-1 text-xs">Proposed UPI e-mandate refill below 10%. Requires a separately authorized mandate and payment integration.</p></>}</div>
                <button type="button" disabled={!!pending || current} onClick={() => void select(plan)} className={`${panelButton} mt-5 w-full ${popular ? 'bg-[#123b32] text-white hover:bg-[#194f42]' : 'bg-white text-stone-700 hover:bg-stone-50'}`}>{pending === plan ? <Loader2 size={17} className="animate-spin" /> : <ArrowUpRight size={17} />}{pending === plan ? 'Saving…' : current ? 'Current Plan' : quoted ? 'Select enterprise preview' : 'Select Plan'}</button>
                <button type="button" aria-pressed={preview === plan} onClick={() => setPreview(plan)} className="mt-3 py-1 text-xs font-medium text-stone-500 transition-colors hover:text-emerald-800">{preview === plan ? 'Showing economics below' : 'Compare unit economics'}</button>
            </article>;
        })}</div>
        <section className={panelCard} aria-labelledby="unit-economics-title">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200/80 bg-stone-100 text-stone-700"><PieChart size={19} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">Transparent unit economics</p><h3 id="unit-economics-title" className="text-lg font-serif font-semibold tracking-tight">Where your subscription rupee goes</h3></div></div>
            {allocation ? <>
                <p className="mt-3 text-sm text-stone-600">{PLANS[preview].name} · {rupees(allocation.price)} / {cycle === 'annual' ? 'year' : 'month'}. An illustrative allocation, not an audited margin or tax invoice.</p>
                <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`Platform ${rupees(allocation.platform)}, gas ${rupees(allocation.gas)}, surcharges ${rupees(allocation.gateway)}`}>{[{ value: allocation.platform, color: '#123b32' }, { value: allocation.gas, color: '#8cb5a5' }, { value: allocation.gateway, color: '#c9b58e' }].map(item => <div key={item.color} className="border-r-2 border-white last:border-r-0" style={{ width: `${item.value / allocation.price * 100}%`, background: item.color }} />)}</div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">{[
                    { name: 'SafeAgent margin & platform infrastructure', value: allocation.platform, Icon: ShieldCheck, color: '#123b32' },
                    { name: 'Dedicated Paymaster gas allowance', value: allocation.gas, Icon: Coins, color: '#8cb5a5' },
                    { name: 'Gateway & statutory surcharge allocation', value: allocation.gateway, Icon: Receipt, color: '#c9b58e' }
                ].map(item => <div key={item.name} className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4"><div className="flex items-start gap-2 text-xs font-medium leading-relaxed text-stone-500"><span style={{ background: item.color }} className="mt-1 h-2 w-2 shrink-0 rounded-full" /><item.Icon size={15} className="mt-0.5 shrink-0" />{item.name}</div><p className="mt-3 text-2xl font-serif font-semibold tracking-tight">{rupees(item.value)} <span className="text-sm font-medium">({(item.value / allocation.price * 100).toFixed(1)}%)</span></p></div>)}</div>
                <p className="mt-4 text-xs text-stone-500">Annual modelling keeps 12 monthly gas allowances and discounts the subscription by two months. Gateway allocation scales with the invoice; platform contribution is the remainder. Actual taxes and processor charges vary.</p>
            </> : <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50/70 p-5"><h4 className="font-semibold">Designed around your fleet</h4><p className="mt-2 text-sm">Negotiated platform fee + dedicated gas pool + actual external surcharges. No fixed enterprise price or margin is implied.</p><p className="mt-3 text-xs">Private RPCs, dedicated deployment, mandate refills and the SLA target are proposed contract features. They are not provisioned by this demo selector.</p></div>}
        </section>
        <section className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Keep agents moving</p><h3 className="mt-2 text-2xl font-serif font-semibold tracking-tight">Gas tank: {rupees(wallet.paymasterTankINR)}</h3><p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">Refill simulated gas credits instantly. A confirmed refill updates the saved wallet and existing treasury dashboard.</p></div><button type="button" onClick={() => setModal(true)} className={`${panelButton} bg-[#123b32] text-white hover:bg-[#194f42]`}><Zap size={20} /> Top-Up Gas Tank via UPI</button></div>
            {billing?.refills?.length ? <p className="mt-4 break-all border-t border-stone-200 pt-3 text-xs text-stone-400">Last simulated refill: {rupees(billing.refills[0].amount)} · {new Date(billing.refills[0].createdAt).toLocaleString()} · {billing.refills[0].id}</p> : null}
        </section>
        {modal && <GasTankRefillModal wallet={wallet} onClose={() => setModal(false)} onRefilled={setBilling} />}
    </div>;
}
