const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name){const a=source.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(a>=0,name);const b=source.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return source.slice(a,b<0?undefined:a+1+b);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<div id="root"></div><div id="group"><h3>Bonus Actions</h3></div><aside id="details"></aside>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.evaluate(()=>{
  window.descriptions={
   'Abjure Foes':'As a Magic action, target up to 5 creatures within 60 feet. Each makes a DC 17 Wisdom saving throw or is Frightened for 1 minute, until it takes damage.',
   'Channel Divinity: Abjure Foes':'As a Magic action, target up to 5 creatures within 60 feet. Each makes a DC 17 Wisdom saving throw or is Frightened for 1 minute, until it takes damage.',
   'Lay On Hands: Heal':'As a Bonus Action, touch a creature and restore a number of HP up to the remaining pool.',
   'Lay On Hands: Purify Poison':'You can expend 5 HP from the pool of healing to remove the Poisoned condition.'};
  for(const [name,text] of Object.entries(descriptions)){const node=document.createElement('div');node.className='ct-feature-snippet';node.innerHTML='<h4 class="ct-feature-snippet__heading"></h4><p class="ct-feature-snippet__content"></p>';node.firstElementChild.textContent=name;node.lastElementChild.textContent=text;node.firstElementChild.onclick=()=>{document.querySelector('#details').textContent=name;};document.querySelector('#group').append(node);}
  window.saved={'waybeyond20-feature-rules':Object.entries(descriptions).map(([name,text])=>({name,text}))};
  window.character={_class_features:Object.keys(descriptions),_racial_traits:[],_feats:[],getSetting:(k,d)=>saved[k]??d};window.wb20ResourceId=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();window.wb20Resource=()=>null;
  window.reads=0;window.wb20FeatureEscape=String;window.wb20FeatureForm=()=>{reads++;return null;};
 });
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/feature-rules.js')});
 await page.addScriptTag({content:['wayBeyond20ActionListMetadata','wayBeyond20FillHitDieChoices','wayBeyond20CollectFeatureOptions','wb20SetActionRange'].map(fn).join('\n')});
 await page.evaluate(()=>{window.render=()=>{const host=document.querySelector('#root'),rows=wayBeyond20CollectFeatureOptions(host,[document.querySelector('#group')],[]);wb20RuleRows(host,rows);return rows;};render();});
 assert.equal(await page.locator('#root>.wb20-feature-option').count(),3,'two aliases produce one Abjure Foes, plus two different Lay On Hands uses');
 assert.equal(await page.locator('.wb20-rule-row').count(),0,'saved parsed rules cannot add an alias of an existing native shortcut');
 const heal=page.locator('.wb20-feature-option').filter({has:page.locator('.wb20-talent-category',{hasText:/^Heal$/})});
 const purify=page.locator('.wb20-feature-option').filter({has:page.locator('.wb20-talent-category',{hasText:/^Purify Poison$/})});
 assert.equal(await heal.locator('.wb20-feature-option-name').innerText(),'Lay On Hands');assert.equal(await purify.locator('.wb20-feature-option-name').innerText(),'Lay On Hands');
 await purify.locator('.wb20-action-note').click();assert.equal(await page.locator('#details').innerText(),'Lay On Hands: Purify Poison','subtitle change keeps original native details routing');
 await heal.locator('.wb20-feature-option-name').click();assert.equal(await page.locator('#details').innerText(),'Lay On Hands: Heal');
 assert.equal(await page.evaluate(()=>reads),0,'native details preserved; no activation or allocation');
 const idle=await page.evaluate(async()=>{let count=0;const watch=new MutationObserver(r=>count+=r.length);watch.observe(document.querySelector('#root'),{subtree:true,attributes:true,childList:true,characterData:true});for(let n=0;n<10;n++)render();await new Promise(r=>setTimeout(r,40));watch.disconnect();return count;});assert.equal(idle,0,'duplicate suppression and subtitles settle with no refresh churn');
 await page.evaluate(()=>{window.original=document.createElement('div');original.textContent='native marker';document.querySelector('#root').prepend(original);window.nativeRows=()=>{const host=document.querySelector('#root'),rows=[{row:original,name:'Abjure Foes'}];rows.push(...wayBeyond20CollectFeatureOptions(host,[document.querySelector('#group')],rows));wb20RuleRows(host,rows);};nativeRows();});
 assert.equal(await page.locator('.wb20-feature-option').count(),2,'existing native entry wins over both synthesized aliases');assert.equal(await page.evaluate(()=>original.textContent),'native marker','native row is not rewritten');
 assert.equal(await page.evaluate(()=>wb20FeatureRowIdentity('Other Pool: Abjure Foes')===wb20FeatureRowIdentity('Abjure Foes')),false,'unrelated feature prefixes stay separate');
 assert.deepEqual(errors,[]);console.log('PASS composed alias suppression, native-row precedence, Lay On Hands name/subtitles, original read-only details routing and zero idle mutations.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
