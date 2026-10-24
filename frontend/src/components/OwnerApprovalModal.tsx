'use client';

import React, { useState } from 'react';
import { ShieldAlert, Fingerprint, X, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { QueuedApproval } from '../lib/web3/agentWalletClient';

interface OwnerApprovalModalProps {
    request: QueuedApproval | null;
    onApprove: (id: string) => Promise<void>;
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

    if (!request) return null;

    const handlePasskeyAuth = async () => {
        setIsAuthenticating(true);
        // Simulate hardware WebAuthn biometric prompt (0.7s)
        await new Promise(r => setTimeout(r, 700));
        setAuthSuccess(true);
        await onApprove(request.id);
        setIsAuthenticating(false);
        setTimeout(() => {
            setAuthSuccess(false);
            onClose();
        }, 600);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border-3 border-black rounded-2xl max-w-md w-full p-6 shadow-brutal-xl relative">
                <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-neoYellow border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-black tracking-tight font-sans">
                                Out-of-Policy Escalation
                            </h2>
                            <p className="text-xs text-zinc-600 font-mono">Agent sub-key exceeded owner constraints</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 text-black brutal-btn shadow-brutal-xs"
                    >
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>

                {/* Violation Reason Banner */}
                <div className="bg-[#FFF0F2] border-2 border-black rounded-xl p-3.5 mb-4 flex items-start gap-2.5 shadow-brutal-xs">
                    <AlertTriangle className="w-4 h-4 text-neoRed stroke-[2.5] shrink-0 mt-0.5" />
                    <div className="text-xs font-mono text-zinc-900 font-medium">
                        <span className="text-neoRed font-black">Policy Intercept: </span>
                        {request.reason}
                    </div>
                </div>

                {/* Staged Transaction Details */}
                <div className="bg-[#FFFDF8] border-2 border-black rounded-xl p-4 mb-5 space-y-2 text-xs font-mono shadow-brutal-xs">
                    <div className="flex justify-between">
                        <span className="text-zinc-600 font-bold">Action:</span>
                        <span className="text-black font-black">{request.actionName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600 font-bold">Target Protocol:</span>
                        <span className="text-black font-black">{request.targetName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600 font-bold">Requested Amount:</span>
                        <span className="text-black font-black text-sm bg-neoYellow px-2 py-0.5 rounded border border-black">
                            ${request.amount.toFixed(2)} USDC
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600 font-bold">Agent Sub-Key:</span>
                        <span className="text-zinc-700 font-bold">{request.agent.slice(0, 10)}...{request.agent.slice(-4)}</span>
                    </div>
                </div>

                {/* Passkey Biometric Button */}
                <div className="space-y-2.5">
                    <button
                        onClick={handlePasskeyAuth}
                        disabled={isAuthenticating || authSuccess}
                        className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-black shadow-brutal brutal-btn transition-all ${
                            authSuccess
                                ? 'bg-neoMint text-black'
                                : 'bg-neoRed hover:bg-neoCrimson text-white'
                        }`}
                    >
                        {authSuccess ? (
                            <>
                                <Check className="w-4 h-4 stroke-[3]" /> TouchID Verified! Executed on-chain
                            </>
                        ) : isAuthenticating ? (
                            <>
                                <Fingerprint className="w-4 h-4 animate-spin text-white stroke-[2.5]" /> Verifying TouchID / FaceID...
                            </>
                        ) : (
                            <>
                                <Fingerprint className="w-4 h-4 text-white stroke-[2.5]" /> Authorize via Biometric Passkey
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            onReject(request.id);
                            onClose();
                        }}
                        className="w-full py-2.5 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs text-black font-bold brutal-btn shadow-brutal-xs transition-all font-mono"
                    >
                        Reject & Cancel Transaction
                    </button>
                </div>

            </div>
        </div>
    );
};
