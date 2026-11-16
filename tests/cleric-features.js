const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function fn(file,name){const s=read(file),a=s.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(a>=0,name);const b=s.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return s.slice(a,b<0?undefined:a+1+b);}
function setup(){
 const rules=[{name:'Blessed Strikes',text:'Divine Strike. Once on each of your turns when you hit with a weapon attack, deal an extra 1d8 Necrotic or Radiant damage.'},
 {name:'Improved Blessed Strikes',text:'Divine Strike. The extra damage of your Divine Strike increases to 2d8.'},
 {name:'Supreme Healing',text:'When you restore HP with a spell or Channel Divinity, use the highest number possible for each die.'},
 {name:'Lucky',text:'You have 6 Luck Points. Spend 1 Luck Point to give yourself Advantage on the roll.'},
 {name:'Celestial Revelation',text:'Inner Radiance. Once on each of your turns, deal an additional 6 Radiant damage to one target. Each creature within 10 ft. takes 6 Radiant damage.'},
 {name:'Divine Intervention',text:'As a Magic action choose any Cleric spell of level 5 or lower that does not require a Reaction. Cast without a spell slot or Material components.'},
 {name:'Disciple of Life',text:'When a spell you cast with a spell slot restores HP, regain an additional 2 + the spell slot’s level.'}];
 const values={},ledger={history:[],turns:{}},pools={'Luck Points':6,'Celestial Revelation':1},state={inCombat:true,action:1,bonusAction:1,reaction:1};
 const packets=[],prompts=[],charges=[];let choice='skip',turn='combat:1';
 const owner={_id:'test',_class_features:rules.map(r=>r.name),_racial_traits:['Celestial Revelation'],_feats:['Lucky'],_spell_modifiers:{Cleric:5},
 getSetting:(k,d)=>values[k]??d,getAbility:()=>({mod:5}),mergeCharacterSettings:(v,cb)=>{Object.assign(values,v);cb?.();}};
 const c=vm.createContext({console,character:owner,wb20CurrentFeatureRules:()=>rules,wb20RuleText:t=>String(t||'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim(),
 wb20ResourceId:s=>String(s).toLowerCase(),wayBeyond20AttackActivationTurnKey:()=>turn,wayBeyond20GetTurnTrackerState:()=>state,
 wb20ResourceStore:()=>ledger,wb20ResourceSave:async()=>{},wb20ResourceLocked:async f=>f(),wb20HasFeature:()=>false,
 wb20PrepareCombatRequest:()=>false,wb20CommitCombatRequest:()=>false,wb20ReadActionGrant:()=>null,
 wb20Resource:n=>({name:n,remaining:pools[n],max:6}),wb20SetResource:async(n,v)=>{pools[n]=v;charges.push(n);return true;},
 wayBeyond20PreflightTurnResource:async()=>true,wayBeyond20SpendTurnResource:r=>state[r]--,wayBeyond20ConfirmChoice:async()=>true,
 wayBeyond20AttachTurnResource:(a,r)=>{a['waybeyond20-turn-resource']={resource:r};},
 wayBeyond20SpellCastLevel:(l,as)=>Number(String(as||l).match(/\d+/)?.[0]||0),
 addEffect:(a,e)=>{(a.effects ||= []).push(e);},damagesToCrits:(o,d)=>d,
 alertify:{warning:t=>prompts.push(['warning',t]),success:t=>prompts.push(['success',t])},
 dndbeyondDiceRoller:{queryGeneric:async(...args)=>{prompts.push(args);return choice;}},
 RollType:{NORMAL:0,ADVANTAGE:3,DISADVANTAGE:4,OVERRIDE_ADVANTAGE:6,OVERRIDE_DISADVANTAGE:7,SUPER_ADVANTAGE:8,SUPER_DISADVANTAGE:9}});
 vm.runInContext(read('src/dndbeyond/content-scripts/cleric-features.js'),c);
 vm.runInContext(fn('src/dndbeyond/content-scripts/resources.js','wb20DispatchResources'),c);
 vm.runInContext(fn('src/dndbeyond/base/utils.js','adjustRollAndKeyModifiersWithAdvantage'),c);
 async function dispatch(type,fallback,args){return c.wb20DispatchResources(args,{rollType:type},async()=>{
  if(c.fail)return false;
  const req={...args};if(req['waybeyond20-rule-advantage'])c.adjustRollAndKeyModifiersWithAdvantage(req);
  packets.push(req);args['waybeyond20-capture-result']?.({whisper:'private'},[],[[args.name,{total:9},1]]);return true;
 });}
 c.sendRollWithCharacter=dispatch;
 return {c,owner,rules,values,ledger,pools,state,packets,prompts,charges,dispatch,choose:x=>{choice=x;},turn:x=>{turn=x;}};
}
(async()=>{let count=0;async function test(n,f){await f();count++;console.log('  PASS '+n);}
 await test('Supreme max preserves Life constants, all dice groups and keep counts',async()=>{const s=setup();for(const [f,e]of[['2d8+8','16+8'],['18d8+16','144+16'],['2d8+1d4+8','16+4+8'],['5d8kh4+5','32+5'],['78','78']])assert.equal(s.c.wb20MaxHealingFormula(f),e);const d=['2d8+8','4d8'];s.c.wb20SupremeHealingRows(d,['Healing','Radiant']);assert.deepEqual(d,['16+8','4d8']);});
 await test('selected Improved Divine Strike reads2d8 without a level table',async()=>{const s=setup();assert.equal(s.c.wb20DivineStrikeDie(),'2d8');s.rules.splice(1,1);assert.equal(s.c.wb20DivineStrikeDie(),'1d8');});
 const attack=()=>({name:'Warhammer','attack-source':'item','to-hit':'+10',rollAttack:true,damages:['1d8+4'],'damage-types':['Bludgeoning']});
 await test('only qualifying weapon hits enter Divine Strike follow-up',async()=>{const s=setup();assert.equal(s.c.wb20ClericNeedsHit(attack()),true);for(const changes of [{'attack-source':'spell'},{'waybeyond20-unarmed-strike':true},{rollAttack:false},{'waybeyond20-attack-context':{isOwnTurn:false}}])assert.equal(!!s.c.wb20ClericNeedsHit({...attack(),...changes}),false);});
 await test('Divine Strike dispatches once, critical dice kept, no extra Action',async()=>{const s=setup();s.choose('Necrotic');const rows=await s.c.wb20ClericAfterHit(attack(),{request:{whisper:'private'}},s.dispatch,true);const a=s.packets[0];assert.equal(a.damages[0],'2d8');assert.equal(a['damage-types'][0],'Necrotic');assert.equal(a.rollCritical,true);assert.equal(a['critical-damages'][0],'2d8');assert.equal(a.whisper,'private');assert.equal(rows.length,1);assert.equal(s.state.action,1);assert.equal(s.ledger.turns['Divine Strike'],'combat:1');await s.c.wb20ClericAfterHit(attack(),{},s.dispatch,false);assert.equal(s.packets.length,1);});
 await test('skip or failed rider does not record the use',async()=>{for(const fail of [false,true]){const s=setup();s.choose(fail?'Radiant':'skip');s.c.fail=fail;await s.c.wb20ClericAfterHit(attack(),{},s.dispatch,false);assert.equal(s.ledger.turns['Divine Strike'],undefined);}});
 await test('a new turn makes Divine Strike available again',async()=>{const s=setup();s.ledger.turns['Divine Strike']='combat:1';assert.equal(s.c.wb20ClericAvailable('Divine Strike'),false);s.turn('combat:2');assert.equal(s.c.wb20ClericAvailable('Divine Strike'),true);});
 await test('a turn change while a hit prompt is open cannot charge a later turn',async()=>{const s=setup(),a=attack();s.c.wb20ClericNeedsHit(a);s.turn('combat:2');s.choose('Radiant');await s.c.wb20ClericAfterHit(a,{},s.dispatch,false);assert.equal(s.packets.length,0);});
 await test('Lucky is explicit: arm/cancel spend nothing',async()=>{const s=setup();s.choose('arm');await s.c.wb20ActivateClericControl(s.rules[3]);s.choose('clear');await s.c.wb20ActivateClericControl(s.rules[3]);await s.c.wb20WithArmedLuck('skill',{name:'Insight',advantage:0},()=>s.dispatch('skill','',{}));assert.equal(s.pools['Luck Points'],6);});
 await test('Lucky first completed d20 gets Advantage and exactly one point charge',async()=>{const s=setup();s.choose('arm');await s.c.wb20ActivateClericControl(s.rules[3]);for(let i=0;i<2;i++){const a={name:'Insight',advantage:0};await s.c.wb20WithArmedLuck('skill',a,()=>s.dispatch('skill','',a));}assert.equal(s.pools['Luck Points'],5);assert.equal(s.charges.length,1);assert.equal(s.packets[0].advantage,3);assert.equal(s.packets[1].advantage,0);});
 await test('Lucky cancels normal Disadvantage through existing combiner',async()=>{const s=setup();s.choose('arm');await s.c.wb20ActivateClericControl(s.rules[3]);const a={name:'Save',advantage:4};await s.c.wb20WithArmedLuck('saving-throw',a,()=>s.dispatch('saving-throw','',a));assert.equal(s.packets[0].advantage,0);});
 await test('failed roll retains armed Lucky and spends nothing',async()=>{const s=setup();s.choose('arm');await s.c.wb20ActivateClericControl(s.rules[3]);const a={name:'Save'};s.c.fail=true;await s.c.wb20WithArmedLuck('saving-throw',a,()=>s.dispatch('saving-throw','',a));assert.equal(s.pools['Luck Points'],6);s.c.fail=false;await s.c.wb20WithArmedLuck('saving-throw',a,()=>s.dispatch('saving-throw','',a));assert.equal(s.pools['Luck Points'],5);});
 await test('damage-only and missing Lucky feat never consume an armed point',async()=>{const s=setup();s.choose('arm');await s.c.wb20ActivateClericControl(s.rules[3]);const a={name:'Damage',rollAttack:false};await s.c.wb20WithArmedLuck('attack',a,()=>s.dispatch('attack','',a));assert.equal(s.pools['Luck Points'],6);s.rules.splice(3,1);await s.c.wb20WithArmedLuck('skill',{},()=>s.dispatch('skill','',{}));assert.equal(s.pools['Luck Points'],6);});
 await test('defensive Lucky charges one point with no Reaction cost',async()=>{const s=setup();s.choose('defend');await s.c.wb20ActivateClericControl(s.rules[3]);assert.equal(s.pools['Luck Points'],5);assert.equal(s.state.reaction,1);});
 await test('native Inner Radiance selection alone does not imply activated',async()=>{const s=setup();s.rules.splice(0,2);assert.equal(!!s.c.wb20ClericNeedsHit(attack()),false);});
 await test('Inner Radiance activates once, bonus Action/use charged; end is free',async()=>{const s=setup();s.choose('activate');await s.c.wb20ActivateClericControl(s.rules[4]);assert.equal(s.pools['Celestial Revelation'],0);assert.equal(s.state.bonusAction,0);assert.equal(s.values['waybeyond20-inner-radiance-active'],true);s.choose('end');await s.c.wb20ActivateClericControl(s.rules[4]);assert.equal(s.values['waybeyond20-inner-radiance-active'],false);assert.equal(s.charges.length,1);});
 await test('active Radiance adds flat6 once, never doubles on critical',async()=>{const s=setup();s.rules.splice(0,2);s.values['waybeyond20-inner-radiance-active']=true;s.choose('Radiant');await s.c.wb20ClericAfterHit(attack(),{},s.dispatch,true);assert.equal(s.packets[0].damages[0],'6');assert.equal(s.packets[0].rollCritical,false);assert.equal(s.ledger.turns['Inner Radiance'],'combat:1');});
 await test('Divine Intervention is1 Action/no Material; invalid native choices warned',async()=>{const s=setup();const p={'Casting Time':'24 hours',Components:'V, S, M (1000 gp)'};assert.equal(s.c.wb20InterventionProperties(s.owner,'Divine Intervention',p,'5th Level'),true);assert.equal(p['Casting Time'],'1 Action');assert.equal(p.Components,'V, S');const a={};s.c.wb20InterventionPacket(a);assert.equal(a['waybeyond20-no-slot-cast'],true);assert.equal(s.c.wb20InterventionProperties(s.owner,'Divine Intervention',{'Casting Time':'1 Reaction'},'1st Level'),false);});
 await test('slot-free Intervention removes only identifiable native Disciple bonus',async()=>{const s=setup(),d=['2d8+8','2d8+5','1'];s.c.wb20InterventionHealing(s.owner,d,['Healing','Healing','Healing'],'1st Level','');assert.deepEqual(d,['2d8+5','2d8+5','1']);});
 await test('legacy Supreme Healing is spell-only, not Channel Divinity',async()=>{const s=setup();s.rules[2].text='When you restore HP with a spell, use the highest number possible for each die.';const d=['1d8+5'];s.c.wb20SupremeHealingRows(d,['Healing'],s.owner,'channel');assert.equal(d[0],'1d8+5');s.c.wb20SupremeHealingRows(d,['Healing'],s.owner,'spell');assert.equal(d[0],'8+5');});
 await test('rest clears an armed Lucky use and ends tracked Radiance',async()=>{const s=setup();s.values['waybeyond20-inner-radiance-active']=true;s.choose('arm');await s.c.wb20ActivateClericControl(s.rules[3]);await s.c.wb20ClericRest(s.owner);assert.equal(s.values['waybeyond20-inner-radiance-active'],false);await s.c.wb20WithArmedLuck('skill',{},()=>s.dispatch('skill','',{}));assert.equal(s.pools['Luck Points'],6);});
 await test('distributed healing keeps the native base pool separate from per-creature Life bonus',async()=>{const s=setup(),a={description:'You restore up to 700 Hit Points, divided as you choose.',damages:['711'],'damage-types':['Healing']};s.c.wb20HealingPoolPacket(s.owner,a,{level:'9th Level'});assert.equal(a.damages[0],'700');assert.match(a.effects[0],/11 HP to each creature/);s.c.wb20HealingPoolPacket(s.owner,a,{level:'9th Level'});assert.equal(a.effects.length,1);});
 console.log('LightCore high-level cleric checks passed: '+count+'.');
})().catch(e=>{console.error(e);process.exitCode=1;});
