// Real sheet opener -> real cold worker -> real popup. Disposable browser only.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),origin='https://settings.test';
const boot=`<script>
window.writes=0;window.sent=[];
const saved={settings:{'migrated-sync-settings':true,'talespire-url':'retained-link'}};
const source={id:7,url:'https://www.dndbeyond.com/characters/123',title:'Original character'};
window.chrome={runtime:{id:'fixture',getURL:p=>location.origin+'/'+p,getManifest:()=>({version:'test'}),openOptionsPage:()=>{window.optionsOpened=true;},
 sendMessage:(m,cb)=>{sent.push(m);if(m.action==='wb20-open-settings-tab')window.workerMessage(m).then(cb);else cb?.({});}},
 tabs:{get:(id,cb)=>{if(id===7)cb(source);else {chrome.runtime.lastError={message:'closed'};cb();delete chrome.runtime.lastError;}},
 query:(q,cb)=>cb([{id:88,title:'Different active sheet',url:'https://www.dndbeyond.com/characters/999'}]),
 sendMessage:(id,m,options,cb)=>{sent.push({id,...m});cb?.({id:123,name:'Original character',classes:{Bard:3},settings:{},'racial-traits':[],'class-features':[],'feats':[]});}},
 storage:{local:{get:(q,cb)=>cb({...q,...saved}),set:(q,cb)=>{writes++;Object.assign(saved,q);cb?.();}}}};
</script>`;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const context=await browser.newContext(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.stack);}));
  await context.route(origin+'/**',route=>{
   const n=new URL(route.request().url()).pathname.slice(1);
   if(n==='sheet')return route.fulfill({contentType:'text/html',body:`<body style="background:rgb(35,36,38);color:rgb(240,241,242)"><button onclick="alertQuickSettings()">WB20</button>${boot}<script src="/src/common/utils.js"></script></body>`});
   const p=path.join(root,n.startsWith('src/')?n:'build/chrome/'+n);
   if(!fs.existsSync(p))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(p);if(n.endsWith('.html'))body=body.toString().replace('<head>','<head>'+boot);
   return route.fulfill({contentType:n.endsWith('.html')?'text/html':n.endsWith('.js')?'application/javascript':n.endsWith('.css')?'text/css':'application/octet-stream',body});
  });
  const event=()=>({addListener(){}});let listener;
  const chrome={runtime:{id:'fixture',getManifest:()=>({manifest_version:3,version:'test',content_scripts:[]}),getURL:p=>origin+'/'+p,onMessage:{addListener:f=>listener=f}},
   action:{setPopup(){},onClicked:event()},tabs:{query:(q,cb)=>cb([]),onUpdated:event(),onRemoved:event(),
    create:(details,cb)=>{context.newPage().then(async p=>{await p.goto(details.url);cb({id:100});});}},
   permissions:{getAll:cb=>cb({origins:[]}),onAdded:event(),onRemoved:event()},
   storage:{local:{get(){},set(){}}}}; // Startup storage intentionally never resolves.
  const worker=vm.createContext({chrome,URL,setTimeout,clearTimeout,setInterval:()=>0,navigator:{userAgent:'Chrome'},window:{},console:{log(){},debug(){},warn(){}}});worker.self=worker;
  vm.runInContext(fs.readFileSync(path.join(root,'build/chrome/dist/background.js'),'utf8'),worker);
  await context.exposeFunction('workerMessage',message=>new Promise(resolve=>assert.equal(listener(message,{id:'fixture',tab:{id:7}},resolve),true)));
  let rejected;listener({action:'wb20-open-settings-tab',page:'https://other.test'}, {id:'fixture'}, r=>rejected=r);assert.equal(rejected.ok,false);
  listener({action:'wb20-open-settings-tab',page:'popup.html'},{id:'foreign'},r=>rejected=r);assert.equal(rejected.ok,false);
  const sheet=await context.newPage();await sheet.goto(origin+'/sheet');
  for(let i=0;i<2;i++){
   const opened=context.waitForEvent('page');await sheet.getByRole('button',{name:'WB20',exact:true}).click();const p=await opened;
   await p.getByRole('searchbox',{name:'Find a setting'}).waitFor();await p.getByText('Original character',{exact:true}).waitFor({state:'attached'});
   assert.equal(new URL(p.url()).searchParams.get('sourceTab'),'7');
   assert.equal(await sheet.locator('iframe,.ajs-modal').count(),0,'no embedded settings or overlay');
   assert.equal(await p.evaluate(()=>writes),0,'opening changes no settings');
   assert.equal(await p.evaluate(()=>getComputedStyle(document.body).color),'rgb(240, 241, 242)');
   assert.equal(await p.evaluate(()=>sent.find(m=>m.action==='get-character')?.id),7,'source preserved despite other active sheet');
   await p.getByText('More Options',{exact:true}).click();await p.waitForURL('**/options.html*');
   await p.getByRole('searchbox',{name:'Find a setting'}).waitFor();
   assert.equal(await p.evaluate(()=>writes),0);assert.equal(sheet.isClosed(),false);await p.close();
  }
  for(const source of ['404','invalid']){
   const p=await context.newPage();await p.goto(origin+'/popup.html?sourceTab='+source);
   await p.getByRole('searchbox',{name:'Find a setting'}).waitFor();
   assert.equal(await p.evaluate(()=>sent.some(m=>m.action==='get-character')),false,'missing source never switches to another character');
   assert.equal(await p.evaluate(()=>writes),0);await p.close();
  }
  const toolbar=await context.newPage();await toolbar.goto(origin+'/popup.html');
  await toolbar.getByText('More Options',{exact:true}).click();
  assert.equal(await toolbar.evaluate(()=>window.optionsOpened),true,'toolbar opens full options via browser API');
  assert.equal(new URL(toolbar.url()).pathname,'/popup.html','full settings do not replace the small toolbar popup');
  await toolbar.close();
  const pagesBefore=context.pages().length;
  for(const state of ['missing-chrome','missing-runtime','missing-send','invalidated-runtime']){
   await sheet.evaluate(state=>{
    if(state==='missing-chrome')delete window.chrome;
    else if(state==='missing-runtime')window.chrome={};
    else if(state==='missing-send')window.chrome={runtime:{}};
    else window.chrome={runtime:{sendMessage(){throw Error('Extension context invalidated.');}}};
   },state);
   await sheet.getByRole('button',{name:'WB20',exact:true}).click();
   assert.equal(context.pages().length,pagesBefore,'unavailable runtime opens no overlay or duplicate page');
   assert.equal(await sheet.locator('iframe,.ajs-modal').count(),0);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS separate settings tabs: opener/cold worker/popup, source character, reopen, More Options, theme, closed source, no iframe/overlay and no writes. Isolated browser only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
