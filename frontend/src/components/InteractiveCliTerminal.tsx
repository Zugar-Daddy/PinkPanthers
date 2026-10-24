'use client';

import React, { useState } from 'react';
import { Terminal, Check, Play, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface InteractiveCliTerminalProps {
    wallet: AgentWalletClient;
}

export const InteractiveCliTerminal: React.FC<InteractiveCliTerminalProps> = ({ wallet }) => {
    const [commandLog, setCommandLog] = useState<string[]>([
        '# SafeAgent Developer CLI & Onboarding Sequence',
        '# 1. Principal account established: Yoav K. (P-256 Passkey Active)',
        '# 2. Fleet provisioned: 11 active agents, 1 provisioning',
        '# 3. Budget allocated: $5,000 USDC / 24h cycle',
        '# 4. Virtual debit card linked: ···· 1126 (Visa Business)',
        '# 5. PolicyEngine.sol active: Max per-tx $25.00 | Recipient whitelist enforced',
        '# 6. Model Context Protocol (MCP) server listening on :3000/api/mcp',
        '✨ Agent ready to autonomously pay and sign within owner constraints.'
    ]);
    const [customCmd, setCustomCmd] = useState('');

    const runCliCommand = (cmd: string) => {
        let response = '';
        const trimmed = cmd.trim().toLowerCase();

        if (trimmed.includes('fleet')) {
            response = `[AGENT FLEET]\n` +
                wallet.fleet.map(a => `• ${a.name.padEnd(18)} [${a.category.toUpperCase()}] Spent: $${a.spentToday}/$${a.dailyBudget} | Card: ${a.assignedCard}`).join('\n');
        } else if (trimmed.includes('card')) {
            response = `[VIRTUAL CARD RESOURCE]\n` +
                `Number: ${wallet.virtualCard.maskedNumber}\n` +
                `Status: ${wallet.virtualCard.isFrozen ? 'FROZEN' : 'ACTIVE'}\n` +
                `Daily Cap: $${wallet.virtualCard.dailyLimit.toFixed(2)}\n` +
                `Holder: ${wallet.virtualCard.holder}\n` +
                `Brand: ${wallet.virtualCard.brand}`;
        } else if (trimmed.includes('mcp')) {
            response = `[MCP PROTOCOL STATUS]\n` +
                `Endpoint: http://localhost:3000/api/mcp\n` +
                `Protocol: MCP 2024-11-05\n` +
                `Tools available: wallet_get_balance, wallet_pay, wallet_freeze_card, wallet_request_approval\n` +
                `Connected clients: Claude Desktop, Cursor IDE, LangChain`;
        } else if (trimmed.includes('policy')) {
            response = `[POLICY ENGINE]\n` +
                `Per-Tx Cap: $${wallet.policy.maxPerTx.toFixed(2)} USDC\n` +
                `24h Rolling Budget: $${wallet.policy.dailyBudget.toFixed(2)} USDC\n` +
                `Session Validity: ${wallet.policy.sessionExpiryHours} hours (validUntil timestamp)\n` +
                `Whitelisted Contracts: ${wallet.policy.allowedContracts.length} approved targets`;
        } else {
            response = `Command executed: "${cmd}" -> Status 200 OK. Operation validated by AgentSmartAccount.sol.`;
        }

        setCommandLog(prev => [
            `\n$ ${cmd}`,
            response,
            ...prev
        ]);
        setCustomCmd('');
    };

    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover space-y-4 font-mono transition-all duration-200">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center shadow-subtle">
                        <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-stone-900">~/safeagent — zsh</div>
                        <div className="text-[10px] text-stone-500 font-sans">Developer CLI & Automated Integration Sequence</div>
                    </div>
                </div>

                {/* Quick command buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => runCliCommand('safeagent fleet --list')}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition"
                    >
                        fleet --list
                    </button>
                    <button
                        onClick={() => runCliCommand('safeagent card --status')}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition"
                    >
                        card --status
                    </button>
                    <button
                        onClick={() => runCliCommand('safeagent mcp --ping')}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition"
                    >
                        mcp --ping
                    </button>
                    <button
                        onClick={() => runCliCommand('safeagent policy --check')}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition"
                    >
                        policy --check
                    </button>
                </div>
            </div>

            {/* Inky Black Terminal Box */}
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 text-xs text-stone-300 space-y-1.5 max-h-72 overflow-y-auto shadow-inner leading-relaxed">
                <div className="flex items-center gap-1.5 pb-2 border-b border-stone-800/80 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                    <span className="text-[10px] text-stone-500 ml-2">safeagent session</span>
                </div>
                {commandLog.map((line, idx) => (
                    <div
                        key={idx}
                        className={
                            line.startsWith('$')
                                ? 'text-amber-300 font-semibold'
                                : line.startsWith('✨')
                                ? 'text-emerald-400 font-medium'
                                : line.startsWith('#')
                                ? 'text-stone-500'
                                : 'text-stone-300'
                        }
                    >
                        <pre className="whitespace-pre-wrap font-mono">{line}</pre>
                    </div>
                ))}
            </div>

            {/* Input Bar */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (customCmd.trim()) runCliCommand(customCmd);
                }}
                className="flex items-center gap-2 pt-1"
            >
                <div className="flex-1 flex items-center gap-2 bg-stone-50/80 border border-stone-200 rounded-xl px-3 py-2 shadow-subtle focus-within:border-stone-400 transition">
                    <span className="text-stone-400 font-mono font-medium">$</span>
                    <input
                        type="text"
                        value={customCmd}
                        onChange={(e) => setCustomCmd(e.target.value)}
                        placeholder="Type safeagent command (e.g. safeagent balance, fleet, mcp)..."
                        className="bg-transparent w-full text-xs font-mono text-stone-900 outline-none placeholder:text-stone-400"
                    />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-subtle transition"
                >
                    <span>Run</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </form>

        </div>
    );
};
