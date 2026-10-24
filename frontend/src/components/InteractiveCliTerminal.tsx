'use client';

import React, { useState } from 'react';
import { Terminal, Check, Play, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface InteractiveCliTerminalProps {
    wallet: AgentWalletClient;
}

export const InteractiveCliTerminal: React.FC<InteractiveCliTerminalProps> = ({ wallet }) => {
    const [commandLog, setCommandLog] = useState<string[]>([
        '# AgentWallet Developer CLI & Onboarding Sequence',
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
        <div className="bg-white border-3 border-black rounded-2xl p-6 shadow-brutal space-y-4 font-mono">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center border border-black shadow-brutal-xs">
                        <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-black text-black">~/agentwallet — bash</div>
                        <div className="text-[10px] text-zinc-600">Developer CLI & Automated Integration Sequence</div>
                    </div>
                </div>

                {/* Quick command buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => runCliCommand('agentwallet fleet --list')}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-neoYellow text-black text-xs font-bold border border-black brutal-btn"
                    >
                        fleet --list
                    </button>
                    <button
                        onClick={() => runCliCommand('agentwallet card --status')}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-neoMint text-black text-xs font-bold border border-black brutal-btn"
                    >
                        card --status
                    </button>
                    <button
                        onClick={() => runCliCommand('agentwallet mcp --ping')}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-neoPurple text-black text-xs font-bold border border-black brutal-btn"
                    >
                        mcp --ping
                    </button>
                    <button
                        onClick={() => runCliCommand('agentwallet policy --check')}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-neoSky text-black text-xs font-bold border border-black brutal-btn"
                    >
                        policy --check
                    </button>
                </div>
            </div>

            {/* Inky Black Terminal Box */}
            <div className="bg-zinc-950 border-2 border-black rounded-xl p-4 text-xs text-zinc-300 space-y-1.5 max-h-72 overflow-y-auto shadow-brutal leading-relaxed">
                {commandLog.map((line, idx) => (
                    <div
                        key={idx}
                        className={
                            line.startsWith('$')
                                ? 'text-neoYellow font-black'
                                : line.startsWith('✨')
                                ? 'text-neoMint font-bold'
                                : line.startsWith('#')
                                ? 'text-zinc-500'
                                : 'text-emerald-400'
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
                <div className="flex-1 flex items-center gap-2 bg-[#FFFDF8] border-2 border-black rounded-xl px-3 py-2 shadow-brutal-xs">
                    <span className="text-zinc-500 font-bold">$</span>
                    <input
                        type="text"
                        value={customCmd}
                        onChange={(e) => setCustomCmd(e.target.value)}
                        placeholder="Type agentwallet command (e.g. agentwallet balance, fleet, mcp)..."
                        className="bg-transparent w-full text-xs font-mono text-black outline-none placeholder:text-zinc-400 font-bold"
                    />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-black hover:bg-neoRed text-white text-xs font-bold flex items-center gap-1.5 border-2 border-black brutal-btn shadow-brutal-xs transition-colors"
                >
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Run</span>
                </button>
            </form>

        </div>
    );
};
