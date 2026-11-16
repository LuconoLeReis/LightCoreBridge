// Offline composition: live stat-block fixture -> casting choice -> active
// effect -> Actions -> real Monster builder/shared lifecycle/sendRoll.
// DDB digital-dice renderer/optional VTT delivery are explicit boundaries.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function fn(file,name){const s=read(file),a=s.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(a>=0,name);const b=s.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return s.slice(a,b<0?undefined:a+1+b);}
const char='src/dndbeyond/content-scripts/character.js',util='src/dndbeyond/base/utils.js';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const html=read('tests/fixtures/find-steed-stat-block.html');
 await page.setContent('<section class="ct-spell-pane"><div class="ct-spell-detail__description"><p>If you already have a steed from this spell, the steed is replaced by the new one.</p>'+html+'</div></section><div id="root"></div>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.addScriptTag({content:`
 var saved={'waybeyond20-active-effects':[]},writes=[],requests=[],notifications=[],operations=[],key_modifiers={},decline=false,failRoll=false,promptCount=0,constructed=0;
 var settings={'auto-roll-damage':true,'waybeyond20-secondary-attacks':true,'roll-type':0,'whisper-type':0,'vtt-tab':null};
 var RollType={NORMAL:0,QUERY:2,ADVANTAGE:3,DISADVANTAGE:4,SUPER_ADVANTAGE:6,SUPER_DISADVANTAGE:7,OVERRIDE_ADVANTAGE:8,OVERRIDE_DISADVANTAGE:9};
 var WhisperType={NO:0,YES:1,QUERY:2,HIDE_NAMES:3},CriticalRules={PHB:0,HOMEBREW_MAX:1,HOMEBREW_DOUBLE:2,HOMEBREW_MOD:3,HOMEBREW_REROLL:4};
 class CharacterBase {constructor(type,global){constructed++;this._type=type;this._global_settings=global;this._url='https://www.dndbeyond.com/characters/test';}type(){return this._type;}getSetting(k,d='',s=null){return(s||this._settings||{})[k]??d;}getGlobalSetting(k,d=''){return this._global_settings[k]??d;}}
 var character={_id:'caster',_name:'Test Paladin',_spell_attacks:{Paladin:'+9'},_spell_saves:{Paladin:'17'},_classes:{Paladin:9},
  getSetting:(k,d)=>saved[k]??d,mergeCharacterSettings:(patch,done)=>{writes.push(structuredClone(patch));Object.assign(saved,structuredClone(patch));done?.();}};
 var owner=character;
 function wb20FeatureEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 async function wb20FeatureForm(title,body){promptCount++;if(decline)return null;const form=$('<form>'+body+'</form>');if(window.choice)form.find('[name="summon-type"]').val(choice);return form;}
 var alertify={warning:m=>notifications.push(m)};
 async function wayBeyond20ConfirmChoice(){return !decline;}
 function wayBeyond20ScheduleActiveEffectBadgeRefresh(){}function wayBeyond20SendEffectsUpdate(){}
 function wayBeyond20ExtensionContextAvailable(){return true;}function wayBeyond20NotifyDispatchFailure(m){notifications.push(m);}
 const wayBeyond20RollDeliveries=new WeakMap(),wayBeyond20ResolvedRollHooks=new WeakMap();
 var dndbeyondDiceRoller={queryWhisper:async()=>0,queryAdvantage:async()=>0,handleRollRequest:async req=>{
  if(failRoll)throw Error('test renderer unavailable');requests.push(structuredClone(req));const d=wayBeyond20RollDeliveries.get(req);d.invoked=true;d.resolve({ok:true,local:true});}};
 function addEffect(args,name){(args.effects||=[]).push(name);}
 `});
 await page.addScriptTag({content:[fn('src/common/utils.js','cleanRoll'),fn('src/common/utils.js','reMatchAll'),fn(util,'damagesToCrits'),fn(util,'wayBeyond20TrackRollDelivery'),fn(util,'sendRoll'),
  ...['wayBeyond20ParseEffectLevel','wayBeyond20GenerateEffectId','wayBeyond20CurrentCharacterName','wayBeyond20OwnerLevel','wayBeyond20CleanEffectText','wayBeyond20EscapeRegExp','wayBeyond20BuildKnownSpellEffectData','wayBeyond20BuildSpellEffect','wayBeyond20AddSpellEffectToSettings','wayBeyond20CreateSpellEffectPlan','wayBeyond20GetTrackedSpellEffects','wayBeyond20GetConcentrationEffect','wb20SetActionRange','wb20DecorateActionValues'].map(n=>fn(char,n)),
  fn('src/dndbeyond/content-scripts/feature-rules.js','wb20SetActionNote')].join('\n')});
 await page.addScriptTag({content:read('src/dndbeyond/base/monster.js')+'\n'+read('src/dndbeyond/base/attack-workflow.js')+'\n'+read('src/dndbeyond/base/attack-workflow-stat-block.js')});
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/resources.js')});
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/summons.js')});
 const make=async(type,level=3)=>page.evaluate(async({type,level})=>{window.choice=type;window.effect=await wb20PrepareSummonEffect(character,{spellName:'Find Steed',source:'Faithful Steed',level:'2nd Level Conjuration',castAt:level+'rd',description:'If you already have a steed from this spell, the steed is replaced by the new one.'});return effect;},{type,level});
 const commit=()=>page.evaluate(()=>{const patch={};wayBeyond20AddSpellEffectToSettings(character,patch,effect);character.mergeCharacterSettings(patch);});
 const render=()=>page.evaluate(()=>{const host=document.querySelector('#root');wb20SummonRows(host);wb20DecorateActionValues(host,'.wb20-summon-row');});
 for(const [type,damage,bonus] of [['Celestial','Radiant','Healing Touch'],['Fey','Psychic','Fey Step'],['Fiend','Necrotic','Fell Glare']]){
  const effect=await make(type);assert.equal(effect.summon.level,3);assert.equal(effect.summon.replacePrevious,true);
  assert.equal(await page.evaluate(()=>writes.length),type==='Celestial'?0:type==='Fey'?1:2,'prepare does not persist');
  await commit();await render();assert.equal(await page.locator('.wb20-summon-row').count(),2);
  assert.deepEqual(await page.locator('.wb20-summon-row .wb20-feature-option-name').allTextContents(),['Otherworldly Slam',bonus]);
  const props=await page.evaluate(()=>{const actor=wb20SummonActor(effect,character);return actor.buildAttackRoll('Otherworldly Slam',wb20SummonActionText(effect.summon.template.actions[0],effect.summon,character));});
  assert.equal(props['to-hit'],'+9');assert.deepEqual(props.damages,['1d8 + 3']);assert.deepEqual(props['damage-types'],[damage]);
  assert.equal(await page.evaluate(()=>wb20SummonEffects().length),1,'recast replaces just the prior steed');
 }

 assert.equal(await page.evaluate(()=>wb20RunSummonAction(character,wb20SummonEffects()[0].id,'Fell Glare')),true);
 const glare=await page.evaluate(()=>requests.at(-1));assert.equal(glare['save-dc'],'17');assert.match(glare['save-ability'],/Wisdom/i);assert.equal(glare['to-hit'],undefined,'Fell Glare announces a target save, not a caster attack');
 await make('Fey');await commit();
 assert.equal(await page.evaluate(()=>wb20RunSummonAction(character,wb20SummonEffects()[0].id,'Fey Step')),true);
 assert.equal(await page.evaluate(()=>requests.at(-1).type),'trait');
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.used['Fey Step']),true);
 await make('Fiend');await commit();
 assert.deepEqual(await page.evaluate(()=>wb20SummonStats(effect.summon,character)),{ac:13,hp:35,speed:'60 ft.',attack:9,dc:17});
 assert.equal(await page.evaluate(()=>{effect.summon.level=4;return wb20SummonStats(effect.summon,character).speed;}),'60 ft., Fly 60 ft.');
 await make('Celestial',2);await commit();await render();

 if(process.env.WB20_SUMMON_EVIDENCE){
  await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
  await page.addStyleTag({content:'body{font:14px Arial;background:#151d22;color:#eee}#root{width:660px;padding:16px;--wb20-value-border-color:#c15b12;--wb20-action-value-color:#fff;--wb20-value-icon-color:#8c999f}#root .ddbc-combat-attack__name{flex:1;min-width:0}#root .ddbc-combat-attack__range,#root .ddbc-combat-attack__action{flex:0 0 64px}#root .ddbc-combat-attack__damage{flex:0 0 90px}#root .ddbc-combat-attack__notes{flex:0 0 130px}.wb20-talent-category{font-size:11px;color:#aebcc4}#root::before{content:"ACTIVE SUMMON · 2nd-level Celestial";display:block;margin-bottom:12px;font-size:12px;font-weight:bold}'});
  await page.locator('#root').screenshot({path:path.join(process.env.WB20_SUMMON_EVIDENCE,'summon-actions-dark.png')});
 }
 const actorCount=await page.evaluate(()=>constructed);
 const idle=await page.evaluate(async()=>{let n=0;const m=new MutationObserver(r=>n+=r.length);m.observe(document.querySelector('#root'),{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<10;i++){wb20SummonRows(document.querySelector('#root'));wb20DecorateActionValues(document.querySelector('#root'),'.wb20-summon-row');}await new Promise(r=>setTimeout(r,20));m.disconnect();return n;});assert.equal(idle,0,'unchanged rows settle');assert.equal(await page.evaluate(()=>constructed),actorCount,'idle does not reconstruct actors or reapply global settings');
 const before=await page.evaluate(()=>writes.length);
 await page.evaluate(()=>{decline=true;});assert.equal(await make('Fey'),null);assert.equal(await page.evaluate(()=>writes.length),before,'cancel writes nothing');await page.evaluate(()=>decline=false);
 // Real shared workflow, both settings, never caster resource/rider props.
 for(const secondary of [false,true]){
  await page.evaluate(secondary=>settings['waybeyond20-secondary-attacks']=secondary,secondary);
  assert.equal(await page.evaluate(()=>wb20RunSummonAction(character,wb20SummonEffects()[0].id,'Otherworldly Slam',document.querySelector('.wb20-summon-row'))),true);
  const req=await page.evaluate(()=>requests.at(-1));assert.equal(req.character.type,'Creature');assert.equal(req.character.creatureType,'Summoned');assert.match(req.character.name,/Celestial/);assert.equal(req['to-hit'],'+9');assert.deepEqual(req.damages,['1d8 + 2']);
  for(const key of ['waybeyond20-resource-costs','waybeyond20-turn-resource','waybeyond20-spell-effect'])assert.equal(req[key],undefined);
  assert.equal(req.character.settings,undefined,'no caster smite/mastery/bless toggles inherited');
 }
 assert.equal(await page.evaluate(()=>wb20RunSummonAction(character,wb20SummonEffects()[0].id,'Healing Touch')),true);
 assert.deepEqual(await page.evaluate(()=>requests.at(-1).damages),['2d8 + 2']);assert.deepEqual(await page.evaluate(()=>requests.at(-1)['damage-types']),['Healing']);
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.used['Healing Touch']),true);
 await page.evaluate(()=>decline=true);const count=await page.evaluate(()=>requests.length);
 assert.equal(await page.evaluate(()=>wb20RunSummonAction(character,wb20SummonEffects()[0].id,'Healing Touch')),false);assert.equal(await page.evaluate(()=>requests.length),count);
 await page.evaluate(()=>{decline=false;return wb20ResourcesRest(character,'short');});assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.used['Healing Touch']),true);
 await page.evaluate(()=>wb20ResourcesRest(character,'long'));assert.deepEqual(await page.evaluate(()=>wb20SummonEffects()[0].summon.used),{});
 await page.evaluate(()=>failRoll=true);assert.equal(await page.evaluate(()=>wb20RunSummonAction(character,wb20SummonEffects()[0].id,'Healing Touch')),false);assert.deepEqual(await page.evaluate(()=>wb20SummonEffects()[0].summon.used),{});await page.evaluate(()=>failRoll=false);
 await page.evaluate(()=>{saved['waybeyond20-active-effects']=[];});await render();assert.equal(await page.locator('.wb20-summon-row').count(),0,'ending summon removes rows');
 assert.equal(await page.evaluate(()=>wb20RunSummonAction(character,'stale','Otherworldly Slam')),false);
 // Exercise the actual utility-cast producer with a live stat-block DOM.
 await page.addScriptTag({content:fn(char,'wayBeyond20CommitAfterDispatch')+'\n'+fn(char,'wayBeyond20CommitRollSettings')+'\n'+fn(char,'wayBeyond20CommitSpellRollSettings')+'\n'+fn(char,'wayBeyond20ApplyRitualMode')+'\n'+fn(char,'rollSpell')});
 await page.evaluate(()=>{
  document.querySelector('.ct-spell-pane').insertAdjacentHTML('afterbegin','<header class="ct-sidebar__header"><div class="ct-sidebar__header-parent">Faithful Steed</div><div class="ct-sidebar__heading"><span class="ddbc-spell-name">Find Steed</span></div></header><div class="ct-spell-detail__level-school-item">2nd Level Conjuration</div><div class="ct-spell-caster__casting-level-current">3rd</div>');
  window.propertyListToDict=()=>({'Casting Time':'1 action','Duration':'Instantaneous','Range/Area':'30 ft.'});
  window.descriptionToString=()=>document.querySelector('.ct-spell-detail__description').textContent;
  window.wayBeyond20ChooseRitualMode=async()=> 'normal';window.wayBeyond20ParseTalent=()=>({});window.findToHit=()=>null;
  window.wayBeyond20AttachActivationResource=()=>{};window.wayBeyond20ConfirmCastingConflicts=async()=>true;window.wayBeyond20ApplyOccultistIntrusion=async()=>{};
  window.castPackets=0;window.nativeUses=0;window.failCast=false;
  // Model the real dispatcher's resource transaction around after-dispatch
  // callbacks. A nested acquire would deadlock navigator.locks in production.
  window.wb20DispatchResources=()=>{};
  window.sendRollWithCharacter=async(type,fallback,args)=>wb20ResourceLocked(async()=>{castPackets++;if(failCast)return false;for(const commit of args['waybeyond20-after-dispatch']||[])await commit();return true;},character);
  saved['waybeyond20-active-effects']=[];decline=true;
 });
 assert.equal(await page.evaluate(()=>rollSpell(false,false,false,()=>nativeUses++)),false);
 assert.equal(await page.evaluate(()=>castPackets),0,'cancel in producer never dispatches or pays');
 await page.evaluate(()=>{decline=false;failCast=true;choice='Fey';});await page.evaluate(()=>rollSpell(false,false,false,()=>nativeUses++));
 assert.equal(await page.evaluate(()=>nativeUses),0);assert.equal(await page.evaluate(()=>wb20SummonEffects().length),0,'failed cast never registers summon');
 await page.evaluate(()=>{failCast=false;return rollSpell(false,false,false,()=>nativeUses++);});
 assert.equal(await page.evaluate(()=>nativeUses),1,'completed cast pays native use exactly once');
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.level),3);assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.type),'Fey');
 const spellsBefore=await page.evaluate(()=>wb20SummonEffects().length);await page.evaluate(()=>rollSpell(true));assert.equal(await page.evaluate(()=>wb20SummonEffects().length),spellsBefore,'reading/showing spell never summons');
 // Restore already-cast creatures without a second native cast or resource spend.
 await page.evaluate(()=>{wb20SummonExistingControl();wb20SummonExistingControl();});assert.equal(await page.locator('.wb20-track-summon').count(),1);
 await page.locator('.wb20-track-summon').click();assert.equal(await page.evaluate(()=>nativeUses),1);assert.equal(await page.evaluate(()=>wb20SummonEffects().length),1);

 const preservedId=await page.evaluate(()=>{const e=wb20SummonEffects()[0];e.summon.used['Fey Step']=true;return e.id;});
 await page.locator('.wb20-track-summon').click();
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].id),preservedId);
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.used['Fey Step']),true,'tracking the existing summon preserves spent abilities');
 assert.equal(await page.evaluate(()=>wb20SummonEffects().length),1);
 assert.equal(await page.evaluate(()=>{const e=structuredClone(wb20SummonEffects()[0]);e.characterId='other';saved['waybeyond20-active-effects'].push(e);return wb20SummonEffects().length;}),1,'foreign character effects do not become controllable');
 await page.evaluate(()=>wb20ResourcesRest(character,'long'));
 assert.equal(await page.evaluate(()=>saved['waybeyond20-active-effects'].find(e=>e.characterId==='other').summon.used['Fey Step']),true,'caster rest leaves foreign records untouched');
 for(const secondary of [false,true]){
  const result=await page.evaluate(async secondary=>{
   settings['waybeyond20-secondary-attacks']=secondary;settings['roll-type']=RollType.QUERY;
   const count=requests.length;dndbeyondDiceRoller.queryAdvantage=async()=>{saved['waybeyond20-active-effects']=[];return RollType.NORMAL;};
   const accepted=await wb20RunSummonAction(character,wb20SummonEffects()[0].id,'Otherworldly Slam');
   settings['roll-type']=RollType.NORMAL;return {accepted,sent:requests.length-count};
  },secondary);
  assert.deepEqual(result,{accepted:false,sent:0},'dismissal during the common roll query cancels without dispatch, with either workflow setting');
  await make('Fey');await commit();
 }

 // Compose the real character producer, dispatcher, resource transaction and
 // summon commit. Only DDB's renderer/native slot control remain boundaries.
 await page.addScriptTag({content:[fn(char,'sendRollWithCharacter'),fn(char,'wayBeyond20DispatchRollWithCharacter'),fn('src/dndbeyond/content-scripts/resources.js','wb20DispatchResources')].join('\n')});
 await page.evaluate(()=>{
  character.type=()=> 'Character';character.getGlobalSetting=(k,d)=>settings[k]??d;
  character.getDict=()=>({name:'Test Paladin',type:'Character'});character.hasRacialTrait=()=>false;
  window.wayBeyond20CharacterDebug=()=>{};window.wayBeyond20AttackActivationTurnKey=()=> 'turn';window.wayBeyond20GetTurnTrackerState=()=>({});
  window.wayBeyond20AttachActivationResource=args=>args['waybeyond20-resource-costs']=[];
  dndbeyondDiceRoller.queryAdvantage=async()=>RollType.NORMAL;
  saved['waybeyond20-active-effects']=[];choice='Celestial';failRoll=false;
 });
 const nativeBefore=await page.evaluate(()=>nativeUses);
 assert.equal(await page.evaluate(()=>rollSpell(false,false,false,()=>nativeUses++)),true,'composed cast finishes without a nested resource lock');
 await page.waitForFunction(()=>wb20SummonEffects().length===1);
 assert.equal(await page.evaluate(()=>nativeUses),nativeBefore+1);
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.level),3);
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.type),'Celestial');
 await page.evaluate(()=>{failRoll=true;choice='Fiend';});
 assert.equal(await page.evaluate(()=>rollSpell(false,false,false,()=>nativeUses++)),false);
 assert.equal(await page.evaluate(()=>wb20SummonEffects()[0].summon.type),'Celestial','failed composed cast preserves the existing summon');
 assert.equal(await page.evaluate(()=>nativeUses),nativeBefore+1);

 // Undead spell integration uses captured DDB markup, never authored stats.
 const undeadHTML=read('tests/fixtures/summon-undead-live.html'),animationHTML=read('tests/fixtures/animate-dead-live.html');
 const setSpell=async(html,name,level,castAt)=>page.evaluate(({html,name,level,castAt})=>{
   const pane=document.querySelector('.ct-spell-pane');pane.querySelector('.ct-spell-detail__description').innerHTML=html;
   pane.querySelector('.ddbc-spell-name').textContent=name;pane.querySelector('.ct-spell-detail__level-school-item').textContent=level;
   pane.querySelector('.ct-spell-caster__casting-level-current').textContent=castAt;
 },{html,name,level,castAt});
 await page.evaluate(()=>{
   saved['waybeyond20-active-effects']=[];saved['waybeyond20-concentration']=null;failRoll=false;decline=false;
   window.wb20FeatureForm=async(title,body)=>{
     if(decline)return null;const form=$('<form>'+body+'</form>');
     if(window.choice)form.find('[name="summon-type"]').val(choice);
     if(window.animationMode)form.find('[name="animation-mode"]').val(animationMode);
     (window.animationCounts||[]).forEach((n,i)=>form.find('[name="animation-count-'+i+'"]').val(n));
     form.find('[name="animation-renew"]').each((_,el)=>el.checked=(window.renewIds||[]).includes(el.value));
     if(window.management){form.find('[name="creature-name"]').val(management.name);form.find('[name="creature-hp"]').val(management.hp);form.find('[name="control-hours"]').val(management.hours);}
     if(window.commandOrder){form.find('[name="command-creature"]').each((_,el)=>el.checked=true);form.find('[name="creature-order"]').val(commandOrder);form.find('[name="command-range"]').prop('checked',true);}
     return form;
   };
 });
 await setSpell(undeadHTML,'Summon Undead','3rd Level Necromancy','3rd');
 for(const [type,hp,speed,dice,damageType,action] of [
   ['Ghostly',30,'30 ft., Fly 40 ft. (hover)','1d8 + 6','Necrotic','Deathly Touch'],
   ['Putrid',30,'30 ft.','1d6 + 6','Slashing','Rotting Claw'],
   ['Skeletal',20,'30 ft.','2d4 + 6','Necrotic','Grave Bolt']]) {
   const value=await page.evaluate(async type=>{choice=type;effect=await wb20PrepareSummonEffect(character,{spellName:'Summon Undead',source:'Oath',level:'3rd',castAt:'3rd',concentration:true,duration:'Concentration, up to 1 hour',description:document.querySelector('.ct-spell-detail__description').textContent});return {effect,stats:wb20SummonStats(effect.summon,character),actions:wb20SummonActions(effect.summon).map(a=>a.name)};},type);
   assert.equal(value.stats.hp,hp);assert.equal(value.stats.ac,14);assert.equal(value.stats.speed,speed);assert.equal(value.effect.concentration,true);assert.deepEqual(value.actions,[action]);
   assert.equal(value.effect.summon.template.attacksDivisor,2);
   await page.evaluate(()=>wb20CommitSummonEffect(character,effect));assert.equal(await page.evaluate(()=>wb20SummonEffects().length),1,'a new concentration summon replaces the old');
   assert.equal(await page.evaluate(()=>saved['waybeyond20-concentration'].id),value.effect.id);
   await render();if(type==='Skeletal')assert.match(await page.locator('.wb20-summon-row .ddbc-combat-attack__range').innerText(),/150/);assert.equal(await page.evaluate(action=>wb20RunSummonAction(character,effect.id,action,document.querySelector('.wb20-summon-row')),action),true);
   const req=await page.evaluate(()=>requests.at(-1));assert.equal(req['to-hit'],'+9');assert.deepEqual(req.damages,[dice]);assert.deepEqual(req['damage-types'],[damageType]);
   assert.equal(req.character.creatureType,'Summoned');assert.equal(req['waybeyond20-turn-resource'],undefined);
 }
 const trackedSpirit=await page.evaluate(async()=>{
   const pane=document.querySelector('.ct-spell-pane'),normal=wb20FeatureForm,previous=wb20SummonEffects()[0];
   previous.summon.currentHP=9;
   window.wb20FeatureForm=async(...args)=>{const form=await normal(...args);pane.remove();return form;};
   const tracked=await wb20PrepareSummonEffect(character,{spellName:'Summon Undead',source:'Oath',level:'3rd',castAt:'3rd',description:pane.querySelector('.ct-spell-detail__description').textContent,concentration:true,existing:true});
   if(tracked)await wb20CommitSummonEffect(character,tracked);
   document.body.append(pane);window.wb20FeatureForm=normal;
   return {prepared:!!tracked,id:tracked?.id===previous.id,hp:tracked?.summon.currentHP,count:wb20SummonEffects().length};
 });
 assert.deepEqual(trackedSpirit,{prepared:true,id:true,hp:9,count:1},'existing spirit tracking tolerates native sidebar dismissal and preserves its identity/HP');
 assert.deepEqual(await page.evaluate(()=>{const e=structuredClone(effect);e.summon.level=4;return {hp:wb20SummonStats(e.summon,character).hp,attacks:Math.floor(e.summon.level/e.summon.template.attacksDivisor)};}),{hp:30,attacks:2});
 await page.evaluate(()=>{const patch={};wayBeyond20AddSpellEffectToSettings(character,patch,{id:'other-concentration',name:'Other spell',characterId:'caster',concentration:true});character.mergeCharacterSettings(patch);});
 await render();assert.equal(await page.locator('.wb20-summon-row').count(),0,'ending/replacing concentration removes its spirit controls');
 // Native Extras definitions are cached once, with actual current-edition HP/actions.
 for(const name of ['skeleton','zombie']) {
   await page.evaluate(html=>document.body.insertAdjacentHTML('beforeend',html),read('tests/fixtures/'+name+'-live.html'));
   await page.evaluate(()=>wb20CaptureCreatureTemplate());await page.waitForFunction(name=>!!saved['waybeyond20-creature-templates']?.[name],name==='skeleton'?'Skeleton':'Zombie');
   const priorWrites=await page.evaluate(()=>writes.length);await page.evaluate(()=>{for(let i=0;i<10;i++)wb20CaptureCreatureTemplate();});assert.equal(await page.evaluate(()=>writes.length),priorWrites,'native definition cache settles after first read');
   await page.evaluate(()=>document.querySelector('section[class*="styles_creatureBlock"]').remove());
 }
 assert.equal(await page.evaluate(()=>saved['waybeyond20-creature-templates'].Skeleton.hp[0]),13);
 assert.equal(await page.evaluate(()=>saved['waybeyond20-creature-templates'].Zombie.hp[0]),15);
 await setSpell(animationHTML,'Animate Dead','3rd Level Necromancy','4th');
 await page.evaluate(()=>{animationMode='create';animationCounts=[1,2];choice=null;saved['waybeyond20-active-effects']=[];});
 const prepareAnimation=()=>page.evaluate(async()=>{effect=await wb20PrepareSummonEffect(character,{spellName:'Animate Dead',source:'Oath',level:'3rd',castAt:document.querySelector('.ct-spell-caster__casting-level-current').textContent,description:document.querySelector('.ct-spell-detail__description').textContent});return effect;});
 assert.equal((await prepareAnimation()).animation.counts.reduce((a,b)=>a+b),3);
 await page.evaluate(()=>wb20CommitSummonEffect(character,effect));await render();
 assert.match(await page.locator('.wb20-summon-row').filter({hasText:'Shortbow'}).locator('.ddbc-combat-attack__range').innerText(),/80[\s\S]*320/);
 let animated=await page.evaluate(()=>wb20SummonEffects());assert.equal(animated.length,3);assert.equal(new Set(animated.map(e=>e.id)).size,3);assert.equal(new Set(animated.map(e=>e.name)).size,3);
 assert.equal(await page.locator('.wb20-companion-command').count(),1);
 assert.equal(await page.locator('.wb20-summon-row').count(),4,'Skeleton has two attacks and each Zombie one');
 for(const [type,action,bonus,dice] of [['Skeleton','Shortbow','+5','1d6 + 3'],['Zombie','Slam','+3','1d8 + 1']]){
   assert.equal(await page.evaluate(({type,action})=>{const e=wb20SummonEffects().find(e=>e.summon.type===type);return wb20RunSummonAction(character,e.id,action);},{type,action}),true);
   const req=await page.evaluate(()=>requests.at(-1));assert.equal(req['to-hit'],bonus);assert.deepEqual(req.damages,[dice]);assert.equal(req.character.settings,undefined);
 }
 if(process.env.WB20_SUMMON_EVIDENCE){
   await page.addStyleTag({content:'#root::before{content:"ANIMATED CREATURES · 4th-level cast · synthetic DOM test"}#root{background:#151d22}'});
   await page.locator('#root').screenshot({path:path.join(process.env.WB20_SUMMON_EVIDENCE,'animated-actions-dark.png')});
 }
 const ids=animated.map(e=>e.id);
 await page.evaluate(ids=>{const e=wb20SummonEffects()[0];e.summon.currentHP=7;e.summon.used.test=true;for(const e of wb20SummonEffects())e.summon.control.hoursLeft=2;animationMode='renew';renewIds=ids;},ids);
 await prepareAnimation();await page.evaluate(()=>wb20CommitSummonEffect(character,effect));
 animated=await page.evaluate(()=>wb20SummonEffects());assert.deepEqual(animated.map(e=>e.id),ids);assert.equal(animated[0].summon.currentHP,7);assert.equal(animated[0].summon.used.test,true);assert.ok(animated.every(e=>e.summon.control.hoursLeft===24));
 const savedBefore=await page.evaluate(()=>JSON.stringify(saved));await page.evaluate(()=>{decline=true;});assert.equal(await prepareAnimation(),null);assert.equal(await page.evaluate(()=>JSON.stringify(saved)),savedBefore);await page.evaluate(()=>decline=false);

 // Native DDB closes/unmounts its sidebar when the separate Track dialog is
 // confirmed. Manual tracking has a captured snapshot, no native cast button.
 const lifetime=await page.evaluate(async()=>{
   const pane=document.querySelector('.ct-spell-pane'),normal=wb20FeatureForm;
   const first=wb20SummonEffects()[0];first.summon.control.hoursLeft=2;first.summon.currentHP=7;
   animationMode='renew';renewIds=[first.id];
   window.wb20FeatureForm=async(...args)=>{const form=await normal(...args);pane.remove();return form;};
   const plan=await wb20PrepareSummonEffect(character,{spellName:'Animate Dead',source:'Oath',level:'3rd',castAt:'4th',description:pane.querySelector('.ct-spell-detail__description').textContent,existing:true});
   if(plan)await wb20CommitSummonEffect(character,plan);
   document.body.append(pane);window.wb20FeatureForm=normal;
   const result=wb20SummonEffects().find(e=>e.id===first.id);
   return {prepared:!!plan,hours:result.summon.control.hoursLeft,hp:result.summon.currentHP,count:wb20SummonEffects().length};
 });
 assert.deepEqual(lifetime,{prepared:true,hours:24,hp:7,count:3},'manual renewal survives native sidebar closure without cloning/healing');
 // Actual casting retains its stricter source lifetime because it owns a
 // native slot/use handoff. A different pane or owner is never accepted.
 const rejected=await page.evaluate(async()=>{
   const pane=document.querySelector('.ct-spell-pane'),normal=wb20FeatureForm,description=pane.querySelector('.ct-spell-detail__description').textContent;
   window.wb20FeatureForm=async(...args)=>{const form=await normal(...args);pane.remove();return form;};
   const cast=await wb20PrepareSummonEffect(character,{spellName:'Animate Dead',source:'Oath',level:'3rd',castAt:'4th',description});
   document.body.append(pane);
   window.wb20FeatureForm=async(...args)=>{const form=await normal(...args);pane.replaceWith(pane.cloneNode(true));return form;};
   const replaced=await wb20PrepareSummonEffect(character,{spellName:'Animate Dead',source:'Oath',level:'3rd',castAt:'4th',description,existing:true});
   document.querySelector('.ct-spell-pane').replaceWith(pane);window.wb20FeatureForm=normal;
   return {cast,replaced};
 });
 assert.deepEqual(rejected,{cast:null,replaced:null});
 const storedDefinitions=await page.evaluate(()=>saved['waybeyond20-creature-templates']);
 await page.evaluate(()=>{saved['waybeyond20-creature-templates']={};animationMode='untracked';});assert.equal(await prepareAnimation(),undefined,'untracked casting stays available without any definition');
 await page.evaluate(()=>animationMode='create');assert.equal(await prepareAnimation(),null,'missing definitions are never fabricated');
 await page.evaluate(defs=>{saved['waybeyond20-creature-templates']=defs;animationMode='renew';},storedDefinitions);
 // Expired control is excluded from renewal and cannot attack.
 await page.evaluate(()=>{const e=wb20SummonEffects()[0];e.summon.control.hoursLeft=0;renewIds=[e.id];});assert.equal(await prepareAnimation(),null);
 assert.equal(await page.evaluate(()=>{const e=wb20SummonEffects()[0];return wb20RunSummonAction(character,e.id,'Shortsword');}),false);
 // Repeated cast creates new identities. Renewal never does, and never refills HP.
 await setSpell(animationHTML,'Animate Dead','3rd Level Necromancy','3rd');
 await page.evaluate(()=>{animationMode='create';animationCounts=[1,0];});await prepareAnimation();await page.evaluate(()=>wb20CommitSummonEffect(character,effect));assert.equal(await page.evaluate(()=>wb20SummonEffects().length),4);
 await page.evaluate(()=>animationCounts=[2,0]);assert.equal(await prepareAnimation(),null,'3rd level cannot create two');
 // Current HP/name/control edits and zero-HP spirit disappearance stay local to one creature.
 const target=await page.evaluate(()=>{const e=wb20SummonEffects()[1];management={name:'Guard A',hp:4,hours:3};return e.id;});await page.evaluate(id=>wb20ManageSummon(id),target);
 assert.deepEqual(await page.evaluate(id=>{const e=wb20SummonEffects().find(e=>e.id===id);return [e.name,e.summon.currentHP,e.summon.control.hoursLeft];},target),['Guard A',4,3]);
 await render();const currentRows=await page.evaluate(async()=>{let n=0;const m=new MutationObserver(r=>n+=r.length);m.observe(document.querySelector('#root'),{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<10;i++){wb20SummonRows(document.querySelector('#root'));wb20DecorateActionValues(document.querySelector('#root'),'.wb20-summon-row');}await new Promise(r=>setTimeout(r,20));m.disconnect();return n;});assert.equal(currentRows,0,'animated rows settle');
 // Compose the actual spell producer and dispatcher for creation/failure and concentration.
 await page.evaluate(()=>{management=null;animationCounts=[1,0];window.propertyListToDict=()=>({'Casting Time':'1 minute','Duration':'Instantaneous','Range/Area':'10 ft.'});});
 const beforeCast=await page.evaluate(()=>({uses:nativeUses,count:wb20SummonEffects().length}));
 await page.evaluate(()=>failRoll=true);assert.equal(await page.evaluate(()=>rollSpell(false,false,false,()=>nativeUses++)),false);assert.deepEqual(await page.evaluate(()=>({uses:nativeUses,count:wb20SummonEffects().length})),beforeCast);
 await page.evaluate(()=>failRoll=false);assert.equal(await page.evaluate(()=>rollSpell(false,false,false,()=>nativeUses++)),true);await page.waitForFunction(count=>wb20SummonEffects().length===count,beforeCast.count+1);assert.equal(await page.evaluate(()=>nativeUses),beforeCast.uses+1);
 await setSpell(undeadHTML,'Summon Undead','3rd Level Necromancy','3rd');await page.evaluate(()=>{choice='Ghostly';window.propertyListToDict=()=>({'Casting Time':'1 action','Duration':'Concentration, up to 1 hour','Range/Area':'90 ft.'});});
 assert.equal(await page.evaluate(()=>rollSpell(false,false,false,()=>nativeUses++)),true);await page.waitForFunction(()=>wb20SummonEffects().some(e=>e.summon.type==='Ghostly'));
 assert.equal(await page.evaluate(()=>wb20SummonEffects().find(e=>e.summon.type==='Ghostly').concentration),true);
 const spirit=await page.evaluate(()=>{const e=wb20SummonEffects().find(e=>e.summon.type==='Ghostly');management={name:e.name,hp:0,hours:0};return e.id;});await page.evaluate(id=>wb20ManageSummon(id),spirit);
 assert.equal(await page.evaluate(id=>wb20SummonEffects().some(e=>e.id===id),spirit),false);assert.equal(await page.evaluate(()=>saved['waybeyond20-concentration']),null);
 // Command gives one Bonus Action intent, one order to multiple in-range creatures.
 await page.addScriptTag({content:fn(char,'wayBeyond20AttachTurnResource')});
 await page.evaluate(()=>{management=null;commandOrder='Guard the door';window.sendRollWithCharacter=async(type,fallback,args)=>{window.commandPacket={type,...args};for(const commit of args['waybeyond20-after-dispatch']||[])await commit();return true;};});
 assert.equal(await page.evaluate(()=>wb20CommandAnimated(character)),true);
 assert.equal(await page.evaluate(()=>commandPacket['waybeyond20-turn-resource'].resource),'bonusAction');assert.equal(await page.evaluate(()=>commandPacket.type),'trait');
 assert.ok(await page.evaluate(()=>wb20SummonEffects().filter(e=>e.summon.control?.hoursLeft>0).every(e=>e.summon.control.order==='Guard the door')));
 // Actual character/resource dispatcher spends one BA after a completed group
 // command. Native turn-state UI is the explicit boundary, as in combat tests.
 await page.addScriptTag({content:fn(char,'sendRollWithCharacter')});
 await page.evaluate(()=>{
   window.commandState={inCombat:true,bonusAction:1,action:1,reaction:1};window.commandSpends=0;
   window.wayBeyond20GetTurnTrackerState=()=>commandState;
   window.wayBeyond20PreflightTurnResource=async resource=>commandState[resource]>0;
   window.wayBeyond20SpendTurnResource=resource=>{commandSpends++;commandState[resource]--;};
   commandOrder='Attack the intruder';failRoll=false;
 });
 assert.equal(await page.evaluate(()=>wb20CommandAnimated(character)),true);
 assert.deepEqual(await page.evaluate(()=>[commandState.bonusAction,commandSpends]),[0,1]);
 await page.evaluate(()=>{commandState.bonusAction=1;failRoll=true;commandOrder='Never delivered';});
 assert.equal(await page.evaluate(()=>wb20CommandAnimated(character)),false);assert.deepEqual(await page.evaluate(()=>[commandState.bonusAction,commandSpends]),[1,1]);
 assert.ok(await page.evaluate(()=>wb20SummonEffects().filter(e=>e.summon.control?.hoursLeft>0).every(e=>e.summon.control.order==='Attack the intruder')));
 await page.evaluate(()=>{failRoll=false;commandState.bonusAction=0;});
 assert.equal(await page.evaluate(()=>wb20CommandAnimated(character)),false);assert.equal(await page.evaluate(()=>commandSpends),1);
 console.log('PASS undead live templates/forms/scaling/concentration; native creature cache; unique create/renew/control/HP; common rolls; one native payment; command BA intent; idle mutations=0.');
 await setSpell(html,'Find Steed','2nd Level Conjuration','3rd');await page.evaluate(()=>{choice='Fey';management=null;});
 await page.evaluate(()=>{const normal=wb20FeatureForm;window.wb20FeatureForm=async(...args)=>{const form=await normal(...args);document.querySelector('.stat-block').remove();return form;};});
 assert.equal(await make('Fey'),null,'closing/replacing the source pane during the summon choice cancels');assert.equal(await make('Fey'),undefined,'unrecognized/missing template leaves ordinary spell behavior');
 assert.deepEqual(errors,[]);console.log('PASS live-template scaling/types, prepare/cancel/replace, idempotent Actions, separate actor/shared attack workflow, healing, daily resource/recharge, failure and stale/end guards.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
