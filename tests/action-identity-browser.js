// Native-shaped spell data -> real quick-list producer -> real typography/icon
// consumer, including unmounted source rows and a repeated producer refresh.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name){const a=source.search(new RegExp('^function '+name+'\\(','m'));assert.ok(a>=0,name);const b=source.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return source.slice(a,b<0?undefined:a+1+b);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
 await page.addScriptTag({content:`var saved={},casts=0,wayBeyond20NativeCastPending=true;var character={getSetting:(k,d)=>saved[k]??d,mergeCharacterSettings:(p,cb)=>{Object.assign(saved,p);cb?.();}};function wayBeyond20RefreshCombinedActions(){};function wayBeyond20SpellRowLevel(row){return Number(row.dataset.level)};${['wayBeyond20NativeSpellIdentity','wb20SetActionRange','wb20DecorateActionValues','wayBeyond20MatchActionTypography'].map(fn).join('\n')}`});
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/quick-list.js')});
 for(const dark of [false,true]){
  await page.evaluate(dark=>{
   document.body.innerHTML=`<style>body{font:14px Arial;background:${dark?'#131d20':'#fff'};color:${dark?'#8e9ba3':'#75838b'}}#root{width:680px}.ddbc-combat-attack{display:flex;gap:8px;padding:6px 0;align-items:center}.ddbc-combat-attack__name{width:170px}.ddbc-combat-attack__range,.ddbc-combat-attack__action{width:65px}.ddbc-combat-attack__damage{width:90px}.native .ddbc-combat-attack__label{font:14px Arial;color:${dark?'#fff':'#111'}}.native .ddbc-combat-attack__meta-item{font:10px Arial;color:${dark?'#8e9ba3':'#75838b'}}.native .ddbc-damage__value{font:13px Arial;color:${dark?'#fff':'#111'}}.native button{color:inherit;background:none;border:1px solid #876012}.ddbc-combat-attack__meta-item{display:block}#spells{display:none}.ddbc-combat-attack select{border:1px solid #d74d32;background:#ffe2d9;appearance:auto}</style><div id="spells"></div><div id="root"><div class="native ddbc-combat-attack"><div class="ddbc-combat-attack__name"><span class="ddbc-combat-attack__label">Unarmed Strike</span><span class="ddbc-combat-attack__meta-item">Melee Attack</span></div><div class="ddbc-combat-attack__range">5 ft.</div><div class="ddbc-combat-attack__action"><div class="ddbc-combat-attack__tohit"><button>+7</button></div></div><div class="ddbc-combat-attack__damage"><span class="ddbc-damage__value">1d6+4</span></div><div class="ddbc-combat-attack__notes">Native retained</div></div></div>`;
   const spell=(name,level,effect,healing)=>`<div class="ct-spells-spell" data-level="${level}"><span class="ct-spell-name">${name}</span><span class="ct-spells-spell__meta">Prepared source</span><div class="ct-spells-spell__action"><button>Cast</button></div><div class="ct-spells-spell__activation">1 action</div><div class="ct-spells-spell__range">Touch</div><div class="ct-spells-spell__damage"><span class="ddbc-damage__value">${effect}</span><span class="${healing?'ddbc-healing-icon':'ddbc-damage-type-icon'}" aria-label="${healing?'healing':'necrotic damage'}"><svg viewBox="${healing?'0 0 18.4 20.1':'0 0 20 20'}"><path d="${healing?'M9.2,2.9c3.4-6.9,13.8,0,6.9,6.9c-6.9,6.9-6.9,10.4-6.9,10.4s0-3.5-6.9-10.4C-4.6,2.9,5.8-4,9.2,2.9':'M2 2H18V18H2Z'}"/></svg><span class="hidden-tooltip">${healing?'Healing':'Necrotic'}</span></span></div></div>`;
   document.querySelector('#spells').innerHTML=spell('Cure Wounds',3,'6d8+5',true)+spell('Cure Wounds',1,'2d8+5',true)+spell('Inflict Wounds',3,'4d10',false)+spell('Hex',1,'1d6*',false);
   wb20QuickObserveSpells();const spells=wb20QuickSession().spells;
   const healing=spells.find(s=>s.name==='Cure Wounds'&&s.level===3),attack=spells.find(s=>s.name==='Inflict Wounds');
   const groups=wb20QuickGroups();saved['waybeyond20-quick-list']=JSON.stringify({selected:Object.fromEntries(groups.map(g=>[g.key,g.name.includes('Healing')?healing.key:attack.key]))});
   wb20QuickLoadDescription=async()=>{};wb20QuickCast=async()=>{casts++};
   document.querySelector('#spells').remove(); // real tab switch unmounts source
   const root=document.querySelector('#root');wb20QuickRows(root);wayBeyond20MatchActionTypography(root);
  },dark);
  const healing=page.locator('.wb20-quick-row').filter({hasText:'Spell: Healing'}).first();
  assert.equal(await healing.locator('.wb20-spell-choice-caption').innerText(),'3rd · Cure Wounds');
  assert.equal(await healing.locator('.wb20-talent-category').innerText(),'Spell: Healing');
  assert.equal(await healing.locator('.wb20-action-value [data-wb20-value-icon]').getAttribute('aria-label'),'healing');
  const cureDice=healing.locator('.ddbc-combat-attack__damage .wb20-action-value');
  await cureDice.hover();
  assert.equal(await cureDice.evaluate(el=>getComputedStyle(el,'::after').content),'"Healing"');
  assert.equal(await cureDice.getAttribute('title'),null,'Cure Wounds does not display a browser title below the roll');
  const spellPicker=healing.locator('select');
  await page.mouse.move(980,680);
  assert.equal(await spellPicker.evaluate(el=>getComputedStyle(el).borderTopColor),'rgba(0, 0, 0, 0)');
  assert.equal(await spellPicker.evaluate(el=>getComputedStyle(el.parentElement,'::after').opacity),'0');
  await spellPicker.hover();
  assert.equal(await spellPicker.evaluate(el=>getComputedStyle(el.parentElement,'::after').opacity),'1');
  await page.mouse.move(980,680);
  assert.equal(await spellPicker.evaluate(el=>getComputedStyle(el.parentElement,'::after').opacity),'0');
  const attack=page.locator('.wb20-quick-row').filter({hasText:'Spell: Attack'}).first();
  assert.equal(await attack.locator('.wb20-spell-choice-caption').innerText(),'3rd · Inflict Wounds');
  assert.equal(await attack.locator('[data-wb20-value-icon]').getAttribute('aria-label'),'necrotic damage');
  const colors=await page.evaluate(()=>{const color=selector=>getComputedStyle(document.querySelector(selector)).color;return{nativeName:color('.native .ddbc-combat-attack__label'),name:color('.wb20-feature-option-name'),nativeSub:color('.native .ddbc-combat-attack__meta-item'),sub:color('.wb20-talent-category'),nativeDice:color('.native .ddbc-damage__value'),dice:color('.wb20-quick-row .wb20-action-value')};});
  assert.equal(colors.name,colors.nativeName);assert.equal(colors.sub,colors.nativeSub);assert.equal(colors.dice,colors.nativeDice);
  const stable=await page.evaluate(async()=>{const root=document.querySelector('#root');let changes=0;const watch=new MutationObserver(r=>changes+=r.length);watch.observe(root,{subtree:true,childList:true,attributes:true,characterData:true});for(let n=0;n<12;n++){wb20QuickRows(root);wayBeyond20MatchActionTypography(root)}await new Promise(r=>setTimeout(r,50));watch.disconnect();return changes;});
  assert.equal(stable,0,'complete producer + consumer settles with cached native icon, no tooltip text churn');
  await healing.locator('select').selectOption({index:2});await page.evaluate(()=>{wb20QuickRows(document.querySelector('#root'));wayBeyond20MatchActionTypography(document.querySelector('#root'));});
  assert.equal(await healing.locator('.wb20-spell-choice-caption').innerText(),'1st · Cure Wounds');assert.equal(await page.evaluate(()=>casts),dark?1:0,'selection does not cast');
  await attack.locator('select').selectOption({index:2});await page.evaluate(()=>{wb20QuickRows(document.querySelector('#root'));wayBeyond20MatchActionTypography(document.querySelector('#root'));});
  assert.equal(await attack.locator('.wb20-spell-choice-caption').innerText(),'1st · Hex');assert.equal(await attack.locator('.ddbc-damage__value').innerText(),'1d6*');assert.equal(await attack.locator('[data-wb20-value-icon]').getAttribute('aria-label'),'necrotic damage');
  if(process.env.WB20_IDENTITY_EVIDENCE)await page.screenshot({path:path.join(process.env.WB20_IDENTITY_EVIDENCE,dark?'actions-dark.png':'actions-light.png')});
  await healing.locator('.wb20-feature-option-icon').click();assert.equal(await page.evaluate(()=>casts),dark?2:1,'same existing cast called once');
 }
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/feature-activations.js')});
 const evasion=await page.evaluate(()=>{wb20FeatureProfile=()=>({active:true,has:name=>name==='Evasion'});const root=document.createElement('div');document.body.append(root);return{owned:wb20FeatureActions().some(([name])=>name==='Evasion'),rows:wb20FeatureRows(root).length};});
 assert.deepEqual(evasion,{owned:true,rows:0},'Evasion remains an owned automatic rule, without a separate activation');
 assert.deepEqual(errors,[]);console.log('PASS name/category hierarchy, selected upcast level, picker without cast, native healing/Necrotic geometry retained after unmount, Hex rider marker, light/dark ink, one activation and zero repeated-producer mutations. Isolated fixture, no real characters.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
