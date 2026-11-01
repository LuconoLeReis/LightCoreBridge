// One real delayed child request -> real completion observer. Disposable profile.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'../src/reliability/sheet-load-diagnostics.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();let held;
  await page.route('https://load.test/**',route=>{
   if(new URL(route.request().url()).pathname==='/slow') {held=route;return;}
   return route.fulfill({contentType:'text/html',body:'<h1>Ready native content</h1><iframe src="/slow?token=never-record-this"></iframe>'});
  });
  await page.goto('https://load.test/page',{waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>document.readyState),'interactive');
  await page.evaluate(()=>{
   window.records=[];window.chrome={runtime:{id:'fixture'}};
   window.lateStatusCallbacks=0;
   window.wayBeyond20DebugLog=(scope,event,details,_enabled,cb)=>{
    records.push({scope,event,details});
    if(cb){lateStatusCallbacks++;cb({loading:{status:'complete',pendingScheme:null}});}
   };
   window.deadlines=[];window.cancelled=[];
   window.realSetTimeout=setTimeout;window.realClearTimeout=clearTimeout;
   window.setTimeout=(fn,ms)=>{if(ms===1800000){const token={fn,ms};deadlines.push(token);return token;}return realSetTimeout(fn,ms);};
   window.clearTimeout=id=>deadlines.includes(id)?cancelled.push(id):realClearTimeout(id);
  });
  await page.addScriptTag({content:code+'\nwb20WatchSheetLoadCompletion();wb20WatchSheetLoadCompletion();'});
  assert.equal(await page.evaluate(()=>deadlines.length),1,'idempotent, one finite watchdog');
  assert.equal(await page.evaluate(()=>records.length),0,'no completion claim while child request is pending');
  await held.fulfill({contentType:'text/html',body:'Finished child'});
  await page.waitForFunction(()=>records.length===1);
  const record=await page.evaluate(()=>records[0]);
  assert.equal(record.details.reason,'load');assert.equal(record.details.documentReady,'complete');
  assert.ok(record.details.loadEventEnd>0);
  assert.ok(record.details.slowResources.some(r=>r.origin==='https://load.test'&&r.type==='iframe'));
  assert.ok(record.details.frameLoads.some(r=>r.origin==='https://load.test'&&r.loadedAtMs>0));
  assert.ok(!JSON.stringify(record).includes('never-record-this'));
  assert.ok(!JSON.stringify(record).includes('/slow'),'no paths or query strings logged');
  await page.evaluate(()=>{window.dispatchEvent(new Event('load'));});
  assert.equal(await page.evaluate(()=>records.length),1,'late load/deadline cannot duplicate completion');
  assert.equal(await page.evaluate(()=>cancelled.length),0,'late-frame listener remains bounded by the original watchdog');
  await page.evaluate(()=>{
   const realNow=performance.now.bind(performance);
   Object.defineProperty(performance,'now',{configurable:true,value:()=>realNow()+20000});
   const form=document.createElement('form');form.action='https://late.test/secret-path?token=never-record-this';
   const frame=document.createElement('iframe');form.append(frame);document.body.append(form);
   for(let n=0;n<20;n++)frame.dispatchEvent(new Event('load'));
  });
  const late=await page.evaluate(()=>records.filter(r=>r.event==='Late frame load'));
  assert.equal(late.length,8,'post-load frame reports stop at the explicit cap');
  assert.equal(await page.evaluate(()=>lateStatusCallbacks),8,'each bounded frame report reads its fresh worker loading reply');
  assert.ok(late.every(r=>r.details.formTargetOrigin==='https://late.test'));
  assert.ok(!JSON.stringify(late).includes('secret-path')&&!JSON.stringify(late).includes('never-record-this'));
  assert.equal(await page.evaluate(()=>window.__wb20SheetLoadCompletion.finished),true);
  await page.evaluate(()=>{deadlines[0].fn();window.records=[];});
  assert.equal(await page.evaluate(()=>cancelled.length),2,'cap and deliberately repeated watchdog cleanup are harmless');
  await page.evaluate(()=>{delete window.__wb20SheetLoadCompletion;wb20WatchSheetLoadCompletion();});
  await page.waitForFunction(()=>records.length===1);
  assert.equal(await page.evaluate(()=>records.at(-1).details.reason),'already-complete');
  await page.evaluate(()=>{
   window.dispatchEvent(new Event('pagehide'));
   delete window.__wb20SheetLoadCompletion;wb20WatchSheetLoadCompletion();
   window.dispatchEvent(new Event('pagehide'));deadlines.at(-1).fn();
  });
  await page.waitForTimeout(20);
  assert.equal(await page.evaluate(()=>records.length),1,'pagehide removes the deferred callback and watchdog');
  // Pending-page expiry has a finite one-record outcome too.
  const pending=await browser.newPage();let never;
  await pending.route('https://pending.test/**',route=>{
   if(new URL(route.request().url()).pathname==='/slow'){never=route;return;}
   return route.fulfill({contentType:'text/html',body:'<iframe src="/slow"></iframe>'});
  });
  await pending.goto('https://pending.test/',{waitUntil:'domcontentloaded'});
  await pending.evaluate(()=>{
   window.records=[];window.chrome={runtime:{id:'fixture'}};
   window.wayBeyond20DebugLog=(_scope,_event,d)=>records.push(d);
   window.realSetTimeout=setTimeout;
   window.setTimeout=(fn,ms)=>ms===1800000?(window.expire=fn):realSetTimeout(fn,ms);
  });
  await pending.addScriptTag({content:code+'\nwb20WatchSheetLoadCompletion();expire();expire();'});
  assert.deepEqual(await pending.evaluate(()=>records.map(r=>r.reason)),['deadline']);
  await never.fulfill({body:'Late child'});await pending.waitForLoadState('load');
  assert.equal(await pending.evaluate(()=>records.length),1,'completion after deadline remains a no-op');
  assert.equal(await pending.evaluate(()=>window.__wb20SheetLoadCompletion.frameLoads.length),0,'deadline removes frame listeners too');
  console.log('PASS actual slow child load, completion timing and resource origins, no URL secrets, idempotence, late callback, already-complete, pagehide and finite deadline, post-load frame origin and eight-report cap. No live account.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
