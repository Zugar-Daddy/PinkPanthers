import { NextRequest, NextResponse } from 'next/server';
import { executeSimulation } from '../../../../lib/state/copilotTransactions';
import { readWalletState } from '../../../../lib/state/walletStore';
export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const receipts = (readWalletState().simulatedTransactions || []).slice(0, 20).map(({ fingerprint, ...receipt }) => receipt);
        return NextResponse.json({ receipts }, { headers: { 'Cache-Control': 'no-store' } });
    } catch { return NextResponse.json({ error: 'Unable to read simulated receipts' }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();
        const { fingerprint, ...receipt } = executeSimulation(token);
        return NextResponse.json({ receipt }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Simulated transaction failed' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
}
