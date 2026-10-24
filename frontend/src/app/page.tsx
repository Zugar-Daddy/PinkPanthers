'use client';

import React, { useState, useEffect } from 'react';
import { WalletHeader } from '../components/WalletHeader';
import { DashboardOverview } from '../components/DashboardOverview';
import { AgentKeyPolicyCard } from '../components/AgentKeyPolicyCard';
import { AgentActionSimulator } from '../components/AgentActionSimulator';
import { LiveOmniAgentCopilot } from '../components/LiveOmniAgentCopilot';
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

import { Phase2HijackRecovery } from '../components/Phase2HijackRecovery';

import { agentWalletClient, QueuedApproval, UserOperationLog, formatINR } from '../lib/web3/agentWalletClient';
import { LayoutGrid, CreditCard, Terminal, ShieldAlert, Activity, Sparkles, Users, LifeBuoy, Play } from 'lucide-react';

type ActiveTab = 'overview' | 'fleet' | 'card' | 'lab' | 'simulator' | 'stream' | 'cli' | 'threats' | 'phase2';

const navigation = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, group: 'Workspace' },
    { id: 'fleet', label: 'Agents', icon: Users, group: 'Workspace' },
    { id: 'card', label: 'Cards & policy', icon: CreditCard, group: 'Workspace' },
    { id: 'stream', label: 'Activity', icon: Activity, group: 'Workspace' },
    { id: 'lab', label: 'Simulate', icon: Play, group: 'Tools' },
    { id: 'simulator', label: 'Copilot', icon: Sparkles, group: 'Tools' },
    { id: 'threats', label: 'Security tests', icon: ShieldAlert, group: 'Tools' },
    { id: 'phase2', label: 'Recovery', icon: LifeBuoy, group: 'Tools' },
    { id: 'cli', label: 'Terminal', icon: Terminal, group: 'Tools' },
] as const;

const sectionIntro: Record<ActiveTab, { title: string; description: string }> = {
    overview: { title: 'Treasury overview', description: 'Manage agent access, spending, and approvals in one place.' },
    fleet: { title: 'Agents', description: 'See who is active and switch between agents.' },
    card: { title: 'Cards & policy', description: 'Review card controls and spending limits.' },
    lab: { title: 'Simulation lab', description: 'Test an agent action and see how the current policy responds.' },
    simulator: { title: 'Copilot', description: 'Ask for live listings and review sourced options before visiting a merchant.' },
    stream: { title: 'Activity', description: 'Follow recent agent actions and account operations.' },
    cli: { title: 'Terminal', description: 'Explore account actions in the local terminal.' },
    threats: { title: 'Security tests', description: 'Try common attacks against the simulated policy.' },
    phase2: { title: 'Recovery', description: 'Explore the simulated account recovery flow.' },
};

