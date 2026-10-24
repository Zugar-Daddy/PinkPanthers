#!/usr/bin/env node

/**
 * SafeAgent Treasury - Model Context Protocol (MCP) Stdio Server
 * Compatible with Claude Desktop (claude_desktop_config.json), Cursor (.cursor/mcp.json),
 * and any MCP-compliant autonomous AI agent runner.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { randomUUID } = require('crypto');

// Locate authoritative persistent state file
const STATE_PATHS = [
    path.resolve(__dirname, '../data/wallet-state.json'),
    path.resolve(__dirname, 'data/wallet-state.json'),
    path.resolve(process.cwd(), 'data/wallet-state.json'),
    path.resolve(process.cwd(), '../data/wallet-state.json')
];

function getStatePath() {
    for (const p of STATE_PATHS) {
        if (fs.existsSync(p)) { fs.chmodSync(p, 0o600); return p; }
    }
    // Fallback default
    const defaultPath = path.resolve(__dirname, '../data/wallet-state.json');
    const parentDir = path.dirname(defaultPath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    const example = path.join(parentDir, 'wallet-state.example.json');
    if (fs.existsSync(example)) {
        fs.copyFileSync(example, defaultPath, fs.constants.COPYFILE_EXCL);
        fs.chmodSync(defaultPath, 0o600);
    }
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
    const temp = `${p}.${process.pid}.${randomUUID()}.tmp`;
    try {
        fs.writeFileSync(temp, JSON.stringify(state, null, 2), { encoding: 'utf-8', mode: 0o600 });
        fs.renameSync(temp, p);
    } finally {
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
}

function withStateLock(work) {
    const lock = `${getStatePath()}.lock`;
    const start = Date.now();
    while (true) {
        try {
            fs.mkdirSync(lock);
            break;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            if (Date.now() - start > 5000) throw new Error('Wallet state is busy');
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }
    }
    try { return work(); } finally { fs.rmdirSync(lock); }
}

/**
 * Execute In-Policy Payment
 */
