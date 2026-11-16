const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WB20_TEST_SOURCE || path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(name,file='src/dndbeyond/content-scripts/character.js') {
 const code=read(file),m=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(code);assert.ok(m,name);
 const tail=code.slice(m.index+m[0].length),end=/^(?:async )?function |^(?:const|let|var|class) /m.exec(tail);
 return code.slice(m.index,end?m.index+m[0].length+end.index:undefined);
}
function diceFixture() {
 const math=Object.create(Math);math.random=()=>0;
 const c=vm.createContext({console,Math:math,Promise,Map,Set,Array,Number,String,Object,Date,setTimeout,clearTimeout,
  window:{addEventListener(){}},$:()=>({length:0}),sendCustomEvent(){},WhisperType:{YES:1},
  dndbeyondDiceRoller:{_settings:{'use-digital-dice':true}}});
 vm.runInContext(read('src/common/dice.js')+'\n'+read('src/dndbeyond/base/digital-dice-new.js')+'\n'+
  read('src/dndbeyond/base/dice.js').split('class DNDBPrompter')[0]+
  '\nthis.Roll=DNDBRoll;this.Digital=DigitalDice;this.Manager=DigitalDiceManager;this.Roller=DNDBRoller;',c);
 c.Manager.isEnabled=()=>true;c.Manager._ensureRollerOpenWithRetry=async()=>false;
 c.Manager.clear=()=>{};c.Manager._wait=async()=>{};
 return c;
}
const payload=(d8=[8],d6=[6,2])=>({rolls:[{diceNotation:{set:[
 {dieType:'d8',dice:d8.map(dieValue=>({dieValue}))},{dieType:'d6',dice:d6.map(dieValue=>({dieValue}))}]}}]});
