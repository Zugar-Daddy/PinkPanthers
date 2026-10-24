import { NextRequest, NextResponse } from 'next/server';
import { calculatePayroll } from '../../../lib/payroll/ai';
import { failPayroll, finishPayroll, getPaymaster, payPayroll, savePaymaster, startPayroll } from '../../../lib/payroll/store';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
    try { return json({ payroll: getPaymaster() }); }
    catch { return json({ error: 'Unable to load PayMaster' }, 500); }
}
export async function POST(req: NextRequest) {
    let pendingId: string | undefined;
    try {
        const body = await req.json();
        if (body.action === 'save') return json({ payroll: savePaymaster(body.config, body.revision) });
        if (body.action === 'pay') {
            if (typeof body.runId !== 'string') return json({ error: 'Select a payroll run' }, 400);
            return json({ run: payPayroll(body.runId), payroll: getPaymaster() });
        }
        if (body.action !== 'run') return json({ error: 'Unknown PayMaster action' }, 400);
        const started = startPayroll(body.requestId, body.revision);
        if (started.existing) return json({ run: started.run, payroll: getPaymaster() });
        pendingId = started.run.id;
        const result = await calculatePayroll(started.run.config, req.signal);
        if (req.signal?.aborted) throw new Error('Payroll calculation cancelled. No salaries were paid.');
        let run = finishPayroll(started.run.id, result.output, result.model);
        if (run.config.autoPay) run = payPayroll(run.id);
        return json({ run, payroll: getPaymaster() });
    } catch (error: any) {
        const message = error?.message || 'Payroll operation failed';
        if (pendingId) failPayroll(pendingId, message);
        return json({ error: message }, 400);
    }
}
