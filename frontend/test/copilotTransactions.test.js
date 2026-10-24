const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const ts = require('typescript');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const runFile = promisify(execFile);
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pinkpanthers-transactions-'));
const working = path.join(temporary, 'frontend');
const dataFile = path.join(temporary, 'data/wallet-state.json');
fs.mkdirSync(working); fs.mkdirSync(path.dirname(dataFile));
let now = Date.now();
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
let calls = 0;
const merchant = 'https://merchant.example/bananas';
const sourceListing = { title: '1 kg bananas', merchant: 'Merchant', url: merchant, price: 60.25, currency: 'INR', priceEvidence: '1 kg bananas cost ₹60.25' };
let modelResult = { action: 'RESEARCH', summary: 'Matched listing', readyToBuy: true, options: [sourceListing], missingDetails: [] };
function load(file, cache = new Map()) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    assert.equal(compiled.diagnostics.length, 0);
    vm.runInNewContext(compiled.outputText, {
        module, exports: module.exports, Buffer, URL, Date: Clock, AbortController, Atomics, Int32Array, SharedArrayBuffer, setTimeout, clearTimeout,
        process: { pid: process.pid, cwd: () => working, env: { WALLET_ADMIN_TOKEN: 'test-secret-never-used-in-production-123456789', AZURE_OPENAI_API_KEY: 'test-key', AZURE_OPENAI_BASE_URL: 'https://example.openai.azure.com/openai/v1', AZURE_OPENAI_MODEL: 'gpt-6-test' } },
        fetch: async () => {
            calls++;
            const text = JSON.stringify(modelResult);
            return { ok: true, json: async () => ({ output: [
                { type: 'web_search_call', status: 'completed', action: { sources: [{ url: merchant, title: 'Merchant' }] } },
                { type: 'message', content: [{ text, annotations: [{ url: merchant, title: 'Merchant', start_index: text.indexOf('priceEvidence') }] }] }
            ] }) };
        },
        require(name) {
            if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'), cache);
            if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
            return require(name);
        }
    }, { filename: file });
    return module.exports;
}
function fresh() {
    const state = JSON.parse(fs.readFileSync(path.join(root, '../data/wallet-state.example.json'), 'utf8'));
    state.activeAgent.sessionActive = true; state.activeAgent.sessionExpiresAt = now + 3600000;
    state.balances.usdc = 10000; state.dailySpent = 0; state.principal.totalFleetSpendToday = 0;
    state.policy.dailyBudget = 5000; state.policy.maxPerTx = 1000;
    const agent = state.fleet.find(item => item.id === state.activeAgent.id);
    agent.status = 'active'; agent.spentToday = 0; agent.dailyBudget = 5000; agent.maxPerTx = 1000;
    agent.cardDetails.isFrozen = false; agent.cardDetails.spentToday = 0; agent.cardDetails.dailyLimit = 5000;
    state.virtualCard = { ...agent.cardDetails };
    state.simulatedTransactions = []; state.userOps = []; state.activityStream = []; state.inboxMessages = [];
    fs.writeFileSync(dataFile, JSON.stringify(state)); return state;
}
const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const change = fn => { const state = read(); fn(state); fs.writeFileSync(dataFile, JSON.stringify(state)); };
const command = 'command-0000000000000001';
const request = (query, extra = {}) => ({ json: async () => ({ query, requestId: command, ...extra }) });
(async () => {
    try {
        let state = fresh();
        const service = load(path.join(root, 'src/lib/state/copilotTransactions.ts'));
        const planRoute = load(path.join(root, 'src/app/api/copilot/plan/route.ts'));
        const transactions = load(path.join(root, 'src/app/api/copilot/transactions/route.ts'));
        const execute = token => transactions.POST({ json: async () => ({ token }) });
        const walletRoute = load(path.join(root, 'src/app/api/wallet/state/route.ts'));
        const renew = agentId => walletRoute.POST({ json: async () => ({ action: 'renew_session', payload: { agentId } }) });
        change(s => { s.activeAgent.sessionExpiresAt = now - 1; s.activeAgent.sessionActive = false; s.dailySpent = 120; s.virtualCard.isFrozen = true; });
        const beforeRenewal = read();
        const renewed = await renew(beforeRenewal.activeAgent.id);
        assert.equal(renewed.status, 200);
        const afterRenewal = read();
        assert.equal(afterRenewal.activeAgent.sessionActive, true);
        assert.equal(afterRenewal.activeAgent.sessionExpiresAt, now + beforeRenewal.policy.sessionExpiryHours * 3600000);
        const unchanged = { ...afterRenewal, activeAgent: beforeRenewal.activeAgent };
        assert.deepEqual(unchanged, beforeRenewal, 'Renewal must only update session activity/expiry, not balance, counters, limits or frozen cards');
        assert.equal((await renew('different-agent')).status, 409);
        assert.equal((await renew(undefined)).status, 400);
        change(s => { s.fleet.find(a => a.id === s.activeAgent.id).status = 'paused'; });
        assert.equal((await renew(beforeRenewal.activeAgent.id)).status, 409, 'Renewal cannot unpause an agent');
        fresh(); change(s => { s.policy.sessionExpiryHours = 0; });
        assert.equal((await renew(beforeRenewal.activeAgent.id)).status, 409);
        fresh();
        const buy = await planRoute.POST(request('Buy me a 1 kg pack of bananas under ₹100'));
        assert.equal(buy.status, 200); assert.equal(buy.body.autoExecute, true); assert.equal(calls, 1);
        assert.equal(read().balances.usdc, 10000, 'Planning alone must never spend');
        const token = buy.body.transaction.token;
        const result = await execute(token);
        assert.equal(result.status, 200); assert.equal(result.body.receipt.status, 'SIMULATED'); assert.equal(result.body.receipt.balanceAfter, 9939.75);
        state = read(); assert.equal(state.balances.usdc, 9939.75); assert.equal(state.simulatedTransactions.length, 1);
        assert.equal(state.userOps.length, 1); assert.equal(state.activityStream.length, 1); assert.equal(state.inboxMessages.length, 1);
        assert.equal(state.dailySpent, 60.25); assert.equal(state.virtualCard.spentToday, 60.25); assert.equal(state.principal.totalFleetSpendToday, 60.25);
        assert.equal(result.body.receipt.fingerprint, undefined, 'Do not expose the internal fingerprint in receipt responses');
        const retries = await Promise.all([execute(token), execute(token), execute(token)]);
        assert.ok(retries.every(item => item.body.receipt.id === result.body.receipt.id));
        assert.equal(read().balances.usdc, 9939.75); assert.equal(read().userOps.length, 1);
        const restarted = load(path.join(root, 'src/lib/state/copilotTransactions.ts'));
        assert.equal(restarted.executeSimulation(token).id, result.body.receipt.id, 'Idempotency survives process restart');
        now += 300001;
        assert.equal((await execute(token)).status, 200, 'An expired completed quote still returns its receipt without spending');
        assert.equal((await transactions.GET()).body.receipts.length, 1);

        fresh();
        assert.match((await execute(token)).body.error, /expired/);
        const [payload, signature] = token.split('.');
        const edited = JSON.parse(Buffer.from(payload, 'base64url').toString()); edited.amountMinor = 1;
        assert.equal((await execute(Buffer.from(JSON.stringify(edited)).toString('base64url') + '.' + signature)).status, 400);
        assert.equal(read().balances.usdc, 10000);
        const before = calls;
        const transfer = await planRoute.POST(request('transfer ₹500.25 to alex@upi'));
        assert.equal(transfer.body.action, 'TRANSFER'); assert.equal(transfer.body.autoExecute, true); assert.equal(calls, before, 'Transfers must not invoke web search or a model');
        assert.equal((await execute(transfer.body.transaction.token)).body.receipt.balanceAfter, 9499.75);
        const repeated = await planRoute.POST(request('transfer ₹500.25 to alex@upi'));
        assert.equal((await execute(repeated.body.transaction.token)).body.receipt.balanceAfter, 9499.75);
        const address = '0x' + '1'.repeat(40);
        assert.equal(service.transferPlan(`send 50 INR to ${address}`, read(), command).autoExecute, true);
        for (const query of ['transfer -5 to alex@upi', 'send 1.001 to alex@upi', 'send $20 to alex@upi', 'transfer ₹500 to Alex', 'transfer 500 to alex@upi and bob@upi', 'transfer 500 USD to alex@upi']) {
            assert.equal(service.transferPlan(query, read(), command).transaction, undefined, query);
        }
        for (const amount of [-1, 0, NaN, Infinity, 1.001]) assert.throws(() => service.minorUnits(amount));
        assert.equal((await planRoute.POST(request('send ₹5 to alex@upi', { requestId: '../bad' }))).status, 400);

        const make = (amount = 100, id = 'command-policy000000000001') => service.signQuote({ kind: 'TRANSFER', agentId: read().activeAgent.id, title: 'Test transfer', recipient: 'alex@upi', amountMinor: service.minorUnits(amount), quantity: 1, currency: 'INR' }, id, 'test', 0);
        for (const [mutate, error] of [
            [s => { s.balances.usdc = 50; }, /Insufficient/],
            [s => { s.virtualCard.isFrozen = true; }, /frozen/],
            [s => { s.activeAgent.sessionActive = false; }, /session/],
            [s => { s.activeAgent.sessionExpiresAt = now - 1; }, /session/],
            [s => { s.policy.maxPerTx = 0; }, /per-transaction/],
            [s => { s.policy.dailyBudget = 50; }, /daily budget/],
            [s => { s.fleet.find(a => a.id === s.activeAgent.id).cardDetails.dailyLimit = 50; }, /card limit/],
            [s => { s.fleet.find(a => a.id === s.activeAgent.id).status = 'paused'; }, /session/]
        ]) {
            fresh(); const quote = make(); change(mutate); const balance = read().balances.usdc;
            const failure = await execute(quote.token); assert.equal(failure.status, 400); assert.match(failure.body.error, error);
            assert.equal(read().balances.usdc, balance); assert.equal(read().simulatedTransactions.length, 0);
        }
        fresh(); const firstQuote = make(); await execute(firstQuote.token);
        const changed = make(200); assert.match((await execute(changed.token)).body.error, /different terms/); assert.equal(read().balances.usdc, 9900);
        // Separate Node processes exercise the real filesystem lock, not just sequential JS calls.
        fresh();
        const library = path.join(temporary, 'lib'); fs.mkdirSync(library);
        for (const name of ['walletStore', 'copilotTransactions']) {
            const code = ts.transpileModule(fs.readFileSync(path.join(root, `src/lib/state/${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
            fs.writeFileSync(path.join(library, `${name}.js`), code);
        }
        const concurrentA = make(100, 'command-concurrent00000001');
        const concurrentB = make(200, 'command-concurrent00000002');
        const program = `require(${JSON.stringify(path.join(library, 'copilotTransactions.js'))}).executeSimulation(process.argv[1])`;
        await Promise.all([concurrentA, concurrentA, concurrentB].map(quote => runFile(process.execPath, ['-e', program, quote.token], { cwd: working, env: { WALLET_ADMIN_TOKEN: 'test-secret-never-used-in-production-123456789' } })));
        assert.equal(read().balances.usdc, 9700); assert.equal(read().simulatedTransactions.length, 2);
        fresh(); const oldAgent = make(); change(s => { s.activeAgent.id = 'another-agent'; }); assert.match((await execute(oldAgent.token)).body.error, /session/);

        fresh();
        const refreshed = await planRoute.POST(request('Buy me bananas', { refresh: true }));
        assert.equal(refreshed.body.autoExecute, false); assert.ok(refreshed.body.options[0].transaction);
        const researchOnly = await planRoute.POST(request('Find bananas'));
        assert.equal(researchOnly.body.autoExecute, false, 'Even a model mistake cannot convert research into automatic spending');
        const negated = await planRoute.POST(request('Do not buy bananas'));
        assert.equal(negated.body.autoExecute, false);
        const tooExpensive = await planRoute.POST(request('Buy bananas under ₹50'));
        assert.equal(tooExpensive.body.autoExecute, false, 'Enforce the user budget independently of model readiness');
        const foreignBudget = await planRoute.POST(request('Buy bananas under $50'));
        assert.equal(foreignBudget.body.autoExecute, false);
        modelResult = { ...modelResult, options: [{ ...sourceListing, url: 'https://uncited.example/item' }, sourceListing] };
        const droppedFirst = await planRoute.POST(request('Buy a matching banana listing'));
        assert.equal(droppedFirst.body.options.length, 1); assert.equal(droppedFirst.body.autoExecute, false, 'Dropping an unsourced first option must not automatically buy a fallback');
        modelResult = { ...modelResult, options: [sourceListing], missingDetails: ['Choose a date'] };
        assert.equal((await planRoute.POST(request('Book bananas'))).body.autoExecute, false);
        modelResult = { ...modelResult, missingDetails: [], options: [{ ...sourceListing, price: 60.25, currency: 'USD', priceEvidence: 'USD 60.25' }] };
        const foreign = await planRoute.POST(request('Buy foreign item'));
        assert.equal(foreign.body.options[0].transaction, undefined); assert.equal(foreign.body.autoExecute, false);
        modelResult = { ...modelResult, options: [{ ...sourceListing, price: null }] };
        const unknown = await planRoute.POST(request('Buy unknown item'));
        assert.equal(unknown.body.options[0].transaction, undefined);
        assert.equal(read().balances.usdc, 10000);
        console.log('Transaction tests passed: signed live quotes, direct transfers, atomic debit/receipts, retry/restart idempotency, expiry/tampering, spending guardrails, currency, ambiguity, research/refresh and budget handling.');
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
