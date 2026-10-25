'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Fingerprint, Loader2, ShieldCheck, X } from 'lucide-react';
import type { OwnerIntent } from '../lib/auth/types';
import { verifyOwnerPasskey } from '../lib/auth/passkeyClient';
export function OwnerVerificationModal({ intent, title, details, onVerified, onClose }: {
    intent: OwnerIntent; title: string; details: string[]; onVerified: (proof: string) => Promise<void>; onClose: () => void;
}) {
    const [registered, setRegistered] = useState<boolean | null>(null);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const pending = useRef(false);
    const dialog = useRef<HTMLDivElement>(null);
    const close = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const controller = new AbortController(); const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; close.current?.focus();
        void fetch('/api/owner', { cache: 'no-store', signal: controller.signal }).then(async response => {
            const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Cannot read passkey status');
            if (!controller.signal.aborted) { setRegistered(result.registered); if (!result.originMatches) setError(`Open this wallet on ${result.rpId} to use the registered owner passkey.`); }
        }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
        return () => { controller.abort(); document.body.style.overflow = overflow; previous?.focus(); };
    }, []);
    const authenticate = async () => {
        if (pending.current || registered === null) return;
        pending.current = true; setBusy(true); setError(''); setNotice('');
        try {
            const proof = await verifyOwnerPasskey(intent, !registered, password);
            setPassword('');
            if (!registered) { setRegistered(true); setNotice('Owner passkey registered. Verify once more to authorize the action below.'); }
            else { if (!proof) throw new Error('No owner approval returned'); await onVerified(proof); }
        } catch (cause: any) { setError(cause?.name === 'NotAllowedError' ? 'Device verification was cancelled or timed out. No action was authorized.' : cause?.message || 'Owner verification failed'); }
        finally { pending.current = false; setBusy(false); }
    };
    return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-md">
        <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="owner-verification-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-modal" onKeyDown={event => {
            if (event.key === 'Escape' && !pending.current) onClose();
            if (event.key !== 'Tab') return;
            const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
            if (!nodes?.length) { event.preventDefault(); dialog.current?.focus(); return; }
            if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length-1].focus(); }
            else if (!event.shiftKey && document.activeElement === nodes[nodes.length-1]) { event.preventDefault(); nodes[0].focus(); }
        }}>
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-800"><Fingerprint size={22} /></span><div><h2 id="owner-verification-title" className="font-serif text-lg font-semibold text-stone-900">Verify owner approval</h2><p className="text-xs text-stone-500">Touch ID, Face ID, Windows Hello or device PIN</p></div></div><button ref={close} type="button" aria-label="Cancel owner verification" disabled={busy} onClick={onClose} className="rounded-lg p-1 text-stone-500 disabled:opacity-40"><X size={18} /></button></div>
            <h3 className="mt-5 text-sm font-semibold text-stone-900">{title}</h3>
            <ul className="mt-3 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">{details.map((detail,index) => <li key={index} className="break-words">{detail}</li>)}</ul>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-500"><ShieldCheck size={16} className="shrink-0" />Verification authorizes only these details, once. Biometrics remain on your device; this site receives a signed passkey response.</p>
            {registered === false && <div className="mt-4 space-y-2"><p className="text-sm font-medium text-stone-900">One-time owner passkey setup</p><label className="block text-xs text-stone-600">Owner setup password<input type="password" autoComplete="current-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /></label><p className="text-xs text-stone-500">Use your dashboard owner password. For local setup, this is WALLET_ADMIN_TOKEN in frontend/.env.local.</p></div>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {notice && <p role="status" className="mt-4 text-sm text-emerald-800">{notice}</p>}
            <button type="button" disabled={busy || registered === null} onClick={() => void authenticate()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123b32] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin" /> : <Fingerprint size={17} />}{busy ? 'Waiting for device verification…' : registered === false ? 'Set up owner passkey' : 'Verify & authorize'}</button>
        </div>
    </div>;
}
