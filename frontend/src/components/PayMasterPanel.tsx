'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, Download, Loader2, Play, Save, Users } from 'lucide-react';
import type { Employee, PaymasterState, PayrollConfig, PayrollRun } from '../lib/payroll/types';
import { AgentWalletClient, formatINR } from '../lib/web3/agentWalletClient';

const inputClass = 'w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-100';
const buttonClass = 'rounded-lg bg-[#123b32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center justify-center gap-2';
const inr = (paise: number) => formatINR(paise / 100);
function Numeric({ label, value, onChange, disabled, step = 1 }: { label: string; value: number; onChange: (n: number) => void; disabled?: boolean; step?: number }) {
    return <label className="block space-y-1 text-xs text-stone-600"><span>{label}</span><input type="number" min="0" step={step} aria-label={label} value={Number.isFinite(value) ? value : ''} disabled={disabled} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass} /></label>;
}
function TextField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (s: string) => void; disabled?: boolean }) {
    return <label className="block space-y-1 text-xs text-stone-600"><span>{label}</span><input value={value} disabled={disabled} maxLength={100} onChange={e => onChange(e.target.value)} className={inputClass} /></label>;
}
export function PayMasterPanel({ wallet, onBack }: { wallet: AgentWalletClient; onBack: () => void }) {
    const [data, setData] = useState<PaymasterState | null>(null);
    const [draft, setDraft] = useState<PayrollConfig | null>(null);
    const [tab, setTab] = useState<'employees' | 'policy' | 'runs'>('employees');
    const [employeeId, setEmployeeId] = useState('EMP-001');
    const [runId, setRunId] = useState<string | null>(null);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [dirty, setDirty] = useState(false);
    const lock = useRef(false);
    const pendingCommand = useRef<string | null>(null);
    const apply = (payroll: PaymasterState) => { setData(payroll); setDraft(structuredClone(payroll.config)); setDirty(false); };
    const reload = async () => {
        const response = await fetch('/api/paymaster', { cache: 'no-store' }); const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load PayMaster');
        apply(result.payroll);
        return result.payroll as PaymasterState;
    };
    useEffect(() => { void reload().catch(e => setError(e.message)); }, []);
    // Recover the persisted outcome after a slow or disconnected calculation, without starting another one.
    const calculating = data?.runs.some(run => run.status === 'CALCULATING');
    useEffect(() => {
        if (!calculating || busy || dirty) return;
        const timer = setInterval(() => { void reload().catch(() => {}); }, 5000);
        return () => clearInterval(timer);
    }, [calculating, busy, dirty]);
    const change = <K extends keyof PayrollConfig>(key: K, value: PayrollConfig[K]) => { setDraft(current => current ? { ...current, [key]: value } : current); setDirty(true); };
    const employee = draft?.employees.find(item => item.id === employeeId);
    const editEmployee = (patch: Partial<Employee>) => {
        if (!draft) return;
        change('employees', draft.employees.map(item => item.id === employeeId ? { ...item, ...patch } : item));
    };
    const act = async (action: 'save' | 'run' | 'pay', selectedRun?: string) => {
        if (lock.current || !data || !draft) return;
        lock.current = true; setBusy(action); setError(''); setNotice('');
        try {
            if (action === 'run' && !pendingCommand.current) {
                const stored = sessionStorage.getItem('paymaster-command');
                const previous = stored ? JSON.parse(stored) : null;
                pendingCommand.current = previous?.revision === data.revision && previous?.month === draft.month ? previous.id : crypto.randomUUID();
                sessionStorage.setItem('paymaster-command', JSON.stringify({ id: pendingCommand.current, revision: data.revision, month: draft.month }));
            }
            const response = await fetch('/api/paymaster', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, config: action === 'save' ? draft : undefined, revision: data.revision, requestId: pendingCommand.current, runId: selectedRun }) });
            const result = await response.json();
            if (!response.ok) {
                if (action !== 'save') await reload();
                pendingCommand.current = null; sessionStorage.removeItem('paymaster-command');
                throw new Error(result.error || 'Payroll operation failed');
            }
            apply(result.payroll);
            if (result.run) {
                setRunId(result.run.id); setTab('runs');
                if (result.run.status !== 'CALCULATING') { pendingCommand.current = null; sessionStorage.removeItem('paymaster-command'); }
                if (result.run.error) setError(result.run.error);
                else setNotice(result.run.status === 'PAID' ? 'Payroll completed in the simulated wallet. Individual payslips are below.' : result.run.status === 'CALCULATING' ? 'Calculation is still running. This view will refresh when it finishes.' : 'AI calculations verified. Payroll is ready.');
            } else { pendingCommand.current = null; sessionStorage.removeItem('paymaster-command'); setNotice('PayMaster settings saved. Existing paid payslips remain unchanged.'); }
            await wallet.syncFromServer();
        } catch (cause: any) { setError(cause?.message || 'Connection interrupted. Reload payroll status before retrying.'); }
        finally { lock.current = false; setBusy(''); }
    };
    const run = data?.runs.find(item => item.id === runId) || data?.runs[0];
    const paidMonth = data?.runs.find(item => item.month === draft?.month && item.status === 'PAID');
    const download = (selected: PayrollRun) => {
        const blob = new Blob([JSON.stringify({ simulation: true, ...selected }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `PayMaster-${selected.month}-${selected.id}.json`; a.click(); URL.revokeObjectURL(url);
    };
    if (!draft || !data) return <div className="rounded-2xl border bg-white p-6"><button onClick={onBack} className="text-sm underline">Back to agents</button><p className="mt-4" role={error ? 'alert' : 'status'}>{error || 'Loading PayMaster…'}</p>{error && <button onClick={() => void reload().catch(e => setError(e.message))} className="mt-3 underline">Retry loading</button>}</div>;
    return <div className="space-y-5">
        <button type="button" onClick={onBack} disabled={!!busy || dirty} className="flex items-center gap-2 text-sm text-stone-600 disabled:opacity-40"><ArrowLeft size={16} /> All agents</button>
        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#123b32] text-white"><Bot /></div>
                    <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Detailed payroll agent</p><h2 className="text-3xl font-serif text-stone-950">{draft.name}</h2><p className="mt-1 text-sm text-stone-600">Attendance → AI payslips → validation → simulated salaries</p></div>
                </div><span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-800">{draft.enabled ? 'Enabled' : 'Paused'} · Simulation only</span>
            </div>
            <p className="mt-5 max-w-3xl text-sm text-stone-600">Profiles, leave records and working days are synthetic. Compensation and deductions are editable policy assumptions. Salary results come from your configured AI, then pass independent arithmetic checks. No bank transfers or tax remittances occur.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
                ['Employees', '15'], ['Scheduled gross / month', formatINR(draft.employees.reduce((sum, e) => sum + (Number.isFinite(e.monthlyGross) ? e.monthlyGross : 0), 0))],
                ['Simulated wallet', formatINR(wallet.usdcBalance)], ['Payroll month', draft.month]
            ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-stone-200 bg-white p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 break-words text-lg font-semibold text-stone-900">{value}</p></div>)}</div>
        </section>
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
                <label className="space-y-1 text-xs text-stone-600">Payroll month<input type="month" value={draft.month} disabled={!!busy} onChange={e => change('month', e.target.value)} className={`${inputClass} block`} /></label>
                <div className="w-36"><Numeric label="Working days (synthetic)" value={draft.workingDays} onChange={v => change('workingDays', v)} disabled={!!busy} /></div>
                <button type="button" disabled={!!busy || !dirty && data.revision > 0} onClick={() => void act('save')} className={buttonClass}><Save size={15} /> Save changes</button>
                <button type="button" disabled={!!busy || dirty || !draft.enabled || !!paidMonth || !!calculating && !data.runs.some(r => r.status === 'CALCULATING' && Date.now() - Date.parse(r.startedAt) >= 90000)} onClick={() => void act('run')} className={buttonClass}><Play size={15} /> {draft.autoPay ? 'Run AI payroll & pay' : 'Calculate with AI'}</button>
            </div>
            <p className="text-xs text-stone-500">{dirty ? 'Save your changes before calculating. Changing the month keeps the displayed attendance: review it for the new period.' : paidMonth ? 'This month is already paid. Its payslips are locked against duplicate payouts.' : draft.autoPay ? 'Running payroll automatically pays all employees if calculations, balance and limits pass. Runs start when you click; no background month-end schedule is enabled.' : 'Calculate first, then distribute the batch from the payroll results.'}</p>
            {dirty && <button type="button" disabled={!!busy} onClick={() => { setDraft(structuredClone(data.config)); setDirty(false); }} className="text-xs underline text-stone-600">Discard unsaved changes</button>}
        </div>
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-emerald-800"><Loader2 className="animate-spin" size={16} />{busy === 'run' ? 'AI is calculating 15 individual payslips… This may take up to 60 seconds.' : busy === 'pay' ? 'Checking and distributing the payroll batch…' : 'Saving PayMaster…'}</p>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{error}</p><button type="button" disabled={!!busy || dirty} onClick={() => void reload().then(() => setTab('runs')).catch(e => setError(e.message))} className="mt-2 underline disabled:opacity-40">Reload saved payroll status</button></div>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
        <nav aria-label="PayMaster sections" className="flex flex-wrap gap-2">{(['employees', 'policy', 'runs'] as const).map(item => <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)} className={`rounded-lg px-4 py-2 text-sm ${tab === item ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}>{item === 'employees' ? 'Employees & attendance' : item === 'policy' ? 'Agent & salary rules' : 'AI payslips & runs'}</button>)}</nav>
        {tab === 'employees' && <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="flex items-center gap-2 p-4 font-semibold text-stone-800"><Users size={18} /> Employee register <span className="text-xs font-normal text-stone-500">Select a row to edit</span></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-stone-50 text-xs text-stone-500"><tr><th className="p-3">Employee</th><th className="p-3">Gross INR</th><th className="p-3">Paid / sick / unpaid leave</th></tr></thead><tbody>{draft.employees.map(e => <tr key={e.id} className={`border-t border-stone-100 ${e.id === employeeId ? 'bg-emerald-50' : ''}`}><td className="p-3"><button type="button" onClick={() => setEmployeeId(e.id)} className="text-left font-medium text-stone-900 hover:underline">{e.name}</button><p className="text-xs text-stone-500">{e.id} · {e.role}</p></td><td className="p-3 tabular-nums">{formatINR(e.monthlyGross)}</td><td className="p-3 tabular-nums">{e.paidLeave} / {e.sickLeave} / {e.unpaidLeave}</td></tr>)}</tbody></table></div>
            </section>
            {employee && <section className="self-start rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
                <div><h3 className="font-semibold text-stone-900">Edit {employee.name}</h3><p className="text-xs text-stone-500">{employee.id} · Fictional employee profile</p></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{(['name', 'role', 'department', 'city', 'email', 'payoutReference'] as const).map(key => <TextField key={key} label={key === 'payoutReference' ? 'Simulated payout reference' : key.charAt(0).toUpperCase() + key.slice(1)} value={employee[key]} disabled={!!busy} onChange={v => editEmployee({ [key]: v })} />)}</div>
                <div className="border-t pt-4"><h4 className="mb-3 text-sm font-medium text-stone-800">Compensation inputs · policy assumptions</h4><div className="grid grid-cols-2 gap-3"><Numeric label="Monthly gross salary (INR)" value={employee.monthlyGross} onChange={v => editEmployee({ monthlyGross: v })} disabled={!!busy} step={0.01} /><Numeric label="TDS withholding rate (%)" value={employee.tdsPercent} onChange={v => editEmployee({ tdsPercent: v })} disabled={!!busy} step={0.01} /></div></div>
                <div className="border-t pt-4"><h4 className="mb-3 text-sm font-medium text-stone-800">Synthetic leave record · days</h4><div className="grid grid-cols-3 gap-3"><Numeric label="Paid leave taken" value={employee.paidLeave} onChange={v => editEmployee({ paidLeave: v })} disabled={!!busy} step={0.5} /><Numeric label="Sick leave taken" value={employee.sickLeave} onChange={v => editEmployee({ sickLeave: v })} disabled={!!busy} step={0.5} /><Numeric label="Unpaid leave taken" value={employee.unpaidLeave} onChange={v => editEmployee({ unpaidLeave: v })} disabled={!!busy} step={0.5} /></div><p className="mt-2 text-xs text-stone-500">Present days: {draft.workingDays - employee.paidLeave - employee.sickLeave - employee.unpaidLeave}. Leave categories are distinct; excess paid or sick leave becomes unpaid.</p></div>
            </section>}
        </div>}
        {tab === 'policy' && <section className="rounded-2xl border border-stone-200 bg-white p-5 space-y-5">
            <div><h3 className="text-lg font-semibold text-stone-900">Agent instructions & salary policy</h3><p className="mt-1 text-sm text-stone-500">PayMaster reads the saved attendance, calculates every payslip with AI, verifies the amounts, and executes one simulated batch within these limits.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><TextField label="Agent name" value={draft.name} onChange={v => change('name', v)} disabled={!!busy} />
                <Numeric label="Maximum payroll batch (INR)" value={draft.batchLimit} onChange={v => change('batchLimit', v)} disabled={!!busy} /><Numeric label="Maximum salary per employee (INR)" value={draft.perEmployeeLimit} onChange={v => change('perEmployeeLimit', v)} disabled={!!busy} />
                <Numeric label="Paid leave allowance / month (days)" value={draft.paidLeaveAllowance} onChange={v => change('paidLeaveAllowance', v)} disabled={!!busy} step={0.5} /><Numeric label="Paid sick leave allowance / month (days)" value={draft.sickLeaveAllowance} onChange={v => change('sickLeaveAllowance', v)} disabled={!!busy} step={0.5} />
                <Numeric label="Basic share of earned gross (%)" value={draft.basicPercent} onChange={v => change('basicPercent', v)} disabled={!!busy} step={0.01} /><Numeric label="Employee PF contribution (%)" value={draft.pfPercent} onChange={v => change('pfPercent', v)} disabled={!!busy} step={0.01} /><Numeric label="PF wage ceiling (INR)" value={draft.pfWageCap} onChange={v => change('pfWageCap', v)} disabled={!!busy} /><Numeric label="Monthly professional tax (INR)" value={draft.professionalTax} onChange={v => change('professionalTax', v)} disabled={!!busy} step={0.01} />
            </div>
            <div className="space-y-3 border-t pt-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} disabled={!!busy} onChange={e => change('enabled', e.target.checked)} /> Enable PayMaster payroll runs</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.autoPay} disabled={!!busy} onChange={e => change('autoPay', e.target.checked)} /> Automatically pay after AI calculations pass validation</label></div>
            <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600 space-y-2"><p><strong>Formula:</strong> monthly gross − unpaid-day proration − employee PF − professional tax − TDS = net salary. Paid leave within the allowances has no salary deduction. All monetary steps round to the nearest paise.</p><p>PF uses the configured basic-pay share and wage ceiling. Professional tax is a flat demo input, waived when earned salary is zero. TDS defaults to 0% and is editable per employee; it is not a tax-slab calculation.</p><p>Initial compensation assumptions: Engineer ₹60,000; Designer ₹55,000; Finance ₹50,000; HR ₹45,000; Operations ₹40,000; Support ₹35,000 per month. Changing a role label does not change its salary input.</p><p>This example omits employer contributions, ESI, gratuity, bonuses, reimbursements and annual tax adjustments. PayMaster has its own bounded payroll authorization; it does not renew or alter another agent’s session.</p></div>
        </section>}
        {tab === 'runs' && <section className="space-y-4">
            {!data.runs.length ? <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">No generated salaries yet. Run AI payroll to calculate real results from the saved inputs.</div> : <>
                <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Payroll run <select value={run?.id || ''} onChange={e => setRunId(e.target.value)} className={`${inputClass} mt-1`}>{data.runs.map(item => <option key={item.id} value={item.id}>{item.month} · {item.status} · {new Date(item.startedAt).toLocaleString()}</option>)}</select></label>
                    <button disabled={!!busy || dirty} onClick={() => void reload().catch(e => setError(e.message))} className="text-sm underline">Refresh status</button>
                    {run && <button onClick={() => download(run)} className="inline-flex items-center gap-2 text-sm underline"><Download size={15} /> Download run & payslips</button>}
                </div>
                {run && <>
                    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{run.month} · {run.status === 'PAID' ? 'Simulated payroll paid' : run.status}</h3><strong className="text-xl text-emerald-800">Net payout: {inr(run.totalNet)}</strong></div>
                        <p className="text-xs text-stone-500">{run.model ? `Calculated by ${run.model} · ${run.calculatedAt ? new Date(run.calculatedAt).toLocaleString() : ''}` : 'No verified AI result yet.'} · Input revision {run.revision}</p>
                        {run.error && <p className="text-sm text-rose-700">{run.error}</p>}
                        {run.status === 'PAID' && <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 size={16} /> {run.rows.length} payslips recorded. No real funds transferred.</p>}
                        {run.status === 'READY' && <button disabled={!!busy || dirty || !draft.enabled || run.revision !== data.revision || !!paidMonth} onClick={() => void act('pay', run.id)} className={buttonClass}>Distribute simulated salaries</button>}
                    </div>
                    {run.rows.map(row => { const e = run.config.employees.find(item => item.id === row.employeeId)!; const receipt = run.receipts?.find(item => item.employeeId === row.employeeId); return <details key={row.employeeId} className="rounded-xl border border-stone-200 bg-white p-4" open={row.employeeId === employeeId ? true : undefined}>
                        <summary className="cursor-pointer text-sm"><span className="font-semibold text-stone-900">{e.name}</span><span className="ml-2 text-stone-500">{e.id} · {row.paidDays}/{run.config.workingDays} paid days</span><strong className="float-right ml-3 text-emerald-800">{inr(row.netPay)}</strong></summary>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2"><div><table className="w-full text-sm"><tbody>{([
                            ['Monthly gross', row.grossPay], ['Loss of pay', row.lossOfPay], ['Earned gross', row.earnedGross], ['Basic pay (PF basis)', row.basicPay], ['Employee PF', row.pf], ['Professional tax', row.professionalTax], ['TDS withholding', row.tds], ['Total deductions including loss of pay', row.totalDeductions], ['Net salary', row.netPay]
                        ] as [string, number][]).map(([label, amount]) => <tr key={label} className="border-b border-stone-100"><th className="py-2 text-left font-normal text-stone-600">{label}</th><td className="py-2 text-right tabular-nums">{inr(amount)}</td></tr>)}</tbody></table></div>
                            <div className="rounded-xl bg-stone-50 p-4 space-y-3 text-sm text-stone-600"><h4 className="font-semibold text-stone-900">AI calculation · independently verified</h4><p className="whitespace-pre-wrap">{row.explanation}</p><p>Unpaid days after allowances: {row.unpaidDays}. Paid leave: {e.paidLeave}; sick leave: {e.sickLeave}; explicit unpaid leave: {e.unpaidLeave}.</p><p className="break-all text-xs">Destination: {e.payoutReference}{receipt ? ` · Simulated receipt: ${receipt.id}` : ' · Not paid'}</p></div>
                        </div>
                    </details>; })}
                </>}
            </>}
        </section>}
    </div>;
}
