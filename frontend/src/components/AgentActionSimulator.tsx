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
            badgeColor: 'text-black bg-neoMint border border-black',
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
            badgeColor: 'text-black bg-neoMint border border-black',
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
            badgeColor: 'text-black bg-neoMint border border-black',
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
            badgeColor: 'text-black bg-neoRose border border-black',
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
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-brutal space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neoMint border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                        <Bot className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-black tracking-tight font-sans">
                            AI Agent Action Simulator
                        </h2>
                        <p className="text-xs text-zinc-600 font-mono">Trigger real-world spending requests from autonomous agents</p>
                    </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-black bg-neoPurple border-2 border-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-brutal-sm">
                    <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" /> Interactive Sandbox
                </span>
            </div>

            {/* 4 Interactive Presets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presets.map((p) => {
                    const Icon = p.icon;
                    return (
                        <div
                            key={p.id}
                            className="bg-[#FFFDF8] border-2 border-black rounded-xl p-4 flex flex-col justify-between transition-all group shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5"
                        >
                            <div className="space-y-2 mb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 font-black text-xs text-black font-sans">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-black flex items-center justify-center text-black shrink-0 group-hover:bg-neoYellow transition-colors">
                                            <Icon className="w-4 h-4 stroke-[2.5]" />
                                        </div>
                                        <span>{p.title}</span>
                                    </div>
                                    <span className="text-sm font-mono font-black text-black bg-zinc-100 px-2 py-0.5 rounded border border-black">
                                        ${p.amount.toFixed(2)}
                                    </span>
                                </div>

                                <p className="text-[11px] text-zinc-600 font-sans font-medium">{p.description}</p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-black/10">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${p.badgeColor}`}>
                                    {p.badge}
                                </span>

                                <button
                                    onClick={() => runPreset(p)}
                                    disabled={isExecuting}
                                    className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-neoRed text-white hover:text-white border-2 border-black text-xs font-mono font-bold flex items-center gap-1.5 brutal-btn shadow-brutal-xs disabled:opacity-50"
                                >
                                    <span>Dispatch UserOp</span>
                                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Execution Terminal */}
            <div className="bg-zinc-950 border-2 border-black rounded-xl p-4 font-mono text-[11px] space-y-2 shadow-brutal">
                <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider pb-1.5 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-neoMint" />
                        <span>ERC-4337 PROTOCOL EXECUTION TRACE</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono">v0.7 EntryPoint</span>
                </div>
                <div className="space-y-1.5 text-zinc-300 max-h-36 overflow-y-auto">
                    {terminalOutput.map((line, idx) => (
                        <div key={idx} className={line.includes('INTERCEPT') || line.includes('ALERT') ? 'text-amber-400 font-bold' : line.includes('PASSED') || line.includes('CONFIRMED') ? 'text-emerald-400 font-bold' : ''}>
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
