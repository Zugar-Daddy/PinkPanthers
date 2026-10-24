const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const ts = require('typescript');
const runFile = require('node:util').promisify(require('node:child_process').execFile);
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paymaster-test-'));
const working = path.join(tmp, 'frontend'); fs.mkdirSync(working); fs.mkdirSync(path.join(tmp, 'data'));
const dataFile = path.join(tmp, 'data/wallet-state.json');
let now = Date.now();
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
let fetchCalls = 0;
let providerMode = 'success';
let upstream;
let delayDeadline = 60000;
const cache = new Map();
function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    assert.equal(compiled.diagnostics.length, 0);
    vm.runInNewContext(compiled.outputText, {
        module, exports: module.exports, Buffer, URL, Date: Clock, structuredClone, AbortController, Atomics, Int32Array, SharedArrayBuffer,
        setTimeout: (cb, ms) => setTimeout(cb, ms === 60000 ? delayDeadline : ms), clearTimeout,
        process: { pid: process.pid, cwd: () => working, env: { AZURE_OPENAI_API_KEY: 'test-only', AZURE_OPENAI_BASE_URL: 'https://example.openai.azure.com/openai/v1/', AZURE_OPENAI_MODEL: 'gpt-6-test' } },
        fetch: async (url, options) => {
            fetchCalls++; upstream = { url, body: JSON.parse(options.body) };
            if (providerMode === 'error') return { ok: false, status: 503 };
            if (providerMode === 'timeout') return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
            const { policy, employees } = JSON.parse(upstream.body.input[1].content);
            const config = { ...policy, employees };
            const rows = employees.map(employee => ({ ...policyModule.verifyAmounts(employee, config), explanation: `${employee.name}: gross ${employee.monthlyGross} INR. Paid and unpaid leave prorated under policy; employee PF, professional tax and TDS deducted to calculate net salary.` }));
            if (providerMode === 'wrong') rows[2].netPay += 1;
            if (providerMode === 'missing') rows.pop();
            if (providerMode === 'duplicate') rows[1] = rows[0];
            if (providerMode === 'revision') store.savePaymaster(store.getPaymaster().config, store.getPaymaster().revision);
            return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ text: providerMode === 'invalid' ? 'not JSON' : JSON.stringify({ employees: rows }) }] }] }) };
        },
        require(name) {
            if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
            if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
            return require(name);
        }
    }, { filename: file });
    return module.exports;
}
const policyModule = load(path.join(root, 'src/lib/payroll/policy.ts'));
const store = load(path.join(root, 'src/lib/payroll/store.ts'));
const route = load(path.join(root, 'src/app/api/paymaster/route.ts'));
const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
function change(fn) { const state = read(); fn(state); fs.writeFileSync(dataFile, JSON.stringify(state)); }
function fresh() {
    const state = JSON.parse(fs.readFileSync(path.join(root, '../data/wallet-state.example.json'), 'utf8'));
    state.balances.usdc = 2000000; state.principal.totalFleetSpendToday = 0;
    delete state.paymaster; state.fleet = state.fleet.filter(a => a.id !== 'paymaster-01');
    state.userOps = []; state.activityStream = []; state.inboxMessages = []; state.simulatedTransactions = [];
    fs.writeFileSync(dataFile, JSON.stringify(state)); providerMode = 'success'; return state;
}
let seq = 0;
const request = (body, signal) => ({ json: async () => body, signal });
const run = (extra = {}) => route.POST(request({ action: 'run', revision: store.getPaymaster().revision, requestId: `payroll-test-command-${++seq}`, ...extra }));
const clone = value => JSON.parse(JSON.stringify(value));
(async () => {
    try {
        const initial = fresh(); const initialFile = fs.readFileSync(dataFile, 'utf8');
        const get = await route.GET(); assert.equal(get.status, 200); assert.equal(get.body.payroll.config.employees.length, 15);
        assert.equal(fs.readFileSync(dataFile, 'utf8'), initialFile, 'Opening PayMaster must not modify the wallet');
        const c = clone(get.body.payroll.config);
        assert.equal(new Set(c.employees.map(e => e.name)).size, 15);
        const sample = policyModule.verifyAmounts(c.employees[0], c);
        assert.equal(sample.grossPay, 6000000); assert.equal(sample.lossOfPay, 0); assert.equal(sample.pf, 180000); assert.equal(sample.professionalTax, 20000); assert.equal(sample.netPay, 5800000);
        const excess = policyModule.verifyAmounts(c.employees[2], c);
        assert.equal(excess.unpaidDays, 2); assert.equal(excess.lossOfPay, 454545); assert.equal(excess.netPay, 4345455);
        const zero = policyModule.verifyAmounts({ ...c.employees[0], paidLeave: 0, sickLeave: 0, unpaidLeave: 22 }, c);
        assert.equal(zero.netPay, 0); assert.equal(zero.pf, 0); assert.equal(zero.professionalTax, 0);
        const half = policyModule.verifyAmounts({ ...c.employees[0], paidLeave: 0, sickLeave: 0, unpaidLeave: 0.5, tdsPercent: 5 }, c);
        assert.equal(half.lossOfPay, 136364); assert.equal(half.tds, 293182); assert.equal(half.netPay, 5370454);
        for (const alter of [x => x.employees[0].unpaidLeave = 23, x => x.employees[1].id = x.employees[0].id, x => x.employees[0].monthlyGross = -100, x => x.workingDays = 0, x => x.month = '2026-13', x => x.employees[0].payoutReference = 'real-bank-target']) {
            const bad = clone(c); alter(bad); assert.throws(() => policyModule.validateConfig(bad));
        }
        const saved = store.savePaymaster(c, 0); assert.equal(saved.revision, 1);
        assert.equal(read().fleet.length, initial.fleet.length + 1);
        assert.deepEqual(read().activeAgent, initial.activeAgent);
        assert.deepEqual(read().policy, initial.policy);
        assert.throws(() => store.savePaymaster(c, 0), /another tab/);
        const paid = await run(); assert.equal(paid.status, 200, paid.body.error);
        assert.equal(paid.body.run.status, 'PAID'); assert.equal(paid.body.run.rows.length, 15);
        assert.equal(fetchCalls, 1); assert.equal(upstream.url, 'https://example.openai.azure.com/openai/v1/responses');
        assert.equal(upstream.body.model, 'gpt-6-test'); assert.equal(upstream.body.tools, undefined);
        const sent = JSON.parse(upstream.body.input[1].content);
        assert.equal(sent.employees[0].email, undefined); assert.equal(sent.employees[0].payoutReference, undefined, 'Do not send unnecessary personal or payout data to the model');
        assert.equal(read().balances.usdc, 2000000 - paid.body.run.totalNet / 100);
        assert.equal(read().userOps.length, 15); assert.equal(read().activityStream.length, 15); assert.equal(read().simulatedTransactions.length, 15);
        assert.deepEqual(read().activeAgent, initial.activeAgent, 'Payroll has its own authorization, not another agent session');
        assert.deepEqual(read().fleet.filter(a => a.id !== 'paymaster-01'), initial.fleet);
        const balance = read().balances.usdc;
        assert.equal(store.payPayroll(paid.body.run.id).status, 'PAID'); assert.equal(read().balances.usdc, balance);
        const duplicateMonth = await run(); assert.equal(duplicateMonth.body.run.id, paid.body.run.id); assert.equal(fetchCalls, 1, 'A second run cannot pay this month again or invoke AI unnecessarily');
        assert.equal(read().userOps.length, 15);
        const beforeEdit = clone(paid.body.run);
        const nextConfig = clone(store.getPaymaster().config); nextConfig.employees[0].name = 'Updated Name';
        store.savePaymaster(nextConfig, store.getPaymaster().revision);
        assert.deepEqual(clone(store.getPaymaster().runs[0]), beforeEdit, 'Paid payslips keep their original inputs');

        for (const mode of ['wrong', 'missing', 'duplicate', 'invalid', 'error', 'revision']) {
            fresh(); providerMode = mode;
            const failed = await run(); assert.equal(failed.status, 400, mode); assert.equal(read().balances.usdc, 2000000, mode);
            assert.equal(read().userOps.length, 0); assert.equal(store.getPaymaster().runs[0].status, 'FAILED', mode);
        }
        fresh(); providerMode = 'timeout'; delayDeadline = 5;
        assert.match((await run()).body.error, /60 seconds/); assert.equal(read().balances.usdc, 2000000); delayDeadline = 60000;
        for (const [mutate, message] of [
            [s => s.balances.usdc = 1, /Insufficient/],
            [s => s.fleet.find(a => a.id === 'paymaster-01').cardDetails.isFrozen = true, /frozen/],
            [s => s.fleet.find(a => a.id === 'paymaster-01').maxPerTx = 1, /employee limit/],
            [s => s.fleet.find(a => a.id === 'paymaster-01').dailyBudget = 1, /daily budget/]
        ]) {
            fresh(); store.savePaymaster(c, 0); change(mutate); const before = read().balances.usdc;
            const blocked = await run(); assert.equal(blocked.status, 200); assert.equal(blocked.body.run.status, 'READY'); assert.match(blocked.body.run.error, message);
            assert.equal(read().balances.usdc, before); assert.equal(read().userOps.length, 0, 'A blocked batch cannot pay any employee');
        }
        fresh(); const manual = clone(c); manual.autoPay = false; store.savePaymaster(manual, 0);
        const ready = await run(); assert.equal(ready.body.run.status, 'READY'); assert.equal(read().balances.usdc, 2000000);
        const library = path.join(tmp, 'lib');
        fs.mkdirSync(path.join(library, 'payroll'), { recursive: true }); fs.mkdirSync(path.join(library, 'state'));
        for (const name of ['payroll/store', 'payroll/policy', 'payroll/types', 'state/walletStore']) {
            const code = ts.transpileModule(fs.readFileSync(path.join(root, `src/lib/${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
            fs.writeFileSync(path.join(library, `${name}.js`), code);
        }
        const program = `require(${JSON.stringify(path.join(library, 'payroll/store.js'))}).payPayroll(process.argv[1])`;
        await Promise.all([1, 2, 3].map(() => runFile(process.execPath, ['-e', program, ready.body.run.id], { cwd: working })));
        assert.equal(read().balances.usdc, 2000000 - ready.body.run.totalNet / 100, 'Concurrent workers must debit a payroll only once');
        assert.equal(read().userOps.length, 15);
        const manualPaid = await route.POST(request({ action: 'pay', runId: ready.body.run.id })); assert.equal(manualPaid.body.run.status, 'PAID');
        fresh(); store.savePaymaster(manual, 0); const stale = await run(); store.savePaymaster(manual, 1);
        assert.match(store.payPayroll(stale.body.run.id).error, /inputs changed/); assert.equal(read().balances.usdc, 2000000);
        fresh(); const paused = clone(c); paused.enabled = false; store.savePaymaster(paused, 0);
        assert.match((await run()).body.error, /paused/); assert.equal(read().balances.usdc, 2000000);
        fresh(); const waiting = store.startPayroll('waiting-payroll-command1', 0);
        assert.throws(() => store.startPayroll('waiting-payroll-command2', 0), /already running/);
        now += 90001;
        assert.equal(store.startPayroll('waiting-payroll-command1', 0).run.status, 'FAILED', 'A retried interrupted run must become recoverable');
        const retry = store.startPayroll('waiting-payroll-command3', 0); assert.equal(retry.existing, false);
        assert.throws(() => store.finishPayroll(waiting.run.id, {}, 'test'), /no longer active/);
        console.log('PayMaster tests passed: sample inputs and exact payroll math, real provider request shape, 15 AI payslips, atomic payout, duplicate-month protection, immutable history, validation failures, timeout, balance/card/limits, manual mode, revision races, interruption recovery and isolation from other agents.');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
