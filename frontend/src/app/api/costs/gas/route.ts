import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
let cache: { endpoint: string; gwei: number; measuredAt: string; expiresAt: number } | undefined;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
    // Only public network metadata is requested. Operators can provide a private RPC.
    const endpoint = process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com';
    if (cache?.endpoint === endpoint && cache.expiresAt > Date.now()) return json({ available: true, gwei: cache.gwei, measuredAt: cache.measuredAt });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
        const url = new URL(endpoint);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid RPC protocol');
        const rpc = async (method: string, id: number) => {
            const response = await fetch(endpoint, { method: 'POST', cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params: [] }) });
            if (!response.ok) throw new Error('RPC unavailable');
            const result = await response.json();
            if (result.error || typeof result.result !== 'string' || !/^0x[0-9a-f]+$/i.test(result.result)) throw new Error('Invalid RPC response');
            return result.result;
        };
        const [chain, price] = await Promise.all([rpc('eth_chainId', 1), rpc('eth_gasPrice', 2)]);
        if (Number(chain) !== 1) throw new Error('Feed must be Ethereum mainnet');
        const wei = Number(price);
        if (!Number.isSafeInteger(wei) || wei < 0) throw new Error('Invalid gas price');
        const gwei = wei / 1e9; const measuredAt = new Date().toISOString();
        cache = { endpoint, gwei, measuredAt, expiresAt: Date.now() + 15000 };
        return json({ available: true, gwei, measuredAt });
    } catch { return json({ available: false, message: 'Live Ethereum data is unavailable. Use the labelled scenario controls.' }, 503); }
    finally { controller.abort(); clearTimeout(timer); }
}
