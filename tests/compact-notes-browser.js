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
   'Lay On Hands: Healing Pool':'You have a pool of healing power. You can restore a total of 15 HP.',
   'Lay On Hands: Purify Poison':'You can expend 5 HP from the pool of healing to remove the Poisoned condition.',
   'Wardstone: Transfer':'As a Bonus Action, touch a willing creature to give it protection for 1 minute.'};
  for(const [name,text] of Object.entries(descriptions)){const node=document.createElement('div');node.className='ct-feature-snippet';node.innerHTML='<h4 class="ct-feature-snippet__heading"></h4><p class="ct-feature-snippet__content"></p>';node.firstElementChild.textContent=name;node.lastElementChild.textContent=text;node.firstElementChild.onclick=()=>{document.querySelector('#details').textContent=name;};document.querySelector('#group').append(node);}
  window.saved={'waybeyond20-feature-rules':Object.entries(descriptions).map(([name,text])=>({name,text}))};
  saved['waybeyond20-feature-rules'].push({name:'Wardstone',text:'Protect a creature.',actions:['Wardstone: Transfer: 1 Bonus Action']});
  const wardstone=[...document.querySelectorAll('.ct-feature-snippet')].at(-1);
  wardstone.insertAdjacentHTML('beforeend','<button role="checkbox" aria-checked="true"></button><button id="ward-pip" role="checkbox" aria-checked="false"></button><button role="checkbox" aria-checked="false"></button>');
  window.character={_class_features:[...Object.keys(descriptions),'Wardstone'],_racial_traits:[],_feats:[],getSetting:(k,d)=>saved[k]??d};window.wb20ResourceId=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();window.wb20Resource=()=>null;
  const poolSnippet=[...document.querySelectorAll('.ct-feature-snippet')].find(node=>node.firstElementChild.textContent==='Lay On Hands: Healing Pool');
  poolSnippet.insertAdjacentHTML('beforeend','<div id="pool-widget" class="ct-slot-manager-large"><button class="button-action-decrease">-</button><span class="ct-slot-manager-large__value--cur">9</span></div>');
  window.uses=[];window.wayBeyond20RollLayOnHands=async (name,description,properties)=>{uses.push({name,description,properties});};
  window.reads=0;window.wb20FeatureEscape=String;window.wb20FeatureForm=()=>{reads++;return null;};
 });
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/feature-rules.js')});
 await page.addScriptTag({content:"const WAYBEYOND20_LAY_ON_HANDS_POOL = 'Lay On Hands: Healing Pool';\n"+source.slice(source.indexOf('const WAYBEYOND20_LAY_ON_HANDS_PILLS'),source.indexOf('function wayBeyond20LayOnHandsActionMetadata'))+['wayBeyond20LayOnHandsActionMetadata','wayBeyond20ActionListMetadata','wayBeyond20FillHitDieChoices','wayBeyond20CollectFeatureOptions','wb20SetActionRange','wayBeyond20CharacterHelperEnabled','wayBeyond20FindNumericFeaturePool','wayBeyond20ActionSummaryParts','wayBeyond20NormalizeFeatureLabel','wayBeyond20ElementOwnText','wayBeyond20ParseInteger'].map(fn).join('\n')});
 await page.evaluate(()=>{window.render=()=>{const host=document.querySelector('#root'),rows=wayBeyond20CollectFeatureOptions(host,[document.querySelector('#group')],[]);wb20RuleRows(host,rows);return rows;};render();});
 assert.equal(await page.locator('#root>.wb20-feature-option').count(),5,'two aliases produce one Abjure Foes, plus Lay On Hands and Wardstone');
 assert.equal(await page.locator('.wb20-rule-row').count(),0,'saved parsed rules cannot add an alias of an existing native shortcut');
 const wardstone=page.locator('.wb20-feature-option').filter({has:page.locator('.wb20-talent-category',{hasText:/^Wardstone$/})});
 assert.equal(await wardstone.locator('.wb20-feature-option-name').innerText(),'Transfer');
 assert.equal(await wardstone.locator('.ddbc-combat-attack__range').innerText(),'Touch');
 assert.match(await wardstone.locator('.wb20-action-note').innerText(),/^2\/3 uses left/);
 await page.evaluate(()=>{document.querySelector('#ward-pip').setAttribute('aria-checked','true');render();});
 assert.match(await wardstone.locator('.wb20-action-note').innerText(),/^1\/3 uses left/);
 const heal=page.locator('.wb20-feature-option').filter({has:page.locator('.wb20-talent-category',{hasText:/^Heal$/})});
 const pool=page.locator('.wb20-feature-option').filter({has:page.locator('.wb20-talent-category',{hasText:/^Healing Pool$/})});
 const purify=page.locator('.wb20-feature-option').filter({has:page.locator('.wb20-talent-category',{hasText:/^Purify Poison$/})});
 for(const row of [heal,pool,purify])assert.equal(await row.locator('.ddbc-combat-attack__range').innerText(),'Touch');
 assert.equal(await heal.locator('.wb20-feature-option-name').innerText(),'Lay On Hands');assert.equal(await purify.locator('.wb20-feature-option-name').innerText(),'Lay On Hands');
 assert.equal(await heal.locator('.wb20-action-note').innerText(),'9 points left','Heal shows the live native pool');
 assert.equal(await pool.locator('.wb20-feature-option-name').innerText(),'Lay On Hands');
 await purify.locator('.wb20-action-note').click();assert.equal(await page.locator('#details').innerText(),'Lay On Hands: Purify Poison','subtitle change keeps original native details routing');
 assert.deepEqual(await page.evaluate(()=>uses),[],'reading Notes spends or activates nothing');
 await heal.locator('.wb20-feature-option-name').click();
 await pool.locator('.wb20-feature-option-name').click();
 await purify.locator('.wb20-feature-option-icon').click();
 assert.deepEqual(await page.evaluate(()=>uses.map(call=>[call.name,call.properties['Action Type']])),[
  ['Lay On Hands: Heal','1 Bonus Action'],['Lay On Hands: Healing Pool','1 Bonus Action'],['Lay On Hands: Purify Poison','1 Bonus Action']]);
 assert.equal(await page.locator('#details').innerText(),'Lay On Hands: Purify Poison','activation does not open the info panel');
 await page.evaluate(()=>{document.querySelector('#pool-widget span').textContent='0';render();});
 assert.equal(await heal.locator('.wb20-action-note').innerText(),'0 points left','zero is a real balance');
 await page.evaluate(()=>{
  const widget=document.querySelector('#pool-widget');
  document.querySelector('#group .ct-feature-snippet').append(widget);
  widget.querySelector('span').textContent='23';
  saved['waybeyond20-lay-on-hands-helper']=false;render();
 });
 assert.equal(await heal.locator('.wb20-action-note').innerText(),'Pool balance unavailable','an absent balance is not assumed to be zero or full');
 await heal.locator('.wb20-feature-option-name').click();
 assert.equal(await page.locator('#details').innerText(),'Lay On Hands: Heal','disabled helper retains native details');
 assert.equal(await page.evaluate(()=>uses.length),3);
 assert.equal(await page.evaluate(()=>reads),0,'details use native routing');
 const idle=await page.evaluate(async()=>{let count=0;const watch=new MutationObserver(r=>count+=r.length);watch.observe(document.querySelector('#root'),{subtree:true,attributes:true,childList:true,characterData:true});for(let n=0;n<10;n++)render();await new Promise(r=>setTimeout(r,40));watch.disconnect();return count;});assert.equal(idle,0,'duplicate suppression and subtitles settle with no refresh churn');
 await page.evaluate(()=>{window.original=document.createElement('div');original.textContent='native marker';document.querySelector('#root').prepend(original);window.nativeRows=()=>{const host=document.querySelector('#root'),rows=[{row:original,name:'Abjure Foes'}];rows.push(...wayBeyond20CollectFeatureOptions(host,[document.querySelector('#group')],rows));wb20RuleRows(host,rows);};nativeRows();});
 assert.equal(await page.locator('.wb20-feature-option').count(),4,'existing native entry wins over both synthesized aliases');assert.equal(await page.evaluate(()=>original.textContent),'native marker','native row is not rewritten');
 assert.equal(await page.evaluate(()=>wb20FeatureRowIdentity('Other Pool: Abjure Foes')===wb20FeatureRowIdentity('Abjure Foes')),false,'unrelated feature prefixes stay separate');
 assert.deepEqual(errors,[]);console.log('PASS combined Actions aliases, Lay On Hands activation and live pool balance, read-only Notes and zero idle mutations.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
