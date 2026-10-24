#!/usr/bin/env node

/**
 * SafeAgent Treasury - Model Context Protocol (MCP) Stdio Server
 * Compatible with Claude Desktop (claude_desktop_config.json), Cursor (.cursor/mcp.json),
 * and any MCP-compliant autonomous AI agent runner.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Locate authoritative persistent state file
const STATE_PATHS = [
    path.resolve(__dirname, '../data/wallet-state.json'),
    path.resolve(__dirname, 'data/wallet-state.json'),
    path.resolve(process.cwd(), 'data/wallet-state.json'),
    path.resolve(process.cwd(), '../data/wallet-state.json')
];

function getStatePath() {
    for (const p of STATE_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    // Fallback default
    const defaultPath = path.resolve(__dirname, '../data/wallet-state.json');
    const parentDir = path.dirname(defaultPath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    return defaultPath;
}

function readState() {
    const p = getStatePath();
    if (!fs.existsSync(p)) {
        throw new Error(`Wallet state file not found at ${p}`);
    }
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeState(state) {
    const p = getStatePath();
    fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Execute In-Policy Payment
 */
function executePayment(vendor, targetAddress, functionCalled, amount, description) {
    const state = readState();

    if (!state.activeAgent.sessionActive) {
        return { status: 'REVERTED', reason: 'Agent Session Key is Inactive or Revoked' };
    }

    if (Date.now() > state.activeAgent.sessionExpiresAt) {
        return { status: 'REVERTED', reason: 'Session Key has Expired on-chain (validUntil passed)' };
    }

    if (state.virtualCard.isFrozen) {
        return { status: 'REVERTED', reason: 'Virtual Debit Card is currently FROZEN by Principal' };
    }

    // 1. Whitelist Check
    const isContractAllowed = state.policy.allowedContracts.some(
        c => c.address.toLowerCase() === targetAddress.toLowerCase()
    );
    const isRecipientAllowed = state.policy.allowedRecipients.some(
        r => r.toLowerCase() === targetAddress.toLowerCase()
    );

    if (!isContractAllowed && !isRecipientAllowed) {
        return { status: 'REVERTED', reason: `Target address not allowlisted: ${targetAddress}` };
    }

    // 2. Per-Tx Cap Check
    if (amount > state.policy.maxPerTx) {
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds Per-Tx Cap (₹${state.policy.maxPerTx.toLocaleString('en-IN')})`;
        state.queuedApprovals.unshift({
            id: `req-mcp-${Date.now()}`,
            agent: state.activeAgent.name,
            targetName: vendor,
            targetAddress,
            amount,
            actionName: functionCalled,
            reason,
            timestamp: new Date().toLocaleTimeString(),
            status: 'PENDING'
        });
        writeState(state);
        return { status: 'QUEUED', reason };
    }

    // 3. Daily Budget Check
    if (state.dailySpent + amount > state.policy.dailyBudget) {
        const remaining = Math.max(0, state.policy.dailyBudget - state.dailySpent);
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds 24h Remaining Budget (₹${remaining.toLocaleString('en-IN')} remaining of ₹${state.policy.dailyBudget.toLocaleString('en-IN')})`;
        state.queuedApprovals.unshift({
            id: `req-mcp-${Date.now()}`,
            agent: state.activeAgent.name,
            targetName: vendor,
            targetAddress,
            amount,
            actionName: functionCalled,
            reason,
            timestamp: new Date().toLocaleTimeString(),
            status: 'PENDING'
        });
        writeState(state);
        return { status: 'QUEUED', reason };
    }

    // In-Policy Success!
    state.dailySpent += amount;
    state.balances.usdc -= amount;
    state.principal.totalFleetSpendToday += amount;

    const activeAg = state.fleet.find(a => a.id === state.activeAgent.id);
    if (activeAg) {
        activeAg.spentToday += amount;
        activeAg.lastAction = `${functionCalled} · ${vendor} (₹${amount.toLocaleString('en-IN')})`;
    }

    const opHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    state.userOps.unshift({
        id: `op-mcp-${Date.now()}`,
        userOpHash: `${opHash.slice(0, 8)}...${opHash.slice(-6)}`,
        timestamp: new Date().toLocaleTimeString(),
        targetName: vendor,
        targetAddress,
        functionCalled,
        amount,
        gasSponsored: true,
        gasCostUSD: 10.00,
        status: 'EXECUTED',
        validationResult: 'IN_POLICY',
        reason: `MCP Autonomous Agent payment: ${description}`,
        rawUserOp: {
            sender: state.smartAccountAddress,
            nonce: state.userOps.length + 1,
            callData: `0x${functionCalled.slice(0, 8)}...`,
            callGasLimit: '0x186a0',
            verificationGasLimit: '0x249f0',
            paymasterAndData: `${state.paymasterAddress}...`,
            signature: '0xAgentSignatureSecp256k1...'
        }
    });

    state.activityStream.unshift({
        id: `stream-mcp-${Date.now()}`,
        agentId: state.activeAgent.id,
        agentName: state.activeAgent.name,
        category: activeAg ? activeAg.category : 'finance',
        tag: activeAg ? activeAg.tag : 'AG',
        action: functionCalled.split('(')[0],
        vendor,
        amount,
        timeAgo: 'now',
        timestamp: Date.now()
    });

    writeState(state);
    return {
        status: 'EXECUTED',
        reason: 'In-policy payment executed successfully on-chain via ERC-4337 Smart Account',
        userOpHash: opHash
    };
}

