import { NextRequest, NextResponse } from 'next/server';
import { readBilling, refillGasTank, selectDemoPlan } from '../../../lib/state/billingStore';
import { readWalletState, publicWalletState } from '../../../lib/state/walletStore';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
    try { return json({ billing: readBilling() }); }
    catch { return json({ error: 'Unable to read billing settings' }, 500); }
}
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (body.action === 'select_plan') return json({ billing: selectDemoPlan(body.plan, body.cycle) });
        if (body.action === 'refill') {
            const receipt = refillGasTank(body.amount, body.requestId);
            return json({ receipt, state: publicWalletState(readWalletState()), billing: readBilling() });
        }
        return json({ error: 'Unknown billing action' }, 400);
    } catch (error: any) { return json({ error: error?.message || 'Billing update failed' }, 400); }
}
