import { NextResponse } from 'next/server';
import { readWalletState } from '../../../../../lib/state/walletStore';
import { createActivityPdf } from '../../../../../lib/reports/activityPdf';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() {
    try {
        const now = new Date();
        const pdf = createActivityPdf(readWalletState().userOps || [], now);
        return new NextResponse(new Uint8Array(pdf), { headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="PinkPanthers-activity-${now.toISOString().slice(0, 10)}.pdf"`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        } });
    } catch {
        return NextResponse.json({ error: 'Unable to generate the activity PDF. Please retry.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}
