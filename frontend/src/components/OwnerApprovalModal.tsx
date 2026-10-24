'use client';

import React, { useState } from 'react';
import { ShieldAlert, Fingerprint, X, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { QueuedApproval, formatINR } from '../lib/web3/agentWalletClient';

interface OwnerApprovalModalProps {
    request: QueuedApproval | null;
    onApprove: (id: string) => Promise<boolean>;
    onReject: (id: string) => void;
    onClose: () => void;
}

export const OwnerApprovalModal: React.FC<OwnerApprovalModalProps> = ({
    request,
    onApprove,
    onReject,
    onClose
}) => {
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authSuccess, setAuthSuccess] = useState(false);
    const [authError, setAuthError] = useState(false);

    if (!request) return null;

    const handlePasskeyAuth = async () => {
        setIsAuthenticating(true);
        setAuthError(false);
        const approved = await onApprove(request.id);
        setIsAuthenticating(false);
        if (!approved) {
            setAuthError(true);
            return;
        }
        setAuthSuccess(true);
        setTimeout(() => {
            setAuthSuccess(false);
            onClose();
        }, 600);
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200/90 rounded-2xl max-w-md w-full p-6 shadow-modal relative">
                <div className="flex items-start justify-between mb-4 pb-3 border-b border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shadow-subtle">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
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
                    <div className="flex justify-between">
                        <span className="text-stone-500 font-normal">Action:</span>
                        <span className="text-stone-900 font-semibold">{request.actionName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-500 font-normal">Target Protocol:</span>
                        <span className="text-stone-900 font-semibold">{request.targetName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-stone-500 font-normal">Requested Amount:</span>
                        <span className="text-stone-900 font-semibold text-sm bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle">
                            {formatINR(request.amount)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-500 font-normal">Agent Sub-Key:</span>
                        <span className="text-stone-700 font-medium">{request.agent.slice(0, 10)}...{request.agent.slice(-4)}</span>
                    </div>
                </div>

                {/* Passkey Biometric Button */}
                <div className="space-y-2">
                    {authError && <p className="text-xs text-rose-700">Approval failed. The request is still pending.</p>}
                    <button
                        onClick={handlePasskeyAuth}
                        disabled={isAuthenticating || authSuccess}
                        className={`w-full py-3 rounded-xl font-medium text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all ${
                            authSuccess
                                ? 'bg-emerald-800 text-white'
                                : 'bg-stone-900 hover:bg-stone-800 text-white'
                        }`}
                    >
                        {authSuccess ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-300" /> Local simulation approved
                            </>
                        ) : isAuthenticating ? (
                            <>
                                <Fingerprint className="w-4 h-4 animate-spin text-stone-300" /> Recording approval...
                            </>
                        ) : (
                            <>
                                <Fingerprint className="w-4 h-4 text-stone-300" /> Approve local simulation
                            </>
                        )}
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
