const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(name,text){const start=text.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));assert.ok(start>=0,name);const end=text.slice(start+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return text.slice(start,end<0?undefined:start+1+end);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:850}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<body style="background:#252525;color:#eeeeee"><div class="ct-saving-throws-box" style="background:#252525;color:#eeeeee;border:1px solid #da7200;font:14px Arial"><span class="ct-signed-number">+4</span></div><section id="defense-panel" style="height:80px;overflow:hidden;display:flex;width:340px;border:2px solid #da7200;padding:10px"><div id="defense-group" style="width:50%"><div id="defense-heading">DEFENSES</div><div class="ct-defenses-summary" style="line-height:20px">Resistances, Immunities, or Vulnerabilities</div></div><div style="width:50%"><div id="conditions-heading">CONDITIONS</div>Add Active Conditions</div></section></body>');
 await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.addScriptTag({content:fn('wayBeyond20ApplySheetTheme',read('src/dndbeyond/content-scripts/portent.js'))});
 await page.evaluate(()=>{
  window.dndbeyondDiceRoller={_settings:{}};window.WhisperType={YES:1};window.modals=0;window.domSends=0;window.runtimeSends=0;window.chrome={runtime:{getURL:p=>'chrome-extension://fixture/'+p}};window.DigitalDiceManager={clearResults(){}};
  window.alertify={Beyond20Roll:(title,html)=>{modals++;const dialog=document.createElement('div');dialog.className='ajs-dialog';const content=document.createElement('div');content.innerHTML=html;dialog.append(content);document.body.append(dialog);return{set(){},destroy(){dialog.remove();},elements:{content}};}};
  window.sendRollRequestToDOM=()=>{domSends++;};window.outcome={ok:true,response:{success:true,delivered:true,vtt:['roll20']}};window.wayBeyond20SendRuntimeMessage=async()=>{runtimeSends++;return outcome;};window.wayBeyond20RollDeliveries=new WeakMap();
 });
 await page.addScriptTag({content:read('src/dndbeyond/base/dice.js').split('class DNDBRoller {')[0]+'\nwindow.testDisplayer=new DNDBDisplayer();'});
 await page.evaluate(async()=>{
  window.showRoll=request=>testDisplayer.sendMessage(request,'Everflame','<div class="beyond20-message"><header class="beyond20-header">Everflame</header><div class="beyond20-roll-total">23</div></div>','Test Paladin',0,false,'',{},'',[],[],[],{},false);
  await showRoll({type:'attack'});
 });
 assert.equal(await page.evaluate(()=>modals),0,'delivered attack never opens an information modal');assert.equal(await page.locator('#wb20-local-rolls').isVisible(),false,'confirmed VTT delivery suppresses duplicate local display');assert.equal(await page.locator('#wb20-local-rolls').getAttribute('open'),null);assert.equal(await page.locator('.wb20-local-roll-card').count(),0,'confirmed delivery discards its hidden local record');assert.equal(await page.evaluate(()=>runtimeSends),1);
 await page.evaluate(async()=>{window.completedBeforeSend=false;const request={type:'attack'},delivery={resolve:()=>{completedBeforeSend=!!document.querySelector('.wb20-local-roll-card');}};wayBeyond20RollDeliveries.set(request,delivery);await showRoll(request);});assert.equal(await page.evaluate(()=>completedBeforeSend),true,'local completed record exists before optional transmission');
 // A hung bridge may postpone fallback visibility, never internal completion.
 await page.evaluate(()=>{
  window.completedPending=false;window.oldSend=wayBeyond20SendRuntimeMessage;
  window.wayBeyond20SendRuntimeMessage=()=>new Promise(resolve=>{window.releaseDelivery=resolve;});
  const request={type:'attack'};wayBeyond20RollDeliveries.set(request,{resolve:()=>{completedPending=true;}});
  window.pendingDisplay=showRoll(request);
 });
 assert.equal(await page.evaluate(()=>completedPending),true);
 assert.equal(await page.locator('#wb20-local-rolls').isVisible(),false,'no local flash while delivery is pending');
 await page.evaluate(async()=>{releaseDelivery({ok:true,response:{success:true,delivered:true}});await pendingDisplay;wayBeyond20SendRuntimeMessage=oldSend;});
 assert.equal(await page.locator('.wb20-local-roll-card').count(),0);
 // Exercise the real finite runtime-message timeout, not a pre-resolved failure.
 await page.addScriptTag({content:fn('wayBeyond20ExtensionContextAvailable',read('src/dndbeyond/base/utils.js'))+'\n'+fn('wayBeyond20SendRuntimeMessage',read('src/dndbeyond/base/utils.js'))});
 await page.evaluate(()=>{chrome.runtime.id='fixture';chrome.runtime.sendMessage=()=>{};window.timeoutStart=performance.now();window.timeoutDone=false;const r={type:'attack'};wayBeyond20RollDeliveries.set(r,{resolve:()=>{timeoutDone=true;}});window.timeoutDisplay=showRoll(r);});
 assert.equal(await page.evaluate(()=>timeoutDone),true,'normal completion never awaits the message timeout');
 assert.equal(await page.locator('#wb20-local-rolls').isVisible(),false);
 await page.evaluate(()=>timeoutDisplay);
 assert.equal(await page.locator('#wb20-local-rolls').isVisible(),true,'hung worker exposes fallback at bounded timeout');
 assert.ok(await page.evaluate(()=>performance.now()-timeoutStart<4000));
 await page.evaluate(()=>{wayBeyond20SendRuntimeMessage=oldSend;document.getElementById('wb20-local-rolls').remove();});
 // A successful tab lookup without an acknowledgment must still fall back.
 await page.evaluate(async()=>{outcome={ok:true,response:{success:true}};await showRoll({type:'attack'});});
 assert.equal(await page.locator('.wb20-local-roll-card:not([hidden])').count(),1);
 await page.evaluate(()=>document.getElementById('wb20-local-rolls').remove());
 // Existing private/digital-dice suppression remains respected.
 await page.evaluate(async()=>{dndbeyondDiceRoller._settings={'use-digital-dice':true,'hide-results-with-digital-dice':true};outcome={ok:false};await showRoll({type:'attack'});});
 assert.equal(await page.locator('#wb20-local-rolls').isVisible(),false);
 await page.evaluate(async()=>{await showRoll({type:'attack','waybeyond20-digital-dice-fallback':true});});
 assert.equal(await page.locator('#wb20-local-rolls').isVisible(),true,'native fallback remains visible even when successful digital dice normally suppress the local card');
 await page.evaluate(()=>document.getElementById('wb20-local-rolls').remove());
 await page.evaluate(()=>{dndbeyondDiceRoller._settings={};});
 await page.evaluate(async()=>{outcome={ok:false,error:'receiving end missing'};await showRoll({type:'attack'});});assert.equal(await page.evaluate(()=>modals),0);assert.notEqual(await page.locator('#wb20-local-rolls').getAttribute('open'),null,'a local fallback opens its temporary nonmodal result');const local=page.locator('.wb20-local-roll-card:not([hidden])').first();assert.notEqual(await local.getAttribute('open'),null,'the latest local result is immediately readable');assert.match(await local.innerText(),/23/);
 const sends=await page.evaluate(()=>runtimeSends);await page.evaluate(async()=>showRoll({type:'attack','waybeyond20-local-only':true}));assert.equal(await page.evaluate(()=>runtimeSends),sends,'local only never transmits');
 await page.addStyleTag({content:'.beyond20-header summary a{color:#000}'});
 await page.evaluate(()=>testDisplayer.sendMessage({type:'trait','waybeyond20-local-only':true},'Everflame',
  '<div class="beyond20-message"><div class="beyond20-header"><details open><summary><a>Everflame</a></summary><p>Flames</p></details></div></div>',
  'Test Paladin',0,false,'',{},'',[],[],[],{},false));
 const traitTitle=page.locator('.wb20-local-roll-card:not([hidden]) .beyond20-header summary a');
 assert.equal(await traitTitle.evaluate(node=>getComputedStyle(node).color),'rgb(238, 238, 238)','expandable title uses readable sheet ink');
 await page.evaluate(async()=>{for(let n=0;n<24;n++)await showRoll({type:'attack','waybeyond20-local-only':true});});assert.equal(await page.locator('.wb20-local-roll-card').count(),20,'retention is bounded');
 await page.evaluate(()=>testDisplayer.postHTML({type:'item'},'Explicit details','<div class="beyond20-message"><div class="beyond20-roll-total">23</div></div>','Test Paladin',0,false,'',{},'',[],[],[],{},false));assert.equal(await page.evaluate(()=>modals),1,'an explicit information request still opens its dialog');assert.equal(await page.locator('.wb20-result-dialog').evaluate(n=>getComputedStyle(n).color),'rgb(238, 238, 238)');
 await page.addScriptTag({content:fn('wayBeyond20InjectBuffsBadge',read('src/dndbeyond/content-scripts/character.js'))});
 await page.evaluate(()=>{
  window.wayBeyond20FindVisibleTextElement=label=>$(label==='DEFENSES'?'#defense-heading':'#conditions-heading');window.wayBeyond20UpsertEffectBadge=()=>{};window.wayBeyond20EffectKey=e=>e.name;window.wayBeyond20GetTrackedSpellEffects=()=>[];
  wayBeyond20InjectBuffsBadge([{name:'Everflame — Flames'},{name:'Another longer active effect with wrapping'}]);
 });
 const geometry=await page.locator('#defense-panel').evaluate(n=>({height:n.clientHeight,scroll:n.scrollHeight,bottom:n.getBoundingClientRect().bottom,contentBottom:Math.max(...Array.from(n.querySelectorAll('.ct-defenses-summary,.waybeyond20-buff-name')).map(e=>e.getBoundingClientRect().bottom))}));assert.ok(geometry.contentBottom<=geometry.bottom,'native defenses and buffs must fit inside the frame: '+JSON.stringify(geometry));assert.ok(geometry.scroll<=geometry.height+1,'no clipped overflow');
 await page.locator('#wb20-local-rolls > summary').click();
 if(process.env.WB20_PRESENTATION_EVIDENCE)await page.screenshot({path:path.join(process.env.WB20_PRESENTATION_EVIDENCE,'local-result-and-buffs.png')});
 await page.evaluate(()=>wayBeyond20InjectBuffsBadge([]));assert.equal(await page.locator('.wb20-defenses-auto-height').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS automatic results have no modal on delivered/failed/local-only routes; local completion retained before sending, temporary fallback, bounded records, explicit themed details and expanding Defenses/Buffs. No live roll.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
