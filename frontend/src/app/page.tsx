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

import { PrincipalFleetOverview } from '../components/PrincipalFleetOverview';
import { AgentVirtualCard } from '../components/AgentVirtualCard';
import { AgentInboxModal } from '../components/AgentInboxModal';
import { McpIntegrationModal } from '../components/McpIntegrationModal';
import { LiveActivityStream } from '../components/LiveActivityStream';
import { InteractiveCliTerminal } from '../components/InteractiveCliTerminal';

import { agentWalletClient, QueuedApproval, UserOperationLog } from '../lib/web3/agentWalletClient';
import { LayoutGrid, Bot, CreditCard, Terminal, ShieldAlert, Activity, Sparkles, Users } from 'lucide-react';

type ActiveTab = 'overview' | 'fleet' | 'card' | 'simulator' | 'stream' | 'cli' | 'threats';

export default function Home() {
    // Wallet Client Instance
    const [wallet, setWallet] = useState(agentWalletClient);
    const [renderTick, setRenderTick] = useState(0);
    const forceUpdate = () => setRenderTick(t => t + 1);

    // Active View Tab
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

    // Modals
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
    const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
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

    // Handle Agent Fleet Switch
    const handleSelectAgent = (agentId: string) => {
        wallet.switchAgent(agentId);
        forceUpdate();
    };

    // Handle Virtual Card Freeze Toggle
    const handleToggleCardFreeze = () => {
        wallet.toggleCardFreeze();
        forceUpdate();
    };

    const handleUpdateCardLimit = (limit: number) => {
        wallet.updateCardLimit(limit);
        forceUpdate();
    };

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
            100000.00,
            'Leaked Sub-Key Drain Attempt to unauthorized hacker address'
        );
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Leaked Key Drain (₹1,00,000)',
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
            25000.00,
            'Prompt Injection: Malicious webpage injected unverified contract call'
        );
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Prompt Injection / Jailbreak (₹25,000)',
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
            'prepayCluster(uint256 25000)',
            25000.00,
            'Agent attempts ₹25,000 purchase on ₹2,500 per-tx limit'
        );
        setActiveApprovalRequest(wallet.queuedApprovals[0] || null);
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Budget Overspend (₹25,000 > ₹2,500)',
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
            'payInvoice(uint256 1000)',
            1000.00,
            'Agent attempts to spend after 6-hour session key expiry'
        );
        wallet.sessionExpiresAt = originalExpires; // Restore
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: 'Expired Sub-Key Call (₹1,000)',
            result: 'REVERTED ON-CHAIN',
            defenseMechanism: 'validUntil Block Timestamp Check'
        };
        setThreatLogs(prev => [newLog, ...prev]);
        forceUpdate();
    };

    return (
        <main className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-emerald-600 selection:text-white">
            {/* Top Navigation */}
            <WalletHeader
                wallet={wallet}
                onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
                onOpenInbox={() => setIsInboxModalOpen(true)}
                onOpenMcp={() => setIsMcpModalOpen(true)}
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
                    <div className="flex items-center bg-white/80 backdrop-blur-md border border-stone-200/80 rounded-2xl p-1.5 gap-1 shadow-subtle flex-wrap">
                        
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                                activeTab === 'overview'
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Workspace</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('fleet')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                                activeTab === 'fleet'
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Agent Fleet</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('card')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                                activeTab === 'card'
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                            }`}
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Virtual Card</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('simulator')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                                activeTab === 'simulator'
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                            }`}
                        >
                            <Bot className="w-3.5 h-3.5" />
                            <span>Action Simulator</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('stream')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                                activeTab === 'stream'
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                            }`}
                        >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Live Activity</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('cli')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                                activeTab === 'cli'
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                            }`}
                        >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>CLI Terminal</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('threats')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                                activeTab === 'threats'
                                    ? 'bg-stone-900 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                            }`}
                        >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Threat Defense</span>
                        </button>

                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 rounded-xl shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>MCP + PolicyEngine.sol Active</span>
                    </div>
                </div>

                {/* 3. Main Workspace Display */}
                {activeTab === 'overview' && (
                    <div key="overview" className="space-y-6 tab-panel-enter">
                        {/* 1. Principal & Fleet Banner */}
                        <PrincipalFleetOverview
                            wallet={wallet}
                            onSelectAgent={handleSelectAgent}
                        />

                        {/* 2. Interactive Card + Simulator row */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-6 space-y-6">
                                <AgentVirtualCard
                                    wallet={wallet}
                                    onToggleFreeze={handleToggleCardFreeze}
                                    onUpdateLimit={handleUpdateCardLimit}
                                />
                                <AgentKeyPolicyCard
                                    wallet={wallet}
                                    onEditPolicy={() => setIsPolicyModalOpen(true)}
                                />
                            </div>

                            <div className="lg:col-span-6 space-y-6">
                                <AgentActionSimulator
                                    wallet={wallet}
                                    onExecuteAction={handleExecuteAction}
                                />
                                <LiveActivityStream
                                    wallet={wallet}
                                />
                            </div>
                        </div>

                        {/* 3. UserOp History Log */}
                        <UserOpActivityTable
                            userOps={wallet.userOps}
                            onInspectUserOp={(op) => setSelectedUserOp(op)}
                        />
                    </div>
                )}

                {activeTab === 'fleet' && (
                    <div key="fleet" className="space-y-6 tab-panel-enter">
                        <PrincipalFleetOverview
                            wallet={wallet}
                            onSelectAgent={handleSelectAgent}
                        />
                        <LiveActivityStream
                            wallet={wallet}
                        />
                    </div>
                )}

                {activeTab === 'card' && (
                    <div key="card" className="max-w-4xl mx-auto space-y-6 tab-panel-enter">
                        <AgentVirtualCard
                            wallet={wallet}
                            onToggleFreeze={handleToggleCardFreeze}
                            onUpdateLimit={handleUpdateCardLimit}
                        />
                        <AgentKeyPolicyCard
                            wallet={wallet}
                            onEditPolicy={() => setIsPolicyModalOpen(true)}
                        />
                    </div>
                )}

                {activeTab === 'simulator' && (
                    <div key="simulator" className="max-w-4xl mx-auto space-y-6 tab-panel-enter">
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

                {activeTab === 'stream' && (
                    <div key="stream" className="max-w-4xl mx-auto space-y-6 tab-panel-enter">
                        <LiveActivityStream
                            wallet={wallet}
                        />
                        <UserOpActivityTable
                            userOps={wallet.userOps}
                            onInspectUserOp={(op) => setSelectedUserOp(op)}
                        />
                    </div>
                )}

                {activeTab === 'cli' && (
                    <div key="cli" className="max-w-4xl mx-auto space-y-6 tab-panel-enter">
                        <InteractiveCliTerminal
                            wallet={wallet}
                        />
                    </div>
                )}

                {activeTab === 'threats' && (
                    <div key="threats" className="max-w-4xl mx-auto space-y-6 tab-panel-enter">
                        <ThreatDefensePlayground
                            onTriggerDrain={handleTriggerDrain}
                            onTriggerPromptInjection={handleTriggerPromptInjection}
                            onTriggerOverspend={handleTriggerOverspend}
                            onTriggerExpired={handleTriggerExpired}
                            threatLogs={threatLogs}
                        />
                    </div>
                )}

                {/* Sleek Editorial Footer */}
                <footer className="mt-12 pt-6 border-t border-stone-200/80 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-stone-500 pb-8">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                        <span className="font-serif font-bold text-stone-900 tracking-tight">SafeAgent Treasury</span>
                        <span>•</span>
                        <span>Autonomous Agent Financial Infrastructure</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] flex-wrap justify-center">
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-stone-200/80 font-mono text-stone-700 shadow-xs">
                            ERC-4337 v0.7
                        </span>
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-stone-200/80 font-mono text-stone-700 shadow-xs">
                            MCP Protocol
                        </span>
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-stone-200/80 font-mono text-stone-700 shadow-xs">
                            WebAuthn P-256
                        </span>
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-stone-200/80 font-mono text-stone-700 shadow-xs">
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

            <AgentInboxModal
                wallet={wallet}
                isOpen={isInboxModalOpen}
                onClose={() => setIsInboxModalOpen(false)}
                onMarkAllRead={() => {
                    wallet.markAllInboxRead();
                    forceUpdate();
                }}
            />

            <McpIntegrationModal
                wallet={wallet}
                isOpen={isMcpModalOpen}
                onClose={() => setIsMcpModalOpen(false)}
            />

            <UserOpInspectorModal
                op={selectedUserOp}
                onClose={() => setSelectedUserOp(null)}
            />
        </main>
    );
}
