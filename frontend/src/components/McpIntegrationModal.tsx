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
            "safeagent": {
                "command": "node",
                "args": ["<absolute path to PinkPanthers>/mcp-server/index.js"]
            }
        }
    }, null, 2);

    const cursorConfig = JSON.stringify({
        name: "SafeAgent Treasury MCP",
        type: "command",
        command: "node <absolute path to PinkPanthers>/mcp-server/index.js",
        description: "Local simulated agent payments and policy checks"
    }, null, 2);

    const curlSnippet = `curl -u owner -X POST http://localhost:3000/api/mcp \\
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
        if (selectedTool === 'wallet_get_balance') {
            params.arguments = {
                agent_id: wallet.activeAgentId
            };
        } else if (selectedTool === 'wallet_pay') {
            params.arguments = {
                target_vendor: 'OpenAI Billing API',
                target_address: '0x00000000000000000000000000000000000A1A1A',
                function_called: 'payInvoice',
                amount_usd: 15.00,
                reason: 'Replenishing GPT-4 inference tokens via MCP',
                agent_id: wallet.activeAgentId
            };
        } else if (selectedTool === 'wallet_freeze_card') {
            params.arguments = {
                freeze: !wallet.virtualCard.isFrozen,
                agent_id: wallet.activeAgentId,
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
            await wallet.syncFromServer();
        } catch (e: any) {
            setToolResult(JSON.stringify({ error: e?.message || 'Failed to call /api/mcp' }, null, 2));
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200/90 rounded-2xl max-w-2xl w-full p-6 shadow-modal relative overflow-hidden font-mono">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                            <Terminal className="w-5 h-5 text-stone-700" />
                        </div>
                        <div>
                            <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight flex items-center gap-2">
                                <span>Model Context Protocol (MCP) Hub</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                                    MCP READY
                                </span>
                            </h2>
                            <p className="text-xs text-stone-500 font-sans">One MCP endpoint connecting Claude, Cursor, Devin, GPT & LangChain</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                    <button
                        onClick={() => setActiveTab('claude')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                            activeTab === 'claude'
                                ? 'bg-stone-900 text-white font-medium shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        Claude Desktop
                    </button>
                    <button
                        onClick={() => setActiveTab('cursor')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                            activeTab === 'cursor'
                                ? 'bg-stone-900 text-white font-medium shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        Cursor IDE
                    </button>
                    <button
                        onClick={() => setActiveTab('curl')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                            activeTab === 'curl'
                                ? 'bg-stone-900 text-white font-medium shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        cURL / API
                    </button>
                    <button
                        onClick={() => setActiveTab('tester')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                            activeTab === 'tester'
                                ? 'bg-emerald-800 text-white font-medium shadow-xs'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium'
                        }`}
                    >
                        ⚡ Live Tool Tester
                    </button>
                </div>

                {/* Content based on tab */}
                {activeTab !== 'tester' ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs text-stone-500 font-sans">
                            <span>
                                {activeTab === 'claude' ? 'Paste into claude_desktop_config.json:' : activeTab === 'cursor' ? 'Add as MCP Server in Cursor Settings:' : 'Direct REST JSON-RPC 2.0 invocation:'}
                            </span>
                            <button
                                onClick={() => handleCopy(
                                    activeTab === 'claude' ? claudeConfig : activeTab === 'cursor' ? cursorConfig : curlSnippet,
                                    activeTab
                                )}
                                className="px-3 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-mono font-medium flex items-center gap-1 shadow-subtle transition"
                            >
                                {copiedTab === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                                <span>{copiedTab === activeTab ? 'Copied' : 'Copy Config'}</span>
                            </button>
                        </div>

                        <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 overflow-x-auto max-h-64 text-xs text-stone-300 leading-relaxed shadow-inner">
                            <pre>{activeTab === 'claude' ? claudeConfig : activeTab === 'cursor' ? cursorConfig : curlSnippet}</pre>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-sans text-stone-600">Select MCP Tool:</span>
                                <select
                                    value={selectedTool}
                                    onChange={(e: any) => setSelectedTool(e.target.value)}
                                    className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-900 outline-none shadow-subtle"
                                >
                                    <option value="wallet_get_balance">wallet_get_balance</option>
                                    <option value="wallet_pay">wallet_pay ($15.00 to OpenAI)</option>
                                    <option value="wallet_freeze_card">wallet_freeze_card</option>
                                </select>
                            </div>

                            <button
                                onClick={runLiveTool}
                                disabled={isExecuting}
                                className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-subtle transition disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>{isExecuting ? 'Calling MCP...' : 'Execute Tool Call'}</span>
                            </button>
                        </div>

                        {/* Result Output */}
                        <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 overflow-x-auto max-h-52 text-xs text-emerald-400 leading-relaxed shadow-inner">
                            <div className="text-[10px] text-stone-500 uppercase tracking-widest pb-1 mb-2 border-b border-stone-800/80 flex justify-between">
                                <span>JSON-RPC 2.0 RESPONSE</span>
                                <span>Endpoint: /api/mcp</span>
                            </div>
                            <pre>{toolResult || '// Click "Execute Tool Call" above to test the live MCP protocol route...'}</pre>
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-500 font-sans">
                    <span className="font-mono text-[11px] text-stone-600 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Standard Anthropic MCP Specification v2024-11-05
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-mono text-xs shadow-subtle transition"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