export default function Home() {
    // Wallet Client Instance
    const [wallet, setWallet] = useState(agentWalletClient);
    const [renderTick, setRenderTick] = useState(0);
    const forceUpdate = () => setRenderTick(t => t + 1);

    // Auto-sync with live shared state bridge (MCP and backend updates)
    useEffect(() => {
        wallet.syncFromServer().then(ok => { if (ok) forceUpdate(); });
        const interval = setInterval(() => {
            wallet.syncFromServer().then(ok => { if (ok) forceUpdate(); });
        }, 2500);
        return () => clearInterval(interval);
    }, [wallet]);

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
    const handleSimulateAction = async (
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
        return result;
    };

    // Owner Passkey Approval Handlers
    const handleApproveRequest = async (id: string) => {
        const approved = await wallet.approveQueued(id);
        if (approved) setActiveApprovalRequest(null);
        forceUpdate();
        return approved;
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
            result: 'REVERTED IN SIMULATION',
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
            result: 'REVERTED IN SIMULATION',
            defenseMechanism: 'Contract Whitelist Rejection'
        };
        setThreatLogs(prev => [newLog, ...prev]);
        forceUpdate();
    };

    const handleTriggerOverspend = () => {
        const overspendAmount = Math.max(25000, (wallet.policy.maxPerTx || 2500) * 2);
        wallet.submitAgentAction(
            'High-End Compute Cluster API',
            '0x00000000000000000000000000000000000C3C3C',
            `prepayCluster(uint256 ${overspendAmount})`,
            overspendAmount,
            `Agent attempts ${formatINR(overspendAmount)} purchase on ${formatINR(wallet.policy.maxPerTx)} per-tx limit`
        );
        setActiveApprovalRequest(wallet.queuedApprovals[0] || null);
        const newLog = {
            id: `threat-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            attackType: `Budget Overspend (${formatINR(overspendAmount)} > ${formatINR(wallet.policy.maxPerTx)})`,
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
            result: 'REVERTED IN SIMULATION',
            defenseMechanism: 'validUntil Block Timestamp Check'
        };
        setThreatLogs(prev => [newLog, ...prev]);
        forceUpdate();
    };

    return (
        <main className="min-h-screen flex flex-col bg-[#faf9f6] text-stone-900 selection:bg-[#123b32] selection:text-white">
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs text-amber-900">
                Demo workspace · Balances and actions are simulated; no blockchain transaction or biometric verification occurs.
            </div>
            {/* Top Navigation */}
            <WalletHeader
                wallet={wallet}
                onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
                onOpenInbox={() => setIsInboxModalOpen(true)}
                onOpenMcp={() => setIsMcpModalOpen(true)}
            />

            <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-9 lg:px-8 lg:py-9">
                <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-label="Main navigation">
                    <div className="dashboard-sidebar">
                        {(['Workspace', 'Tools'] as const).map(group => (
                            <div key={group} className="lg:mb-6">
                                <p className="hidden px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 lg:block">{group}</p>
                                <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label={group}>
                                    {navigation.filter(item => item.group === group).map(({ id, label, icon: Icon }) => (
                                        <button key={id} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined}
                                            className={`flex min-h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-colors lg:w-full ${
                                                activeTab === id ? 'bg-[#e8f3ee] text-[#105b49]' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
                                            }`}>
                                            <Icon className="h-[17px] w-[17px]" />
                                            {label}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        ))}
                    </div>
                </aside>

                <div className="min-w-0 space-y-7">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="dashboard-eyebrow">SAFEAGENT / {sectionIntro[activeTab].title.toUpperCase()}</p>
                            <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.045em] text-stone-950 sm:text-[38px]">{sectionIntro[activeTab].title}</h1>
                            <p className="mt-2 text-sm text-stone-500">{sectionIntro[activeTab].description}</p>
                        </div>
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">{activeTab === 'simulator' ? 'Live research · merchant checkout' : `Selected: ${wallet.agentName}`}</span>
                    </div>

                    {activeTab === 'overview' && (
                        <div className="space-y-6 tab-panel-enter">
                            <DashboardOverview wallet={wallet} onSelectAgent={handleSelectAgent} onOpenSimulator={() => setActiveTab('lab')} onOpenActivity={() => setActiveTab('stream')} onOpenPolicy={() => setActiveTab('card')} />
                            <div className="grid gap-5 xl:grid-cols-2">
                                <LiveActivityStream wallet={wallet} />
                                <UserOpActivityTable userOps={wallet.userOps} onInspectUserOp={setSelectedUserOp} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'fleet' && (
                        <div className="space-y-6 tab-panel-enter">
                            <PrincipalFleetOverview wallet={wallet} onSelectAgent={handleSelectAgent} />
                            <LiveActivityStream wallet={wallet} />
                        </div>
                    )}

                    {activeTab === 'card' && (
                        <div className="grid gap-6 tab-panel-enter xl:grid-cols-2">
                            <AgentVirtualCard wallet={wallet} onToggleFreeze={handleToggleCardFreeze} onUpdateLimit={handleUpdateCardLimit} />
                            <AgentKeyPolicyCard wallet={wallet} onEditPolicy={() => setIsPolicyModalOpen(true)} />
                        </div>
                    )}

                    {activeTab === 'lab' && (
                        <div className="space-y-6 tab-panel-enter">
                            <AgentActionSimulator wallet={wallet} onExecuteAction={handleSimulateAction} />
                            <UserOpActivityTable userOps={wallet.userOps} onInspectUserOp={setSelectedUserOp} />
                        </div>
                    )}

                    {activeTab === 'simulator' && (
                        <div className="space-y-6 tab-panel-enter">
                            <LiveOmniAgentCopilot wallet={wallet} />
                            <UserOpActivityTable userOps={wallet.userOps} onInspectUserOp={setSelectedUserOp} />
                        </div>
                    )}

                    {activeTab === 'stream' && (
                        <div className="grid gap-6 tab-panel-enter xl:grid-cols-2">
                            <LiveActivityStream wallet={wallet} />
                            <UserOpActivityTable userOps={wallet.userOps} onInspectUserOp={setSelectedUserOp} />
                        </div>
                    )}

                    {activeTab === 'cli' && (
                        <div className="tab-panel-enter"><InteractiveCliTerminal wallet={wallet} /></div>
                    )}

                    {activeTab === 'threats' && (
                        <div className="tab-panel-enter">
                            <ThreatDefensePlayground onTriggerDrain={handleTriggerDrain} onTriggerPromptInjection={handleTriggerPromptInjection} onTriggerOverspend={handleTriggerOverspend} onTriggerExpired={handleTriggerExpired} threatLogs={threatLogs} />
                        </div>
                    )}

                    {activeTab === 'phase2' && (
                        <div className="tab-panel-enter"><Phase2HijackRecovery wallet={wallet} /></div>
                    )}

                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-6 text-xs text-stone-400">
                        <span>SafeAgent Treasury</span>
                        <span>Local simulation · No blockchain transactions</span>
                    </footer>
                </div>
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
