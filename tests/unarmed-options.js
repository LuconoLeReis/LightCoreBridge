const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WB20_TEST_SOURCE || path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(name,file='src/dndbeyond/content-scripts/character.js') {
 const source=read(file),match=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(source);assert.ok(match,name);
 const tail=source.slice(match.index+match[0].length),end=/^(?:async )?function |^(?:const|let|class) /m.exec(tail);
 return source.slice(match.index,end?match.index+match[0].length+end.index:undefined);
}
function fixture(str=-1,dex=4) {
 const values={'waybeyond20-feature-rules':[
  {name:'Fanged Heritage',text:'Your Unarmed Strikes deal 1d6 + your Strength or Dexterity modifier Slashing damage.',actions:['Renamed Strike: 1 Action']},
  {name:'Dancing Technique',text:'You can use Dex. instead of Str. for the attack rolls of your Unarmed Strike. When you deal damage with it, you can deal 1d8+4 Bludgeoning damage.'}
 ]};
 const c={console,Math,Map,WeakMap,WeakSet,Set,Promise,Number,String,Array,Object,JSON,
  character:{_feats:['Fanged Heritage','Dancing Technique'],_class_features:[],_racial_traits:[],_proficiency:3,
   getAbility:a=>({mod:a==='STR'?str:dex}),getSetting:(k,d)=>values[k]??d},
  damagesToCrits:(_,dice)=>dice.map(d=>(d.match(/\d*d\d+/g)||[]).join('+')),wb20ResourceId:v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),
  addEffect:(args,e)=>(args.effects??=[]).push(e),wayBeyond20AttackActivationTurnKey:()=>1,
  values};
 vm.createContext(c);
 vm.runInContext(read('src/dndbeyond/content-scripts/feature-rules.js'),c);
 vm.runInContext(read('src/dndbeyond/content-scripts/item-rules.js'),c);
 vm.runInContext(fn('wayBeyond20RollIsUnarmedStrike')+'\n'+fn('wayBeyond20ChooseUnarmedStrikeProfile'),c);
 return c;
}
function attack(name='Unarmed Strike',hit=2,damage='0') {
 return {name,'attack-source':'action','to-hit':String(hit),rollAttack:true,rollDamage:true,
  damages:[damage,'2d6'],'damage-types':['Slashing','Fire'],
  'critical-damages':damage.includes('d')?[damage.split(/[+-]/)[0],'2d6']:['2d6'],
  'critical-damage-types':damage.includes('d')?['Slashing','Fire']:['Fire']};
}
(async()=>{
 let tests=0;
 for(const name of ['Unarmed Strike','Fangs/Claws (Strength)','Bite','Renamed Strike','Dancing Technique','Agile Strikes: Unarmed Strike']) {
  const c=fixture(),a=attack(name);await c.wb20PrepareItemRules(a);
  assert.equal(a['to-hit'],'7',name);assert.equal(a.damages[0],'1d8+4',name);
  assert.deepEqual(Array.from(a.damages.slice(1)),['2d6']);
  assert.deepEqual(Array.from(a['critical-damages']),['1d8','2d6']);
  const once=JSON.stringify(a);await c.wb20PrepareItemRules(a);assert.equal(JSON.stringify(a),once,'one normalization');tests++;
 }
 for(const [str,dex,hit,formula,expectedHit,expectedDamage] of [
  [-1,4,7,'1d6+4','7','1d8+4'],[5,2,5,'1d6+2','8','1d8+5'],
  [-3,-1,0,'1d6-3','2','1d8-1'],[-1,4,2,'1d6-1+5','7','1d8+9']]) {
  const c=fixture(str,dex),a=attack('Claws',hit,formula);await c.wb20PrepareItemRules(a);
  assert.equal(a['to-hit'],expectedHit);assert.equal(a.damages[0],expectedDamage);tests++;
 }
 {
  const c=fixture(),a=attack('Fangs/Claws (Strength)',4,'1d6-1+2');
  a['waybeyond20-native-unarmed-hit']='2';await c.wb20PrepareItemRules(a);
  assert.equal(a['to-hit'],'9','native attack rider remains');assert.equal(a.damages[0],'1d8+6','native flat rider remains');tests++;
 }
 {
  const c=fixture(),a=attack('Claws',2,'1d6-1+1d4');await c.wb20PrepareItemRules(a);
  assert.equal(a.damages[0],'1d8+4+1d4');assert.equal(a['critical-damages'][0],'1d8+1d4');tests++;
 }
 {
  const c=fixture();c.values['waybeyond20-feature-rules']=[];
  const a=attack();await c.wb20PrepareItemRules(a);assert.equal(a['to-hit'],'2');assert.equal(a.damages[0],'0');
  assert.equal((await c.wayBeyond20ChooseUnarmedStrikeProfile()).damageFormula,'1-1');tests++;
 }
 {
  const c=fixture(),a=attack('Bite',7,'1d10+4');await c.wb20PrepareItemRules(a);
  assert.equal(a.damages[0],'1d10+4','keep stronger native alternative');
  c.values['waybeyond20-feature-rules'][1].text=c.values['waybeyond20-feature-rules'][1].text.replace('1d8','1d12');
  const b=attack('Claws',7,'1d6+4');await c.wb20PrepareItemRules(b);
  assert.equal(b.damages[0],'1d12+4','fresh feature value after leveling');tests++;
 }
 for(const source of ['item','spell']) {
  const c=fixture(),a=attack('Claw',2,'1d6-1');a['attack-source']=source;
  const before=JSON.stringify(a.damages);await c.wb20PrepareItemRules(a);
  assert.equal(JSON.stringify(a.damages),before);assert.equal(a['to-hit'],'2');tests++;
 }
 {
  const c=fixture();c.values['waybeyond20-feature-rules'][1].text='You can use Dexterity instead of Strength for the attack rolls of your Unarmed Strikes. When you deal damage with an Unarmed Strike, you can deal Bludgeoning damage equal to a roll of your Inspiration die plus your Dexterity modifier, instead of the strike\'s normal damage.';
  c.character._feats.push('Inspiration');c.values['waybeyond20-feature-rules'].push({name:'Inspiration',text:'Your Inspiration die is 1d10.'});
  assert.equal((await c.wayBeyond20ChooseUnarmedStrikeProfile()).damageFormula,'1d10+4');tests++;
 }
 {
  for(const str of [-1,0]) {
   const c=fixture(str,4),a=attack('Unarmed Strike',8,'1d8+5');await c.wb20PrepareItemRules(a);
   assert.equal(a['to-hit'],'8');assert.equal(a.damages[0],'1d8+5','native Dexterity plus bonus is not counted twice');tests++;
  }
 }
 {
  const c=fixture();c.character._feats.push('Hand of Harm','Battle Fury');
  c.values['waybeyond20-feature-rules'].push(
   {name:'Hand of Harm',text:'When you hit with an Unarmed Strike, you can expend 1 Focus Point to deal extra Necrotic damage equal to one roll of your Martial Arts die plus your Wisdom modifier.'},
   {name:'Battle Fury',text:'While active, your Unarmed Strikes gain a bonus to damage rolls.'});
  for(const name of ['Hand of Harm','Battle Fury']) {
   const a=attack(name);delete a['to-hit'];a.damages=['1d6+3'];a['damage-types']=['Necrotic'];
   assert.equal(c.wayBeyond20RollIsUnarmedStrike(a),false);await c.wb20PrepareItemRules(a);
   assert.equal(a.damages[0],'1d6+3');assert.equal(a['damage-types'][0],'Necrotic');tests++;
  }
 }
 {
  const c=fixture();c.character._feats=['Parent Feature'];c.values['waybeyond20-feature-rules']=[
   {name:'Parent Feature',text:'You can use Dexterity instead of Strength for the attack rolls of your Unarmed Strikes. You can deal 1d8+4 Bludgeoning damage.',actions:['Child Technique: 1 Action']}];
  const a=attack('Child Technique');await c.wb20PrepareItemRules(a);assert.equal(a['to-hit'],'7');assert.equal(a.damages[0],'1d8+4');tests++;
 }
 console.log(`PASS ${tests} shared Unarmed option cases: current owned text, all producers, ability choice, level changes, riders, criticals, idempotency and exclusions.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
