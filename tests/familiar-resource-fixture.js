const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function(page,root){
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/familiars.js'),'utf8')});
 await page.evaluate(()=>{
  character._level=4;
  window.wb20RuleText=s=>String(s || '').replace(/\s+/g,' ').trim();
  values['waybeyond20-feature-controls']=true;
  window.wb20CurrentFeatureRules=()=>[{name:'Familiar Friend (Charisma)',text:'You always have the Find Familiar spell prepared. Its HP max and current HP are increased by 8. When making a skill in which you have proficiency while your familiar is within 5 feet of you, gain Advantage on the check.'}];
  window.wayBeyond20RollAlreadyHasAdvantage=a=>!!a.advantage;
  window.helperChoice='use';dndbeyondDiceRoller.queryGeneric=async()=>helperChoice;
  const row=document.createElement('div');row.className='ct-feature-snippet';row.id='helpful-fixture';
  row.innerHTML='<div class="ct-feature-snippet__heading">Familiar Friend: Helpful Friend <span class="ct-feature-snippet__heading-activation">(Special)</span></div><div class="ct-feature-snippet__limited-use"><div role="checkbox" aria-checked="false" aria-label="use"></div><div role="checkbox" aria-checked="false" aria-label="use"></div></div>';
  for(const control of row.querySelectorAll('[role="checkbox"]'))control.onclick=()=>control.setAttribute('aria-checked',String(control.getAttribute('aria-checked')!=='true'));
  document.body.append(row);
 });
 assert.equal(await page.evaluate(()=>wb20Resource('Familiar Friend: Helpful Friend').remaining),2);
 const roll=async(success,choice='use')=>page.evaluate(async({success,choice})=>{
  helperChoice=choice;wb20ArmedHelpful.set(character,{busy:false});const args={name:'Stealth'};wb20HelpfulSkills.add(args);
  return wb20WithHelpfulFriend('skill',args,()=>wb20DispatchResources(args,{rollType:'skill'},async()=>success));
 },{success,choice});
 assert.equal(await roll(true),true);assert.equal(await page.evaluate(()=>wb20Resource('Familiar Friend: Helpful Friend').remaining),1);
 assert.equal(await roll(false),false);assert.equal(await page.evaluate(()=>wb20Resource('Familiar Friend: Helpful Friend').remaining),1);
 assert.equal(await roll(true,'cancel'),false);assert.equal(await page.evaluate(()=>wb20Resource('Familiar Friend: Helpful Friend').remaining),1);
 assert.equal(await roll(true),true);assert.equal(await page.evaluate(()=>wb20Resource('Familiar Friend: Helpful Friend').remaining),0);
 console.log('PASS Helpful Friend native resource composition: 5 cases; actual Special heading, exact counter, accepted/rejected/canceled dispatch.');
};