(async()=>{
 let cases=0;
 for(const selected of ['none','partial']) {
  const c=diceFixture(),request={},roll=new c.Roll('1d8+4+2d6');
  c.Manager.rollDice=async(amount,type)=>selected==='partial'&&type==='d8'?amount:0;
  c.Manager._makeRoll=async()=>{throw Error('must not submit an incomplete selection');};
  await new c.Roller().resolveRolls('Unarmed with flames',[roll],request);
  assert.equal(roll.total,7,'actual native RNG rolls every die and adds the modifier');
  assert.equal(roll.dice.reduce((n,d)=>n+d.rolls.length,0),3);
  assert.equal(request['waybeyond20-digital-dice-fallback'],true);assert.equal(c.Manager._pendingRolls.length,0);cases++;
 }
 {
  const c=diceFixture(),request={},roll=new c.Roll('1d8+4+2d6');c.Manager.isEnabled=()=>false;
  await new c.Roller().resolveRolls('No native dice controls',[roll],request);
  assert.equal(roll.total,7);assert.equal(request['waybeyond20-digital-dice-fallback'],true);cases++;
 }
 {
  const c=diceFixture(),request={},roll=new c.Roll('1d3+4');
  await new c.Roller().resolveRolls('Unsupported native die',[roll],request);
  assert.equal(roll.total,5);assert.equal(request['waybeyond20-digital-dice-fallback'],true);cases++;
 }
 {
  const c=diceFixture(),roll=new c.Roll('1d8+4+2d6'),digital=new c.Digital('Damage',[roll]);
  assert.equal(digital.parseMessageBrokerRoll(payload(),true),true);assert.equal(roll.total,20);
  for(const bad of [payload([],[]),payload([0]),payload([9]),payload([1.5]),payload([true]),payload([8],[6])]) {
   assert.equal(digital.parseMessageBrokerRoll(bad,true),false,'incomplete/malformed dice are never accepted as zero');
   assert.equal(roll.total,20,'invalid payload does not mutate the accepted result');cases++;
  }
 }
 {
  const c=diceFixture(),first=new c.Roll('1d8+4+2d6'),second=new c.Roll('1d8+4+2d6');
  c.Manager.rollDice=async amount=>c.Manager._pendingRolls[0][0].name==='First'?0:amount;
  c.Manager._makeRoll=async()=>{c.Manager._handleDiceBrokerMessage({eventType:'dice/roll/fulfilled',dateTime:Date.now(),data:payload()});return true;};
  const a={},b={};await Promise.all([new c.Roller().resolveRolls('First',[first],a),new c.Roller().resolveRolls('Second',[second],b)]);
  assert.equal(first.total,7);assert.equal(second.total,20);assert.equal(a['waybeyond20-digital-dice-fallback'],true);
  assert.equal(b['waybeyond20-digital-dice-fallback'],false);assert.equal(c.Manager._pendingRolls.length,0);cases++;
 }
 {
  const c=diceFixture();c.Manager.isEnabled=()=>false;c.getDiscordChannel=()=>null;c.postToDiscord=async()=>{};
  vm.runInContext(read('src/common/constants.js')+'\n'+read('src/common/roll_renderer.js')+'\nthis.Renderer=Beyond20RollRenderer;',c);
  const displayer={sendMessage:(...args)=>{c.packet=args;}};
  const renderer=new c.Renderer(new c.Roller(),{},displayer);renderer.setSettings({'use-digital-dice':true});c.dndbeyondDiceRoller=renderer;
  vm.runInContext(fn('buildAttackRoll','src/dndbeyond/base/utils.js'),c);
  c.RollType={NORMAL:0};c.applyRogueSneakAttack=async()=>{};c.damagesToCrits=()=>[];c.Manager.isEnabled=()=>true;
  let nativeDiceOpened=false;
  c.Manager._ensureRollerOpenWithRetry=async()=>{nativeDiceOpened=true;return false;};
  const owner={hasClass:()=>false,getGlobalSetting:()=>false};
  const healing=await c.buildAttackRoll(owner,'spell','Cure Wounds','Restore Hit Points.',{},['16+8'],['Healing']);
  assert.equal(healing.rollDamage,true,'healing-only casts resolve even when automatic attack damage is disabled');
  assert.equal(healing.rollAttack,false,'healing-only casts have no attack phase');
  assert.equal(healing.advantage,0,'healing-only casts do not ask how to roll a d20');
  await renderer.rollAttack({...healing,character:{name:'Local player',settings:{}},sendMessage:true});
  assert.equal(c.packet[11][0][1].total,24,'the real renderer includes the fixed healing amount');
  assert.equal(c.packet[0]['waybeyond20-digital-dice-fallback'],true,'the result stays available when digital dice results are hidden');
  assert.equal(nativeDiceOpened,false,'fixed healing does not open or wait for the digital dice tray');cases++;
  const mixed=await c.buildAttackRoll(owner,'spell','Mixed spell','',{},['1d8','1d4'],['Radiant','Healing']);
  assert.equal(mixed.rollDamage,false,'mixed damage and healing still honors the automatic attack damage preference');
  c.Manager.isEnabled=()=>false;
  for(const critical of [false,true]) {
   await renderer.rollAttack({name:'Unarmed plus flames',character:{name:'Local player',settings:{}},sendMessage:true,
    rollAttack:false,rollDamage:true,rollCritical:critical,damages:['1d8+4','2d6'],'damage-types':['Bludgeoning','Fire'],
    'critical-damages':['1d8','2d6'],'critical-damage-types':['Bludgeoning','Fire']});
   const totals=c.packet[12];assert.equal(totals.Damage.total,7,'real renderer adds base plus fire exactly once');
   if(critical){assert.equal(totals['Critical Damage'].total,3);assert.equal(totals.Combined.total,10);}
   cases++;
  }
  await renderer.rollAttack({name:'Single critical',character:{name:'Local player',settings:{}},sendMessage:true,
   rollAttack:false,rollDamage:true,rollCritical:true,damages:['1d8+4'],'damage-types':['Slashing'],
   'critical-damages':['1d8'],'critical-damage-types':['Slashing']});
  assert.equal(c.packet[12].Combined.total,6,'single damage type critical has a combined total on damage-only card');cases++;
  c.Math.random=()=>0.5;
  await renderer.rollAttack({name:'Versatile critical',character:{name:'Local player',settings:{}},sendMessage:true,is_versatile:true,
   rollAttack:false,rollDamage:true,rollCritical:true,damages:['1d8+4','1d10+4','2d6'],'damage-types':['Slashing','Slashing','Fire'],
   'critical-damages':['1d8','1d10','2d6'],'critical-damage-types':['Slashing','Slashing','Fire']});
  assert.equal(c.packet[12]['Combined 1 Handed'].total,18);assert.equal(c.packet[12]['Combined 2 Handed'].total,34);cases++;
 }
 {
  let state={inCombat:true,combatSource:'Roll20',combatStartedAt:1,currentRoll20Turn:{tokenId:'old',tokenName:'Old VTT combatant'},localTurnNumber:4};
  const c=vm.createContext({console,Date,JSON,Object,Array,String,Number,Set,settings:{'vtt-tab':null},
   character:{_name:'Local player',getSetting:(_,d)=>d},wayBeyond20GetTrackedSpellEffects:()=>[],
   wayBeyond20GetTurnTrackerState:()=>state,wayBeyond20SetTurnTrackerState:s=>state=s,
   wayBeyond20ScheduleActiveEffectBadgeRefresh(){},wayBeyond20CharacterDebug(){},wayBeyond20NormalizeNameForTokenMatch:v=>String(v).toLowerCase(),
   wayBeyond20BuildTurnResourceDefaults:()=>({action:1,bonusAction:1,reaction:1,movement:30,maxAction:1,maxBonusAction:1,maxReaction:1,maxMovement:30,maxHasteAction:0,hasteAction:0}),
   wayBeyond20ParseInteger:v=>Number.isFinite(Number(v))?Math.trunc(Number(v)):null});
  vm.runInContext(['wayBeyond20HasActiveCombatState','wayBeyond20NormalizeTurnTrackerState','wayBeyond20StartCombat','wayBeyond20StartNewTurn','wayBeyond20EndCombat','wayBeyond20ResetTurnResourcesFromRoll20'].map(n=>fn(n)).join('\n'),c);
  c.wayBeyond20StartNewTurn();assert.equal(state.combatSource,'Manual Combat','New Turn itself takes over a stale external combat');
  assert.equal(state.currentRoll20Turn,null,'New Turn removes stale opponent identity');assert.equal(state.localTurnNumber,5);
  c.wayBeyond20StartCombat('Manual Combat',true);assert.equal(state.currentRoll20Turn,null,'fresh manual combat drops stale VTT turn');
  const firstCombat=state.combatStartedAt;c.wayBeyond20StartCombat('D&D Beyond Initiative',true);assert.ok(state.combatStartedAt>firstCombat,'reset starts a distinct combat identity');
  for(const source of ['Roll20','Foundry']) {
   c.wayBeyond20ResetTurnResourcesFromRoll20({active:false},source);assert.equal(state.inCombat,true,'idle VTT cannot end manual combat');
  }
  state.action=0;state.bonusAction=0;state.reaction=0;state.attacksRemaining=2;
  c.wayBeyond20StartNewTurn();assert.equal(state.localTurnNumber,2);assert.equal(state.action,1);assert.equal(state.bonusAction,1);assert.equal(state.reaction,1);assert.equal(state.attacksRemaining,0);
  c.wayBeyond20ResetTurnResourcesFromRoll20({active:false},'Roll20');c.wayBeyond20StartNewTurn();assert.equal(state.localTurnNumber,3);
  state.combatSource='Roll20';c.wayBeyond20ResetTurnResourcesFromRoll20({active:false},'Roll20');assert.equal(state.inCombat,false,'own VTT end still works');cases++;
  const vtt={active:true,tokenId:'opponent',tokenName:'Other',turnKey:'same-order'};
  c.wayBeyond20ResetTurnResourcesFromRoll20(vtt,'Roll20');c.wayBeyond20EndCombat();assert.equal(state.suppressedRoll20TurnKey,'same-order');
  c.wayBeyond20ResetTurnResourcesFromRoll20({active:false},'Roll20');assert.equal(state.suppressedRoll20TurnKey,'','ended tracker clears suppression');
  c.wayBeyond20ResetTurnResourcesFromRoll20(vtt,'Roll20');assert.equal(state.inCombat,true,'same order in a new combat can resume');cases++;
 }
 console.log(`PASS ${cases} composed local-play regressions: real dice arithmetic/fallback, broker validation, queue continuation, manual turns and idle VTT isolation.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
