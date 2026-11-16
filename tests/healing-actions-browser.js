// Disposable Chrome only; no actual DDB, browser profile or gameplay writes.
// Real current-markup feature reader -> action preparation -> packet decoration.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent(`<main><div class="ct-features"><button aria-pressed="true">All</button>
 <div class="styles_snippet__sample ct-feature-snippet--class"><h3 class="styles_heading__sample">Channel Divinity<span>PHB</span></h3><div class="styles_content__sample">Three uses.</div><div class="ct-feature-snippet__action-summary">Channel Divinity: Divine Spark<span>: 1 Action</span></div><div class="ct-feature-snippet__action-summary">Channel Divinity: Turn Undead<span>: 1 Action</span></div></div>
 <div class="styles_snippet__sample ct-feature-snippet--class"><h3 class="styles_heading__sample">Sear Undead<span>PHB</span></h3><div class="styles_content__sample">Whenever you use Turn Undead, any Undead that fails its saving throw takes 5d8 Radiant damage. This damage doesn't end the turn effect.</div></div>
 <div class="styles_snippet__sample ct-feature-snippet--class"><h3 class="styles_heading__sample">Blessed Healer<span>PHB</span></h3><div class="styles_content__sample">Immediately after you cast a spell with a spell slot that restores HP to one or more creatures other than yourself, you regain 2 + the spell slot's level HP.</div></div>
 </div><div id="choice"></div></main>`);
 await page.addScriptTag({content:`var character={_id:'fixture',_class_features:['Channel Divinity','Sear Undead','Blessed Healer'],_racial_traits:[],_feats:[],_spell_saves:{Cleric:16},getAbility:()=>({mod:5}),getSetting:(k,d)=>d};
 function wb20ResourceId(v){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
 function wayBeyond20SpellCastLevel(){return 3;}function addEffect(a,e){(a.effects||=[]).push(e);}function wayBeyond20AttachLimitedUse(a,f){a['waybeyond20-limited-use']={feature:f};}
 var alertify={warning:()=>{throw Error('unexpected warning');}},dndbeyondDiceRoller={queryGeneric:async()=>{document.querySelector('#choice').innerHTML='<button id="heal">Restore HP</button><button id="radiant">Radiant</button><button id="cancel">Cancel</button>';return new Promise(resolve=>{for(const [id,value] of [['heal','healing'],['radiant','radiant'],['cancel',null]])document.querySelector('#'+id).onclick=()=>{document.querySelector('#choice').replaceChildren();resolve(value);};});}};`});
 for(const file of ['feature-rules.js','healing-actions.js','healing-cast.js'])await page.addScriptTag({content:read('src/dndbeyond/content-scripts/'+file)});
 const owned=await page.evaluate(()=>wb20ReadNativeFeatureRules());assert.equal(owned.length,3);assert.deepEqual(owned[0].actions,['Channel Divinity: Divine Spark','Channel Divinity: Turn Undead']);
 assert.equal(await page.evaluate(()=>wb20HealingCastPlan(character,{name:'Cure Wounds',range:'Touch',damages:['6d8+10'],'damage-types':['Healing']},{level:'1st Level',castas:'3rd Level',ritualMode:'normal'}).amount),5);
 const description='As a Magic action, choose another creature within 30 feet. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points or deal damage.';
 for(const button of ['heal','radiant','cancel']){
  await page.evaluate(desc=>{window.pending=wb20PrepareHealingAction(character,'Channel Divinity: Divine Spark',desc,{Damage:'1d8','Attack/Save':'CON 16','Range/Area':'-- ft. Reach'});},description);
  await page.locator('#'+button).click();
  const plan=await page.evaluate(()=>window.pending);
  if(button==='cancel'){assert.equal(plan.canceled,true);continue;}
  assert.equal(plan.properties.Damage,'1d8+5');assert.equal(plan.properties['Range/Area'],'30 ft.');
  assert.equal(plan.properties['Attack/Save'],button==='heal'?undefined:'CON 16');
 }
 const sear=await page.evaluate(async()=>{const p=await wb20PrepareHealingAction(character,'Channel Divinity: Turn Undead','Each chosen Undead within 30 feet makes a Wisdom saving throw.',{'Attack/Save':'WIS 16'});const a={name:'Turn Undead'};wb20ApplyHealingAction(p,a);return {p,a,passive:wb20RuleIsPassiveAction('Channel Divinity: Sear Undead')};});
 assert.equal(sear.p.properties.Damage,'5d8');assert.equal(sear.a['waybeyond20-limited-use'].feature,'Channel Divinity');assert.equal(sear.passive,true);
 let mutations=0;await page.exposeFunction('countChanges',n=>{mutations+=n;});
 await page.evaluate(()=>{new MutationObserver(r=>window.countChanges(r.length)).observe(document.querySelector('.ct-features'),{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<50;i++)wb20ReadNativeFeatureRules();});
 await page.waitForTimeout(100);assert.equal(mutations,0);assert.deepEqual(errors,[]);
 if(fs.existsSync(path.join(root,'src/dndbeyond/content-scripts/cleric-features.js'))){
  await page.addScriptTag({content:read('src/dndbeyond/content-scripts/cleric-features.js')});
  await page.evaluate(()=>{
   window.controlPackets=[];window.controlSettings={};
   character._feats.push('Lucky');character._racial_traits.push('Celestial Revelation');
   character.getSetting=(k,d)=>controlSettings[k]??d;character.mergeCharacterSettings=(v,cb)=>{Object.assign(controlSettings,v);cb?.();};
   document.querySelector('.ct-features').insertAdjacentHTML('beforeend','<div class="styles_snippet__sample ct-feature-snippet--feat"><h3 class="styles_heading__sample">Lucky<span>PHB</span></h3><div class="styles_content__sample">You have 6 Luck Points. Spend 1 Luck Point to give yourself Advantage on the roll.</div></div><div class="styles_snippet__sample ct-feature-snippet--racial-trait"><h3 class="styles_heading__sample">Celestial Revelation<span>PHB</span></h3><div class="styles_content__sample">Inner Radiance. Once on each of your turns, you can deal an additional 6 Radiant damage to one target.</div></div>');
   document.body.insertAdjacentHTML('beforeend','<div id="rows"></div>');
   window.wayBeyond20AttackActivationTurnKey=()=> 'fixture:1';
   window.sendRollWithCharacter=async(t,f,a)=>{controlPackets.push(JSON.parse(JSON.stringify(a)));return true;};
   window.wayBeyond20AttachTurnResource=(a,r)=>{a['waybeyond20-turn-resource']={resource:r};};alertify.success=()=>{};
   dndbeyondDiceRoller.queryGeneric=async(title,message,choices)=>{
    const root=document.querySelector('#choice');root.replaceChildren();
    return new Promise(resolve=>{for(const [value,label] of Object.entries(choices)){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{root.replaceChildren();resolve(value);};root.append(b);}});
   };
   wb20RuleRows(document.querySelector('#rows'),[]);
  });
  await page.getByRole('button',{name:'Use Lucky',exact:true}).click();
  await page.getByRole('button',{name:'Give my next d20 Test Advantage',exact:true}).click();
  assert.equal(await page.evaluate(()=>controlPackets.length),0,'arming is not a spend');
  await page.evaluate(async()=>{const a={name:'Insight',advantage:0};await wb20WithArmedLuck('skill',a,()=>sendRollWithCharacter('skill','',a));});
  assert.equal(await page.evaluate(()=>controlPackets[0]['waybeyond20-resource-costs'][0].name),'Luck Points');
  await page.getByRole('button',{name:'Use Celestial Revelation',exact:true}).click();
  await page.getByRole('button',{name:'Activate: 1 Bonus Action + 1 use',exact:true}).click();
  assert.equal(await page.evaluate(()=>controlSettings['waybeyond20-inner-radiance-active']),true);
  assert.equal(await page.evaluate(()=>controlPackets.at(-1)['waybeyond20-turn-resource'].resource),'bonusAction');
  await page.getByRole('button',{name:'Use Celestial Revelation',exact:true}).click();
  await page.getByRole('button',{name:'End transformation',exact:true}).click();
  assert.equal(await page.evaluate(()=>controlSettings['waybeyond20-inner-radiance-active']),false);
 }
 assert.deepEqual(errors,[]);console.log('PASS current Features DOM -> compact healing and Channel choices, mutation-free reads, Lucky and Inner Radiance controls.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
