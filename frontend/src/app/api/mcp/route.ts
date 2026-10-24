import { NextRequest, NextResponse } from 'next/server';
import {
    readWalletState,
    executeAgentPayment,
    toggleCardFreeze,
    approveQueuedAction
} from '../../../lib/state/walletStore';

export const dynamic = 'force-dynamic';

/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Handler
 * Conforms to Anthropic & MCP Protocol Standard for Agent Tools
 * Connected directly to the persistent SafeAgent state engine.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { jsonrpc, id, method, params } = body;

        if (jsonrpc !== '2.0') {
            return NextResponse.json(
                { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' } },
                { status: 400 }
            );
        }

        // 1. Tool Listing Request (tools/list)
        if (method === 'tools/list') {
            return NextResponse.json({
                jsonrpc: '2.0',
                id,
                result: {
                    tools: [
                        {
                            name: 'wallet_get_balance',
                            description: 'Get current USDC, ETH balances, remaining daily budget, per-tx cap, and active session sub-key for SafeAgent Treasury.',
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
                    ]
                }
            });
        }

        // 2. Tool Execution Request (tools/call)
        if (method === 'tools/call') {
            const toolName = params?.name;
            const args = params?.arguments || {};
            const state = readWalletState();

            switch (toolName) {
                case 'wallet_get_balance': {
                    const remaining = Math.max(0, state.policy.dailyBudget - state.dailySpent);
                    return NextResponse.json({
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
                    });
                }

                case 'wallet_pay': {
                    const amount = Number(args.amount_usd || 0);
                    const vendor = args.target_vendor || 'Unknown Vendor';
                    const targetAddress = args.target_address || '0x00000000000000000000000000000000000A1A1A';
                    const func = args.function_called || 'payInvoice()';
                    const desc = args.reason || `Payment to ${vendor}`;

                    const execResult = executeAgentPayment(vendor, targetAddress, func, amount, desc);

                    if (execResult.status === 'REVERTED') {
                        return NextResponse.json({
                            jsonrpc: '2.0',
                            id,
                            result: {
                                isError: true,
                                content: [
                                    {
                                        type: 'text',
                                        text: `[POLICY ENGINE REVERT] ${execResult.reason}`
                                    }
                                ]
                            }
                        });
                    }

                    if (execResult.status === 'QUEUED') {
                        return NextResponse.json({
                            jsonrpc: '2.0',
                            id,
                            result: {
                                isError: true,
                                content: [
                                    {
                                        type: 'text',
                                        text: `[POLICY INTERCEPT] ${execResult.reason}. Transaction staged in PendingApprovalQueue for Principal Passkey TouchID authorization.`
                                    }
                                ]
                            }
                        });
                    }

                    return NextResponse.json({
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
                                        user_op_hash: execResult.userOpHash,
                                        gas_sponsored: true,
                                        policy_check: 'PASSED_ON_CHAIN'
                                    }, null, 2)
                                }
                            ]
                        }
                    });
                }

                case 'wallet_freeze_card': {
                    const shouldFreeze = Boolean(args.freeze);
                    const currentFrozen = state.virtualCard.isFrozen;
                    let isNowFrozen = currentFrozen;
                    if (shouldFreeze !== currentFrozen) {
                        isNowFrozen = toggleCardFreeze();
                    }
                    return NextResponse.json({
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
                    });
                }

                case 'wallet_request_approval': {
                    const amount = Number(args.amount_usd || 0);
                    const vendor = args.vendor || 'Unknown Vendor';
                    const targetAddress = args.target_address || '0x00000000000000000000000000000000000A1A1A';
                    const just = args.justification || 'Emergency spending request';

                    const execResult = executeAgentPayment(vendor, targetAddress, 'requestOverride()', amount, just);
                    return NextResponse.json({
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
                    });
                }

                case 'wallet_get_inbox_otp': {
                    const otpMessages = state.inboxMessages.filter(m => m.category === '2fa');
                    return NextResponse.json({
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
                    });
                }

                case 'wallet_list_agents': {
                    return NextResponse.json({
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
                    });
                }

                default:
                    return NextResponse.json(
                        { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${toolName}` } },
                        { status: 404 }
                    );
            }
        }

        return NextResponse.json(
            { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } },
            { status: 404 }
        );

    } catch (e: any) {
        return NextResponse.json(
            { jsonrpc: '2.0', id: null, error: { code: -32700, message: `Parse error: ${e?.message || 'Invalid JSON'}` } },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        service: 'SafeAgent Treasury MCP Endpoint',
        protocol_version: '2024-11-05',
        capabilities: ['tools', 'resources', 'prompts'],
        endpoint: '/api/mcp',
        documentation: 'https://safeagent.dev/protocol/mcp/'
    });
}
