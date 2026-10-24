'use client';

import React, { useState } from 'react';
import { Terminal, X, Copy, Check, Sparkles, Code, Play, ArrowRight } from 'lucide-react';
import { AgentWalletClient } from '../lib/web3/agentWalletClient';

interface McpIntegrationModalProps {
    wallet: AgentWalletClient;
    isOpen: boolean;
    onClose: () => void;
}

export const McpIntegrationModal: React.FC<McpIntegrationModalProps> = ({ wallet, isOpen, onClose }) => {
    const [copiedTab, setCopiedTab] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'curl' | 'tester'>('claude');
    const [selectedTool, setSelectedTool] = useState<'wallet_get_balance' | 'wallet_pay' | 'wallet_freeze_card'>('wallet_get_balance');
    const [toolResult, setToolResult] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    if (!isOpen) return null;

    const claudeConfig = JSON.stringify({
        mcpServers: {
            "agentwallet": {
                "command": "npx",
                "args": [
                    "-y",
                    "@agentwallet/mcp-server",
                    "--endpoint",
                    "http://localhost:3000/api/mcp",
                    "--agent-id",
                    wallet.activeAgentId
                ]
            }
        }
    }, null, 2);

    const cursorConfig = JSON.stringify({
        name: "AgentWallet MCP",
        type: "command",
        command: "curl -X POST http://localhost:3000/api/mcp -H 'Content-Type: application/json'",
        description: "Enables autonomous agent payments, virtual cards and policy checks"
    }, null, 2);

    const curlSnippet = `curl -X POST http://localhost:3000/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wallet_get_balance",
      "arguments": { "agent_id": "${wallet.activeAgentId}" }
    }
  }'`;

    const handleCopy = (text: string, tab: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTab(tab);
        setTimeout(() => setCopiedTab(null), 1500);
    };

    const runLiveTool = async () => {
        setIsExecuting(true);
        setToolResult(null);

        let params: any = { name: selectedTool, arguments: {} };
        if (selectedTool === 'wallet_pay') {
            params.arguments = {
                target_vendor: 'OpenAI Billing API',
                target_address: '0x00000000000000000000000000000000000A1A1A',
                function_called: 'payInvoice',
                amount_usd: 15.00,
                reason: 'Replenishing GPT-4 inference tokens via MCP'
            };
        } else if (selectedTool === 'wallet_freeze_card') {
            params.arguments = {
                freeze: true,
                reason: 'MCP security freeze request'
            };
        }

        try {
            const res = await fetch('/api/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'tools/call',
                    params
                })
            });
            const data = await res.json();
            setToolResult(JSON.stringify(data, null, 2));
        } catch (e: any) {
            setToolResult(JSON.stringify({ error: e?.message || 'Failed to call /api/mcp' }, null, 2));
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border-3 border-black rounded-2xl max-w-2xl w-full p-6 shadow-brutal-xl relative overflow-hidden font-mono">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b-2 border-black">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neoPurple border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                            <Terminal className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-black tracking-tight font-sans flex items-center gap-2">
                                <span>Model Context Protocol (MCP) Hub</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neoMint border border-black font-black">
                                    MCP READY
                                </span>
                            </h2>
                            <p className="text-xs text-zinc-600 font-mono">One MCP endpoint connecting Claude, Cursor, Devin, GPT & LangChain</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 text-black brutal-btn shadow-brutal-xs"
                    >
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                    <button
                        onClick={() => setActiveTab('claude')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all brutal-btn ${
                            activeTab === 'claude'
                                ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black'
                        }`}
                    >
                        Claude Desktop
                    </button>
                    <button
                        onClick={() => setActiveTab('cursor')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all brutal-btn ${
                            activeTab === 'cursor'
                                ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black'
                        }`}
                    >
                        Cursor IDE
                    </button>
                    <button
                        onClick={() => setActiveTab('curl')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all brutal-btn ${
                            activeTab === 'curl'
                                ? 'bg-black text-white border-2 border-black shadow-brutal-xs'
                                : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black'
                        }`}
                    >
                        cURL / API
                    </button>
                    <button
                        onClick={() => setActiveTab('tester')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all brutal-btn ${
                            activeTab === 'tester'
                                ? 'bg-neoRed text-white border-2 border-black shadow-brutal-xs'
                                : 'bg-neoYellow text-black border-2 border-black font-black'
                        }`}
                    >
                        ⚡ Live Tool Tester
                    </button>
                </div>

                {/* Content based on tab */}
                {activeTab !== 'tester' ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs text-zinc-600">
                            <span>
                                {activeTab === 'claude' ? 'Paste into claude_desktop_config.json:' : activeTab === 'cursor' ? 'Add as MCP Server in Cursor Settings:' : 'Direct REST JSON-RPC 2.0 invocation:'}
                            </span>
                            <button
                                onClick={() => handleCopy(
                                    activeTab === 'claude' ? claudeConfig : activeTab === 'cursor' ? cursorConfig : curlSnippet,
                                    activeTab
                                )}
                                className="px-3 py-1 rounded-lg border-2 border-black bg-white hover:bg-neoYellow text-black text-xs font-bold flex items-center gap-1 brutal-btn shadow-brutal-xs"
                            >
                                {copiedTab === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedTab === activeTab ? 'Copied' : 'Copy Config'}</span>
                            </button>
                        </div>

                        <div className="bg-zinc-950 border-2 border-black rounded-xl p-4 overflow-x-auto max-h-64 text-xs text-emerald-400 leading-relaxed shadow-brutal">
                            <pre>{activeTab === 'claude' ? claudeConfig : activeTab === 'cursor' ? cursorConfig : curlSnippet}</pre>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-[#FFFDF8] border-2 border-black rounded-xl p-3.5 shadow-brutal-xs flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-700">Select MCP Tool:</span>
                                <select
                                    value={selectedTool}
                                    onChange={(e: any) => setSelectedTool(e.target.value)}
                                    className="bg-white border-2 border-black rounded-lg px-2.5 py-1 text-xs font-bold text-black"
                                >
                                    <option value="wallet_get_balance">wallet_get_balance</option>
                                    <option value="wallet_pay">wallet_pay ($15.00 to OpenAI)</option>
                                    <option value="wallet_freeze_card">wallet_freeze_card</option>
                                </select>
                            </div>

                            <button
                                onClick={runLiveTool}
                                disabled={isExecuting}
                                className="px-4 py-1.5 rounded-xl bg-black hover:bg-neoRed text-white text-xs font-bold flex items-center gap-1.5 brutal-btn shadow-brutal-xs disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>{isExecuting ? 'Calling MCP...' : 'Execute Tool Call'}</span>
                            </button>
                        </div>

                        {/* Result Output */}
                        <div className="bg-zinc-950 border-2 border-black rounded-xl p-4 overflow-x-auto max-h-52 text-xs text-emerald-400 leading-relaxed shadow-brutal">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest pb-1 mb-2 border-b border-zinc-800 flex justify-between">
                                <span>JSON-RPC 2.0 RESPONSE</span>
                                <span>Endpoint: /api/mcp</span>
                            </div>
                            <pre>{toolResult || '// Click "Execute Tool Call" above to test the live MCP protocol route...'}</pre>
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between text-xs text-zinc-600 font-sans">
                    <span className="font-mono text-[11px] text-black font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-neoRed" /> Standard Anthropic MCP Specification v2024-11-05
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-black hover:bg-neoRed text-white font-mono font-bold text-xs border-2 border-black brutal-btn shadow-brutal-xs transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
