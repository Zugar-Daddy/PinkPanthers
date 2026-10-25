const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/app/api/costs/gas/route.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function route(fetch,endpoint='https://private-rpc.example',timeout=5000){
    const module={exports:{}};let now=Date.now();class Clock extends Date{static now(){return now;}}
    vm.runInNewContext(code,{module,exports:module.exports,fetch,URL,Date:Clock,AbortController,process:{env:{ETHEREUM_RPC_URL:endpoint}},setTimeout:(cb,ms)=>{assert.equal(ms,5000);return setTimeout(cb,timeout);},clearTimeout,require:()=>({NextResponse:{json:(body,options={})=>({body,status:options.status||200})}})});
    return {get:module.exports.GET,advance:ms=>now+=ms};
}
(async()=>{
    let calls=0;
    const success=route(async(_,options)=>{calls++;const req=JSON.parse(options.body);return{ok:true,json:async()=>({result:req.method==='eth_chainId'?'0x1':'0x2cb417800'})};});
    const first=await success.get();assert.equal(first.body.gwei,12);assert.equal(first.body.available,true);assert.equal(calls,2);
    await success.get();assert.equal(calls,2);success.advance(15001);await success.get();assert.equal(calls,4);
    let fallbackUrl; const fallback=route(async(url,options)=>{fallbackUrl=url;return{ok:true,json:async()=>({result:JSON.parse(options.body).method==='eth_chainId'?'0x1':'0x2cb417800'})};},'');assert.equal((await fallback.get()).body.available,true);assert.equal(fallbackUrl,'https://ethereum-rpc.publicnode.com');
    const wrongChain=route(async()=>({ok:true,json:async()=>({result:'0x89'})}));assert.equal((await wrongChain.get()).status,503);
    const malformed=route(async()=>({ok:true,json:async()=>({result:'not-a-gas-price'})}));assert.equal((await malformed.get()).body.available,false);
    const timeout=route((_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))),'https://private-rpc.example',5);
    const failed=await timeout.get();assert.equal(failed.status,503);assert.equal(failed.body.available,false);assert.ok(!JSON.stringify(failed).includes('private-rpc'));
    console.log('Gas feed tests passed: mainnet verification, Gwei conversion, cache expiry, public fallback, malformed response and bounded timeout without endpoint disclosure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
