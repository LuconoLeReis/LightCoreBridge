const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/dndbeyond/content-scripts/character.js');
function fn(name,text=source){const m=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(text);assert.ok(m,name);const rest=text.slice(m.index+m[0].length),end=/^(?:async )?function |^(?:const|let|class) /m.exec(rest);return text.slice(m.index,end?m.index+m[0].length+end.index:undefined);}
const rules=[
 {name:'Natural Attack',text:'Your Unarmed Strikes deal 1d6 + your Strength or Dexterity modifier Bludgeoning damage.',actions:['Siphoning Strike: 1 Action']},
 {name:'Draining Attack',text:'When you hit with an Unarmed Strike, you gain Temporary Hit Points equal to the damage dealt.'},
 {name:'Guardian Wards',text:'You automatically succeed on saves against magical effects that would make you Incapacitated, Stunned, or Unconscious.'},
 {name:'Pack Instinct',text:'When an ally is next to a creature at the start of your turn, you have Advantage on attacks against it.'},
 {name:'Protected',text:'Luck Points. You have 4 Luck Points per Long Rest and can spend them to Reroll or Stabilize. Reroll. Whenever you make a d20 Test and roll 9 or lower on the d20, you can spend 1 Luck Point to reroll, and must accept the second result. Stabilize. When you are reduced to 0 HP and not killed outright, you can spend 1 Luck Point to drop to 1 HP instead.'},
 {name:'Control Undead',text:'As an action, choose one Undead within 30 feet. It makes a Wisdom saving throw or obeys your commands for 24 hours.'},
 {name:'Abjure Foes',text:'As a Magic action, expend one use of Channel Divinity. Up to 5 creatures within 60 feet make a Wisdom saving throw or are Frightened for 1 minute.'},
 {name:'Aura of Ruin',text:'While you are conscious, you and your allies within 10 ft. gain a +5 bonus to melee attack damage rolls.'},
 {name:'Dueling',text:'While holding a Melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.'},
 {name:'Weapon Mastery',text:'Push. If you hit a creature, you can push it up to 10 ft. straight away from you if Large or smaller.',actions:['Push (Warhammer): 1 Action','Sap (Longsword): 1 Action']}
];
const gauntlets={name:'Everflame',equipped:true,text:'While wearing these gauntlets, you can take a Bonus Action and use a command word to cause flames to engulf your fists. These flames shed Bright Light in a 40-foot radius and Dim Light for an additional 40 feet. While your fists are ablaze, your Unarmed Strikes deal an extra 2d6 Fire damage on a hit. The flames last until you take a Bonus Action to issue the command again or until you remove the gauntlets.'};
const shield={name:'Spiked Shield',equipped:true,text:'Crude metal spikes adorn this magic Shield. It has the following properties that you can use while holding it. Shield Bash. When you take the Attack action, you can make one of the attack rolls using the Shield against a target within 5 feet of yourself. Apply your Proficiency Bonus and Strength modifier to the attack roll. On a hit, the Shield deals Piercing damage equal to 2d6 plus your Strength modifier. Spike Salvo. As a Magic action, you can cause spikes to erupt from the Shield in a 30-foot Cone. Each creature in the Cone makes a DC 13 Dexterity saving throw, taking 3d6 Piercing damage on a failed save or half as much damage on a successful one. Once this property is used, it can’t be used again until the next dawn.'};
function fixture(){
 const values={'waybeyond20-feature-rules':structuredClone(rules),'waybeyond20-rule-items':[structuredClone(gauntlets)]},calls=[],forms=[];
 const state={inCombat:true,combatSource:'Manual',combatStartedAt:1,localTurnNumber:1,action:1,bonusAction:1,reaction:1,attacksRemaining:0,featureGrants:{}};
 const pools=new Map([['channel divinity',{name:'Channel Divinity',kind:'native',remaining:2,max:2}],['protected luck points',{name:'Protected: Luck Points',kind:'native',remaining:4,max:4}],['spiked shield',{name:'Spiked Shield',kind:'native',remaining:1,max:1}]]);
 const c={console,setTimeout,clearTimeout,Promise,Map,WeakMap,WeakSet,Set,Date,Math,JSON,structuredClone,
  RollType:{NORMAL:0,ADVANTAGE:3,DISADVANTAGE:4,OVERRIDE_ADVANTAGE:6,OVERRIDE_DISADVANTAGE:7},
  character:{_id:'different-character',_proficiency:4,_class_features:[],_racial_traits:[],_feats:rules.map(r=>r.name),_hp:0,
   getAbility:()=>({mod:'+4'}),getSetting:(k,d)=>values[k]??d,getGlobalSetting:(k,d)=>d,
   hasRacialTrait:n=>['Natural Attack','Draining Attack'].includes(n),
   mergeCharacterSettings:(data,done)=>{Object.assign(values,structuredClone(data));done?.();}},
  alertify:{message:t=>calls.push(['message',t]),warning:t=>calls.push(['warning',t])},
  wb20FeatureEscape:v=>String(v),wayBeyond20CharacterDebug(){},
  wayBeyond20GetTurnTrackerState:()=>structuredClone(state),wayBeyond20SetTurnTrackerState:s=>Object.assign(state,structuredClone(s)),
  wayBeyond20AttackActivationTurnKey:()=>String(state.localTurnNumber),wayBeyond20HasActiveCombatState:s=>!!s.inCombat,
  wayBeyond20ScheduleActiveEffectBadgeRefresh(){},wayBeyond20AttacksPerAttackAction:()=>2,
  wayBeyond20ConfirmChoice:async()=>true,wayBeyond20PreflightTurnResource:async()=>true,
  wayBeyond20SpendTurnResource:unit=>{if(state[unit]>0)state[unit]--;},
  wayBeyond20VisitResourceSheets:async op=>op(),wayBeyond20TrackSelfFeatureEffect:(...a)=>calls.push(['effect',...a]),
  wayBeyond20ParseTalentDuration:()=>({value:24,unit:'hour'}),wayBeyond20CurrentHitPoints:()=>({current:c.character._hp,max:121}),
  wayBeyond20ApplyHealingToSelf:async(amount,options)=>{calls.push(['hp',amount,options]);c.character._hp+=amount;return{applied:true};},
  wayBeyond20AttachTurnResource:(args,resource,options)=>args['waybeyond20-turn-resource']={resource,...options},
  wayBeyond20AttachAttackActionResource:(args,props,unused,resource,options)=>args['waybeyond20-turn-resource']={resource,...options,actionType:'Attack'},
  wayBeyond20QueueAttackFollowup:(args)=>{args['waybeyond20-smite-eligible']=true;},
  wayBeyond20SelfHasCondition:()=>false,wayBeyond20GetTrackedSpellEffects:()=>[],wayBeyond20RemoveTrackedEffect(){},wayBeyond20EffectKey:e=>e.name,
  damagesToCrits:()=>['12'],addEffect:(args,e)=>{(args.effects ||= []).push(e);},
  handleSpecialGeneralAttacks:(d,t,p,s,{to_hit})=>to_hit,handleSpecialMeleeAttacks:(d,t,p,s,{to_hit})=>to_hit,
  buildAttackRoll:async(owner,src,name,description,properties,damages,types,hit)=>({name,description,'attack-source':src,'attack-type':properties['Attack Type'],damages,'damage-types':types,'to-hit':hit,rollAttack:!!hit,rollDamage:true}),
 };
 c.wb20FeatureForm=async()=>{const next=forms.shift();if(next===null)return null;const data=next || {};return{find:selector=>({val:()=>data[/name="([^"]+)"/.exec(selector)?.[1]],prop:()=>!!data[/name="([^"]+)"/.exec(selector)?.[1]]})};};
 vm.createContext(c);
 vm.runInContext(read('src/common/dice.js')+'\nthis.DNDBRoll=DNDBRoll;',c);
 vm.runInContext(read('src/dndbeyond/content-scripts/resources.js'),c);
 vm.runInContext(read('src/dndbeyond/content-scripts/feature-rules.js'),c);
 vm.runInContext(read('src/dndbeyond/content-scripts/item-rules.js'),c);
 vm.runInContext(fn('adjustRollAndKeyModifiersWithAdvantage',read('src/dndbeyond/base/utils.js')),c);
 vm.runInContext(['wayBeyond20RollIsUnarmedStrike','wayBeyond20NormalizeAttackSemantics','wayBeyond20ApplyDrainingAttackIntent'].map(name=>fn(name)).join('\n'),c);
 c.wb20NativeResources=()=>pools;
 c.wb20SetNativeResource=async(pool,desired)=>{pool.remaining=desired;return true;};
 c.wb20ReadItemRule=()=>structuredClone(shield);
 c.sendRollWithCharacter=async(type,fallback,args)=>c.wb20DispatchResources(args,{rollType:type},async()=>{calls.push(['dispatch',type,structuredClone(args)]);return c.accepted!==false;});
 return {c,values,calls,forms,pools,state};
}
async function test(name,run){await run();console.log('PASS',name);}
(async()=>{
 await test('modern/cached rule semantics are feature-based, not character/class/campaign identities',async()=>{
  const {c,values}=fixture();assert.equal(c.wb20RuleIsUnarmed({'attack-source':'action',name:'Siphoning Strike'}),true);
  assert.equal(c.wb20RuleIsUnarmed({'attack-source':'item',name:'Everflame',description:gauntlets.text}),true);
  assert.equal(c.wb20RuleIsUnarmed({'attack-source':'item',name:'Flame Tongue',description:'A sword deals extra Fire damage.'}),false);
  assert.equal(c.wb20RuleIsUnarmed({'attack-source':'spell',name:'Alter Self',description:gauntlets.text}),false);
  assert.equal(c.wb20RuleDrainingSource(),'Draining Attack');
  values['waybeyond20-feature-rules'][1].name='Renamed vitality';c.character._feats.push('Renamed vitality');assert.equal(c.wb20RuleDrainingSource(),'Renamed vitality');
  c.character._feats=[];assert.equal(c.wb20CurrentFeatureRules().length,0,'removed features cannot survive solely in a stale cache');
 });
 await test('gauntlet and natural action both acquire the existing Draining intent; shield/spell do not',async()=>{
  const {c}=fixture();for(const args of [{'attack-source':'item',name:'Everflame',description:gauntlets.text},{'attack-source':'action',name:'Siphoning Strike'}]){
   c.wayBeyond20NormalizeAttackSemantics(args,args.name);c.wayBeyond20ApplyDrainingAttackIntent(args,args.name);assert.equal(args['waybeyond20-temp-hp-on-hit'].mode,'damage-dealt');
  }
  const args={'attack-source':'item',name:'Shield Bash',description:shield.text};c.wayBeyond20NormalizeAttackSemantics(args,args.name);c.wayBeyond20ApplyDrainingAttackIntent(args,args.name);assert.equal(args['waybeyond20-temp-hp-on-hit'],undefined);
 });
 await test('Control Undead and Abjure spend the same native Channel Divinity pool, once per accepted use',async()=>{
  const {c,forms,pools,state}=fixture();forms.push({targets:'Undead A'});assert.equal(await c.wb20ActivateRule('Control Undead'),true);assert.equal(pools.get('channel divinity').remaining,1);assert.equal(state.action,0);
  state.action=1;forms.push({targets:'Creatures B, C'});assert.equal(await c.wb20ActivateRule('Channel Divinity: Abjure Foes'),true);assert.equal(pools.get('channel divinity').remaining,0);assert.equal(state.action,0);
 });
 await test('canceled, failed and stale activations do not spend or establish effects',async()=>{
  const {c,forms,pools,state,calls}=fixture();forms.push(null);assert.equal(await c.wb20ActivateRule('Control Undead'),false);
  c.accepted=false;forms.push({});assert.equal(await c.wb20ActivateRule('Control Undead'),false);assert.equal(pools.get('channel divinity').remaining,2);assert.equal(state.action,1);assert.equal(calls.filter(c=>c[0]==='effect').length,0);
  c.wb20FeatureForm=async()=>{state.localTurnNumber++;return{find:()=>({val:()=>'',prop:()=>true})};};assert.equal(await c.wb20ActivateRule('Control Undead'),false);assert.equal(pools.get('channel divinity').remaining,2);
 });
 await test('Guardian Wards needs explicit magical-effect confirmation and never rolls a d20 or spends Action',async()=>{
  const {c,forms,calls,state}=fixture();forms.push({condition:'Stunned',magical:false});assert.equal(await c.wb20ActivateRule('Guardian Wards'),false);
  forms.push({condition:'Stunned',magical:true});assert.equal(await c.wb20ActivateRule('Guardian Wards'),true);assert.equal(state.action,1);assert.match(calls.find(x=>x[0]==='dispatch')[2].description,/Automatic saving throw success/);
 });
 await test('Pack Instinct is target/start-of-turn confirmation, with ordinary cancellation and explicit-mode respect',async()=>{
  const {c,forms}=fixture();forms.push({eligible:true});const args={name:'Attack',rollAttack:true,advantage:c.RollType.DISADVANTAGE};assert.equal(await c.wb20RulePrepareAttack(args),true);c.wb20RuleApplyResolvedAdvantage(args);assert.equal(args.advantage,c.RollType.NORMAL);
  forms.push({eligible:true});const explicit={name:'Attack',rollAttack:true,advantage:0,'waybeyond20-explicit-attack-mode':0};await c.wb20RulePrepareAttack(explicit);assert.equal(explicit.advantage,0);
  forms.push(null);assert.equal(await c.wb20RulePrepareAttack({rollAttack:true}),false);
 });
 await test('Protected rerolls only one raw d20, preserves modifier/other dice, spends one native point and keeps a lower second result',async()=>{
  const {c,forms,pools}=fixture();const roll=new c.DNDBRoll('1d20+8+1d4');roll.dice[0]._rolls=[{roll:9}];roll.dice[1]._rolls=[{roll:4}];roll.dice.forEach(d=>d.calculateTotal());roll.calculateTotal();
  const request={type:'attack'},replacement=new c.DNDBRoll('1d20');replacement.roll=async()=>{replacement.dice[0]._rolls=[{roll:2}];replacement.dice[0].calculateTotal();replacement.calculateTotal();};forms.push({die:'0'});
  await c.wb20RuleRerollD20([roll],request,{roll:()=>replacement});assert.equal(roll.total,14);assert.equal(roll.dice[1].rolls[0].roll,4);assert.equal(pools.get('protected luck points').remaining,3);
  await c.wb20RuleRerollD20([roll],request,{roll:()=>{throw Error('must not roll twice');}});assert.equal(pools.get('protected luck points').remaining,3);
 });
 await test('Protected ignores damage, Portent replacements, high dice and declined prompts',async()=>{
  for(const mode of ['damage','portent','high','declined']) {const {c,forms,pools}=fixture(),roll=new c.DNDBRoll('1d20+8');roll.dice[0]._rolls=[{roll:mode==='high'?10:9}];roll.calculateTotal();if(mode==='damage')roll.setRollType('damage');forms.push(null);
   await c.wb20RuleRerollD20([roll],{type:'attack',...(mode==='portent'?{'waybeyond20-portent-value':9}:{})},{roll:()=>{throw Error('should not reroll');}});assert.equal(pools.get('protected luck points').remaining,4);
  }
 });
 await test('the real local roller runs the reroll hook before publishing its Game Log result',async()=>{
  const {c,forms,pools,calls}=fixture();vm.runInContext(read('src/dndbeyond/base/dice.js').split('const dndbeyondDiceRoller =')[0]+'\nthis.DNDBRoller=DNDBRoller;',c);
  c.dndbeyondDiceRoller={_settings:{'use-digital-dice':false,'roll-to-game-log':true}};c.sendCustomEvent=(name,args)=>calls.push(['game-log',name,args]);
  const roller=new c.DNDBRoller(),original=new c.DNDBRoll('1d20+8');original.roll=async()=>{original.dice[0]._rolls=[{roll:9}];original.dice[0].calculateTotal();original.calculateTotal();};
  roller.roll=()=>{const next=new c.DNDBRoll('1d20');next.roll=async()=>{next.dice[0]._rolls=[{roll:3}];next.dice[0].calculateTotal();next.calculateTotal();};return next;};
  forms.push({die:'0'});await roller.resolveRolls('Athletics',[original],{type:'skill'});
  assert.equal(pools.get('protected luck points').remaining,3);assert.equal(calls.find(e=>e[0]==='game-log')[2][0].rolls[0].total,11);
 });
 await test('Stabilize applies only at 0 HP and is not a healing-received trigger',async()=>{
  const {c,forms,pools,calls}=fixture();forms.push({eligible:true});assert.equal(await c.wb20ActivateRule('Protected'),true);assert.equal(c.character._hp,1);assert.equal(pools.get('protected luck points').remaining,3);assert.equal(calls.find(x=>x[0]==='hp')[2].notify,false);
  assert.equal(await c.wb20ActivateRule('Protected'),false);assert.equal(pools.get('protected luck points').remaining,3);
 });
 await test('item properties are read from descriptions, with correct shield attack/save and dawn semantics',async()=>{
  const {c}=fixture(),properties=c.wb20ParseItemProperties(shield);assert.equal(properties.length,2);assert.equal(properties[0].kind,'bash');assert.equal(properties[0].dice,'2d6');assert.equal(properties[1].dc,'13');assert.equal(properties[1].charge,true);assert.equal(properties[1].range,'30-foot Cone');assert.equal(c.wb20ParseItemProperties(gauntlets)[0].kind,'flames');
 });
 await test('Reactive Spell accepts the actual War Caster wording, and reduction spells preserve Reaction and slot intents without damage',async()=>{
  const {c}=fixture();vm.runInContext(fn('wayBeyond20ReactiveSpellRule',read('src/dndbeyond/content-scripts/opportunity-attacks.js')),c);
  const warcaster={name:'War Caster',text:'When a creature provokes an Opportunity Attack from you by leaving your reach, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack. This spell must have a casting time of one action and must target only that creature.'};
  assert.equal(c.wayBeyond20ReactiveSpellRule([warcaster]).name,'War Caster');
  const original={name:'Shield-Maiden’s Favor',description:'The triggering attack’s damage is reduced by 1d10 plus your spellcasting modifier.',rollAttack:false,rollDamage:true,damages:['1d10+5'],'waybeyond20-turn-resource':{resource:'reaction'},'waybeyond20-after-dispatch':[()=>{}]};
  const reduction=c.wb20RuleReductionRoll('spell-attack',original);assert.equal(reduction.type,'custom');assert.equal(reduction.args.modifier,'1d10+5');assert.equal(reduction.args['waybeyond20-turn-resource'],original['waybeyond20-turn-resource']);assert.equal(reduction.args['waybeyond20-after-dispatch'],original['waybeyond20-after-dispatch']);assert.equal(reduction.args.rollDamage,false);
  assert.equal(c.wb20RuleReductionRoll('spell-attack',{...original,rollAttack:true}),null);
 });
 await test('abbreviated native durations retain units, and conscious-only melee bonuses do not invent an Incapacitated exclusion',async()=>{
  const {c}=fixture();vm.runInContext(['wayBeyond20NormalizeTalentText','wayBeyond20TalentTextLower','wayBeyond20WordToNumber','wayBeyond20ParseTalentDuration'].map(name=>fn(name)).join('\n'),c);
  const parsed=c.wayBeyond20ParseTalentDuration('','For the next 10 min. or until Incapacitated.');assert.equal(parsed.value,10);assert.equal(parsed.unit,'minute');
  c.wayBeyond20SelfHasCondition=condition=>condition==='Incapacitated';assert.equal(c.wb20ItemMeleeBonus(),5);
  c.wayBeyond20SelfHasCondition=condition=>condition==='Unconscious';assert.equal(c.wb20ItemMeleeBonus(),0);
 });
 await test('native Fire is replaced once, respects selected critical rule, never doubles native aura/dueling damage',async()=>{
  const {c,values}=fixture();values['waybeyond20-rule-flames']={everflame:true};const args={'attack-source':'item',name:'Everflame',description:gauntlets.text,rollAttack:true,damages:['1d6+11','2d6'],'damage-types':['Bludgeoning','Fire (While your fists are ablaze)'],'critical-damages':['6','12'],'critical-damage-types':['Bludgeoning','Fire (While your fists are ablaze)']};
  await c.wb20PrepareItemRules(args);assert.deepEqual(Array.from(args.damages),['1d6+11','2d6']);assert.deepEqual(Array.from(args['damage-types']),['Bludgeoning','Fire']);assert.deepEqual(Array.from(args['critical-damages']),['6','12']);await c.wb20PrepareItemRules(args);assert.equal(args.damages.length,2);
  values['waybeyond20-rule-flames']={everflame:false};const off={...args,damages:['1d6+11','2d6'],'damage-types':['Bludgeoning','Fire (While your fists are ablaze)'],'waybeyond20-item-rules-prepared':false};await c.wb20PrepareItemRules(off);assert.equal(off.damages.length,1);
 });
 await test('Shield Bash uses the existing Attack-action queue and never adds a draining intent',async()=>{
  const {c,forms,state,calls}=fixture();forms.push({});assert.equal(await c.wb20ActivateItemProperty(shield,c.wb20ParseItemProperties(shield)[0]),true);assert.equal(state.action,0);assert.equal(state.attacksRemaining,1);const args=calls.find(x=>x[0]==='dispatch')[2];assert.equal(args['to-hit'],'8');assert.equal(args.damages[0],'2d6+9');assert.equal(args['waybeyond20-temp-hp-on-hit'],undefined);
 });
 await test('ordinary Unarmed converts only base 1 to natural d6; gauntlet Dueling and trained mastery are explicit, scoped and idempotent',async()=>{
  const {c,values}=fixture();values['waybeyond20-rule-flames']={everflame:false};
  const attack=()=>({'attack-source':'action',name:'Unarmed Strike',rollAttack:true,damages:['10'],'damage-types':['Bludgeoning']});
  const ordinary=attack();await c.wb20PrepareItemRules(ordinary);assert.equal(ordinary.damages[0],'1d6+9');assert.equal(ordinary.mastery,undefined);assert.equal(ordinary['critical-damages'][0],'12');
  values['waybeyond20-unarmed-equipment']={everflame:{mastery:'Push',weaponBonus:true}};
  const configured=attack();await c.wb20PrepareItemRules(configured);assert.equal(configured.damages[0],'1d6+9+2');assert.equal(configured.mastery,'Push');await c.wb20PrepareItemRules(configured);assert.equal(configured.damages[0],'1d6+9+2');
  const siphon={...attack(),name:'Siphoning Strike',damages:['1d6+9'],'critical-damages':['6']};await c.wb20PrepareItemRules(siphon);assert.equal(siphon.damages[0],'1d6+9+2');assert.deepEqual(Array.from(siphon['critical-damages']),['6']);
  const weapon={...attack(),'attack-source':'item',name:'Everflame',description:gauntlets.text,damages:['1d6+11']};await c.wb20PrepareItemRules(weapon);assert.equal(weapon.damages[0],'1d6+11');assert.equal(weapon.mastery,'Push');
  values['waybeyond20-rule-items']=[];const removed=attack();await c.wb20PrepareItemRules(removed);assert.equal(removed.damages[0],'1d6+9');assert.equal(removed.mastery,undefined);
  values['waybeyond20-rule-items']=[{...gauntlets,equipped:false}];const unequipped=attack();await c.wb20PrepareItemRules(unequipped);assert.equal(unequipped.damages[0],'1d6+9');
  values['waybeyond20-rule-items']=[gauntlets];c.character._feats=c.character._feats.filter(n=>!['Dueling','Weapon Mastery'].includes(n));const lost=attack();await c.wb20PrepareItemRules(lost);assert.equal(lost.damages[0],'1d6+9');assert.equal(lost.mastery,undefined);
  c.character._feats=[];const other=attack();await c.wb20PrepareItemRules(other);assert.equal(other.damages[0],'10','configuration cannot grant missing features');
 });
 await test('Spike Salvo is one Magic action, one native item charge, fixed save and no attack roll',async()=>{
  const {c,forms,state,pools,calls}=fixture();forms.push({});assert.equal(await c.wb20ActivateItemProperty(shield,c.wb20ParseItemProperties(shield)[1]),true);assert.equal(state.action,0);assert.equal(pools.get('spiked shield').remaining,0);const args=calls.find(x=>x[0]==='dispatch')[2];assert.equal(args.rollAttack,false);assert.equal(args['save-dc'],'13');assert.equal(args['save-ability'],'Dexterity');assert.equal(args.damages[0],'3d6');
 });
 console.log('PASS current-feature operators and common resource composition. Native DOM/IPC and live delivery are separate acceptance.');
})().catch(e=>{console.error(e);process.exitCode=1;});
