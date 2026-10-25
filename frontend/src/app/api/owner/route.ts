import { NextRequest, NextResponse } from 'next/server';
import { beginVerification, completeVerification, ownerStatus } from '../../../lib/auth/ownerVerification';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: NextRequest) {
    try { return json(ownerStatus(req.nextUrl.origin)); }
    catch { return json({ error: 'Unable to read owner passkey status' }, 500); }
}
export async function POST(req: NextRequest) {
    try {
        if (req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Same-origin owner verification required' }, 403);
        const body = await req.json();
        let password = body.ownerPassword;
        const basic = req.headers.get('authorization');
        if (!password && basic?.startsWith('Basic ')) password = Buffer.from(basic.slice(6),'base64').toString().split(':').slice(1).join(':');
        if (body.action === 'begin') {
            if (!['register','authenticate'].includes(body.kind)) throw new Error('Invalid passkey ceremony');
            return json(beginVerification(req.nextUrl.origin, body.kind, body.intent, password));
        }
        if (body.action === 'finish') return json(completeVerification(req.nextUrl.origin, body.id, body.credential, password));
        return json({ error: 'Unknown verification action' },400);
    } catch (error: any) { return json({ error: error?.message || 'Owner verification failed' },403); }
}
