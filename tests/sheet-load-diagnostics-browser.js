// Actual debug producer -> actual worker consumer. Disposable browser, no accounts.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const worker=require('./background-wake');
const root=path.resolve(__dirname,'..');
const diagnostics=fs.readFileSync(path.join(root,'src/reliability/sheet-load-diagnostics.js'),'utf8');
const common=fs.readFileSync(path.join(root,'src/common/settings.js'),'utf8');
const debug=common.slice(common.indexOf('function wayBeyond20DebugLog('),common.indexOf('\nfunction getStorage('));
const sender={id:'fixture',tab:{id:5,url:'https://www.dndbeyond.com/characters/1'}};
async function reply(w,entry={scope:'sheet-load'}) {
    return new Promise((resolve,reject)=>{
        w.context.onMessage({action:'waybeyond20-debug-log',entry},sender,resolve);
        w.flushStorage().catch(reject);
    });
}
const watchdog=setTimeout(()=>{throw Error('Diagnostic test did not complete');},20000);
(async()=>{
    const w=worker({id:0,vtt:'dndbeyond'});await w.releaseSettings();
    const requested=[];
    w.chrome.tabs.get=(id,cb)=>{requested.push(id);cb({status:'loading',pendingUrl:'talespire://symbiote/secret-connection/?token=secret'});};
    const result=await reply(w);
    assert.equal(result.loading.status,'loading');assert.equal(result.loading.pendingScheme,'talespire:');
    assert.deepEqual(requested,[5],'only sender tab is read');assert.ok(!JSON.stringify(result).includes('secret'));
    w.chrome.tabs.get=(_id,cb)=>{w.chrome.runtime.lastError={message:'closed'};cb();w.chrome.runtime.lastError=null;};
    assert.equal((await reply(w)).loading.status,'unavailable');
    w.chrome.tabs.get=()=>{throw Error('unavailable');};assert.equal((await reply(w)).loading.status,'unavailable');
    let late;
    w.chrome.tabs.get=(_id,cb)=>{late=cb;};const bounded=await reply(w);
    assert.equal(bounded.loading.status,'unavailable');late({status:'complete'});
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try {
        const page=await browser.newPage(),messages=[],logs=[];
        page.on('console',message=>{if(message.text().startsWith('WayBeyond20:'))logs.push(message.text());});
        w.chrome.tabs.get=(_id,cb)=>cb({status:'loading'});
        await page.exposeFunction('workerMessage',async message=>{
            messages.push(message);return reply(w,message.entry);
        });
        await page.setContent('<form action="https://analytics.invalid/tr?token=never-log-this"><iframe src="about:blank"></iframe></form><img src="https://asset.invalid/picture?token=never-log-this">');
        await page.evaluate(()=>{
            window.samples=[];window.activeTimers=new Set();window.debugSafe=value=>value;
            window.wayBeyond20DebugSafeValue=value=>value;
            window.chrome={runtime:{id:'fixture',sendMessage:(message,callback)=>workerMessage(message).then(callback)}};
            window.realTimeout=setTimeout;window.realClear=clearTimeout;
            window.setTimeout=(fn,ms)=>{if([2000,10000,30000].includes(ms)){const id={fn,ms};samples.push(id);activeTimers.add(id);return id;}return realTimeout(fn,ms);};
            window.clearTimeout=id=>activeTimers.has(id)?activeTimers.delete(id):realClear(id);
            window.disconnects=0;
            const NativeObserver=PerformanceObserver;
            window.PerformanceObserver=class extends NativeObserver{disconnect(){disconnects++;super.disconnect();}};
        });
        await page.addScriptTag({content:debug+'\n'+diagnostics+'\nwb20StartSheetLoadDiagnostics();wb20StartSheetLoadDiagnostics();'});
        assert.equal(await page.evaluate(()=>samples.length),3,'one startup instance, exactly three timers');
        await page.evaluate(()=>new Promise(resolve=>realTimeout(()=>{
            const start=performance.now();while(performance.now()-start<80){};resolve();
        },0)));
        await page.evaluate(()=>new Promise(resolve=>realTimeout(resolve,100)));
        for(let i=0;i<3;i++){
            await page.evaluate(i=>samples[i].fn(),i);
            for(let n=0;n<100&&logs.filter(x=>x.includes('browser loading diagnostic')).length<i+1;n++)await new Promise(r=>setTimeout(r,5));
        }
        assert.equal(messages.length,3);assert.equal(logs.filter(x=>x.includes('browser loading diagnostic')).length,3,'including final stopped sample reply');
        assert.ok(messages.some(x=>x.entry.details.longTasks>0),'actual long task is measured');
        assert.equal(messages[0].entry.details.frames[0].formTargetOrigin,'https://analytics.invalid');
        assert.equal(await page.evaluate(()=>activeTimers.size),0);assert.equal(await page.evaluate(()=>disconnects),1);
        assert.ok(!JSON.stringify(messages).includes('never-log-this'),'resource query strings are never captured');
        await page.evaluate(()=>{delete window.__wb20SheetLoadDiagnostics;window.PerformanceObserver=undefined;wb20StartSheetLoadDiagnostics();window.dispatchEvent(new Event('pagehide'));samples.slice(-3).forEach(x=>x.fn());});
        assert.equal(messages.length,3,'pagehide cancels samples, optional PerformanceObserver is safe');
        assert.equal(await page.evaluate(()=>activeTimers.size),0);
        console.log('PASS actual diagnostic producer/worker: three samples only, idempotent startup, real long-task capture, no resource secrets, sender-only Chrome loading status, final reply, closed/throwing/missing tab callback, timeout and pagehide cleanup.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
