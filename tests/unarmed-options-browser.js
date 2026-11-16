const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(name){const source=read('src/dndbeyond/content-scripts/character.js'),m=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(source);assert.ok(m);const tail=source.slice(m.index+m[0].length),end=/^(?:async )?function |^(?:const|let|class) /m.exec(tail);return source.slice(m.index,end?m.index+m[0].length+end.index:undefined);}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page=await browser.newPage();
  await page.setContent(`<div class="ct-features"><button aria-pressed="true">All</button>
   <div class="ct-feature-snippet"><div class="ct-feature-snippet__heading">Dance Training</div>
   <div class="ct-feature-snippet__content">You can use Dexterity instead of Strength for the attack rolls of your Unarmed Strikes. When you deal damage with an Unarmed Strike, you can deal Bludgeoning damage equal to a roll of your Inspiration die plus your Dexterity modifier, instead of the strike's normal damage.</div>
   <div class="ct-feature-snippet__action-summary">Dance Strike: 1 Action</div></div></div>
   <div class="ct-combat-attack"><div class="ct-combat-attack__name">Inspiration</div><div class="ct-combat-attack__damage">d8</div></div>`);
  await page.addScriptTag({content:`var character={_feats:['Dance Training'],_proficiency:3,getSetting:(k,d)=>d,getAbility:a=>({mod:a==='STR'?-1:4})};
   function wb20ResourceId(v){return String(v).toLowerCase().trim();}
   function damagesToCrits(owner,values){return values.map(v=>(v.match(/\\d*d\\d+/g)||[]).join('+'));}
   ${read('src/dndbeyond/content-scripts/feature-rules.js')}
   ${read('src/dndbeyond/content-scripts/item-rules.js')}
   ${fn('wayBeyond20RollIsUnarmedStrike')}
   ${fn('wayBeyond20ChooseUnarmedStrikeProfile')}`});
  const readProfile=()=>page.evaluate(async()=>({profile:await wayBeyond20ChooseUnarmedStrikeProfile(),qualified:wayBeyond20RollIsUnarmedStrike({'attack-source':'action',name:'Dance Strike'})}));
  let result=await readProfile();assert.equal(result.qualified,true,JSON.stringify(await page.evaluate(()=>wb20CurrentFeatureRules())));assert.equal(result.profile.damageFormula,'1d8+4');assert.equal(result.profile.toHit,'7');
  await page.locator('.ct-combat-attack__damage').evaluate(el=>el.textContent='d10');
  result=await readProfile();assert.equal(result.profile.damageFormula,'1d10+4','current native die, no class/level lookup');
  await page.locator('.ct-feature-snippet__content').evaluate(el=>el.textContent='You can use Dexterity instead of Strength for the attack rolls of your Unarmed Strikes. You can deal 1d6+4 Bludgeoning damage instead.');
  await page.locator('.ct-combat-attack__name').evaluate(el=>el.textContent='Dance Strike');
  result=await readProfile();assert.equal(result.profile.damageFormula,'1d10+4','live owned action supersedes a stale resolved feature die after leveling');
  const mutations=await page.evaluate(async()=>{let count=0;const observer=new MutationObserver(records=>count+=records.length);observer.observe(document.body,{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<20;i++)await wayBeyond20ChooseUnarmedStrikeProfile();await new Promise(resolve=>setTimeout(resolve,50));observer.disconnect();return count;});
  assert.equal(mutations,0,'read-only activation calculation does not mutate/restart the refresh cycle');
  console.log('PASS current native feature -> shared action qualification -> current referenced die, level-value change and zero DOM mutations. Isolated Chromium only.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
