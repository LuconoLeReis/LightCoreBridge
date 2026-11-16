// Disposable browser only. Real rollSpell -> new completion hook -> existing
// native Heal updater. Dispatch/dice delivery are explicit mocked boundaries.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const src=read('src/dndbeyond/content-scripts/character.js');
function fn(name){const a=src.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(a>=0,name);const b=src.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return src.slice(a,b<0?undefined:a+1+b);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent(`<div class="ct-sidebar__header-parent">Healer</div><div class="ct-sidebar__heading"><span class="ct-spell-name">Cure spell</span></div>
 <section class="ct-spell-pane"><div class="ct-spell-detail"><div role="list"></div></div><div class="ct-spell-detail__description">A creature regains Hit Points.</div>
 <div class="ct-spell-detail__level-school-item">1st Level Evocation</div><div class="ct-spell-caster__casting-level-current">3rd Level</div>
 <div class="ct-spell-caster__modifiers--healing"><div class="ct-spell-caster__modifier--hp"><span class="ct-spell-caster__modifier-amount">4d8+4</span></div></div></section>
 <div class="ct-quick-info__health"><span id="hp">10</span><button id="open-heal">Heal</button><div id="adjuster" hidden><input aria-label="Hit Points Adjustment"><button id="apply-heal">Heal</button></div></div><div id="prompt"></div>`);
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.addScriptTag({content:`
 var packets=[],events=[],warnings=[],spends=0,failCast=false,key_modifiers={},settings={};
 var character={_id:'test-owner',_hp:10,_max_hp:30,_class_features:['Blessed Healer'],_racial_traits:[],_feats:[],
  hasClass:()=>false,hasClassFeature:name=>name==='Blessed Healer',hasFeat:()=>false,getSetting:(k,d)=>d,
  updateHP(){this._hp=Number(document.querySelector('#hp').textContent);}};
 var rules=[{name:'Blessed Healer',text:"Immediately after you cast a spell with a spell slot that restores HP to one or more creatures other than yourself, you regain 2 + the spell slot's level HP."}];
 function wb20CurrentFeatureRules(){return rules;}function wb20RuleText(v){return String(v||'');}
 function propertyListToDict(){return {'Range/Area':'60 ft.','Duration':'Instantaneous','Casting Time':'1 Action','Components':'V/S'};}
 function descriptionToString(selector){return $(selector).text();}function findToHit(){return null;}
 async function wayBeyond20ChooseRitualMode(){return 'normal';}function wayBeyond20ParseTalent(){return {};}
 async function wayBeyond20ResolveSpellcastingSource(){return {source:null};}
 function wayBeyond20ApplyScrollSpellcastingToRollInput(v){return v;}function addCustomDamages(){}
 function wayBeyond20SpellDescriptionUsesSpellcastingModifier(){return false;}
 async function buildAttackRoll(owner,kind,name,description,properties,damages,types){return {name,description,range:properties['Range/Area'],damages,'damage-types':types,rollAttack:false,rollDamage:true};}
 function wayBeyond20ApplyBedsideMannerIntent(){}function wayBeyond20ApplyRitualMode(){}function addEffect(a,e){(a.effects||=[]).push(e);}
 function wayBeyond20ShouldTrackSpellEffect(){return false;}function wayBeyond20CommitSpellRollSettings(){}
 function wayBeyond20AttachActivationResource(){}async function wayBeyond20ConfirmCastingConflicts(){return true;}
 async function wayBeyond20MaybeAddElementalStrike(){}async function wayBeyond20ApplyOccultistIntrusion(){}
 async function sendRollWithCharacter(type,fallback,args){events.push('dispatch');packets.push({type,name:args.name,damages:args.damages,types:args['damage-types'],noSlot:args['waybeyond20-no-slot-cast']});if(failCast)return false;for(const commit of args['waybeyond20-after-dispatch']||[])await commit();return true;}
 var alertify={success:t=>events.push('success'),warning:t=>warnings.push(t)};
 var dndbeyondDiceRoller={queryGeneric:async(title,message,choices)=>{events.push('prompt');document.querySelector('#prompt').innerHTML='<button id="yes">Confirm other healed</button><button id="skip">Skip</button>';return new Promise(resolve=>{document.querySelector('#yes').onclick=()=>{document.querySelector('#prompt').innerHTML='';resolve('other');};document.querySelector('#skip').onclick=()=>{document.querySelector('#prompt').innerHTML='';resolve('skip');};});}};
 function wayBeyond20CharacterDebug(){}function wayBeyond20NotifyHealingReceived(d){events.push('healed:'+d.regained);}
 document.querySelector('#open-heal').onclick=()=>{events.push('open-native-heal');document.querySelector('#adjuster').hidden=false;};
 document.querySelector('#apply-heal').onclick=()=>{events.push('native-heal');document.querySelector('#hp').textContent=Math.min(30,Number(document.querySelector('#hp').textContent)+Number(document.querySelector('#adjuster input').value));};
 `});
 for(const name of ['wayBeyond20SpellCastLevel','wayBeyond20ApplySpellcastingModifierToHealing','handleSpecialHealingSpells','wayBeyond20CommitAfterDispatch','wayBeyond20IsVisibleElement','wayBeyond20FindTempHpHealthRoots','wayBeyond20FindHitPointsAdjuster','wayBeyond20CurrentHitPoints','wayBeyond20SetReactInputValue','wayBeyond20NativeClick','wayBeyond20ApplyHealingToSelf','rollSpell'])await page.addScriptTag({content:fn(name)});
 if(fs.existsSync(path.join(root,'src/dndbeyond/content-scripts/healing-cast.js')))await page.addScriptTag({content:read('src/dndbeyond/content-scripts/healing-cast.js')});
 await page.evaluate(()=>{window.cast=rollSpell(false,false,false,()=>{spends++;events.push('slot');});});
 await page.locator('#yes').waitFor({timeout:3000});
 assert.deepEqual(await page.evaluate(()=>events),['dispatch','slot','prompt']);
 await page.locator('#yes').click();assert.equal(await page.evaluate(()=>window.cast),true);
 assert.equal(await page.locator('#hp').textContent(),'15');assert.equal(await page.evaluate(()=>spends),1);
 assert.deepEqual(await page.evaluate(()=>packets[0].damages),['4d8+4']);
 assert.deepEqual(await page.evaluate(()=>events),['dispatch','slot','prompt','open-native-heal','native-heal','healed:5','success']);
 // Description-only (spell-card) path, no duplicate native cast or new resource.
 await page.evaluate(()=>{document.querySelector('.ct-spell-caster__modifier--hp').remove();window.cast=rollSpell(false,false,false,()=>{spends++;events.push('slot');});});
 await page.locator('#skip').waitFor();await page.locator('#skip').click();assert.equal(await page.evaluate(()=>window.cast),true);
 assert.equal(await page.evaluate(()=>packets.at(-1).type),'spell-card');assert.equal(await page.evaluate(()=>spends),2);assert.equal(await page.locator('#hp').textContent(),'15');
 await page.evaluate(()=>{document.querySelector('#hp').textContent='28';window.cast=rollSpell(false,false,false,()=>{spends++;});});
 await page.locator('#yes').waitFor();await page.locator('#yes').click();assert.equal(await page.evaluate(()=>window.cast),true);
 assert.equal(await page.locator('#hp').textContent(),'30');assert.equal(await page.evaluate(()=>spends),3);
 // Failed dispatch produces no new helper prompt and no HP/slot mutation.
 await page.evaluate(()=>{failCast=true;window.cast=rollSpell(false,false,false,()=>{spends++;});});
 assert.equal(await page.evaluate(()=>window.cast),false);assert.equal(await page.locator('#prompt button').count(),0);assert.equal(await page.evaluate(()=>spends),3);
 if(fs.existsSync(path.join(root,'src/dndbeyond/content-scripts/cleric-features.js'))){
  await page.addScriptTag({content:read('src/dndbeyond/content-scripts/cleric-features.js')});
  await page.evaluate(()=>{failCast=false;rules.push({name:'Divine Intervention',text:'Cast without a spell slot or Material components.'},{name:'Disciple of Life',text:'When a spell you cast with a spell slot restores HP, regain an additional 2 + the spell slot’s level.'},{name:'Supreme Healing',text:'Restore HP with a spell or Channel Divinity; use the highest number possible for each die.'});
   character.getAbility=()=>({mod:5});character._spell_modifiers={Cleric:5};
   document.querySelector('.ct-sidebar__header-parent').textContent='Divine Intervention';
   document.querySelector('.ct-spell-caster__casting-level-current').textContent='1st Level';
   document.querySelector('.ct-spell-pane').insertAdjacentHTML('beforeend','<div class="ct-spell-caster__modifiers--healing"><div class="ct-spell-caster__modifier--hp"><span class="ct-spell-caster__modifier-amount">2d8+8</span></div></div>');
   window.cast=rollSpell(false,false,false,()=>{spends++;events.push('feature-use');});});
  assert.equal(await page.evaluate(()=>window.cast),true);assert.deepEqual(await page.evaluate(()=>packets.at(-1).damages),['16+5']);
  assert.equal(await page.evaluate(()=>packets.at(-1).noSlot),true);assert.equal(await page.locator('#prompt button').count(),0);
  assert.equal(await page.locator('#hp').textContent(),'30');assert.equal(await page.evaluate(()=>spends),4);
 }
 assert.deepEqual(errors,[]);console.log('PASS real spell roll/card completion -> confirmation -> native Heal, one slot, capped HP, skip/failure, native free Intervention once with Supreme and no slot-only bonuses.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