function executePayment(vendor, targetAddress, functionCalled, amount, description, agentId) {
    const state = readState();
    const targetAgentId = agentId || state.activeAgent.id;
    const activeAg = state.fleet.find(a => a.id === targetAgentId);
    if (!activeAg || targetAgentId !== state.activeAgent.id || activeAg.status !== 'active') {
        return { status: 'REVERTED', reason: 'Agent is not the active authorized session' };
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > state.balances.usdc) {
        return { status: 'REVERTED', reason: 'Payment amount must be positive, finite, and within available balance' };
    }
    if (typeof targetAddress !== 'string' || typeof functionCalled !== 'string') {
        return { status: 'REVERTED', reason: 'Invalid payment target or function' };
    }

    if (!state.activeAgent.sessionActive) {
        return { status: 'REVERTED', reason: 'Agent Session Key is Inactive or Revoked' };
    }

    if (Date.now() > state.activeAgent.sessionExpiresAt) {
        return { status: 'REVERTED', reason: 'Session has expired in local simulation' };
    }

    // 1. Check if target agent's specific card is frozen
    const agentCard = activeAg.cardDetails || state.virtualCard;
    if (agentCard.isFrozen) {
        return {
            status: 'REVERTED',
            reason: `Virtual Debit Card (${agentCard.maskedNumber}) for ${activeAg.name} is currently FROZEN by Principal`
        };
    }

    // 2. Whitelist Check
    const isContractAllowed = state.policy.allowedContracts.some(c =>
        c.address.toLowerCase() === targetAddress.toLowerCase() &&
        c.selector.match(/\(([^)]+)\)/)?.[1] === functionCalled.split('(')[0]
    );
    const isRecipientAllowed = state.policy.allowedRecipients.some(
        r => r.toLowerCase() === targetAddress.toLowerCase()
    ) && functionCalled === 'transfer()';

    if (!isContractAllowed && !isRecipientAllowed) {
        return { status: 'REVERTED', reason: `Target address not allowlisted: ${targetAddress}` };
    }

    // 3. Per-Tx Cap Check (Scoped to active agent's role policy)
    const agentMaxPerTx = activeAg.maxPerTx ?? state.policy.maxPerTx;
    if (amount > agentMaxPerTx) {
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds Per-Tx Cap (₹${agentMaxPerTx.toLocaleString('en-IN')})`;
        state.queuedApprovals.unshift({
            id: `req-mcp-${randomUUID()}`,
            agent: activeAg.name,
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

    // 4. Daily Budget Check (Scoped to agent's budget)
    const agentBudget = activeAg.dailyBudget ?? state.policy.dailyBudget;
    const agentSpent = activeAg.spentToday || 0;
    if (agentSpent + amount > agentBudget) {
        const remaining = Math.max(0, agentBudget - agentSpent);
        const reason = `Amount (₹${amount.toLocaleString('en-IN')}) exceeds 24h Remaining Budget (₹${remaining.toLocaleString('en-IN')} remaining of ₹${agentBudget.toLocaleString('en-IN')})`;
        state.queuedApprovals.unshift({
            id: `req-mcp-${randomUUID()}`,
            agent: activeAg.name,
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
    activeAg.spentToday = (activeAg.spentToday || 0) + amount;
    if (activeAg.cardDetails) {
        activeAg.cardDetails.spentToday = (activeAg.cardDetails.spentToday || 0) + amount;
    }
    activeAg.lastAction = `${functionCalled} · ${vendor} (₹${amount.toLocaleString('en-IN')})`;

    if (activeAg.id === state.activeAgent.id) {
        state.dailySpent = activeAg.spentToday;
        state.virtualCard.spentToday = activeAg.spentToday;
    }

    state.balances.usdc -= amount;
    state.principal.totalFleetSpendToday += amount;

    const opHash = `sim-${randomUUID()}`;
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
        reason: `Simulated MCP Agent payment: ${description}`,
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
        agentId: activeAg.id,
        agentName: activeAg.name,
        category: activeAg.category || 'finance',
        tag: activeAg.tag || 'AG',
        action: functionCalled.split('(')[0],
        vendor,
        amount,
        timeAgo: 'now',
        timestamp: Date.now()
    });

    writeState(state);
    return {
        status: 'EXECUTED',
        reason: 'Payment simulated in local wallet state; no blockchain transaction was submitted',
        userOpHash: opHash
    };
}

/**
 * Toggle Virtual Card Freeze for a specific agent (or active agent)
 */
function toggleCardFreeze(freezeState, agentId) {
    const state = readState();
    const targetId = agentId || state.activeAgent.id;
    const ag = state.fleet.find(a => a.id === targetId) || state.fleet[0];

    const currentFrozen = ag?.cardDetails ? ag.cardDetails.isFrozen : state.virtualCard.isFrozen;
    const shouldFreeze = freezeState !== undefined ? Boolean(freezeState) : !currentFrozen;

    if (ag && ag.cardDetails) {
        ag.cardDetails.isFrozen = shouldFreeze;
    }
    if (!agentId || targetId === state.activeAgent.id) {
        state.virtualCard.isFrozen = shouldFreeze;
    }

    const action = shouldFreeze ? 'FROZEN' : 'ACTIVE';
    const cardMasked = ag?.cardDetails?.maskedNumber || state.virtualCard.maskedNumber;
    state.inboxMessages.unshift({
        id: `msg-${Date.now()}`,
        sender: 'Card Control System',
        subject: `Virtual Card ${action} (${cardMasked})`,
        body: `Agent ${ag?.name || state.activeAgent.name} virtual card ${cardMasked} status changed to ${action} via MCP Tool by Principal ${state.principal.name}.`,
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
        description: 'Simulate an agent payment in local wallet state under configured guardrails.',
        inputSchema: {
            type: 'object',
            properties: {
                target_vendor: { type: 'string', description: 'Name of the approved vendor (e.g. OpenAI, Datadog, Blinkit)' },
                target_address: { type: 'string', description: 'Whitelisted smart contract address' },
                function_called: { type: 'string', description: 'Approved ABI method call (e.g. payInvoice, orderCheckout)' },
                amount_usd: { type: 'number', description: 'Amount to pay in INR/USD' },
                reason: { type: 'string', description: 'Reason for payment justification' },
                agent_id: { type: 'string', description: 'Optional: ID of the fleet agent executing the payment' }
            },
            required: ['target_vendor', 'target_address', 'amount_usd']
        }
    },
    {
        name: 'wallet_request_approval',
        description: 'Stage an out-of-policy payment for owner review in local state.',
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
        name: 'wallet_list_agents',
        description: 'List all agents in the fleet, their assigned virtual cards, daily budgets, and spend totals.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    }
];

function handleMcpRequestUnlocked(req) {
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
                const targetId = args.agent_id || state.activeAgent.id;
                const ag = state.fleet.find(a => a.id === targetId) || state.fleet[0];
                const budget = ag ? ag.dailyBudget : state.policy.dailyBudget;
                const spent = ag ? ag.spentToday : state.dailySpent;
                const remaining = Math.max(0, budget - spent);
                const maxPerTx = ag?.maxPerTx || state.policy.maxPerTx;
                const card = ag?.cardDetails || state.virtualCard;

                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    smart_account: state.smartAccountAddress,
                                    agent_id: ag ? ag.id : state.activeAgent.id,
                                    agent_name: ag ? ag.name : state.activeAgent.name,
                                    usdc_balance: state.balances.usdc,
                                    eth_balance: state.balances.eth,
                                    paymaster_gas_tank_inr: state.balances.paymasterGasTankINR,
                                    daily_budget: budget,
                                    daily_spent: spent,
                                    remaining_budget: remaining,
                                    per_tx_cap: maxPerTx,
                                    session_active: state.activeAgent.sessionActive,
                                    virtual_card: `${card.maskedNumber} (${card.isFrozen ? 'FROZEN' : 'ACTIVE'})`,
                                    card_details: {
                                        masked_number: card.maskedNumber,
                                        is_frozen: card.isFrozen,
                                        holder: card.holder,
                                        daily_limit: card.dailyLimit,
                                        spent_today: card.spentToday
                                    }
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
                const targetAgentId = args.agent_id || args.agent;

                const result = executePayment(vendor, targetAddress, func, amount, desc, targetAgentId);

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
                                    status: 'SIMULATED',
                                    protocol: 'local-state',
                                    vendor,
                                    amount_paid: amount,
                                    user_op_hash: result.userOpHash,
                                    gas_sponsored: true,
                                    policy_check: 'PASSED_IN_SIMULATION'
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

                if (!Number.isFinite(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER || typeof vendor !== 'string' || typeof targetAddress !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(targetAddress)) {
                    return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Invalid approval request' } };
                }

                const requestId = `req-mcp-${randomUUID()}`;

                state.queuedApprovals.unshift({
                    id: requestId,
                    agent: state.activeAgent.name,
                    targetName: vendor,
                    targetAddress,
                    amount,
                    actionName: 'requestOverride()',
                    reason: String(just).slice(0, 1000),
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
                                    request_id: requestId,
                                    vendor,
                                    amount,
                                    message: 'Request stored for owner review in local state.'
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
                                    fleet: state.fleet.map(({ cardDetails, ...agent }) => ({
                                        ...agent,
                                        cardDetails: { maskedNumber: cardDetails.maskedNumber, isFrozen: cardDetails.isFrozen }
                                    }))
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

function handleMcpRequest(req) {
    return req.method === 'tools/call' ? withStateLock(() => handleMcpRequestUnlocked(req)) : handleMcpRequestUnlocked(req);
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
