const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/app/api/copilot/plan/route.ts'), 'utf8');
const compilation = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
assert.equal(compilation.diagnostics?.length || 0, 0, 'The route must parse without TypeScript diagnostics');
const compiled = compilation.outputText;
function routeWith(fetch, options = {}) {
    const module = { exports: {} };
    let now = Date.now();
    class Clock extends Date { static now() { return now; } }
    vm.runInNewContext(compiled, {
        module, exports: module.exports, fetch, URL, AbortController, Date: Clock,
        setTimeout: (callback, ms) => { assert.equal(ms, 25000); return setTimeout(callback, options.deadlineMs ?? ms); }, clearTimeout,
        process: { env: { AZURE_OPENAI_API_KEY: 'test-key', AZURE_OPENAI_BASE_URL: 'https://example.openai.azure.com/openai/v1', AZURE_OPENAI_MODEL: 'gpt-6-test' } },
        require(name) {
            if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
            if (name.endsWith('/copilotTransactions')) return { commandId: () => true, transferPlan: () => null, attachPurchaseQuotes: plan => plan };
            if (name.endsWith('/walletStore')) return { readWalletState: () => ({ activeAgent: { id: 'concierge-08' }, fleet: [{ id: 'concierge-08', name: 'Concierge' }] }) };
            throw new Error(`Unexpected import ${name}`);
        }
    });
    return { post: module.exports.POST, advance: ms => { now += ms; } };
}
function request(query, refresh = false, signal) { return { json: async () => ({ query, refresh }), signal }; }
function ok(payload) { return { ok: true, json: async () => payload }; }
const url = 'https://merchant.example/bananas';
const listing = { title: 'Bananas', merchant: 'Merchant', url, price: 60, currency: 'INR', priceEvidence: 'Bananas cost ₹60 at the merchant.' };
function research(options = [listing]) {
    const text = JSON.stringify({ action: 'RESEARCH', summary: 'Listings found', missingDetails: [], options });
    return ok({ output: [
        { type: 'web_search_call', status: 'completed', action: { sources: [{ url, title: 'Merchant listing' }] } },
        { type: 'message', content: [{ text, annotations: [{ url, title: 'Merchant listing', start_index: Math.max(0, text.indexOf('Bananas cost')) }] }] }
    ] });
}

(async () => {
    const calls = [];
    const { post, advance } = routeWith(async (endpoint, options) => { calls.push({ endpoint, options }); return research([listing, { ...listing, url: 'https://invented.example/' }, { ...listing, price: 999 }]); });
    const first = await post(request('Find bananas'));
    assert.equal(first.status, 200);
    assert.equal(first.body.options.length, 2);
    assert.equal(first.body.options[0].price, 60);
    assert.equal(first.body.options[1].price, null);
    assert.equal(calls.length, 1, 'A fresh lookup must use exactly one model request');
    assert.equal(calls[0].endpoint, 'https://example.openai.azure.com/openai/v1/responses');
    const sent = JSON.parse(calls[0].options.body);
    assert.equal(sent.model, 'gpt-6-test');
    assert.equal(sent.tools[0].search_context_size, 'low');
    assert.equal(sent.reasoning.effort, 'low');
    const cached = await post(request('Find bananas'));
    assert.equal(cached.body.cached, true);
    assert.equal(cached.body.researchedAt, first.body.researchedAt);
    assert.equal(calls.length, 1);
    await post(request('Find bananas', true));
    assert.equal(calls.length, 2, 'Refresh must bypass cache');
    advance(60001);
    await post(request('Find bananas'));
    assert.equal(calls.length, 3, 'Expired results must be looked up again');

    let cardCalls = 0;
    const card = routeWith(async () => { cardCalls++; return ok({ output: [{ type: 'message', content: [{ text: JSON.stringify({ action: 'CARD_FREEZE', summary: 'Freeze concierge card', agentId: 'concierge-08' }) }] }] }); });
    assert.equal((await card.post(request('Freeze card'))).body.action, 'CARD_FREEZE');
    await card.post(request('Freeze card'));
    assert.equal(cardCalls, 2, 'Card plans must not reuse cached account context');

    let rejectedCalls = 0;
    const rejected = routeWith(async () => { rejectedCalls++; return { ok: false, status: 400, json: async () => ({ error: { message: 'Invalid deployment' } }) }; });
    assert.equal((await rejected.post(request('Find item'))).status, 503);
    assert.equal(rejectedCalls, 1, 'Unrelated provider errors must not launch retry loops');
    await rejected.post(request('Find item'));
    assert.equal(rejectedCalls, 2, 'Failures must not be cached');

    const variants = [];
    const compatible = routeWith(async (_, options) => {
        const type = JSON.parse(options.body).tools[0].type; variants.push(type);
        return type === 'web_search_preview' ? { ok: false, status: 400, json: async () => ({ error: { message: 'Unsupported tool web_search_preview' } }) } : research();
    });
    assert.equal((await compatible.post(request('Find bananas'))).status, 200);
    await compatible.post(request('Find another item'));
    assert.deepEqual(variants, ['web_search_preview', 'web_search', 'web_search']);

    const malformed = routeWith(async () => research([null, { ...listing, url: 'find' }, { ...listing, url: 'javascript:alert(1)' }]));
    assert.equal((await malformed.post(request('Find item'))).body.options.length, 0);

    const timeout = routeWith((_, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })), { deadlineMs: 5 });
    assert.match((await timeout.post(request('Find slow item'))).body.error, /exceeded 25 seconds/);

    const cancel = new AbortController();
    const cancelled = routeWith((_, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        cancel.abort();
    }));
    assert.match((await cancelled.post(request('Cancel item', false, cancel.signal))).body.error, /cancelled/);
    console.log('Live copilot tests passed: one-call lookup, cache/refresh/expiry, source validation, bounded retry, timeout and cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
