const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {sandbox,fn,count}=require('./attack-followups');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{let checks=0;
 for(const secondary of [false,true])for(const hit of [false,true])for(const deferred of [false,true]){
  const c=sandbox({hit,smites:false,elemental:false});
  Object.assign(c.character,{_id:'cleric',_class_features:['Blessed Strikes','Improved Blessed Strikes'],_feats:[],_racial_traits:[],
   getGlobalSetting:(k,d)=>k==='waybeyond20-secondary-attacks'?secondary:d,
   mergeCharacterSettings:(v,cb)=>{Object.assign(c.values,v);cb?.();}});
  c.wb20RuleText=s=>String(s||'');c.wb20CurrentFeatureRules=()=>[
   {name:'Blessed Strikes',text:'Divine Strike. Once on each of your turns when you hit with a weapon, add an extra 1d8 Necrotic or Radiant damage.'},
   {name:'Improved Blessed Strikes',text:'Divine Strike. The extra damage of your Divine Strike increases to 2d8.'}];
  c.damagesToCrits=(o,d)=>d;c.dndbeyondDiceRoller.queryGeneric=async()=> 'Radiant';
  vm.runInContext(read('src/dndbeyond/content-scripts/resources.js'),c);
  vm.runInContext(read('src/dndbeyond/content-scripts/cleric-features.js'),c);
  if(secondary){vm.runInContext(read('src/dndbeyond/base/attack-workflow.js'),c);vm.runInContext(read('src/dndbeyond/content-scripts/attack-workflow-character.js'),c);
   const prompt=c.dndbeyondDiceRoller._prompter.prompt;
   c.dndbeyondDiceRoller._prompter.prompt=async(...args)=>{const r=await prompt(...args);return args[0]==='Attack result'&&r===true?{find:s=>({val:()=>s.includes('outcome')?'hit':'0'})}:r;};}
  const args=c.attack({'attack-source':'item','waybeyond20-smite-eligible':false,rollDamage:!deferred});
  assert.equal(c.wayBeyond20NeedsAttackFollowup(args),true);
  assert.equal(await c.sendRollWithCharacter('attack','1d8+3',args),true);
  if(deferred && hit){const pending=vm.runInContext('Array.from(wayBeyond20PendingAttackDamage.keys()).at(-1)',c);assert.ok(pending);await c.wayBeyond20ContinueAttackDamage(pending);await c.wayBeyond20ContinueAttackDamage(pending);}
  assert.equal(count(c,'spend:action'),1,'one original Action');
  assert.equal(count(c,'send:cleric-rider'),hit?1:0,'rider only after a hit, once through repeated continuation');
  const ledger=c.wb20ResourceStore();assert.equal(ledger.turns['Divine Strike'],hit?c.wayBeyond20AttackActivationTurnKey():undefined);
  checks++;console.log(`  PASS cleric common hit path secondary=${secondary} hit=${hit} deferred=${deferred}`);
 }
 console.log('LightCore cleric workflow checks passed: '+checks+'.');
})().catch(e=>{console.error(e);process.exitCode=1;});
