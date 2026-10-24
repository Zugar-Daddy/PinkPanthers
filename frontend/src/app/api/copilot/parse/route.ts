import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ service: 'SafeAgent live copilot', endpoint: '/api/copilot/plan' });
}

export async function POST() {
    return NextResponse.json({ error: 'The mock intent parser is retired. Use /api/copilot/plan for Azure OpenAI planning and live research.' }, { status: 410 });
}
