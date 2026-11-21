// Offline sheet model. Real icon -> execute -> rollSpell -> resource transaction ->
// dispatch -> exact native slot updater. Only dice/destination and DDB markup are fixtures.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const src=read('src/dndbeyond/content-scripts/character.js');
function fn(source,name,optional=false){const a=source.search(new RegExp('^(?:async )?function '+name+'\\(','m'));if(optional && a<0)return '';assert.ok(a>=0,name);const b=source.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return source.slice(a,b<0?undefined:a+1+b);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent(`<div class="ct-sidebar__header-parent">Sorcerer</div><div class="ct-sidebar__heading"><span class="ct-spell-name">Chromatic Orb</span></div>
 <section class="ct-spell-pane"><div class="ct-spell-detail"><div role="list"></div></div><div class="ct-spell-detail__description">Make a ranged spell attack.</div>
 <div class="ct-spell-detail__level-school-item">1st Level Evocation</div><div class="ct-spell-caster__casting-level-current">1st Level</div>
 <div class="ct-spell-caster__casting-action"><button>Cast</button></div>
 <div class="ct-spell-caster__modifiers--damages"><div class="ct-spell-caster__modifier--damage"><span class="ct-spell-caster__modifier-amount">3d8</span><span class="ct-damage-type-icon"><span class="ct-tooltip" data-original-title="Fire"></span></span></div></div></section>
 <div id="slots"></div>`);
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.addScriptTag({content:`
 var packets=[],warnings=[],events=[],failCast=false,throwCast=false,cancelBuild=false,ritualMode='normal',secondary=false,key_modifiers={},settings={},nativeSpends=0,intervention=false,managed=false,hit=true,autoDamage=true;
 var owner={_id:'fixture-owner',getSetting:(k,d)=>d,getGlobalSetting:(k,d)=>k==='waybeyond20-secondary-attacks'?secondary:k==='auto-roll-damage'?autoDamage:d,hasClass:()=>false,hasClassFeature:()=>false,hasFeat:()=>false,hasRacialTrait:()=>false};
 var character=owner,wayBeyond20SpellSlotCache=null,wayBeyond20SmiteCacheOwner=null,wayBeyond20AttackFollowupQueue=Promise.resolve();
 function propertyListToDict(){return {'To Hit':'+7','Range/Area':'90 ft.','Duration':'Instantaneous','Casting Time':'1 Action','Components':'V/S/M'};}
 function descriptionToString(s){return $(s).text();}function findToHit(){return null;}
 async function wayBeyond20ChooseRitualMode(){return ritualMode;}function wayBeyond20ParseTalent(){return {};}
 async function wayBeyond20ResolveSpellcastingSource(){return {source:null};}function wayBeyond20ApplyScrollSpellcastingToRollInput(v){return v;}
 function addCustomDamages(){}function wayBeyond20SpellDescriptionUsesSpellcastingModifier(){return false;}
 function capitalize(s){return s;}function wayBeyond20ApplySpellcastingModifierToDamage(){}function handleSpecialGeneralAttacks(d,t,p,s,o){return o.to_hit;}function handleSpecialSpells(){}
 var RollType={NORMAL:0,QUERY:2},CriticalRules={PHB:0};
 var dndbeyondDiceRoller={queryDamageType:async()=>cancelBuild?null:'Fire'};
 async function applyRogueSneakAttack(){}function damagesToCrits(c,damages){return damages;}function applyGWFIfRequired(n,p,d){return d;}
 function wayBeyond20ApplyBedsideMannerIntent(){}function wayBeyond20ApplyRitualMode(){}function addEffect(){}
 function wayBeyond20ShouldTrackSpellEffect(){return false;}function wayBeyond20CommitSpellRollSettings(){}
 function wayBeyond20AttachActivationResource(){}async function wayBeyond20ConfirmCastingConflicts(){return true;}
 async function wayBeyond20MaybeAddElementalStrike(){}async function wayBeyond20ApplyOccultistIntrusion(){}
 function wayBeyond20GetTrackedSpellEffects(){return [];}function wayBeyond20NormalizeAttackSemantics(){}function wayBeyond20ApplyDrainingAttackIntent(){}
 function wayBeyond20CharacterDebug(){}function wayBeyond20GetTurnTrackerState(){return {inCombat:false};}
 function wayBeyond20AttackActivationTurnKey(){return null;}function wayBeyond20HasActiveCombatState(){return false;}
 function wayBeyond20NeedsAttackFollowup(){return false;}function wayBeyond20MayHaveSmiteAfterHit(){return false;}
 function wayBeyond20ActiveCharacterSheetTab(){return null;}function wayBeyond20CharacterSheetTab(){return null;}
 function handleCustomText(){return {before:[],replace:[],after:[]};}function pauseHotkeyHandling(){}function resumeHotkeyHandling(){}
 function addRollButton(o,callback,where){var b=document.createElement('button');b.id='lightcore-icon';b.textContent='LightCore roll';b.onclick=()=>{window.cast=callback();};document.querySelector(where).append(b);}
 var alertify={warning:t=>warnings.push(t)};
 function wb20InterventionProperties(){return intervention;}function wb20InterventionPacket(p){p['waybeyond20-no-slot-cast']=true;}
 async function sendRoll(o,type,fallback,args){events.push('dispatch');if(throwCast)throw Error('fixture delivery failure');if(failCast)return false;packets.push({type,name:args.name,rollAttack:args.rollAttack,rollDamage:args.rollDamage,internal:!!args['waybeyond20-after-dispatch']});args['waybeyond20-capture-result']?.(args,[{total:17,isDiscarded:()=>false,isCriticalHit:()=>false}],[]);return true;}
 function resetSlots(){document.querySelector('#slots').innerHTML=[1,3].map(level=>'<div class="ct-content-group__header"><div class="ct-content-group__header-content">'+level+(level===1?'st':'rd')+' Level</div>'+Array.from({length:4},()=>'<div role="checkbox" aria-label="use" aria-checked="false" data-level="'+level+'"></div>').join('')+'</div>').join('');for(const box of document.querySelectorAll('[role=checkbox]'))box.onclick=()=>{events.push('slot:'+box.dataset.level);box.setAttribute('aria-checked','true');};}
 async function wayBeyond20RequestPageSpellSlotChange(level,mode,before){await new Promise(resolve=>setTimeout(resolve,15));const state=wayBeyond20SpellSlotState(level);if(state?.available===before){state.availableControls[0].click();return {changed:true};}return {changed:false};}
 resetSlots();
 `});
 const names=['wayBeyond20SpellCastLevel','wayBeyond20CommitAfterDispatch','wayBeyond20SpellSlotHeaderLevel','wayBeyond20SpellSlotState','wayBeyond20WaitForSpellSlotBelow','wayBeyond20SpendSpellSlot','wayBeyond20AvailableSpellSlots','wayBeyond20SpellSlotControls','wayBeyond20CurrentSmiteCacheOwner','wayBeyond20EnsureSmiteCacheOwner','wayBeyond20ElementOwnText','sendRollWithCharacter','wayBeyond20DispatchRollWithCharacter','rollSpell','execute','addRollButtonEx'];
 for(const name of names)await page.addScriptTag({content:fn(src,name)});
 const utils=read('src/dndbeyond/base/utils.js');
 await page.addScriptTag({content:fn(utils,'queryDamageTypeFromArray')+'\n'+fn(utils,'buildAttackRoll')});
 await page.addScriptTag({content:fn(src,'wayBeyond20SpellIconCastCommit',true) || '// No icon accounting helper in this version.'});
 const resources=read('src/dndbeyond/content-scripts/resources.js');
 await page.addScriptTag({content:'var wb20ResourceQueue=Promise.resolve();function wb20HasFeature(){return false;}\n'+fn(resources,'wb20ResourceLocked')+'\n'+fn(resources,'wb20DispatchResources')});
 await page.addScriptTag({content:read('src/dndbeyond/base/attack-workflow.js')+'\n'+read('src/dndbeyond/content-scripts/attack-workflow-character.js')});
 const followups=read('src/dndbeyond/content-scripts/attack-followups.js');
 await page.addScriptTag({content:'var wayBeyond20PendingAttackDamage=new Map();function wb20FeatureNeedsHit(args){return managed;}async function wayBeyond20ConfirmAttackHit(){return hit;}async function wb20ConfirmAttackOutcome(){return {hit,roll:null};}async function wayBeyond20SendRuntimeMessage(){return {ok:false};}\n'+['wayBeyond20NeedsAttackFollowup','wayBeyond20RunAttackFollowup','wayBeyond20ResolveAttackFollowup','wayBeyond20FinishAttackDamage','wayBeyond20ResolveAttackDamage','wayBeyond20ContinueAttackDamage'].map(name=>fn(followups,name)).join('\n')});
 await page.evaluate(()=>addRollButtonEx('ct-spell-pane','.ct-sidebar__heading',{}));
 const click=async()=>{await page.locator('#lightcore-icon').click();return page.evaluate(()=>window.cast);};
 assert.equal(await click(),true);
 assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),3,'successful Chromatic Orb through LightCore icon spends exactly one slot');
 assert.deepEqual(await page.evaluate(()=>events),['dispatch','slot:1'],'slot completes after accepted cast, before cast resolves');
 assert.equal(await page.evaluate(()=>packets[0].internal),false,'internal callbacks never leave the sheet');
 let cases=1;
 for(const useSecondary of [false,true]){
  await page.evaluate(v=>{secondary=v;resetSlots();events=[];document.querySelector('.ct-spell-caster__casting-level-current').textContent='3rd Level';},useSecondary);
  assert.equal(await click(),true);
  assert.deepEqual(await page.evaluate(()=>[wayBeyond20SpellSlotState(1).available,wayBeyond20SpellSlotState(3).available]),[4,3],'upcast uses selected level in either workflow');cases++;
  // Two successful casts queued before accounting completes must each pay, not
  // mistake the first decrement for the second cast's native payment.
  await page.evaluate(async()=>{resetSlots();await Promise.all([execute('ct-spell-pane'),execute('ct-spell-pane')]);});
  assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(3).available),2);cases++;
 }
 for(const [label,setup] of [
  ['cancelled damage choice',()=>{cancelBuild=true;}],['rejected dispatch',()=>{failCast=true;}],
  ['ritual',()=>{ritualMode='ritual';}],['display preview',()=>{key_modifiers.display_attack=true;}],
  ['free Use control',()=>{document.querySelector('.ct-spell-caster__casting-action button').textContent='Use';}],
  ['Divine Intervention',()=>{intervention=true;}],['cantrip',()=>{document.querySelector('.ct-spell-detail__level-school-item').textContent='Evocation Cantrip';document.querySelector('.ct-spell-caster__casting-level-current').textContent='';}]
 ]){
  await page.evaluate(()=>{secondary=false;resetSlots();events=[];cancelBuild=false;failCast=false;ritualMode='normal';key_modifiers={};intervention=false;document.querySelector('.ct-spell-caster__casting-action button').textContent='Cast';document.querySelector('.ct-spell-detail__level-school-item').textContent='1st Level Evocation';document.querySelector('.ct-spell-caster__casting-level-current').textContent='1st Level';});
  await page.evaluate(setup);await click();
  assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),4,label+' does not spend a slot');cases++;
 }
 await page.evaluate(async()=>{resetSlots();key_modifiers={};document.querySelector('.ct-spell-detail__level-school-item').textContent='1st Level Evocation';document.querySelector('.ct-spell-caster__casting-level-current').textContent='1st Level';await execute('ct-spell-pane',{force_damages_only:true});});
 assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),4,'separate damage roll never pays again');cases++;
 await page.evaluate(async()=>{await execute('ct-spell-pane',{nativeCast:()=>{nativeSpends++;document.querySelector('[data-level="1"]').click();}});});
 assert.equal(await page.evaluate(()=>nativeSpends),1);assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),3,'supplied native payer remains the only payer');cases++;
 // Exercise the actual pane binding: DDB's own Cast handler pays on its native
 // click. LightCore's attached handler must explicitly avoid adding a payer.
 const bindingStart=src.indexOf('        $(".ct-spell-caster__casting-action > button,.ddbc-spell-caster__casting-action > button").off(');
 assert.ok(bindingStart>=0);
 await page.evaluate(()=>{resetSlots();document.querySelector('.ct-spell-caster__casting-action button').onclick=()=>document.querySelector('[data-level="1"]').click();window.nativeExecution=execute;execute=(...args)=>window.cast=nativeExecution(...args);});
 await page.addScriptTag({content:'{const paneClass="ct-spell-pane";'+src.slice(bindingStart,src.indexOf('\n        });',bindingStart)+12)+'}'});
 await page.locator('.ct-spell-caster__casting-action button').click();await page.evaluate(()=>window.cast);
 assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),3,'native sidebar button already owns its payment');cases++;
 await page.evaluate(async()=>{resetSlots();throwCast=true;try{await execute('ct-spell-pane');}catch(e){if(e.message!=='fixture delivery failure')throw e;}throwCast=false;});
 assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),4,'thrown dispatch spends nothing');cases++;
 for(const useSecondary of [false,true])for(const isHit of [false,true])for(const deferred of [false,true]){
  await page.evaluate(({useSecondary,isHit,deferred})=>{secondary=useSecondary;managed=true;hit=isHit;autoDamage=!deferred;resetSlots();packets=[];wayBeyond20PendingAttackDamage.clear();}, {useSecondary,isHit,deferred});
  assert.equal(await click(),true);
  assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),3,'accepted attack spends once even on Miss, before deferred damage');
  if(deferred){await page.evaluate(async()=>{const id=Array.from(wayBeyond20PendingAttackDamage.keys())[0];await Promise.all([wayBeyond20ContinueAttackDamage(id),wayBeyond20ContinueAttackDamage(id)]);});}
  assert.equal(await page.evaluate(()=>wayBeyond20SpellSlotState(1).available),3,'damage continuation never spends a second slot');
  assert.equal(await page.evaluate(()=>packets.length),isHit?2:1,'only a confirmed hit sends damage, repeated continuation reuses it');cases++;
 }
 await page.evaluate(()=>{managed=false;secondary=false;resetSlots();});
 // The payment closure belongs to one cast, including retries of its commit.
 const once=await page.evaluate(async()=>{const pay=wayBeyond20SpellIconCastCommit('1st Level','1st Level','Chromatic Orb');await Promise.all([pay(),pay()]);await pay();return wayBeyond20SpellSlotState(1).available;});
 assert.equal(once,3);cases++;
 const stale=await page.evaluate(async()=>{resetSlots();const pay=wayBeyond20SpellIconCastCommit('1st Level','1st Level','Chromatic Orb');character={...owner,_id:'other-owner'};await pay();character=owner;return wayBeyond20SpellSlotState(1).available;});
 assert.equal(stale,4,'stale owner never spends against another character');cases++;
 const frozen=await page.evaluate(async()=>{resetSlots();dndbeyondDiceRoller.queryDamageType=async()=>{document.querySelector('.ct-spell-caster__casting-level-current').textContent='3rd Level';return 'Fire';};await execute('ct-spell-pane');return [wayBeyond20SpellSlotState(1).available,wayBeyond20SpellSlotState(3).available];});
 assert.deepEqual(frozen,[3,4],'casting level is captured before the damage chooser redraws the pane');cases++;
 const missing=await page.evaluate(async()=>{resetSlots();warnings=[];events=[];document.querySelector('[data-level="1"]').parentElement.remove();const pay=wayBeyond20SpellIconCastCommit('1st Level','1st Level','Chromatic Orb');await pay();await pay();return {warnings:warnings.length,other:wayBeyond20SpellSlotState(3).available,events};});
 assert.equal(missing.warnings,1,'unavailable counter is reported once without recasting');assert.equal(missing.other,4);assert.deepEqual(missing.events,[]);cases++;
 const changedOwner=await page.evaluate(async()=>{resetSlots();const original=wayBeyond20RequestPageSpellSlotChange;wayBeyond20RequestPageSpellSlotChange=async()=>{character={...owner,_id:'changed-during-payment'};return {changed:false};};const paid=await wayBeyond20SpendSpellSlot(1,{owner});character=owner;wayBeyond20RequestPageSpellSlotChange=original;return {paid,remaining:wayBeyond20SpellSlotState(1).available};});
 assert.deepEqual(changedOwner,{paid:false,remaining:4},'owner change during accounting cannot trigger a fallback against another sheet');cases++;
 const rejectedPayment=await page.evaluate(async()=>{resetSlots();warnings=[];const original=wayBeyond20RequestPageSpellSlotChange;wayBeyond20RequestPageSpellSlotChange=async()=>{throw Error('fixture payment failure');};const pay=wayBeyond20SpellIconCastCommit('1st Level','1st Level','Chromatic Orb');await pay();await pay();wayBeyond20RequestPageSpellSlotChange=original;return {warnings:warnings.length,remaining:wayBeyond20SpellSlotState(1).available};});
 assert.deepEqual(rejectedPayment,{warnings:1,remaining:4},'payment error is visible and never retries a cast or a slot');cases++;
 const utility=await page.evaluate(async()=>{resetSlots();document.querySelector('.ct-spell-caster__casting-level-current').textContent='1st Level';document.querySelector('.ct-spell-caster__modifiers--damages').remove();const props=propertyListToDict;propertyListToDict=()=>({...props(),'To Hit':'--'});await execute('ct-spell-pane');return {type:packets.at(-1).type,remaining:wayBeyond20SpellSlotState(1).available};});
 assert.deepEqual(utility,{type:'spell-card',remaining:3},'description-only spell branch shares the same successful-cast payment');cases++;
 assert.deepEqual(errors,[]);console.log('PASS spell icon slot accounting: '+cases+' cases; real icon, dispatcher, lock, exact native slot updater, both workflows.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
