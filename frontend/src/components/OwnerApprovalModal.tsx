'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Fingerprint, X, AlertTriangle } from 'lucide-react';
import { OwnerVerificationModal } from './OwnerVerificationModal';
import { QueuedApproval, formatINR } from '../lib/web3/agentWalletClient';

interface OwnerApprovalModalProps {
    request: QueuedApproval | null;
    onApprove: (id: string, proof: string) => Promise<boolean>;
    onReject: (id: string) => void;
    onClose: () => void;
}

export const OwnerApprovalModal: React.FC<OwnerApprovalModalProps> = ({
    request,
    onApprove,
    onReject,
    onClose
}) => {
    const [verifying, setVerifying] = useState(false);
    useEffect(() => { setVerifying(false); }, [request?.id]);
    if (!request) return null;
    if (verifying) return <OwnerVerificationModal
        intent={{ kind: 'queued_approval', id: request.id, amount: request.amount, recipient: request.targetAddress, agent: request.agent, action: request.actionName }}
        title="Approve this policy exception"
        details={[
            `${request.actionName} · ${request.targetName}`,
            `Recipient: ${request.targetAddress}`,
            `Amount: ${formatINR(request.amount)}`,
            `Agent: ${request.agent}`,
            request.reason,
            'This approval applies to this request only. Standing policy stays unchanged.'
        ]}
        onClose={() => setVerifying(false)}
        onVerified={async proof => {
            if (!await onApprove(request.id, proof)) throw new Error('Approval failed. The request may have changed or the wallet balance is insufficient.');
            setVerifying(false);
            onClose();
        }}
    />;

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200/90 rounded-2xl max-w-md w-full p-6 shadow-modal relative">
                <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-stone-200/80">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-subtle">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                                Out-of-Policy Escalation
                            </h2>
                            <p className="text-xs text-stone-500 font-sans">Agent sub-key exceeded owner constraints</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Violation Reason Banner */}
                <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs font-sans text-rose-950 font-normal">
                        <span className="text-rose-700 font-semibold font-mono">Policy Intercept: </span>
                        {request.reason}
                    </div>
                </div>

                {/* Staged Transaction Details */}
                <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-4 mb-5 space-y-2 text-xs font-mono">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-2">
                        <span className="text-stone-500 font-normal">Action:</span>
                        <span className="min-w-0 break-all text-right text-stone-900 font-semibold">{request.actionName}</span>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-2">
                        <span className="text-stone-500 font-normal">Target Protocol:</span>
                        <span className="min-w-0 text-right text-stone-900 font-semibold">{request.targetName}</span>
                    </div>
                    <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="text-stone-500 font-normal">Requested Amount:</span>
                        <span className="text-stone-900 font-semibold text-sm bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle">
                            {formatINR(request.amount)}
                        </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-stone-500 font-normal">Agent Sub-Key:</span>
                        <span className="text-stone-700 font-medium">{request.agent.slice(0, 10)}...{request.agent.slice(-4)}</span>
                    </div>
                </div>

                {/* Passkey Biometric Button */}
                <div className="space-y-2">
                    <button
                        onClick={() => setVerifying(true)}
                        className="w-full py-3 rounded-xl font-medium text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all bg-stone-900 hover:bg-stone-800 text-white"
                    >
                        <Fingerprint className="w-4 h-4 text-stone-300" /> Verify & approve once
                    </button>

                    <button
                        onClick={() => {
                            onReject(request.id);
                            onClose();
                        }}
                        className="w-full py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs text-stone-700 font-medium transition-all font-sans"
                    >
                        Reject & Cancel Transaction
                    </button>
                </div>

            </div>
        </div>
    );
};
