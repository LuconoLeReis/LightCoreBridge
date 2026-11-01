// Composes native filter DOM, Character.updateFeatures persistence and rule consumers.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.setContent('<div class="ddbc-character-summary__classes">Paladin 9</div><div class="ct-features"><button class="styles_active__fixture">All</button><button>Feats</button><div id="native"></div></div>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.evaluate(()=>{
  window.CharacterBase=class{constructor(){this._settings={};}getSetting(k,d){return this._settings[k]??d;}mergeCharacterSettings(d){Object.assign(this._settings,d);}};
  window.isListEqual=window.isObjectEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  window.wb20ResourceId=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();window.descriptionToString=n=>n.textContent;
  window.featureMarkup=(name,text,kind)=>`<div class="ct-feature-snippet--${kind}"><div class="styles_heading__fixture">${name}</div><div class="styles_content__fixture">${text}</div></div>`;
  window.allMarkup=()=>'<div class="ct-classes-detail">'+featureMarkup('Control Undead','As an action, control one undead.','class')+'</div><div class="ct-content-group">'+featureMarkup('Guardian Wards','You automatically succeed on saves against magical effects that would make you Stunned.','racial-trait')+'</div><div class="ct-feats-detail">'+featureMarkup('Protected','Whenever you make a d20 Test and roll 9 or lower on the d20, spend 1 Luck Point to reroll, and must accept the second result.','feat')+'</div>';
  document.querySelector('#native').innerHTML=allMarkup();
 });
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/feature-rules.js')});
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/base/character.js')});
 await page.evaluate(()=>{window.character=new Character({});character.mergeCharacterSettings=data=>Object.assign(character._settings,data);character._applyUseMagicDeviceScrollSpellcasting=()=>false;character._queueFeatureParseNotice=()=>{};character.updateFeatures();});
 assert.equal(await page.evaluate(()=>character.getSetting('waybeyond20-feature-rules',[]).length),3);
 await page.evaluate(()=>{document.querySelectorAll('.ct-features button')[0].className='';document.querySelectorAll('.ct-features button')[1].className='styles_active__fixture';document.querySelector('#native').innerHTML='<div class="ct-feats-detail">'+featureMarkup('Protected','Whenever you make a d20 Test and roll 8 or lower on the d20, spend 1 Luck Point to reroll, and must accept the second result.','feat')+'</div>';character.updateFeatures();});
 const filtered=await page.evaluate(()=>({saved:character.getSetting('waybeyond20-feature-rules',[]).map(r=>r.name),current:wb20CurrentFeatureRules().map(r=>r.name),threshold:wb20RuleOperators(wb20CurrentFeatureRules().find(r=>r.name==='Protected')).reroll.threshold}));
 assert.deepEqual(filtered.saved.sort(),['Control Undead','Guardian Wards','Protected']);assert.deepEqual(filtered.current.sort(),filtered.saved);assert.equal(filtered.threshold,8,'visible rule is updated while other owned categories remain');
 // Unknown CSS marker and absent filter bar both default to merge.
 await page.evaluate(()=>{document.querySelectorAll('.ct-features button').forEach(b=>b.className='');character.updateFeatures();});
 assert.equal(await page.evaluate(()=>wb20NativeFeatureRulesComplete()),false);
 assert.equal(await page.evaluate(()=>character.getSetting('waybeyond20-feature-rules',[]).length),3,'missing active marker retains saved categories');
 await page.evaluate(()=>{document.querySelectorAll('.ct-features button').forEach(b=>b.remove());character.updateFeatures();});
 assert.equal(await page.evaluate(()=>wb20NativeFeatureRulesComplete()),false);
 assert.equal(await page.evaluate(()=>wb20CurrentFeatureRules().length),3,'missing filter bar merges');
 // Active All with only the feat mounted is not proof other features vanished.
 await page.evaluate(()=>{document.querySelector('.ct-features').insertAdjacentHTML('afterbegin','<button class="styles_active__fixture">All</button><button>Feats</button>');character.updateFeatures();});
 assert.equal(await page.evaluate(()=>wb20NativeFeatureRulesComplete()),true);
 assert.equal(await page.evaluate(()=>character.getSetting('waybeyond20-feature-rules',[]).length),3,'small All snapshot retains still-owned missing rules');
 assert.equal(await page.evaluate(()=>wb20CurrentFeatureRules().length),3,'consumer also retains still-owned missing rules');
 await page.evaluate(()=>{document.querySelector('#native').innerHTML='';character.updateFeatures();});
 assert.equal(await page.evaluate(()=>character.getSetting('waybeyond20-feature-rules',[]).length),3,'empty All snapshot cannot replace saved rules');
 assert.equal(await page.evaluate(()=>wb20CurrentFeatureRules().length),3,'empty All consumer retains owned rules');
 // A nonempty native category confirms an actual ownership change.
 await page.evaluate(()=>{document.querySelector('#native').innerHTML=allMarkup().replace(featureMarkup('Guardian Wards','You automatically succeed on saves against magical effects that would make you Stunned.','racial-trait'),featureMarkup('Darkvision','You can see in darkness.','racial-trait'));character.updateFeatures();});
 assert.equal(await page.evaluate(()=>wb20CurrentFeatureRules().some(r=>r.name==='Guardian Wards')),false,'complete native snapshot really removes deleted rules');
 assert.equal(await page.evaluate(()=>character.getSetting('waybeyond20-feature-rules',[]).some(r=>r.name==='Guardian Wards')),false);
 await page.evaluate(()=>{document.querySelector('.ct-features').remove();character._class_features=[];});
 assert.equal(await page.evaluate(()=>wb20CurrentFeatureRules().some(r=>r.name==='Control Undead')),false,'saved rules still require current feature ownership');
 console.log('PASS composed persistence/consumer: unknown active marker, missing filter bar, smaller All and empty All preserve owned rules; visible updates remain fresh; confirmed ownership removal discards stale rules.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
