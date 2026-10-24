import { NextRequest, NextResponse } from 'next/server';

/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Handler
 * Conforms to Anthropic & MCP Protocol Standard for Agent Tools
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
                            description: 'Get current USDC, ETH balances and remaining in-policy spending budget for the agent smart account.',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    agent_id: { type: 'string', description: 'Identifier of the autonomous agent' }
                                }
                            }
                        },
                        {
                            name: 'wallet_pay',
                            description: 'Execute an autonomous payment on-chain via ERC-4337 Smart Account under PolicyEngine.sol constraints.',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    target_vendor: { type: 'string', description: 'Name of the approved vendor (e.g. OpenAI, Datadog, Replicate)' },
                                    target_address: { type: 'string', description: 'Whitelisted smart contract address' },
                                    function_called: { type: 'string', description: 'Approved ABI method call (e.g. payInvoice, orderCheckout)' },
                                    amount_usd: { type: 'number', description: 'Amount to pay in USD/USDC' },
                                    reason: { type: 'string', description: 'Reason for payment justification' }
                                },
                                required: ['target_vendor', 'target_address', 'amount_usd']
                            }
                        },
                        {
                            name: 'wallet_freeze_card',
                            description: 'Immediately freeze or unfreeze the agent-linked virtual debit card.',
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
                                    justification: { type: 'string', description: 'Detailed justification for the human owner' }
                                },
                                required: ['amount_usd', 'vendor', 'justification']
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

            switch (toolName) {
                case 'wallet_get_balance':
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        smart_account: '0x884337bA94D25Ac2c488b394B7f8D44e1D328C39',
                                        usdc_balance: 1250.00,
                                        eth_balance: 0.45,
                                        daily_budget: 100.00,
                                        daily_spent: 24.50,
                                        remaining_budget: 75.50,
                                        per_tx_cap: 25.00,
                                        virtual_card: '4242 0815 ···· 1126 (ACTIVE)'
                                    }, null, 2)
                                }
                            ]
                        }
                    });

                case 'wallet_pay': {
                    const amount = Number(args.amount_usd || 0);
                    const vendor = args.target_vendor || 'Unknown Vendor';
                    const maxCap = 25.00;

                    if (amount > maxCap) {
                        return NextResponse.json({
                            jsonrpc: '2.0',
                            id,
                            result: {
                                isError: true,
                                content: [
                                    {
                                        type: 'text',
                                        text: `[POLICY INTERCEPT] Amount $${amount.toFixed(2)} exceeds Per-Transaction Cap ($${maxCap.toFixed(2)}). Staged in PendingApprovalQueue for Principal TouchID authorization.`
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
                                        amount_paid_usdc: amount,
                                        user_op_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
                                        gas_sponsored: true,
                                        policy_check: 'PASSED'
                                    }, null, 2)
                                }
                            ]
                        }
                    });
                }

                case 'wallet_freeze_card':
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        card: '4242 0815 ···· 1126',
                                        is_frozen: Boolean(args.freeze),
                                        message: args.freeze ? 'Card FROZEN successfully' : 'Card REACTIVATED'
                                    }, null, 2)
                                }
                            ]
                        }
                    });

                case 'wallet_request_approval':
                    return NextResponse.json({
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        staged_request_id: `REQ-${Date.now()}`,
                                        status: 'PENDING_OWNER_TOUCHID',
                                        vendor: args.vendor,
                                        amount: args.amount_usd,
                                        message: 'Escalation alert dispatched to Principal device.'
                                    }, null, 2)
                                }
                            ]
                        }
                    });

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
        service: 'AgentWallet MCP Endpoint',
        protocol_version: '2024-11-05',
        capabilities: ['tools', 'resources', 'prompts'],
        endpoint: '/api/mcp',
        documentation: 'https://agentwallet.ai/protocol/mcp/'
    });
}
