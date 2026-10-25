const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function compile(file, imports) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
    assert.equal(code.diagnostics.length,0);
    vm.runInNewContext(code.outputText,{ module,exports:module.exports,Buffer,Date,Uint8Array,require:name=>{
        if (!(name in imports)) throw new Error(`Unexpected dependency ${name}`);
        return imports[name];
    }});
    return module.exports;
}
const { createActivityPdf } = compile('src/lib/reports/activityPdf.ts', {});
const template = { id:'report-check',userOpHash:'sim-report-check',timestamp:'2026-10-25T02:30:00.000Z',targetName:'Salary payout - Ananya Iyer',targetAddress:'SIM-EMP-002',functionCalled:'simulatedPayroll()',amount:53000,gasSponsored:false,gasCostUSD:0,status:'EXECUTED',validationResult:'IN_POLICY',reason:'PayMaster simulated salary. AI calculation validated. No real bank transfer.' };
const operations = Array.from({length:8},(_,i)=>({...template,id:`report-check-${i}`,userOpHash:`sim-report-check-${i}`,status:['EXECUTED','REVERTED_ON_CHAIN','QUEUED_FOR_APPROVAL'][i%3],targetName:i===4?'A long historical item title with a citation, product variant and merchant location that wraps across multiple lines safely':template.targetName,reason:i===6?'Special text: ₹500, café, नमस्ते, parentheses (test) and backslash \\.\n'+('Long explanation for a multi-page operation. '.repeat(130)):template.reason}));
const snapshot = JSON.stringify(operations);
const pdf = createActivityPdf(operations,new Date('2026-10-25T02:30:00Z'));
const text = pdf.toString('latin1');
assert.equal(JSON.stringify(operations),snapshot,'Export must not mutate history');
assert.ok(text.startsWith('%PDF-1.4'));
const pageCount = Number(text.match(/\/Count (\d+)/)[1]);
assert.ok(pageCount >= 4,'Long records must paginate');
for (const op of operations) assert.ok(text.includes(op.id),`Missing ${op.id}`);
assert.ok(text.includes('café')); assert.ok(text.includes('[U+0928]'),'Preserve unsupported Unicode explicitly');
assert.ok(text.includes('INR 500')); assert.ok(text.includes('\\(test\\)'),'Escape PDF syntax');
assert.ok(text.includes('Record 7 continued'));
assert.ok(text.includes('Sum of simulated operation amounts: INR 1,59,000.00'),'Do not count blocked or queued amounts as completed');
assert.equal((text.match(/Page \d+ \/ \d+/g)||[]).length,pageCount);
const offset = Number(text.match(/startxref\n(\d+)/)[1]); assert.equal(text.slice(offset,offset+4),'xref');
const rows = text.slice(offset).split('\n');
const objects = Number(rows[1].split(' ')[1]);
for(let id=1;id<objects;id++) { const objectOffset=Number(rows[2+id].slice(0,10)); assert.ok(text.slice(objectOffset).startsWith(`${id} 0 obj\n`),`Bad PDF object offset ${id}`); }
for(const match of text.matchAll(/\/Length (\d+) >>\nstream\n/g)) { const start=match.index+match[0].length; assert.equal(text.slice(start+Number(match[1]),start+Number(match[1])+9),'endstream'); }
const empty=createActivityPdf([],new Date('2026-10-25T02:30:00Z'));
assert.ok(empty.toString('latin1').includes('No operations have been recorded yet.'));
assert.ok(empty.toString('latin1').includes('/Count 1'));
const many=Array.from({length:200},(_,i)=>({...template,id:`all-records-${i}`}));
const full=createActivityPdf(many).toString('latin1');
assert.ok(full.includes('all-records-199'),'Do not export only the visible/recent rows');
class Response {
    constructor(body,options={}) {this.body=body;this.headers=options.headers||{};this.status=options.status||200;}
    static json(body,options){return new Response(body,options);}
}
let reads=0;
const route=compile('src/app/api/wallet/history/pdf/route.ts',{
    'next/server':{NextResponse:Response},
    '../../../../../lib/state/walletStore':{readWalletState:()=>{reads++;return{userOps:operations};}},
    '../../../../../lib/reports/activityPdf':{createActivityPdf}
});
(async()=>{
    const result=await route.GET();
    assert.equal(result.status,200);assert.equal(reads,1);assert.equal(result.headers['Content-Type'],'application/pdf');
    assert.equal(result.headers['Cache-Control'],'no-store');assert.match(result.headers['Content-Disposition'],/^attachment; filename="PinkPanthers-activity-/);
    assert.ok(Buffer.from(result.body).toString('latin1').startsWith('%PDF-1.4'));
    const failed=compile('src/app/api/wallet/history/pdf/route.ts',{
        'next/server':{NextResponse:Response},
        '../../../../../lib/state/walletStore':{readWalletState:()=>{throw new Error('private data file path');}},
        '../../../../../lib/reports/activityPdf':{createActivityPdf}
    });
    const error=await failed.GET();assert.equal(error.status,500);assert.ok(!error.body.error.includes('private data'));
    if(process.env.ACTIVITY_PDF_QA_DIR){fs.mkdirSync(process.env.ACTIVITY_PDF_QA_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ACTIVITY_PDF_QA_DIR,'report.pdf'),pdf);fs.writeFileSync(path.join(process.env.ACTIVITY_PDF_QA_DIR,'empty.pdf'),empty);}
    console.log('Activity PDF tests passed: full history, multi-page/long/empty records, totals, character escaping, valid PDF offsets, attachment headers and read-only API.');
})().catch(error=>{console.error(error);process.exitCode=1;});
