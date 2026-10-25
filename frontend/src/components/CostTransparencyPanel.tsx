'use client';
import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, ArrowUpRight, Coins, CreditCard, Globe2, Layers, PieChart, Receipt, ShieldCheck } from 'lucide-react';
import { gasMode, waterfall } from '../lib/billing/plans';
import { panelButton, panelCard, panelInput, rupees } from './businessStyles';

type GasFeed = { available: boolean; gwei?: number; measuredAt?: string; message?: string };
export function CostTransparencyPanel() {
    const [spend, setSpend] = useState(10000);
    const [rail, setRail] = useState<'card' | 'upi' | 'netbanking'>('card');
    const [overseas, setOverseas] = useState(30);
    const [mode, setMode] = useState<'live' | 'scenario'>('live');
    const [scenarioGwei, setScenarioGwei] = useState(12);
    const [feed, setFeed] = useState<GasFeed>({ available: false, message: 'Connecting to Ethereum gas feed…' });
    useEffect(() => {
        let active = true; let pending: AbortController | undefined;
        const poll = async () => {
            pending?.abort(); const controller = new AbortController(); pending = controller;
            try {
                const response = await fetch('/api/costs/gas', { cache: 'no-store', signal: controller.signal });
                const result = await response.json();
                if (active) setFeed(result.available === true && Number.isFinite(result.gwei) ? result : { available: false, message: result.message || 'Live data unavailable.' });
            } catch { if (active && !controller.signal.aborted) setFeed({ available: false, message: 'Live Ethereum feed could not be reached.' }); }
        };
        void poll(); const timer = setInterval(() => void poll(), 30000);
        return () => { active = false; pending?.abort(); clearInterval(timer); };
    }, []);
    const gwei = mode === 'scenario' ? scenarioGwei : feed.available ? feed.gwei! : null;
    const level = gwei === null ? null : gasMode(gwei);
    const gateway = rail === 'card' ? spend * .0236 : rail === 'netbanking' ? 15 : 0;
    const fxBase = spend * overseas / 100;
    const values = waterfall(spend);
    const segments = [
        { label: 'Direct agent treasury spend', detail: 'Merchant purchases, cloud and payroll', color: '#123b32', share: 82.5, Icon: Coins },
        { label: 'SafeAgent software platform fee', detail: 'IAM session security and policy monitoring', color: '#8cb5a5', share: 11.5, Icon: ShieldCheck },
        { label: 'External fiat & FX gateway fees', detail: 'Payment processor and bank charges', color: '#c9b58e', share: 3.8, Icon: CreditCard },
        { label: 'On-chain gas tank sponsorship', detail: 'L2 execution and L1 data availability', color: '#9aa9b5', share: 2.2, Icon: Layers }
    ];
    return <div className="space-y-6 text-stone-900">
        <header className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-card sm:p-7">
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800"><Receipt size={15} /> Know every layer</div>
            <h2 className="text-2xl font-serif font-medium leading-tight tracking-tight text-stone-950">Understand your operating costs</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">Real-time visibility into where every rupee goes. Clear separation between external pass-through surcharges and the SafeAgent SaaS orchestration margin.</p>
            <p className="mt-3 text-xs leading-relaxed text-stone-400">Illustrative fee model · Optional live Ethereum signal · No claim that bank or network rates are fixed.</p>
        </header>
        <section className={panelCard} aria-labelledby="external-fees-title">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">External fees</p><h3 id="external-fees-title" className="mt-2 text-lg font-serif font-semibold tracking-tight">Uncontrollable surcharges</h3><p className="mt-2 max-w-2xl text-sm text-stone-600">External charges apply when the chosen rail, network or currency conversion requires them. SafeAgent does not set those tariffs.</p></div>
                <label className="text-xs font-medium">Illustrative monthly spend (INR)<input type="number" min={1000} max={1000000} step={1000} value={spend} onChange={e => setSpend(Math.max(1000, Math.min(1000000, Number(e.target.value) || 1000)))} className={`${panelInput} mt-1 max-w-56`} /></label>
            </div>
            <div className="mt-6 grid gap-5 xl:grid-cols-3">
                <article className="flex min-w-0 flex-col rounded-xl border border-stone-200/80 bg-stone-50/40 p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200/80 bg-white text-stone-700"><CreditCard size={19} /></span><h4 className="mt-3 text-base font-serif font-semibold tracking-tight">Payment gateway ingestion</h4><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400">Razorpay / banking rails</p>
                    <p className="mt-4 text-sm leading-relaxed text-stone-600"><strong>Corporate credit cards:</strong> assumed 2.0% + 18% GST on that fee = <strong>2.36%</strong> effective.</p>
                    <p className="mt-3 text-sm leading-relaxed text-stone-600"><strong>UPI / netbanking:</strong> illustrative flat ₹0–₹15 cap. Provider, payment type and merchant agreement can differ.</p>
                    <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="Payment rail">{(['card', 'upi', 'netbanking'] as const).map(value => <button key={value} type="button" aria-pressed={rail === value} onClick={() => setRail(value)} className={`rounded-xl border border-stone-200 px-2 py-1 text-xs font-medium transition-colors ${rail === value ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'bg-white text-stone-500 hover:text-stone-900'}`}>{value === 'card' ? 'Corporate card' : value === 'upi' ? 'UPI' : 'Netbanking'}</button>)}</div>
                    <p className="text-2xl font-serif font-semibold tracking-tight">{rupees(gateway)}</p><p className="mb-4 text-xs text-stone-600">Illustrative ingestion fee on {rupees(spend)}</p>
                    <span className="mt-auto border-t border-stone-200 pt-3 text-xs leading-relaxed text-emerald-800">Processor / banking rail charge. 0% SafeAgent markup in this model.</span>
                </article>
                <article className="flex min-w-0 flex-col rounded-xl border border-stone-200/80 bg-stone-50/40 p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200/80 bg-white text-stone-700"><Layers size={19} /></span><h4 className="mt-3 text-base font-serif font-semibold tracking-tight">Ethereum L1 data availability</h4><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400">EIP-4844 blobs + congestion</p>
                    <p className="mt-4 text-sm leading-relaxed text-stone-600"><strong>L2 base execution:</strong> ~₹0.05–₹0.15 per UserOperation in the example.</p>
                    <p className="mt-3 text-sm leading-relaxed text-stone-600"><strong>L1 commitment / blob surcharge:</strong> an assumed +₹0.20–₹0.85 during congestion. Actual charges depend on network, bytes and batching.</p>
                    <div className="my-4 border-l-2 border-emerald-200 pl-3 text-xs leading-relaxed text-stone-500">L1 gas price is a congestion signal, not a direct blob-fee or per-UserOp quote.</div>
                    <span className="mt-auto border-t border-stone-200 pt-3 text-xs leading-relaxed text-stone-600">Network volatility buffer · Network pass-through, no platform markup.</span>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500">Ethereum base/blob fees are burned; eligible priority fees go to validators. L2 data fees are accounted for by its operator.</p>
                </article>
                <article className="flex min-w-0 flex-col rounded-xl border border-stone-200/80 bg-stone-50/40 p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200/80 bg-white text-stone-700"><Globe2 size={19} /></span><h4 className="mt-3 text-base font-serif font-semibold tracking-tight">FX & cross-border markup</h4><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-stone-400">INR → USD merchants</p>
                    <p className="mt-4 text-sm leading-relaxed text-stone-600">For US-billed APIs such as OpenAI, AWS Oregon and Anthropic, currency conversion may add bank or card charges.</p>
                    <p className="mt-3 text-sm leading-relaxed text-stone-600"><strong>Example bank markup:</strong> 3.5% + 18% GST on the markup = <strong>4.13%</strong>, not 21.5% of the payment.</p>
                    <label className="my-4 text-xs font-medium">Cross-border share: {overseas}%<input aria-label="Cross-border spending percentage" type="range" min={0} max={100} value={overseas} onChange={e => setOverseas(Number(e.target.value))} className="mt-2 w-full accent-[#065F46]" /></label>
                    <p className="text-2xl font-serif font-semibold tracking-tight">{rupees(Math.round(fxBase * .0413 * 100) / 100)}</p><p className="mb-4 text-xs text-stone-600">Estimated markup on {rupees(fxBase)} of USD spend</p>
                    <span className="mt-auto border-t border-stone-200 pt-3 text-xs leading-relaxed text-emerald-800">Issuing / RBI-authorized dealer bank charges. Actual tariff varies.</span>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500">RBI does not mandate a universal 3.5% FX markup. This is an illustrative bank-pricing assumption.</p>
                </article>
            </div>
        </section>
        <section className={panelCard} aria-labelledby="waterfall-title">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200/80 bg-stone-100 text-stone-700"><PieChart size={19} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">Spend allocation</p><h3 id="waterfall-title" className="text-xl font-serif font-semibold tracking-tight">Live cost waterfall · {rupees(spend)} example</h3></div></div>
            <p className="mt-3 text-sm text-stone-600">Fixed scenario allocation, updated as you change the budget above. The external-fee calculators illustrate separate rail choices; they do not change these allocation percentages.</p>
            <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label="82.5 percent treasury, 11.5 percent platform, 3.8 percent external fees, 2.2 percent gas">{segments.map(segment => <div key={segment.label} style={{ width: `${segment.share}%`, background: segment.color }} className="border-r-2 border-white last:border-r-0" />)}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{segments.map((segment, i) => <div key={segment.label} className="flex gap-3 rounded-xl border border-stone-200/80 bg-stone-50/40 p-4"><div style={{ color: segment.color, background: `${segment.color}15` }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><segment.Icon size={19} /></div><div className="min-w-0"><p className="text-sm font-medium">{segment.label}</p><p className="text-xl font-serif font-semibold tracking-tight">{rupees(values[i])} <span className="text-sm font-medium">/ {segment.share}%</span></p><p className="mt-1 text-xs text-stone-600">{segment.detail}</p></div></div>)}</div>
        </section>
        <section className={panelCard} aria-labelledby="gas-detector-title">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Network monitor</p><h3 id="gas-detector-title" className="mt-2 text-xl font-serif font-semibold tracking-tight">Spot the spike before it hits operations.</h3></div><div className="flex gap-2">{(['live', 'scenario'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`${panelButton} ${mode === value ? 'bg-[#123b32] text-white' : 'bg-white'}`}>{value === 'live' ? 'Live feed' : 'Scenario mode'}</button>)}</div></div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className={`rounded-2xl border border-stone-200/90 p-5 ${level === 'congested' ? 'border-rose-200 bg-rose-50/60 text-rose-800' : level === 'normal' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'bg-stone-50/70 text-stone-600'}`}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase"><Activity size={16} />{mode === 'scenario' ? 'Simulated network signal' : 'Ethereum mainnet RPC signal'}</div>
                    <p className="mt-3 text-3xl font-serif font-semibold tracking-tight tabular-nums">{gwei === null ? 'Unavailable' : `${gwei.toFixed(2)} Gwei`}</p>
                    <p className="mt-2 font-medium" role="status">{level === 'normal' ? 'Normal gas mode (< 15 Gwei)' : level === 'congested' ? 'Congested spike mode (> 50 Gwei)' : level === 'elevated' ? 'Elevated gas mode (15–50 Gwei)' : feed.message}</p>
                    {mode === 'scenario' ? <label className="mt-4 block text-xs font-medium">Explore congestion<input aria-label="Simulated Ethereum gas price in Gwei" type="range" min={1} max={100} value={scenarioGwei} onChange={e => setScenarioGwei(Number(e.target.value))} className="mt-2 w-full accent-emerald-700" /></label> : <p className="mt-3 text-xs">{feed.available && feed.measuredAt ? `Observed ${new Date(feed.measuredAt).toLocaleString()} · refreshed every 30 seconds` : 'No fabricated gas reading is substituted. Scenario mode remains available.'}</p>}
                </div>
                <div className="space-y-3 text-sm leading-relaxed text-stone-600"><h4 className="flex items-center gap-2 text-base font-semibold"><ShieldCheck size={20} /> How sponsorship buffers micro-spikes</h4><p>A funded <code>SimplePaymaster.sol</code> deposit pays eligible gas costs without asking each agent for ETH. Short spikes can use available headroom in that deposit and the agent’s daily quota.</p><p>The contract reserves the maximum gas cost at validation and reconciles actual cost afterward. It rejects sponsorship for unapproved accounts or exceeded quotas; it does not guarantee execution through every spike.</p><p className="flex items-start gap-2 rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 text-xs"><AlertCircle size={20} className="shrink-0" /><span>This detector is visibility only. It does not alter contract quotas, replenish ETH or retry failed jobs. Check sponsorship failures explicitly.</span></p></div>
            </div>
        </section>
        <p className="flex items-center gap-2 text-xs text-stone-600"><ArrowUpRight size={15} /> Rates are scenario inputs. Your actual processor contract, bank tariff and network receipt determine pass-through cost.</p>
    </div>;
}
