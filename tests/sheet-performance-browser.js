// Compose the actual observer scheduler, refresh function and profiler. A bad
// producer is intentionally non-idempotent: it must not starve tasks/input.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name){const start=source.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));assert.ok(start>=0,name);const end=source.slice(start+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return source.slice(start,end<0?undefined:start+1+end);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:900,height:800}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.setContent('<div id="native-hp">121</div><div id="writer"></div>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.evaluate(()=>{
  window.savedHp='';window.character={updateInfo(){savedHp=document.querySelector('#native-hp').textContent;}};
  window.isExtensionDisconnected=()=>false;window.injectRollToSpellAttack=()=>{};
  window.injectRollToSnippets=()=>{document.querySelector('#writer').textContent='same value';};
  for(const name of ['injectSettingsButton','wayBeyond20InjectCombatMenuAction','wayBeyond20ScheduleActiveEffectBadgeRefresh','injectCustomRollButton','wayBeyond20InjectBloodAndBoneAction','wayBeyond20InjectBardicInspirationButton','wayBeyond20InjectLayOnHandsControls','activateQuickRolls','wayBeyond20RefreshCombinedActions','wayBeyond20ActionListPets','wayBeyond20ActionListPetSelection','wayBeyond20ActionListPetToggles'])window[name]=()=>{};
  window.DigitalDiceManager={updateNotifications:()=>null};window.settings={};
  window.wayBeyond20DebugLog=(scope,event,details)=>{window.lastReport={scope,event,details};};
 });
 const monitor=source.slice(source.indexOf('const wb20SheetMonitor ='),source.indexOf('function documentModified('));
 assert.ok(monitor.includes('function wb20QueueSheetRefresh'),'observer scheduler must be present');
 await page.addScriptTag({content:monitor+fn('documentModified')});
 const stats=await page.evaluate(async()=>{
  let heartbeats=0;const task=setInterval(()=>heartbeats++,10);
  const observer=new MutationObserver(wb20QueueSheetRefresh);observer.observe(document,{subtree:true,childList:true,characterData:true});
  documentModified();
  for(let n=0;n<500;n++)document.querySelector('#native-hp').textContent=String(n);
  await new Promise(resolve=>setTimeout(resolve,550));
  document.querySelector('#native-hp').textContent='99';await new Promise(resolve=>setTimeout(resolve,180));
  observer.disconnect();clearInterval(task);clearTimeout(wb20SheetMonitor.timer);wb20SheetMonitor.timer=0;
  const snapshot=wb20SheetSnapshot();return{...snapshot,heartbeats,savedHp};
 });
 assert.ok(stats.runs>=2&&stats.runs<=12,'one pending yielded refresh, not a mutation microtask loop: '+JSON.stringify(stats));
 assert.ok(stats.heartbeats>=20,'normal tasks must keep executing');assert.equal(stats.savedHp,'99','latest native changes are not lost');
 assert.ok(stats.stages.find(s=>s.name==='snippet dice').writes>=stats.runs,'identify the actual producer writing unchanged DOM');
 await page.evaluate(()=>{const stage=wb20SheetMonitor.stages.get('snippet dice');stage.ms+=100;stage.maxMs=100;for(let n=0;n<20;n++){wb20SheetMonitor.lastReport=-100000;wb20SheetReport(true);}});
 assert.equal(await page.evaluate(()=>wb20SheetMonitor.reports),6,'diagnostic reports have a hard bound');
 assert.equal(await page.evaluate(()=>lastReport.scope),'sheet-performance');
 await page.addScriptTag({content:fn('wayBeyond20FindVisibleTextElement')});
 const scans=await page.evaluate(()=>{
  document.body.innerHTML='<div id="site"></div><div id="label">DEFENSES</div>';
  document.querySelector('#site').innerHTML='<span>Unrelated content</span>'.repeat(3000);
  window.visibilityReads=0;window.wayBeyond20ElementOwnText=n=>Array.from(n.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
  window.wayBeyond20IsVisibleElement=n=>{visibilityReads++;return !!n.getClientRects().length;};window.wayBeyond20IsInsideTransientPanel=()=>false;
  const first=wayBeyond20FindVisibleTextElement('DEFENSES')[0],firstReads=visibilityReads;
  for(let n=0;n<20;n++)wayBeyond20FindVisibleTextElement('DEFENSES');
  const cachedReads=visibilityReads-firstReads;first.remove();const replacement=document.createElement('div');replacement.textContent='DEFENSES';document.body.append(replacement);
  return{firstReads,cachedReads,replacementFound:wayBeyond20FindVisibleTextElement('DEFENSES')[0]===replacement};
 });
 assert.ok(scans.firstReads<=2,'unrelated elements must not trigger layout reads: '+JSON.stringify(scans));
 assert.equal(scans.cachedReads,20,'connected identity-matched label reused');assert.equal(scans.replacementFound,true,'React replacement invalidates cached node');
 // Match the observed native structure, including the INNER 57px clamp.
 await page.setContent('<body style="background:#252525;color:#eee;font:14px Arial"><section id="panel"><div class="ct-combat__statuses-group waybeyond20-defenses-with-buffs"><div class="waybeyond20-effect-header-split">DEFENSES <span>BUFFS</span></div><div class="ct-defenses-summary"><div class="ct-defenses-summary__default">Resistances, Immunities, or Vulnerabilities</div></div><div class="waybeyond20-buffs-list"><button class="waybeyond20-buff-name">Everflame — Flames</button></div></div><div class="conditions">CONDITIONS<br>Add Active Conditions</div></section></body>');
 await page.addStyleTag({content:'#panel{height:90px;width:408px;padding:10px;border:3px solid #e87900;display:flex}.ct-combat__statuses-group,.conditions{box-sizing:border-box;width:50%;padding:0 12px}.ct-combat__statuses-group{overflow:hidden}.ct-defenses-summary{max-height:57px;overflow:hidden;line-height:18px}.waybeyond20-effect-header-split{display:flex;justify-content:space-between}'});
 await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
 await page.locator('#panel').evaluate(n=>n.classList.add('wb20-defenses-auto-height'));
 for(const width of [340,408,600]){
  await page.locator('#panel').evaluate((n,width)=>n.style.width=width+'px',width);
  const geometry=await page.locator('#panel').evaluate(n=>{
   const summary=n.querySelector('.ct-defenses-summary'),range=document.createRange();range.selectNodeContents(summary);
   const box=n.getBoundingClientRect(),text=range.getBoundingClientRect(),inner=summary.getBoundingClientRect();
   return{panelBottom:box.bottom,textBottom:text.bottom,summaryBottom:inner.bottom,panelRight:box.right,textRight:text.right,height:n.clientHeight,scroll:n.scrollHeight};
  });
  assert.ok(geometry.textBottom<=geometry.summaryBottom+1,'native inner clamp must not clip text: '+JSON.stringify(geometry));
  assert.ok(geometry.textBottom<=geometry.panelBottom&&geometry.textRight<=geometry.panelRight,'all native text inside frame');
  assert.ok(geometry.scroll<=geometry.height+1,'frame contains its contents');
 }
 if(process.env.WB20_PRESENTATION_EVIDENCE)await page.screenshot({path:path.join(process.env.WB20_PRESENTATION_EVIDENCE,'native-defenses-clamp.png')});
 assert.deepEqual(errors,[]);console.log('PASS yielded/coalesced real refresh under500 mutations and a self-writing producer; heartbeat/native update preserved; per-stage producer attribution; six-report bound;3000-node label scan/cache replacement; native57px Defenses clamp at340/408/600px. '+JSON.stringify(stats));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
