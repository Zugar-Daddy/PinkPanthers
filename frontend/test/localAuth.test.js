const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(relativePath, env) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const module = { exports: {} };
    class Response {
        constructor(body, options = {}) { this.body = body; this.status = options.status || 200; this.headers = new Map(Object.entries(options.headers || {})); }
        static next() { return new Response(null); }
    }
    vm.runInNewContext(compiled.outputText, {
        module, exports: module.exports, Buffer, process: { env },
        atob: value => Buffer.from(value, 'base64').toString('utf8'),
        require(name) {
            if (name === 'next/server') return { NextResponse: Response };
            if (name === './walletStore') return {};
            if (name.startsWith('.')) return load(path.join(path.dirname(relativePath), name + '.ts'), env);
            return require(name);
        }
    }, { filename: relativePath });
    return module.exports;
}
function request(hostname, method = 'GET', headers = {}, protocol = 'http:') {
    return {
        nextUrl: { hostname, protocol, origin: `${protocol}//${hostname}:3000` },
        method,
        headers: { get: name => headers[name.toLowerCase()] || null }
    };
}
const dev = load('src/middleware.ts', { NODE_ENV: 'development' }).middleware;
assert.equal(dev(request('localhost')).status, 200, 'local dev should open without credentials');
assert.equal(dev(request('127.0.0.1')).status, 200, 'loopback dev should open without credentials');
assert.equal(dev(request('localhost', 'POST', { origin: 'http://localhost:3000' })).status, 200, 'same-origin dev API should work');
assert.equal(dev(request('localhost', 'POST', { origin: 'https://example.com' })).status, 403, 'cross-origin dev writes remain blocked');
assert.equal(dev(request('192.168.1.20')).status, 403, 'non-loopback plain HTTP remains blocked');
const password = 'production-token-with-at-least-thirty-two-characters';
const prod = load('src/middleware.ts', { NODE_ENV: 'production', WALLET_ADMIN_TOKEN: password }).middleware;
assert.equal(prod(request('localhost')).status, 401, 'production remains protected on localhost');
assert.equal(prod(request('localhost', 'GET', { authorization: 'Basic ' + Buffer.from('owner:wrong').toString('base64') })).status, 401);
assert.equal(prod(request('localhost', 'GET', { authorization: 'Basic ' + Buffer.from('owner:' + password).toString('base64') })).status, 200);
assert.equal(load('src/middleware.ts', { NODE_ENV: 'production' }).middleware(request('localhost')).status, 401, 'production stays locked without a token');

const transactionsDev = load('src/lib/state/copilotTransactions.ts', { NODE_ENV: 'development' });
const draft = { kind: 'TRANSFER', agentId: 'finance-07', title: 'Test', recipient: 'alex@upi', amountMinor: 100, quantity: 1, currency: 'INR' };
const quote = transactionsDev.signQuote(draft, 'command-local-auth-0001', 'send ₹1 to alex@upi', 0);
assert.match(quote.token, /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
assert.throws(() => load('src/lib/state/copilotTransactions.ts', { NODE_ENV: 'production' }).signQuote(draft, 'command-local-auth-0001', 'send ₹1 to alex@upi', 0), /must be configured/);
console.log('Local auth and production lock checks passed');
