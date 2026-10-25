const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const ts = require('typescript');
const runFile = require('node:util').promisify(require('node:child_process').execFile);
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeagent-billing-'));
const working = path.join(tmp, 'frontend'); fs.mkdirSync(working); fs.mkdirSync(path.join(tmp, 'data'));
const dataFile = path.join(tmp, 'data/wallet-state.json');
function load(file, cache = new Map()) {
    file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true} });
    assert.equal(code.diagnostics.length,0);
    vm.runInNewContext(code.outputText, { module,exports:module.exports,Buffer,Date,Atomics,Int32Array,SharedArrayBuffer,
        process:{pid:process.pid,cwd:()=>working},
        require(name){
            if(name.startsWith('.')) return load(path.resolve(path.dirname(file),name+'.ts'),cache);
            if(name==='next/server') return {NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})}};
            return require(name);
        }
    });return module.exports;
}
const read=()=>JSON.parse(fs.readFileSync(dataFile,'utf8'));
const initial=JSON.parse(fs.readFileSync(path.join(root,'../data/wallet-state.example.json'),'utf8'));
const fresh=()=>{const state=structuredClone(initial);delete state.billing;state.balances.paymasterGasTankINR=4850;fs.writeFileSync(dataFile,JSON.stringify(state));return state;};
const store=load(path.join(root,'src/lib/state/billingStore.ts'));
const plans=load(path.join(root,'src/lib/billing/plans.ts'));
const route=load(path.join(root,'src/app/api/billing/route.ts'));
const request=body=>({json:async()=>body});
(async()=>{
    try {
        const before=fresh(); const raw=fs.readFileSync(dataFile,'utf8');
        assert.equal((await route.GET()).body.billing.plan,'starter');
        assert.equal(fs.readFileSync(dataFile,'utf8'),raw,'Reading plans must not write wallet state');
        const growth=plans.economics('growth','monthly');
        assert.equal(growth.platform,12400);assert.equal(growth.gas,7000);assert.equal(growth.gateway,599);assert.equal(growth.price,19999);
        for(const plan of ['starter','growth']) for(const cycle of ['monthly','annual']) {
            const e=plans.economics(plan,cycle);assert.equal(e.platform+e.gas+e.gateway,e.price);assert.ok(e.platform>0);
            if(cycle==='annual'){assert.equal(e.gas,plans.PLANS[plan].gas*12);assert.equal(e.savings,plans.PLANS[plan].monthly*2);}
        }
        assert.equal(plans.estimatedActions(1000),15000);assert.equal(plans.estimatedActions(5000),75000);assert.equal(plans.estimatedActions(10000),150000);
        assert.equal(plans.gasMode(14.99),'normal');assert.equal(plans.gasMode(15),'elevated');assert.equal(plans.gasMode(50),'elevated');assert.equal(plans.gasMode(50.01),'congested');
        assert.equal(JSON.stringify(plans.waterfall(10000)),JSON.stringify([8250,1150,380,220]));
        assert.equal(plans.waterfall(12345).reduce((a,b)=>Math.round((a+b)*100)/100,0),12345);
        for(const plan of ['starter','growth','enterprise']) {
            const result=await route.POST(request({action:'select_plan',plan,cycle:'monthly'}));
            assert.equal(result.status,200);assert.equal(result.body.billing.plan,plan);
        }
        assert.equal(read().billing.cycle,'annual');
        const selected=read();delete selected.billing;assert.deepEqual(selected,before,'Plan previews must not alter funds, gas credits or fleet limits');
        assert.equal((await route.POST(request({action:'select_plan',plan:'invalid',cycle:'monthly'}))).status,400);
        const receipt=store.refillGasTank(1000,'refill-test-00000001');
        assert.equal(receipt.balanceAfter,5850);assert.equal(receipt.surcharge,0);
        assert.equal(read().balances.usdc,before.balances.usdc,'A simulated external UPI refill does not debit treasury');
        assert.deepEqual(read().fleet,before.fleet);assert.deepEqual(read().activeAgent,before.activeAgent);assert.deepEqual(read().userOps,before.userOps);
        assert.equal(read().inboxMessages.length,before.inboxMessages.length+1);
        store.refillGasTank(1000,'refill-test-00000001');assert.equal(read().balances.paymasterGasTankINR,5850);
        const restarted=load(path.join(root,'src/lib/state/billingStore.ts'));restarted.refillGasTank(1000,'refill-test-00000001');assert.equal(read().balances.paymasterGasTankINR,5850);
        assert.throws(()=>store.refillGasTank(5000,'refill-test-00000001'),/different amount/);
        for(const amount of [0,-1000,1,1000.01,NaN,Infinity,'1000']) assert.throws(()=>store.refillGasTank(amount,'refill-test-invalid1'));
        assert.throws(()=>store.refillGasTank(1000,'bad'));
        const response=await route.POST(request({action:'refill',amount:5000,requestId:'refill-test-00000002'}));
        assert.equal(response.body.state.balances.paymasterGasTankINR,10850);
        assert.equal(response.headers['Cache-Control'],'no-store');
        const library=path.join(tmp,'lib');fs.mkdirSync(path.join(library,'state'),{recursive:true});fs.mkdirSync(path.join(library,'billing'));fs.mkdirSync(path.join(library,'auth'));
        for(const name of ['state/billingStore','state/walletStore','billing/plans','auth/ownerApproval']) {
            const code=ts.transpileModule(fs.readFileSync(path.join(root,`src/lib/${name}.ts`),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
            fs.writeFileSync(path.join(library,`${name}.js`),code);
        }
        const program=`require(${JSON.stringify(path.join(library,'state/billingStore.js'))}).refillGasTank(Number(process.argv[1]),process.argv[2])`;
        await Promise.all([[10000,'concurrent-refill-0001'],[10000,'concurrent-refill-0001'],[1000,'concurrent-refill-0002']].map(([amount,id])=>runFile(process.execPath,['-e',program,String(amount),id],{cwd:working})));
        assert.equal(read().balances.paymasterGasTankINR,21850,'Concurrent refills add each unique amount exactly once');
        assert.equal(read().billing.refills.length,4);
        console.log('Billing tests passed: exact plan economics, annual credits, gas thresholds, waterfall, persistent selection, atomic refills, restart/concurrent idempotency, validation and isolation from treasury/agents.');
    } finally {fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
