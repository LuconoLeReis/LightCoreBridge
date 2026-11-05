// Compose the actual native-row collector with the feature-row producer under
// the same kind of MutationObserver used by the sheet. Cap the bad baseline so
// a regression produces an assertion rather than hanging the test browser.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name){const start=source.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));assert.ok(start>=0,name);const end=source.slice(start+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return source.slice(start,end<0?undefined:start+1+end);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<div class="ct-actions"><div class="ct-actions-list"><h3>Actions • Attacks per Action: 2</h3><div><section><header>Attack</header><div><div class="ddbc-combat-attack"><div class="ddbc-combat-attack__name"><span class="ddbc-combat-attack__label">Sword</span></div><div class="ddbc-combat-attack__damage">1d6+4</div></div></div></section></div></div></div>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.evaluate(()=>{
  window.saved={'waybeyond20-feature-rules':[{name:'Guardian Wards',text:'You automatically succeed on saves against magical effects that would make you Incapacitated, Stunned, or Unconscious.'},{name:'Control Undead',text:'As an action, spend one Channel Divinity to control one undead.'}]};
  window.character={_class_features:['Control Undead'],_racial_traits:['Guardian Wards'],_feats:[],getSetting:(k,d)=>saved[k]??d};
  window.wb20ResourceId=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();window.wb20Resource=()=>null;
 });
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/feature-rules.js')});
 await page.addScriptTag({content:['wayBeyond20ActionListMetadata','wayBeyond20ActionSortValue','wayBeyond20FillHitDieChoices','wayBeyond20CollectFeatureOptions','wb20SetActionRange','wb20DecorateActionValues','wb20MarkDuplicateWeapons','wayBeyond20MatchActionTypography','wayBeyond20RefreshNaturalAttackIcons','wayBeyond20RefreshCombinedActions'].map(fn).join('\n')});
 const reads=await page.evaluate(()=>{
  const original=wb20ReadNativeFeatureRules;window.nativeRuleReads=0;
  wb20ReadNativeFeatureRules=()=>{nativeRuleReads++;return original();};
  wayBeyond20RefreshCombinedActions();return nativeRuleReads;
 });
 assert.equal(reads,1,'one native rule snapshot per synchronous presentation pass, not repeated DOM parsing for every row lookup');
 const result=await page.evaluate(async()=>{
  wayBeyond20RefreshCombinedActions();const original=Array.from(document.querySelectorAll('.wb20-rule-row'));
  let callbacks=0,mutations=0,replaced=0;const watcher=new MutationObserver(records=>{callbacks++;mutations+=records.length;if(callbacks>=24){watcher.disconnect();return;}wayBeyond20RefreshCombinedActions();});
  watcher.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
  wayBeyond20RefreshCombinedActions();await new Promise(resolve=>setTimeout(resolve,100));watcher.disconnect();
  for(const row of original)if(!row.isConnected)replaced++;
  return{callbacks,mutations,replaced,rows:document.querySelectorAll('.wb20-rule-row').length,nativeRows:document.querySelectorAll('.ct-actions-list .ddbc-combat-attack').length};
 });
 assert.deepEqual(errors,[]);assert.ok(result.callbacks<=3,'refresh must settle, not feed its own observer: '+JSON.stringify(result));assert.equal(result.replaced,0,'native collector must not remove another producer\'s feature rows');assert.equal(result.rows,1);assert.equal(result.nativeRows,1);
 await page.evaluate(()=>{saved['waybeyond20-feature-rules'][0].text='This no longer grants automatic saves.';wayBeyond20RefreshCombinedActions();});assert.equal(await page.locator('.wb20-rule-row').count(),1,'snapshot is discarded before the next native rule update');
 await page.evaluate(()=>{saved['waybeyond20-feature-controls']=false;wayBeyond20RefreshCombinedActions();});assert.equal(await page.locator('.wb20-rule-row').count(),0,'owning producer still removes disabled feature rows');
 console.log('PASS composed action refresh settles, retains producer-owned row identity, preserves native rows and respects feature opt-out. '+JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
