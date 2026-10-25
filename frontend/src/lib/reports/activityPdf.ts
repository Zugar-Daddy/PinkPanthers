import type { WalletState } from '../state/walletStore';

type Operation = WalletState['userOps'][number];
type Line = { text: string; heading?: boolean };
const WIDTH = 98;
const LINES_PER_PAGE = 49;

// Core PDF fonts need no binary assets or external runtime. Preserve unsupported
// characters as explicit Unicode code points rather than silently dropping data.
function printable(value: unknown): string {
    return String(value ?? '').replace(/₹/g, 'INR ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
        .replace(/[–—‑]/g, '-').replace(/…/g, '...').replace(/\t/g, '    ')
        .replace(/\r\n?/g, '\n').replace(new RegExp(/[^\x20-\x7E\xA0-\xFF\n]/.source, 'gu'), char => `[U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}]`);
}
function wrap(value: unknown): string[] {
    return printable(value).split('\n').flatMap(paragraph => {
        const lines: string[] = [];
        let remaining = paragraph;
        while (remaining.length > WIDTH) {
            const boundary = remaining.lastIndexOf(' ', WIDTH);
            const end = boundary > WIDTH / 2 ? boundary : WIDTH;
            lines.push(remaining.slice(0, end));
            remaining = remaining.slice(end).replace(/^ +/, '');
        }
        lines.push(remaining);
        return lines;
    });
}
function amount(value: number): string {
    return Number.isFinite(value) ? `INR ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Amount not recorded';
}
function status(value: string): string {
    return value === 'EXECUTED' ? 'SIMULATED' : value === 'REVERTED_ON_CHAIN' ? 'BLOCKED IN SIMULATION' : value === 'QUEUED_FOR_APPROVAL' ? 'QUEUED FOR APPROVAL' : printable(value);
}
function recordLines(op: Operation, index: number): Line[] {
    const fields = [
        `${index + 1}. ${op.targetName || 'Unnamed operation'}`,
        `Status: ${status(op.status)} | Amount: ${amount(op.amount)}`,
        `Recorded time: ${op.timestamp || 'Not recorded'}`,
        `Action: ${op.functionCalled || 'Not recorded'}`,
        `Validation: ${op.validationResult || 'Not recorded'}`,
        `Record ID: ${op.id || 'Not recorded'}`,
        `Operation reference: ${op.userOpHash || 'Not recorded'}`,
        `Destination: ${op.targetAddress || 'Not recorded'}`,
        `Reason: ${op.reason || 'Not recorded'}`,
        `Gas sponsorship: ${op.gasSponsored ? 'Simulated / estimated only' : 'No'} | Estimated gas cost: ${Number.isFinite(op.gasCostUSD) ? `USD ${op.gasCostUSD.toFixed(2)}` : 'Not recorded'}`
    ];
    return fields.flatMap((field, fieldIndex) => wrap(field).map(text => ({ text, heading: fieldIndex === 0 })));
}
function literal(value: string): string { return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
function draw(text: string, x: number, y: number, font = 'F1', size = 8.5, color = '0.18 0.22 0.22'): string {
    return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${literal(text)}) Tj ET\n`;
}

/** Read-only report of the full persisted operation list, in its recorded order. */
export function createActivityPdf(operations: Operation[], generatedAt = new Date()): Buffer {
    const pages: Line[][] = [[]];
    const add = (line: Line) => {
        if (pages[pages.length - 1].length >= LINES_PER_PAGE) pages.push([]);
        pages[pages.length - 1].push(line);
    };
    const completed = operations.filter(op => op.status === 'EXECUTED');
    const total = completed.reduce((sum, op) => sum + (Number.isFinite(op.amount) ? Math.round(op.amount * 100) : 0), 0) / 100;
    [
        `TOTAL RECORDS: ${operations.length} | SIMULATED: ${completed.length} | BLOCKED: ${operations.filter(op => op.status === 'REVERTED_ON_CHAIN').length} | QUEUED: ${operations.filter(op => op.status === 'QUEUED_FOR_APPROVAL').length}`,
        `Sum of simulated operation amounts: ${amount(total)}`,
        'This is an activity report, not a bank statement or proof of real payment.',
        'All saved records are included in the same order as Operation history.',
        'Times are reproduced as recorded; older records may contain only a time of day.',
        ''
    ].forEach(value => wrap(value).forEach(text => add({ text })));
    if (!operations.length) add({ text: 'No operations have been recorded yet.' });
    operations.forEach((op, index) => {
        const lines = recordLines(op, index);
        if (lines.length <= LINES_PER_PAGE && pages[pages.length - 1].length + lines.length > LINES_PER_PAGE) pages.push([]);
        for (const line of lines) {
            if (pages[pages.length - 1].length >= LINES_PER_PAGE) {
                pages.push([]);
                add({ text: `Record ${index + 1} continued`, heading: true });
            }
            add(line);
        }
        if (pages[pages.length - 1].length < LINES_PER_PAGE) add({ text: '' });
    });
    const unicodeEscapes = pages.some(page => page.some(line => /\[U\+[0-9A-F]+\]/.test(line.text)));
    const objects: string[] = [];
    const put = (value: string) => { objects.push(value); return objects.length; };
    put('<< /Type /Catalog /Pages 2 0 R >>');
    put(''); // Filled after page objects are created.
    put('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
    put('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>');
    put('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds = pages.map((lines, pageIndex) => {
        let stream = '0.07 0.23 0.20 rg 0 800 595.28 42 re f\n';
        stream += draw('PINKPANTHERS / ACTIVITY REPORT', 42, 815, 'F3', 12, '1 1 1');
        stream += draw('Operation history', 42, 774, 'F3', 18, '0.07 0.23 0.20');
        stream += draw(`Exported: ${generatedAt.toISOString()} | SIMULATION DATA`, 42, 754, 'F1', 8);
        lines.forEach((line, index) => {
            stream += draw(line.text, 42, 727 - index * 12.5, line.heading ? 'F2' : 'F1');
        });
        stream += '0.8 0.84 0.83 RG 0.5 w 42 70 m 553 70 l S\n';
        if (unicodeEscapes) stream += draw('Non-Latin characters are preserved as [U+code] notation.', 42, 57, 'F1', 7);
        stream += draw('Historical records only. No real funds moved by this export.', 42, 43, 'F1', 7);
        stream += draw(`Page ${pageIndex + 1} / ${pages.length}`, 470, 29, 'F1', 8);
        const content = put(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`);
        return put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${content} 0 R >>`);
    });
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf, 'latin1'));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
}