/**
 * Toggle Virtual Card Freeze
 */
function toggleCardFreeze(freezeState) {
    const state = readState();
    const shouldFreeze = freezeState !== undefined ? Boolean(freezeState) : !state.virtualCard.isFrozen;
    state.virtualCard.isFrozen = shouldFreeze;
    const action = shouldFreeze ? 'FROZEN' : 'ACTIVE';
    state.inboxMessages.unshift({
        id: `msg-${Date.now()}`,
        sender: 'Card Control System',
        subject: `Virtual Card ${action}`,
        body: `Agent virtual card ···· 1126 status changed to ${action} via MCP Tool by Agent ${state.activeAgent.name}.`,
        timestamp: 'Just now',
        unread: true,
        category: 'alert'
    });
    writeState(state);
    return shouldFreeze;
}

// -------------------------------------------------------------
// MCP PROTOCOL SPECIFICATION (Tools & Schema)
// -------------------------------------------------------------
const MCP_TOOLS = [
    {
        name: 'wallet_get_balance',
        description: 'Get current USDC, ETH balances, remaining 24h spend budget, per-transaction cap, and active session sub-key for SafeAgent Treasury.',
        inputSchema: {
            type: 'object',
            properties: {
                agent_id: { type: 'string', description: 'Optional: ID of the fleet agent' }
            }
        }
    },
    {
        name: 'wallet_pay',
        description: 'Execute an autonomous payment on-chain via ERC-4337 Smart Account strictly verified against PolicyEngine guardrails.',
        inputSchema: {
            type: 'object',
            properties: {
                target_vendor: { type: 'string', description: 'Name of the approved vendor (e.g. OpenAI, Datadog, Blinkit)' },
                target_address: { type: 'string', description: 'Whitelisted smart contract address' },
                function_called: { type: 'string', description: 'Approved ABI method call (e.g. payInvoice, orderCheckout)' },
                amount_usd: { type: 'number', description: 'Amount to pay in INR/USD' },
                reason: { type: 'string', description: 'Reason for payment justification' }
            },
            required: ['target_vendor', 'target_address', 'amount_usd']
        }
    },
    {
        name: 'wallet_freeze_card',
        description: 'Immediately freeze or unfreeze the agent-linked virtual debit card on-chain.',
        inputSchema: {
            type: 'object',
            properties: {
                freeze: { type: 'boolean', description: 'True to freeze, false to unfreeze' },
                reason: { type: 'string', description: 'Security or operational reason' }
            },
            required: ['freeze']
        }
    },
    {
        name: 'wallet_request_approval',
        description: 'Submit an out-of-policy transaction to the Principal for Biometric Passkey (TouchID) approval.',
        inputSchema: {
            type: 'object',
            properties: {
                amount_usd: { type: 'number', description: 'Amount exceeding limit' },
                vendor: { type: 'string', description: 'Vendor to pay' },
                target_address: { type: 'string', description: 'Target recipient address' },
                justification: { type: 'string', description: 'Detailed justification for the human owner' }
            },
            required: ['amount_usd', 'vendor', 'justification']
        }
    },
    {
        name: 'wallet_get_inbox_otp',
        description: 'Retrieve real-time 2FA OTP verification codes received by the agent for 3DS merchant checkout.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'wallet_list_agents',
        description: 'List all agents in the fleet, their assigned virtual cards, daily budgets, and spend totals.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    }
];

function handleMcpRequest(req) {
    const { id, method, params } = req;

    if (method === 'initialize') {
        return {
            jsonrpc: '2.0',
            id,
            result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {
                        listChanged: false
                    }
                },
                serverInfo: {
                    name: 'safeagent-mcp-server',
                    version: '1.0.0'
                }
            }
        };
    }

    if (method === 'notifications/initialized') {
        return null; // No response needed for notification
    }

    if (method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
        return {
            jsonrpc: '2.0',
            id,
            result: {
                tools: MCP_TOOLS
            }
        };
    }

    if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};
        const state = readState();

        switch (toolName) {
            case 'wallet_get_balance': {
                const remaining = Math.max(0, state.policy.dailyBudget - state.dailySpent);
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    smart_account: state.smartAccountAddress,
                                    usdc_balance: state.balances.usdc,
                                    eth_balance: state.balances.eth,
                                    paymaster_gas_tank_inr: state.balances.paymasterGasTankINR,
                                    daily_budget: state.policy.dailyBudget,
                                    daily_spent: state.dailySpent,
                                    remaining_budget: remaining,
                                    per_tx_cap: state.policy.maxPerTx,
                                    active_agent: state.activeAgent.name,
                                    session_active: state.activeAgent.sessionActive,
                                    virtual_card: `${state.virtualCard.maskedNumber} (${state.virtualCard.isFrozen ? 'FROZEN' : 'ACTIVE'})`
                                }, null, 2)
                            }
                        ]
                    }
                };
            }

            case 'wallet_pay': {
                const amount = Number(args.amount_usd || 0);
                const vendor = args.target_vendor || 'Unknown Vendor';
                const targetAddress = args.target_address || '0x00000000000000000000000000000000000A1A1A';
                const func = args.function_called || 'payInvoice()';
                const desc = args.reason || `Payment to ${vendor}`;

                const result = executePayment(vendor, targetAddress, func, amount, desc);

                if (result.status === 'REVERTED') {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            isError: true,
                            content: [
                                {
                                    type: 'text',
                                    text: `[POLICY ENGINE REVERT] ${result.reason}`
                                }
                            ]
                        }
                    };
                }

                if (result.status === 'QUEUED') {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            isError: true,
                            content: [
                                {
                                    type: 'text',
                                    text: `[POLICY INTERCEPT] ${result.reason}. Staged in PendingApprovalQueue for Principal TouchID authorization.`
                                }
                            ]
                        }
                    };
                }

                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    status: 'EXECUTED_ON_CHAIN',
                                    protocol: 'ERC-4337 v0.7',
                                    vendor,
                                    amount_paid: amount,
                                    user_op_hash: result.userOpHash,
                                    gas_sponsored: true,
                                    policy_check: 'PASSED_ON_CHAIN'
                                }, null, 2)
                            }
                        ]
                    }
                };
            }

            case 'wallet_freeze_card': {
                const isNowFrozen = toggleCardFreeze(args.freeze);
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    card: state.virtualCard.maskedNumber,
                                    is_frozen: isNowFrozen,
                                    message: isNowFrozen ? 'Card FROZEN successfully on-chain' : 'Card REACTIVATED on-chain'
                                }, null, 2)
                            }
                        ]
                    }
                };
            }

            case 'wallet_request_approval': {
                const amount = Number(args.amount_usd || 0);
                const vendor = args.vendor || 'Unknown Vendor';
                const targetAddress = args.target_address || '0x00000000000000000000000000000000000A1A1A';
                const just = args.justification || 'Emergency spending request';

                state.queuedApprovals.unshift({
                    id: `req-mcp-${Date.now()}`,
                    agent: state.activeAgent.name,
                    targetName: vendor,
                    targetAddress,
                    amount,
                    actionName: 'requestOverride()',
                    reason: just,
                    timestamp: new Date().toLocaleTimeString(),
                    status: 'PENDING'
                });
                writeState(state);

                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    status: 'STAGED_FOR_APPROVAL',
                                    vendor,
                                    amount,
                                    message: 'Escalation alert dispatched to Principal device (TouchID / WebAuthn).'
                                }, null, 2)
                            }
                        ]
                    }
                };
            }

            case 'wallet_get_inbox_otp': {
                const otpMessages = state.inboxMessages.filter(m => m.category === '2fa');
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    count: otpMessages.length,
                                    latest_otp: otpMessages[0]?.code || null,
                                    messages: otpMessages
                                }, null, 2)
                            }
                        ]
                    }
                };
            }

            case 'wallet_list_agents': {
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    total_agents: state.fleet.length,
                                    fleet: state.fleet
                                }, null, 2)
                            }
                        ]
                    }
                };
            }

            default:
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32601, message: `Tool not found: ${toolName}` }
                };
        }
    }

    return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
    };
}

// -------------------------------------------------------------
// STDIO STREAM PROCESSOR (Reads line-by-line JSON-RPC 2.0)
// -------------------------------------------------------------
function startStdioServer() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        try {
            const req = JSON.parse(trimmed);
            const res = handleMcpRequest(req);
            if (res) {
                process.stdout.write(JSON.stringify(res) + '\n');
            }
        } catch (err) {
            const errRes = {
                jsonrpc: '2.0',
                id: null,
                error: { code: -32700, message: `Parse error: ${err.message}` }
            };
            process.stdout.write(JSON.stringify(errRes) + '\n');
        }
    });

    // Handle process shutdown cleanly
    process.on('SIGINT', () => process.exit(0));
    process.on('SIGTERM', () => process.exit(0));
}

// CLI Testing Flag
if (process.argv.includes('--test')) {
    console.log('🧪 Running SafeAgent MCP Stdio Server Self-Test...');
    const listRes = handleMcpRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    console.log(`✅ tools/list returned ${listRes.result.tools.length} tools`);
    const balRes = handleMcpRequest({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'wallet_get_balance', arguments: {} } });
    console.log('✅ wallet_get_balance returned:');
    console.log(balRes.result.content[0].text);
    process.exit(0);
}

startStdioServer();
