const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeagent-owner-'));
const working = path.join(tmp, 'frontend'); fs.mkdirSync(working); fs.mkdirSync(path.join(tmp, 'data'));
const dataFile = path.join(tmp, 'data/wallet-state.json');
const password = 'test-owner-password-not-a-real-secret-123456789';
const origin = 'http://localhost:3000';
let now = Date.now();
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const cache = new Map();
function load(file) {
    file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, Buffer, URL, Date: Clock, Atomics, Int32Array, SharedArrayBuffer,
        process: { pid: process.pid, cwd: () => working, env: { WALLET_ADMIN_TOKEN: password } },
        require(name) {
            if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
            if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers }) } };
            return require(name);
        }
    }, { filename: file }); return module.exports;
}
const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
function change(fn) { const state = read(); fn(state); fs.writeFileSync(dataFile, JSON.stringify(state)); }
function fresh() {
    const s = JSON.parse(fs.readFileSync(path.join(root, '../data/wallet-state.example.json'), 'utf8'));
    delete s.ownerSecurity;
    s.balances.usdc = 10000; s.activeAgent.sessionActive = true; s.activeAgent.sessionExpiresAt = now + 3600000;
    s.policy.dailyBudget = 1000; s.policy.maxPerTx = 100; s.dailySpent = 20; s.principal.totalFleetSpendToday = 20;
    const agent = s.fleet.find(a => a.id === s.activeAgent.id);
    Object.assign(agent, { status: 'active', dailyBudget: 1000, maxPerTx: 100, spentToday: 20 });
    Object.assign(agent.cardDetails, { dailyLimit: 1000, spentToday: 20, isFrozen: false });
    s.virtualCard = { ...agent.cardDetails }; s.userOps = []; s.simulatedTransactions = []; s.queuedApprovals = [];
    fs.writeFileSync(dataFile, JSON.stringify(s)); return s;
}
const auth = load(path.join(root, 'src/lib/auth/ownerVerification.ts'));
const walletRoute = load(path.join(root, 'src/app/api/wallet/state/route.ts'));
const ownerRoute = load(path.join(root, 'src/app/api/owner/route.ts'));
const transactions = load(path.join(root, 'src/lib/state/copilotTransactions.ts'));
const transactionRoute = load(path.join(root, 'src/app/api/copilot/transactions/route.ts'));
const post = (action, payload) => walletRoute.POST({ json: async () => ({ action, payload }) });
const ownerRequest = (body, requestOrigin = origin) => ({ nextUrl: new URL(origin), headers: new Headers({ origin: requestOrigin }), json: async () => body });
const digest = data => crypto.createHash('sha256').update(data).digest();
const b64 = data => data.toString('base64url');
function head(major, len) {
    if (len < 24) return Buffer.from([major * 32 + len]);
    if (len < 256) return Buffer.from([major * 32 + 24, len]);
    const b = Buffer.alloc(3); b[0] = major * 32 + 25; b.writeUInt16BE(len, 1); return b;
}
function cbor(value) {
    if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
    if (typeof value === 'string') { const b = Buffer.from(value); return Buffer.concat([head(3, b.length), b]); }
    if (typeof value === 'number') return head(value < 0 ? 1 : 0, value < 0 ? -1 - value : value);
    if (value instanceof Map) return Buffer.concat([head(5, value.size), ...[...value].flatMap(([k,v]) => [cbor(k), cbor(v)])]);
    throw new Error('Unsupported test CBOR');
}
const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = keyPair.publicKey.export({ format: 'jwk' });
const rawId = crypto.randomBytes(32);
let counter = 0;
function authData(flags, count, rpId = 'localhost') { const b = Buffer.alloc(5); b[0] = flags; b.writeUInt32BE(count, 1); return Buffer.concat([digest(rpId), b]); }
function client(options, type, overrides = {}) { return Buffer.from(JSON.stringify({ type, challenge: options.publicKey.challenge, origin, ...overrides })); }
function registration(options) {
    const len = Buffer.alloc(2); len.writeUInt16BE(rawId.length);
    const key = cbor(new Map([[1,2],[3,-7],[-1,1],[-2,Buffer.from(jwk.x,'base64url')],[-3,Buffer.from(jwk.y,'base64url')]]));
    const data = Buffer.concat([authData(0x45, 0), Buffer.alloc(16), len, rawId, key]);
    return { type: 'public-key', id: b64(rawId), rawId: b64(rawId), response: {
        clientDataJSON: b64(client(options, 'webauthn.create')),
        attestationObject: b64(cbor(new Map([['fmt','none'],['attStmt',new Map()],['authData',data]])))
    } };
}
function assertion(options, edits = {}) {
    const data = authData(edits.flags ?? 5, edits.counter ?? ++counter, edits.rpId);
    const cd = client(options, 'webauthn.get', edits.client);
    return { type: 'public-key', id: b64(rawId), rawId: b64(rawId), response: {
        clientDataJSON: b64(cd), authenticatorData: b64(data), userHandle: null,
        signature: b64(crypto.sign('sha256', Buffer.concat([data, digest(cd)]), keyPair.privateKey))
    } };
}
function enroll() { const options = auth.beginVerification(origin, 'register', undefined, password); auth.completeVerification(origin, options.id, registration(options), password); counter = 0; }
function authorize(intent) { const options = auth.beginVerification(origin, 'authenticate', intent); return auth.completeVerification(origin, options.id, assertion(options)).proof; }
let serial = 0;
function quote(amount = 500) { return transactions.signQuote({ kind: 'TRANSFER', agentId: read().activeAgent.id, title: 'Test transfer', recipient: 'alex@upi', amountMinor: amount * 100, quantity: 1, currency: 'INR' }, `test-owner-command-${++serial}`, 'test', 0); }
(async () => {
    try {
        fresh();
        assert.equal(auth.ownerStatus(origin).registered, false);
        assert.throws(() => auth.beginVerification(origin, 'register', undefined, 'wrong'), /password/);
        assert.throws(() => auth.beginVerification('http://example.com', 'register', undefined, password), /HTTPS/);
        const denied = await ownerRoute.POST(ownerRequest({ action: 'begin', kind: 'register', ownerPassword: password }, 'https://attacker.example'));
        assert.equal(denied.status, 403);
        const setup = await ownerRoute.POST(ownerRequest({ action: 'begin', kind: 'register', ownerPassword: password }));
        assert.equal(setup.status, 200); assert.equal(setup.body.publicKey.authenticatorSelection.userVerification, 'required');
        const response = registration(setup.body);
        assert.throws(() => auth.completeVerification(origin, setup.body.id, response), /password/, 'A leaked registration challenge cannot enroll an owner');
        assert.equal((await walletRoute.GET()).body.state.ownerSecurity, undefined, 'Pending registration metadata stays server-side');
        assert.equal(auth.completeVerification(origin, setup.body.id, response, password).registered, true);
        assert.throws(() => auth.completeVerification(origin, setup.body.id, response), /expired|already/);
        assert.throws(() => auth.beginVerification(origin, 'register', undefined, password), /already/);
        assert.equal(auth.ownerStatus(origin).registered, true);
        assert.equal(auth.ownerStatus('http://127.0.0.1:3000').originMatches, false);
        assert.throws(() => auth.beginVerification('http://127.0.0.1:3000', 'authenticate', {}), /hostname/);
        const policy = { kind: 'policy_update', agentId: read().activeAgent.id, dailyBudget: 2000, maxPerTx: 500, sessionExpiryHours: 6 };
        for (const [edits, pattern] of [
            [{ flags: 1 }, /verification/], [{ flags: 4 }, /verification/],
            [{ rpId: 'attacker.example' }, /verification/],
            [{ client: { origin: 'https://attacker.example' } }, /origin/],
            [{ client: { crossOrigin: true } }, /origin/],
            [{ client: { challenge: 'wrong' } }, /challenge/],
            [{ client: { type: 'webauthn.create' } }, /challenge/]
        ]) {
            const options = auth.beginVerification(origin, 'authenticate', policy);
            assert.equal(options.publicKey.userVerification, 'required');
            assert.throws(() => auth.completeVerification(origin, options.id, assertion(options, edits)), pattern);
        }
        let options = auth.beginVerification(origin, 'authenticate', policy);
        let signed = assertion(options); signed.response.signature = b64(crypto.randomBytes(72));
        assert.throws(() => auth.completeVerification(origin, options.id, signed), /signature/);
        signed = assertion(options); signed.id = signed.rawId = b64(crypto.randomBytes(32));
        assert.throws(() => auth.completeVerification(origin, options.id, signed), /registered/);
        signed = assertion(options); signed.response.userHandle = b64(crypto.randomBytes(32));
        assert.throws(() => auth.completeVerification(origin, options.id, signed), /user/);
        options = auth.beginVerification(origin, 'authenticate', policy); signed = assertion(options);
        now += 120001;
        assert.throws(() => auth.completeVerification(origin, options.id, signed), /expired/);
        const before = read();
        assert.equal((await post('update_policy', policy)).body.success, false);
        assert.deepEqual(read(), before, 'Policy save without proof must not mutate state');
        const proof = authorize(policy);
        assert.equal((await post('update_policy', { ...policy, maxPerTx: 600, ownerProof: proof })).body.success, false);
        const saved = await post('update_policy', { ...policy, ownerProof: proof });
        assert.equal(saved.body.success, true); assert.equal(saved.body.state.ownerSecurity, undefined); assert.equal(read().policy.dailyBudget, 2000);
        assert.equal(read().dailySpent, 20); assert.equal(read().balances.usdc, 10000); assert.equal(read().virtualCard.spentToday, 20);
        assert.equal((await post('update_policy', { ...policy, ownerProof: proof })).body.success, false, 'Proof is one-use');
        const expiredProof = authorize(policy); now += 60001;
        assert.equal((await post('update_policy', { ...policy, ownerProof: expiredProof })).body.success, false);
        const card = { kind: 'card_limit', agentId: policy.agentId, limit: 3000 };
        assert.equal((await post('update_card_limit', card)).body.success, false);
        assert.equal((await post('update_card_limit', { ...card, ownerProof: authorize(card) })).body.success, true);
        assert.equal(read().policy.dailyBudget, 3000); assert.equal(read().virtualCard.spentToday, 20);
        options = auth.beginVerification(origin, 'authenticate', policy); signed = assertion(options);
        auth.completeVerification(origin, options.id, signed);
        assert.throws(() => auth.completeVerification(origin, options.id, signed), /already used/);
        options = auth.beginVerification(origin, 'authenticate', policy);
        assert.throws(() => auth.completeVerification(origin, options.id, assertion(options, { counter: read().ownerSecurity.credential.counter })), /counter/);
        // Real signatures authorize only the reviewed quote and never relax standing limits.
        fresh(); enroll();
        const q = quote();
        const blocked = await transactionRoute.POST({ json: async () => ({ token: q.token }) });
        assert.equal(blocked.status, 409); assert.equal(blocked.body.code, 'OWNER_APPROVAL_REQUIRED');
        assert.equal(blocked.body.review.amount, 500); assert.equal(read().balances.usdc, 10000);
        const intent = { kind: 'transaction_override', token: q.token };
        const txProof = authorize(intent);
        assert.throws(() => transactions.executeSimulation(quote(600).token, txProof), /different action/);
        const receipt = transactions.executeSimulation(q.token, txProof);
        assert.equal(receipt.ownerOverride, true); assert.equal(receipt.balanceAfter, 9500);
        assert.equal(read().policy.maxPerTx, 100); assert.equal(read().policy.dailyBudget, 1000);
        assert.equal(read().dailySpent, 520); assert.equal(read().userOps[0].validationResult, 'OUT_OF_POLICY');
        assert.equal(transactions.executeSimulation(q.token, txProof).id, receipt.id);
        assert.equal(read().balances.usdc, 9500, 'Retry cannot double debit');
        // Exhausted daily budget is independently overridable; this is not a blanket exemption.
        const daily = quote(50); change(s => { s.fleet.find(a => a.id === s.activeAgent.id).dailyBudget = 10; });
        assert.throws(() => transactions.executeSimulation(daily.token), /daily budget/);
        transactions.executeSimulation(daily.token, authorize({ kind: 'transaction_override', token: daily.token }));
        assert.equal(read().balances.usdc, 9450); assert.equal(read().fleet.find(a => a.id === read().activeAgent.id).dailyBudget, 10);
        for (const [mutate, pattern] of [
            [s => { s.balances.usdc = 1; }, /Insufficient/],
            [s => { s.virtualCard.isFrozen = true; }, /frozen/],
            [s => { s.activeAgent.sessionActive = false; }, /session/],
            [s => { s.activeAgent.sessionExpiresAt = now - 1; }, /session/],
            [s => { s.fleet.find(a => a.id === s.activeAgent.id).status = 'paused'; }, /paused/],
            [s => { s.activeAgent.id = 'different'; }, /session/]
        ]) {
            fresh(); enroll(); const q = quote(); const p = authorize({ kind: 'transaction_override', token: q.token });
            change(mutate); const before = read();
            assert.throws(() => transactions.executeSimulation(q.token, p), pattern); assert.deepEqual(read(), before);
        }
        fresh(); enroll(); const tamper = quote(); const tp = authorize({ kind: 'transaction_override', token: tamper.token });
        assert.throws(() => transactions.executeSimulation(tamper.token + 'x', tp), /signature/);
        now += 300001; assert.throws(() => transactions.executeSimulation(tamper.token, tp), /expired/);
        // The pre-existing approval queue uses the same one-time device verification.
        fresh(); enroll();
        change(s => s.queuedApprovals.push({ id: 'queued-owner-test', status: 'PENDING', amount: 400, agent: s.fleet.find(a => a.id === s.activeAgent.id).name, targetName: 'Test merchant', targetAddress: 'merchant', actionName: 'test()', reason: 'Above cap' }));
        assert.equal((await post('approve_queued', { id: 'queued-owner-test' })).body.success, false);
        assert.equal(read().balances.usdc, 10000);
        const queued = read().queuedApprovals[0];
        const qp = authorize({ kind: 'queued_approval', id: queued.id, amount: queued.amount, recipient: queued.targetAddress, agent: queued.agent, action: queued.actionName });
        change(s => { s.queuedApprovals[0].amount = 450; });
        assert.equal((await post('approve_queued', { id: queued.id, ownerProof: qp })).body.success, false, 'Queue approval is bound to reviewed amount');
        change(s => { s.queuedApprovals[0].amount = 400; });
        assert.equal((await post('approve_queued', { id: 'queued-owner-test', ownerProof: qp })).body.success, true);
        assert.equal(read().balances.usdc, 9600); assert.equal(read().queuedApprovals.length, 0);
        assert.equal((await post('approve_queued', { id: 'queued-owner-test', ownerProof: qp })).body.success, false);
        console.log('Owner verification tests passed: enrollment password, RP/origin/challenge/signature/UV checks, expiry/replay, intent-bound policy/card saves, one-time copilot and queue overrides, unchanged limits, atomic debit and hard guardrails.');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
