'use client';

import React, { useState } from 'react';
import { Bot, Cpu, ShoppingBag, Ticket, Plane, ArrowRight, Sparkles, Zap, ShoppingCart, PlusCircle, CheckCircle2 } from 'lucide-react';
import { AgentWalletClient, formatINR } from '../lib/web3/agentWalletClient';

interface AgentActionSimulatorProps {
    wallet: AgentWalletClient;
    onExecuteAction: (
        targetName: string,
        targetAddress: string,
        functionCalled: string,
        amount: number,
        description: string
    ) => Promise<void>;
}

export const AgentActionSimulator: React.FC<AgentActionSimulatorProps> = ({ wallet, onExecuteAction }) => {
    const [selectedTab, setSelectedTab] = useState<'general' | 'cloud' | 'custom'>('general');
    const [isExecuting, setIsExecuting] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [typingCmd, setTypingCmd] = useState<string>('');
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        '# Autonomous Agent Action Simulator — SafeAgent Smart Account',
        `# Master Principal: ${wallet.principalName} (WebAuthn P-256 Passkey Active)`,
        `# Policy Guardrails: Max Per-Tx ${formatINR(wallet.policy.maxPerTx)} | 24h Budget ${formatINR(wallet.policy.dailyBudget)}`,
        '✨ Ready to test autonomous in-policy payments and out-of-policy TouchID escalations.'
    ]);

    // Custom form inputs
    const [customVendor, setCustomVendor] = useState('OpenAI Billing API');
    const [customAddress, setCustomAddress] = useState('0x00000000000000000000000000000000000A1A1A');
    const [customFunction, setCustomFunction] = useState('payInvoice(uint256 1800)');
    const [customAmount, setCustomAmount] = useState('1800');
    const [customDesc, setCustomDesc] = useState('Autonomous agent API top-up');

    // Tab 1: General & Mobility Presets
    const generalPresets = [
        {
            id: 'openai',
            title: 'OpenAI API Credit Top-Up',
            vendor: 'OpenAI Billing API',
            address: '0x00000000000000000000000000000000000A1A1A',
            functionCalled: 'payInvoice(uint256 1500)',
            amount: 1500.00,
            icon: Cpu,
            badge: 'In-Policy (₹1,500 < ₹2,500)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Agent autonomously replenishes LLM inference credits'
        },
        {
            id: 'grocery',
            title: 'Blinkit / Zepto Grocery Restock',
            vendor: 'Grocery & Delivery Service (Blinkit/Zepto/Instamart)',
            address: '0x00000000000000000000000000000000000B2B2B',
            functionCalled: 'orderCheckout(uint256 950)',
            amount: 950.00,
            icon: ShoppingBag,
            badge: 'In-Policy (₹950 < ₹2,500)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Agent orders office milk, coffee beans & fruit'
        },
        {
            id: 'train',
            title: 'Metro / IRCTC Train Booking',
            vendor: 'Travel & Ticket Booking API (IRCTC/Metro/IndiGo)',
            address: '0x00000000000000000000000000000000000C3C3C',
            functionCalled: 'bookTicket(uint256 800)',
            amount: 800.00,
            icon: Ticket,
            badge: 'In-Policy (₹800 < ₹2,500)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Agent reserves daily commute rapid transit ticket'
        },
        {
            id: 'flight',
            title: 'IndiGo Executive Flight Booking',
            vendor: 'Travel & Ticket Booking API (IRCTC/Metro/IndiGo)',
            address: '0x00000000000000000000000000000000000C3C3C',
            functionCalled: 'bookTicket(uint256 14500)',
            amount: 14500.00,
            icon: Plane,
            badge: 'Out-of-Policy (₹14,500 > ₹2,500 Cap)',
            badgeColor: 'text-amber-800 bg-amber-50 border border-amber-200/80',
            description: 'Agent tries to book conference flight exceeding per-tx cap'
        }
    ];

    // Tab 2: Cloud, DevOps & Catering Presets
    const cloudPresets = [
        {
            id: 'aws-compute',
            title: 'Cloud Infrastructure Top-Up',
            vendor: 'Cloud Infrastructure API (AWS/Cloudflare)',
            address: '0x00000000000000000000000000000000000D4D4D',
            functionCalled: 'topUpCompute(uint256 2200)',
            amount: 2200.00,
            icon: Zap,
            badge: 'In-Policy (₹2,200 < ₹2,500)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'DevOps bot tops up serverless edge worker compute'
        },
        {
            id: 'swiggy-lunch',
            title: 'Swiggy Corporate Team Lunch',
            vendor: 'Corporate Catering (Swiggy/Zomato)',
            address: '0x00000000000000000000000000000000000E5E5E',
            functionCalled: 'orderCatering(uint256 1650)',
            amount: 1650.00,
            icon: ShoppingCart,
            badge: 'In-Policy (₹1,650 < ₹2,500)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Automated executive working lunch catering for team'
        },
        {
            id: 'claude-tokens',
            title: 'Claude 3.5 Fine-Tuning Batch',
            vendor: 'OpenAI Billing API',
            address: '0x00000000000000000000000000000000000A1A1A',
            functionCalled: 'payInvoice(uint256 1800)',
            amount: 1800.00,
            icon: Bot,
            badge: 'In-Policy (₹1,800 < ₹2,500)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Autonomous research batch embedding & inference query'
        },
        {
            id: 'gpu-cluster',
            title: 'Dedicated GPU Cluster Pre-Pay',
            vendor: 'Cloud Infrastructure API (AWS/Cloudflare)',
            address: '0x00000000000000000000000000000000000D4D4D',
            functionCalled: 'topUpCompute(uint256 25000)',
            amount: 25000.00,
            icon: Sparkles,
            badge: 'Out-of-Policy (₹25,000 > ₹2,500 Cap)',
            badgeColor: 'text-amber-800 bg-amber-50 border border-amber-200/80',
            description: 'Agent requests dedicated GPU cluster exceeding per-tx cap'
        }
    ];

    const runAction = async (
        title: string,
        vendor: string,
        address: string,
        functionCalled: string,
        amount: number,
        description: string,
        actionId: string
    ) => {
        setIsExecuting(true);
        setSelectedAction(actionId);

        // 1. Real-time typewriter animation of the terminal CLI command
        const commandString = `$ safeagent exec --agent ${wallet.activeAgentId} --target "${vendor}" --amount ${formatINR(amount)}`;
        for (let i = 1; i <= commandString.length; i++) {
            setTypingCmd(commandString.slice(0, i));
            await new Promise(r => setTimeout(r, 12));
        }
        await new Promise(r => setTimeout(r, 120));

        // 2. Commit typed command and start UserOp inspection sequence
        setTerminalOutput(prev => [
            commandString,
            `🤖 [AGENT] Constructing UserOperation for: ${title} (${formatINR(amount)})`,
            `📦 [UserOp] Target: ${vendor} (${address.slice(0, 10)}...)`,
            `🔐 [Signature] Signed with Agent Sub-Key (${wallet.agentAddress.slice(0, 10)}...)`,
            `🛡️  [PolicyEngine.sol] Validating: Whitelisted? Daily Budget? Per-Tx Cap (${formatINR(wallet.policy.maxPerTx)})`,
            ...prev.slice(0, 12)
        ]);
        setTypingCmd('');

        // 3. Dispatch action to smart wallet
        await new Promise(r => setTimeout(r, 450));
        await onExecuteAction(vendor, address, functionCalled, amount, description);

        // 4. Trace the verification result
        if (amount > wallet.policy.maxPerTx) {
            setTerminalOutput(prev => [
                `⚠️ [INTERCEPT] Amount ${formatINR(amount)} exceeds Per-Tx limit of ${formatINR(wallet.policy.maxPerTx)}!`,
                `📥 [PendingApprovalQueue] Staged UserOp for Master Principal ${wallet.principalName}`,
                `🔔 [OWNER ALERT] Push notification dispatched: WebAuthn TouchID required`,
                ...prev.slice(0, 12)
            ]);
        } else {
            setTerminalOutput(prev => [
                `✅ [PASSED] Policy checks passed! In-policy spending approved.`,
                `⛽ [Paymaster] Gas sponsored (${formatINR(10)}) - 0 ETH deducted from Agent`,
                `✨ [CONFIRMED] Smart Account executed ${functionCalled} on-chain!`,
                ...prev.slice(0, 12)
            ]);
        }

        setIsExecuting(false);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(customAmount) || 0;
        if (numAmount <= 0) return;
        runAction(
            customVendor,
            customVendor,
            customAddress,
            customFunction,
            numAmount,
            customDesc,
            'custom-run'
        );
    };

    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover space-y-4 transition-all duration-200">
            {/* Header with Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle shrink-0">
                        <Bot className="w-5 h-5 text-stone-700" />
                    </div>
                    <div>
                        <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                            AI Agent Action Simulator
                        </h2>
                        <p className="text-xs text-stone-500 font-sans">
                            Trigger real-world spending requests under Master Principal <span className="font-semibold text-stone-700">{wallet.principalName}</span>'s policy
                        </p>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 text-xs font-mono shrink-0">
                    <button
                        onClick={() => setSelectedTab('general')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                            selectedTab === 'general'
                                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        General Ops
                    </button>
                    <button
                        onClick={() => setSelectedTab('cloud')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                            selectedTab === 'cloud'
                                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        Cloud & Compute
                    </button>
                    <button
                        onClick={() => setSelectedTab('custom')}
                        className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                            selectedTab === 'custom'
                                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                        title="Compose Custom Action"
                    >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Custom</span>
                    </button>
                </div>
            </div>

            {/* Tab 1: General Presets (2x2 Grid) */}
            {selectedTab === 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {generalPresets.map((p) => {
                        const Icon = p.icon;
                        const isSelected = selectedAction === p.id && isExecuting;
                        return (
                            <div
                                key={p.id}
                                className={`bg-stone-50/40 hover:bg-white border rounded-xl p-4 flex flex-col justify-between transition-all group shadow-subtle ${
                                    isSelected ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200/80 hover:border-stone-300'
                                }`}
                            >
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 font-medium text-xs text-stone-900 font-sans">
                                            <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 shrink-0 group-hover:bg-stone-200 transition-colors">
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span>{p.title}</span>
                                        </div>
                                        <span className="text-xs font-mono font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle shrink-0">
                                            {formatINR(p.amount)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 font-sans line-clamp-2">{p.description}</p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-stone-200/60">
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${p.badgeColor}`}>
                                        {p.badge}
                                    </span>
                                    <button
                                        onClick={() => runAction(p.title, p.vendor, p.address, p.functionCalled, p.amount, p.description, p.id)}
                                        disabled={isExecuting}
                                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition shadow-subtle disabled:opacity-50"
                                    >
                                        <span>Dispatch</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tab 2: Cloud & Compute Presets (2x2 Grid) */}
            {selectedTab === 'cloud' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cloudPresets.map((p) => {
                        const Icon = p.icon;
                        const isSelected = selectedAction === p.id && isExecuting;
                        return (
                            <div
                                key={p.id}
                                className={`bg-stone-50/40 hover:bg-white border rounded-xl p-4 flex flex-col justify-between transition-all group shadow-subtle ${
                                    isSelected ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200/80 hover:border-stone-300'
                                }`}
                            >
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 font-medium text-xs text-stone-900 font-sans">
                                            <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 shrink-0 group-hover:bg-stone-200 transition-colors">
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span>{p.title}</span>
                                        </div>
                                        <span className="text-xs font-mono font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle shrink-0">
                                            {formatINR(p.amount)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 font-sans line-clamp-2">{p.description}</p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-stone-200/60">
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${p.badgeColor}`}>
                                        {p.badge}
                                    </span>
                                    <button
                                        onClick={() => runAction(p.title, p.vendor, p.address, p.functionCalled, p.amount, p.description, p.id)}
                                        disabled={isExecuting}
                                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition shadow-subtle disabled:opacity-50"
                                    >
                                        <span>Dispatch</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tab 3: Custom Action Composer */}
            {selectedTab === 'custom' && (
                <form onSubmit={handleCustomSubmit} className="bg-stone-50/60 border border-stone-200/90 rounded-xl p-4 space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-stone-600 mb-1 text-[11px] font-medium font-sans">Target Protocol / Vendor</label>
                            <input
                                type="text"
                                value={customVendor}
                                onChange={e => setCustomVendor(e.target.value)}
                                className="w-full bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-stone-900 text-xs focus:outline-none focus:border-stone-400 shadow-subtle font-sans"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-stone-600 mb-1 text-[11px] font-medium font-sans">Amount (₹)</label>
                            <input
                                type="number"
                                value={customAmount}
                                onChange={e => setCustomAmount(e.target.value)}
                                className="w-full bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-stone-900 text-xs focus:outline-none focus:border-stone-400 shadow-subtle font-mono"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-stone-600 mb-1 text-[11px] font-medium font-sans">Target Address</label>
                            <input
                                type="text"
                                value={customAddress}
                                onChange={e => setCustomAddress(e.target.value)}
                                className="w-full bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-stone-900 text-[11px] focus:outline-none focus:border-stone-400 shadow-subtle font-mono"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-stone-600 mb-1 text-[11px] font-medium font-sans">Function Signature</label>
                            <input
                                type="text"
                                value={customFunction}
                                onChange={e => setCustomFunction(e.target.value)}
                                className="w-full bg-white border border-stone-200 px-3 py-1.5 rounded-lg text-stone-900 text-[11px] focus:outline-none focus:border-stone-400 shadow-subtle font-mono"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-stone-500 font-sans">
                            {parseFloat(customAmount) > wallet.policy.maxPerTx ? '⚠️ Triggers TouchID Escalation' : '✅ In-Policy Autonomous Exec'}
                        </span>
                        <button
                            type="submit"
                            disabled={isExecuting}
                            className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition shadow-subtle disabled:opacity-50"
                        >
                            <span>Execute UserOp</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </form>
            )}

            {/* REAL-TIME TYPEWRITER TERMINAL (macOS code style) */}
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-[11px] space-y-2 shadow-inner">
                <div className="text-stone-400 text-[10px] font-medium uppercase tracking-wider pb-2 border-b border-stone-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                        </div>
                        <span className="ml-2 text-stone-300">ERC-4337 PROTOCOL EXECUTION TRACE</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">v0.7 EntryPoint</span>
                </div>

                <div className="space-y-1.5 text-stone-300 max-h-36 overflow-y-auto pr-1">
                    {/* Active real-time typing command line with blinking cursor */}
                    {typingCmd && (
                        <div className="text-emerald-400 font-semibold flex items-center">
                            <span>{typingCmd}</span>
                            <span className="terminal-cursor"></span>
                        </div>
                    )}

                    {/* Historical terminal trace lines */}
                    {terminalOutput.map((line, idx) => (
                        <div
                            key={idx}
                            className={
                                line.startsWith('$')
                                    ? 'text-amber-300 font-semibold'
                                    : line.includes('INTERCEPT') || line.includes('ALERT') || line.includes('⚠️')
                                    ? 'text-amber-400 font-medium'
                                    : line.includes('PASSED') || line.includes('CONFIRMED') || line.includes('✨')
                                    ? 'text-emerald-400 font-medium'
                                    : line.startsWith('#')
                                    ? 'text-stone-500'
                                    : 'text-stone-300'
                            }
                        >
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
