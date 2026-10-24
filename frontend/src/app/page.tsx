'use client';

import React, { useState } from 'react';
import { WalletHeader } from '../components/WalletHeader';
import { WalletBalancesCard } from '../components/WalletBalancesCard';
import { AgentKeyPolicyCard } from '../components/AgentKeyPolicyCard';
import { AgentActionSimulator } from '../components/AgentActionSimulator';
import { ThreatDefensePlayground } from '../components/ThreatDefensePlayground';
import { UserOpActivityTable } from '../components/UserOpActivityTable';
import { OwnerApprovalModal } from '../components/OwnerApprovalModal';
import { PolicyConfigModal } from '../components/PolicyConfigModal';
import { UserOpInspectorModal } from '../components/UserOpInspectorModal';

import { agentWalletClient, QueuedApproval, UserOperationLog } from '../lib/web3/agentWalletClient';
import { LayoutGrid, Bot, Sliders, ShieldAlert, Activity, Sparkles } from 'lucide-react';

type ActiveTab = 'overview' | 'simulator' | 'policies' | 'threats' | 'activity';

export default function Home() {
    // Wallet Client Instance
    const [wallet, setWallet] = useState(agentWalletClient);
    const [renderTick, setRenderTick] = useState(0);
    const forceUpdate = () => setRenderTick(t => t + 1);

    // Active View Tab
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

    // Modals
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [activeApprovalRequest, setActiveApprovalRequest] = useState<QueuedApproval | null>(null);
    const [selectedUserOp, setSelectedUserOp] = useState<UserOperationLog | null>(null);

    // Threat Defense Logs
    const [threatLogs, setThreatLogs] = useState<{ id: string; time: string; attackType: string; result: string; defenseMechanism: string }[]>([
        {
            id: 'init-threat-1',
            time: '12:00:15',
            attackType: 'Target Whitelist Verification',
            result: '0x0000...A1A1 verified',
            defenseMechanism: 'PolicyEngine.validateAction'
        }
    ]);

    // Handle Agent Action Dispatch
    const handleExecuteAction = async (
        targetName: string,
        targetAddress: string,
        functionCalled: string,
        amount: number,
        description: string
    ) => {
        const result = await wallet.submitAgentAction(targetName, targetAddress, functionCalled, amount, description);
        if (result.status === 'QUEUED') {
            setActiveApprovalRequest(wallet.queuedApprovals[0] || null);
        }
        forceUpdate();
    };

    // Owner Passkey Approval Handlers
    const handleApproveRequest = async (id: string) => {
        await wallet.approveQueued(id);
        setActiveApprovalRequest(null);
        forceUpdate();
    };

    const handleRejectRequest = (id: string) => {
        wallet.rejectQueued(id);
        setActiveApprovalRequest(null);
        forceUpdate();
    };

    // Policy Updates
    const handleUpdatePolicy = (dailyBudget: number, maxPerTx: number, durationHours: number) => {
        wallet.issueSubKey(durationHours, dailyBudget, maxPerTx);
        forceUpdate();
    };

    const handleRevokeKey = () => {
        wallet.revokeSubKey();
        forceUpdate();
    };

    // Threat Attack Simulations
    const handleTriggerDrain = () => {
        wallet.submitAgentAction(
            'Attacker Destination (0x9999...9999)',
            '0x9999999999999999999999999999999999999999',
            'transferAll()',
            1000.00,
            'Leaked Sub-Key Drain Attempt to unauthorized hacker address'
        );
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Leaked Key Drain ($1,000)',
            result: 'REVERTED ON-CHAIN',
            defenseMechanism: 'Recipient Allowlist Rejection'
        };
        setThreatLogs(prev => [newLog, ...prev]);
        forceUpdate();
    };

    const handleTriggerPromptInjection = () => {
        wallet.submitAgentAction(
            'Malicious Phishing Protocol (0xDead...Beef)',
            '0xDeadDeadDeadDeadDeadDeadDeadDeadDeadBeef',
            'approvePhishingToken(uint256 max)',
            250.00,
            'Prompt Injection: Malicious webpage injected unverified contract call'
        );
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Prompt Injection / Jailbreak',
            result: 'REVERTED ON-CHAIN',
            defenseMechanism: 'Contract Whitelist Rejection'
        };
        setThreatLogs(prev => [newLog, ...prev]);
        forceUpdate();
    };

    const handleTriggerOverspend = () => {
        wallet.submitAgentAction(
            'High-End Compute Cluster API',
            '0x00000000000000000000000000000000000C3C3C',
            'prepayCluster(uint256 250)',
            250.00,
            'Agent attempts $250 purchase on $25 per-tx limit'
        );
        setActiveApprovalRequest(wallet.queuedApprovals[0] || null);
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Budget Overspend ($250 > $25)',
            result: 'HALTED & ESCALATED',
            defenseMechanism: 'Owner TouchID Passkey Gate'
        };
        setThreatLogs(prev => [newLog, ...prev]);
        forceUpdate();
    };

    const handleTriggerExpired = () => {
        const originalExpires = wallet.sessionExpiresAt;
        wallet.sessionExpiresAt = Date.now() - 1000; // Expired 1 second ago
        wallet.submitAgentAction(
            'OpenAI Billing API',
            '0x00000000000000000000000000000000000A1A1A',
            'payInvoice(uint256 10)',
            10.00,
            'Agent attempts to spend after 6-hour session key expiry'
        );
        wallet.sessionExpiresAt = originalExpires; // Restore
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Expired Sub-Key Call',
            result: 'REVERTED ON-CHAIN',
            defenseMechanism: 'validUntil Block Timestamp Check'
        };
        setThreatLogs(prev => [newLog, ...prev]);
        forceUpdate();
    };

    return (
        <main className="min-h-screen flex flex-col bg-canvas text-black selection:bg-neoRed selection:text-white">
            {/* Top Navigation */}
            <WalletHeader
                wallet={wallet}
                onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
            />

            {/* Main Application Container */}
            <div className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
                
                {/* 1. Primary Treasury & 24h Spend Tracking */}
                <WalletBalancesCard
                    wallet={wallet}
                    onRevokeKey={handleRevokeKey}
                />

                {/* 2. Interactive View Switcher / Tab Bar */}
                <div className="flex items-center justify-between pb-1 gap-3 flex-wrap">
                    <div className="flex items-center bg-white border-2 border-black rounded-2xl p-1.5 gap-1.5 shadow-brutal-sm flex-wrap">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all brutal-btn ${
                                activeTab === 'overview'
                                    ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                    : 'bg-white text-zinc-700 hover:text-black border-2 border-transparent hover:border-black'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Workspace</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('simulator')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all brutal-btn ${
                                activeTab === 'simulator'
                                    ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                    : 'bg-white text-zinc-700 hover:text-black border-2 border-transparent hover:border-black'
                            }`}
                        >
                            <Bot className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Action Simulator</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('policies')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all brutal-btn ${
                                activeTab === 'policies'
                                    ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                    : 'bg-white text-zinc-700 hover:text-black border-2 border-transparent hover:border-black'
                            }`}
                        >
                            <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>On-Chain Policies</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('threats')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all brutal-btn ${
                                activeTab === 'threats'
                                    ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                    : 'bg-white text-zinc-700 hover:text-black border-2 border-transparent hover:border-black'
                            }`}
                        >
                            <ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Threat Defense</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all brutal-btn ${
                                activeTab === 'activity'
                                    ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                    : 'bg-white text-zinc-700 hover:text-black border-2 border-transparent hover:border-black'
                            }`}
                        >
                            <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>UserOp Feed</span>
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold text-black bg-neoYellow border-2 border-black px-3.5 py-2 rounded-xl shadow-brutal-sm">
                        <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>PolicyEngine.sol Guardrails Active</span>
                    </div>
                </div>

                {/* 3. Main Workspace Display */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
                        {/* Left Column: Simulator + Policies (7 cols) */}
                        <div className="lg:col-span-7 space-y-6">
                            <AgentActionSimulator
                                wallet={wallet}
                                onExecuteAction={handleExecuteAction}
                            />
                            <AgentKeyPolicyCard
                                wallet={wallet}
                                onEditPolicy={() => setIsPolicyModalOpen(true)}
                            />
                        </div>

                        {/* Right Column: Threat Sandbox + UserOp Stream (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            <ThreatDefensePlayground
                                onTriggerDrain={handleTriggerDrain}
                                onTriggerPromptInjection={handleTriggerPromptInjection}
                                onTriggerOverspend={handleTriggerOverspend}
                                onTriggerExpired={handleTriggerExpired}
                                threatLogs={threatLogs}
                            />
                            <UserOpActivityTable
                                userOps={wallet.userOps}
                                onInspectUserOp={(op) => setSelectedUserOp(op)}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'simulator' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <AgentActionSimulator
                            wallet={wallet}
                            onExecuteAction={handleExecuteAction}
                        />
                        <UserOpActivityTable
                            userOps={wallet.userOps}
                            onInspectUserOp={(op) => setSelectedUserOp(op)}
                        />
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <AgentKeyPolicyCard
                            wallet={wallet}
                            onEditPolicy={() => setIsPolicyModalOpen(true)}
                        />
                    </div>
                )}

                {activeTab === 'threats' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <ThreatDefensePlayground
                            onTriggerDrain={handleTriggerDrain}
                            onTriggerPromptInjection={handleTriggerPromptInjection}
                            onTriggerOverspend={handleTriggerOverspend}
                            onTriggerExpired={handleTriggerExpired}
                            threatLogs={threatLogs}
                        />
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <UserOpActivityTable
                            userOps={wallet.userOps}
                            onInspectUserOp={(op) => setSelectedUserOp(op)}
                        />
                    </div>
                )}

                {/* Neo-Brutalist Footer Banner */}
                <footer className="mt-12 pt-6 border-t-2 border-black flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-zinc-600 pb-8">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-neoMint border border-black inline-block"></span>
                        <span className="font-black text-black font-sans">PinkPanthers</span>
                        <span>•</span>
                        <span>Track 02: Letting AI Agents Pay Safely</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] flex-wrap justify-center">
                        <span className="bg-white px-2.5 py-1 rounded-md border-2 border-black font-bold text-black shadow-brutal-xs">
                            ERC-4337 v0.7
                        </span>
                        <span className="bg-white px-2.5 py-1 rounded-md border-2 border-black font-bold text-black shadow-brutal-xs">
                            WebAuthn P-256
                        </span>
                        <span className="bg-white px-2.5 py-1 rounded-md border-2 border-black font-bold text-black shadow-brutal-xs">
                            PolicyEngine.sol
                        </span>
                    </div>
                </footer>

            </div>

            {/* Modals */}
            <OwnerApprovalModal
                request={activeApprovalRequest}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                onClose={() => setActiveApprovalRequest(null)}
            />

            <PolicyConfigModal
                wallet={wallet}
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                onUpdatePolicy={handleUpdatePolicy}
                onRevokeKey={handleRevokeKey}
            />

            <UserOpInspectorModal
                op={selectedUserOp}
                onClose={() => setSelectedUserOp(null)}
            />
        </main>
    );
}
