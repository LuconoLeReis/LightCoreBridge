const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {sandbox,count,fn}=require('./attack-followups');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gauntlets='While wearing these gauntlets, you can take a Bonus Action to cause flames to engulf your fists. While your fists are ablaze, your Unarmed Strikes deal an extra 2d6 Fire damage on a hit.';
(async()=>{
 for(const secondary of [false,true])for(const hit of [false,true])for(const flames of [false,true])for(const entry of ['item','unarmed','natural']){
  const c=sandbox({hit,smites:false,elemental:false});
  c.wb20ResourceId=v=>String(v).replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
  c.character._racial_traits=['Natural Attack','Draining Attack'];c.character._feats=[];c.character._class_features=[];
  c.character.getGlobalSetting=(k,d)=>k==='waybeyond20-secondary-attacks'?secondary:d;
  c.values['waybeyond20-feature-rules']=[{name:'Natural Attack',text:'Your Unarmed Strikes deal 1d6 + Strength modifier Bludgeoning damage.',actions:['Siphoning Strike: 1 Action']},{name:'Draining Attack',text:'When you hit with an Unarmed Strike, you gain Temporary Hit Points equal to the damage dealt.'}];
  c.values['waybeyond20-rule-flames']={everflame:flames};
  c.character._feats=['Dueling','Weapon Mastery'];
  c.values['waybeyond20-feature-rules'].push({name:'Dueling',text:'While holding a Melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.'},{name:'Weapon Mastery',text:'',actions:['Push (Warhammer): 1 Action']});
  c.values['waybeyond20-rule-items']=[{name:'Everflame',text:gauntlets,equipped:true}];c.values['waybeyond20-unarmed-equipment']={everflame:{mastery:'Push',weaponBonus:true}};
  vm.runInContext(read('src/dndbeyond/content-scripts/feature-rules.js'),c);
  vm.runInContext(read('src/dndbeyond/content-scripts/item-rules.js'),c);
  vm.runInContext(['addEffect','wayBeyond20RollIsUnarmedStrike','wayBeyond20NormalizeAttackSemantics','wayBeyond20ApplyDrainingAttackIntent'].map(fn).join('\n'),c);
  if(secondary){
   vm.runInContext(read('src/dndbeyond/base/attack-workflow.js'),c);
   vm.runInContext(read('src/dndbeyond/content-scripts/attack-workflow-character.js'),c);
   const prompt=c.dndbeyondDiceRoller._prompter.prompt;
   c.dndbeyondDiceRoller._prompter.prompt=async(...args)=>{const result=await prompt(...args);return args[0]==='Attack result'&&result===true?{find:s=>({val:()=>s.includes('outcome')?'hit':'0'})}:result;};
  }
  const args=c.attack({name:'Everflame','attack-source':'item',description:gauntlets,'waybeyond20-smite-eligible':false,damages:['1d6+11','2d6'],'damage-types':['Bludgeoning','Fire (While your fists are ablaze)'],'critical-damages':['1d6','2d6'],'critical-damage-types':['Bludgeoning','Fire (While your fists are ablaze)']});
  if(entry!=='item')Object.assign(args,{name:entry==='unarmed'?'Unarmed Strike':'Siphoning Strike','attack-source':'action',description:'',damages:[entry==='unarmed'?'10':'1d6+9'],'damage-types':['Bludgeoning'],'critical-damages':entry==='unarmed'?[]:['1d6'],'critical-damage-types':entry==='unarmed'?[]:['Bludgeoning']});
  assert.equal(await c.sendRollWithCharacter('attack','1d6+11',args),true);
  assert.equal(count(c,'spend:action'),1,'one attack spend, whichever entry route');
  assert.equal(count(c,'send:base'),1,'one attack roll');assert.equal(count(c,'send:damage'),hit?1:0,'damage only after hit');
  assert.equal(count(c,'thp:'+(flames?10:5)),hit?1:0,'same common damage-to-tempHP result, including active Fire');
  if(hit){assert.equal(c.lastDamage.damages[0],entry==='item'?'1d6+11':'1d6+9+2','native modifiers retained; homebrew weapon bonus added only to Unarmed actions');assert.equal(c.lastDamage.mastery,'Push');}
 }
 console.log('PASS gauntlet -> both character routes -> shared hit/damage -> one attack spend -> exact tempHP follow-up; flame on/off and hit/miss. Fake resolved dice only; no live game change.');
})().catch(e=>{console.error(e);process.exitCode=1;});
