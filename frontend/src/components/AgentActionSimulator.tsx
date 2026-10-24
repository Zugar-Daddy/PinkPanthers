'use client';

import React, { useState } from 'react';
import { Bot, Zap, ArrowRight, ShoppingCart, CreditCard, Ticket, Plane, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

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
    const [isExecuting, setIsExecuting] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        '⚡ [ERC-4337] Agent session key active: 0xAgent...1023',
        '🛡️  [PolicyEngine] Daily budget: $100.00 | Per-Tx cap: $25.00',
        '⛽ [Paymaster] Gas sponsorship ready: $48.50 in deposit'
    ]);

    const presets = [
        {
            id: 'openai',
            title: 'Prepay OpenAI API Credits',
            vendor: 'OpenAI Billing API',
            address: '0x00000000000000000000000000000000000A1A1A',
            functionCalled: 'payInvoice(uint256 15)',
            amount: 15.00,
            icon: CreditCard,
            badge: 'In-Policy ($15 < $25)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Autonomous research agent replenishes token inference credits'
        },
        {
            id: 'groceries',
            title: 'Instacart Grocery Checkout',
            vendor: 'Grocery & Delivery Service (Instacart/Blinkit)',
            address: '0x00000000000000000000000000000000000B2B2B',
            functionCalled: 'orderCheckout(uint256 18)',
            amount: 18.50,
            icon: ShoppingCart,
            badge: 'In-Policy ($18.50 < $25)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Automated weekly pantry restocking from smart fridge'
        },
        {
            id: 'train',
            title: 'Metro / Train Ticket Booking',
            vendor: 'Travel & Ticket Booking API',
            address: '0x00000000000000000000000000000000000C3C3C',
            functionCalled: 'bookTicket(uint256 8)',
            amount: 8.00,
            icon: Ticket,
            badge: 'In-Policy ($8.00 < $25)',
            badgeColor: 'text-emerald-800 bg-emerald-50 border border-emerald-200/80',
            description: 'Agent reserves daily commute train ticket'
        },
        {
            id: 'flight',
            title: 'United Airlines Flight Booking',
            vendor: 'Travel & Ticket Booking API',
            address: '0x00000000000000000000000000000000000C3C3C',
            functionCalled: 'bookTicket(uint256 145)',
            amount: 145.00,
            icon: Plane,
            badge: 'Out-of-Policy ($145 > $25 Cap)',
            badgeColor: 'text-amber-800 bg-amber-50 border border-amber-200/80',
            description: 'Agent tries to book conference flight exceeding per-tx cap'
        }
    ];

    const runPreset = async (p: typeof presets[0]) => {
        setIsExecuting(true);
        setSelectedAction(p.id);

        setTerminalOutput(prev => [
            `\n🤖 [AGENT] Constructing UserOperation for: ${p.title} ($${p.amount.toFixed(2)})`,
            `📦 [UserOp] Target: ${p.vendor} (${p.address.slice(0, 8)}...)`,
            `🔐 [Signature] Signed with Agent Sub-Key (0xAgent...1023)`,
            `🛡️  [PolicyEngine] Validating: isWhitelisted? perTxLimit? dailyBudget?`,
            ...prev.slice(0, 8)
        ]);

        await new Promise(r => setTimeout(r, 600));
        await onExecuteAction(p.vendor, p.address, p.functionCalled, p.amount, p.description);

        if (p.amount > wallet.policy.maxPerTx) {
            setTerminalOutput(prev => [
                `⚠️ [INTERCEPT] Amount $${p.amount.toFixed(2)} exceeds Per-Tx limit of $${wallet.policy.maxPerTx.toFixed(2)}!`,
                `📥 [PendingApprovalQueue] Staged UserOp #REQ-${Date.now()}`,
                `🔔 [OWNER ALERT] Push notification dispatched: Passkey TouchID required`,
                ...prev.slice(0, 8)
            ]);
        } else {
            setTerminalOutput(prev => [
                `✅ [PASSED] Policy checks passed!`,
                `⛽ [Paymaster] Gas sponsored ($0.10) - 0 ETH deducted from Agent`,
                `✨ [CONFIRMED] Smart Account executed ${p.functionCalled} on-chain!`,
                ...prev.slice(0, 8)
            ]);
        }

        setIsExecuting(false);
    };

    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover space-y-5 transition-all duration-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                        <Bot className="w-5 h-5 text-stone-700" />
                    </div>
                    <div>
                        <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                            AI Agent Action Simulator
                        </h2>
                        <p className="text-xs text-stone-500 font-sans">Trigger real-world spending requests from autonomous agents</p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-medium text-stone-700 bg-stone-100 border border-stone-200/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Interactive Sandbox
                </span>
            </div>

            {/* 4 Interactive Presets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presets.map((p) => {
                    const Icon = p.icon;
                    return (
                        <div
                            key={p.id}
                            className="bg-stone-50/40 hover:bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-subtle"
                        >
                            <div className="space-y-2 mb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 font-medium text-xs text-stone-900 font-sans">
                                        <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 shrink-0 group-hover:bg-stone-200 transition-colors">
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span>{p.title}</span>
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-subtle">
                                        ${p.amount.toFixed(2)}
                                    </span>
                                </div>

                                <p className="text-[11px] text-stone-500 font-sans">{p.description}</p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-stone-200/60">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${p.badgeColor}`}>
                                    {p.badge}
                                </span>

                                <button
                                    onClick={() => runPreset(p)}
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

            {/* Execution Terminal (macOS code style) */}
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-[11px] space-y-2.5 shadow-inner">
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
                    {terminalOutput.map((line, idx) => (
                        <div key={idx} className={line.includes('INTERCEPT') || line.includes('ALERT') ? 'text-amber-400 font-medium' : line.includes('PASSED') || line.includes('CONFIRMED') ? 'text-emerald-400 font-medium' : ''}>
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
