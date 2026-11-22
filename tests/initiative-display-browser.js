// Disposable browser fixture; no real character, extension or game is used.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name){const a=src.search(new RegExp('^(?:async )?function '+name+'\\(','m'));if(a<0)return '';return src.slice(a,src.indexOf('\n}',a)+2);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent(`<section class="ct-combat__summary-group--initiative"><h2>Initiative</h2><button class="integrated-dice__container"><span class="styles_numberDisplay__fixture" style="color:rgb(100, 0, 0)"><span aria-label="plus">+</span><span>3</span></span></button></section><div id="skill">Stealth +5</div>`);
 await page.addScriptTag({content:`
 var enabled=true,feature=true,dex=3,pb=2,turn='turn',rolls=[],queries=[],answer='native';
 var character={_id:'owner',getAbility:()=>({mod:dex,score:16}),get _proficiency(){return pb;},hasClassFeature:()=>feature,getSetting:()=>enabled,getGlobalSetting:()=>false};
 var originalOwner=character,alertify={warning:()=>{}},dndbeyondDiceRoller={queryGeneric:async()=>{queries.push(1);return answer;}};
 var RollType={OVERRIDE_ADVANTAGE:3};
 function wayBeyond20AttackActivationTurnKey(){return turn;}
 function addEffect(p,n){(p.effects||=[]).push(n);}
 function wayBeyond20StartCombat(){} function resetHijackQuickRollState(){}
 async function sendRollWithCharacter(type,formula,p){rolls.push({formula,initiative:p.initiative,effects:p.effects});return true;}
 ${['wayBeyond20FormatSignedNumber','wb20InitiativeRow','wayBeyond20ReadInitiativeModifier','wayBeyond20InitiativeProficiencyLabels','wayBeyond20RefreshInitiativeDisplay','wayBeyond20InitiativeJoatModifier','wayBeyond20FinalizeInitiativeProficiency','rollInitiative','handleInitiativeIntegratedDie'].map(fn).join('\n')}
 window.refresh=()=>{if(typeof wayBeyond20RefreshInitiativeDisplay==='function')wayBeyond20RefreshInitiativeDisplay();};
 window.row=()=>document.querySelector('section');
 window.nativeNode=()=>[...row().querySelectorAll('.styles_numberDisplay__fixture')].find(n=>!n.hasAttribute('data-wb20-initiative-display'));
 window.setNative=n=>{nativeNode().innerHTML='<span aria-label="'+(n<0?'minus':'plus')+'">'+(n<0?'−':'+')+'</span><span>'+Math.abs(n)+'</span>';};
 window.clear=()=>{enabled=true;feature=true;dex=3;pb=2;character=originalOwner;document.querySelector('[data-prof]')?.remove();if(typeof wayBeyond20InitiativeJoatModifier==='function')delete wayBeyond20InitiativeJoatModifier.answers;setNative(3);refresh();};
 `});
 const value=()=>page.locator('button').innerText();
 let checks=0;
 await page.evaluate(()=>refresh());assert.equal((await value()).replace(/\s/g,''),'+4','the visible Initiative box must include missing half proficiency');checks++;
 assert.equal(await page.evaluate(()=>wayBeyond20ReadInitiativeModifier(row())),'+3','the original native modifier remains available to the final guard');checks++;
 assert.equal(await page.locator('[data-wb20-initiative-display]').count(),1);checks++;
 await page.evaluate(()=>{window.mutations=0;window.observer=new MutationObserver(m=>mutations+=m.length);observer.observe(row(),{subtree:true,childList:true,attributes:true,characterData:true});refresh();refresh();});
 assert.equal(await page.evaluate(()=>mutations),0,'stable refreshes must not cause an observer loop');await page.evaluate(()=>observer.disconnect());checks++;
 await page.evaluate(()=>window.result=rollInitiative(row()));await page.evaluate(()=>result);
 assert.deepEqual(await page.evaluate(()=>rolls.at(-1)),{formula:'1d20+4',initiative:'+4',effects:['Jack of All Trades']});checks++;
 const final=await page.evaluate(async()=>{const p={initiative:'+3'};await wayBeyond20FinalizeInitiativeProficiency(row(),p);await wayBeyond20FinalizeInitiativeProficiency(row(),p);return p;});
 assert.equal(final.initiative,'+4');assert.deepEqual(final.effects,['Jack of All Trades']);checks++;
 await page.evaluate(()=>{enabled=false;refresh();});assert.equal((await value()).replace(/\s/g,''),'+3');assert.equal(await page.locator('[data-wb20-initiative-display]').count(),0);checks++;
 assert.equal(await page.evaluate(()=>nativeNode().style.color),'rgb(100, 0, 0)','unrelated native styling is preserved');checks++;
 await page.evaluate(()=>{enabled=true;feature=false;refresh();});assert.equal((await value()).replace(/\s/g,''),'+3');checks++;
 await page.evaluate(()=>{feature=true;setNative(4);refresh();});assert.equal((await value()).replace(/\s/g,''),'+4');assert.equal(await page.locator('[data-wb20-initiative-display]').count(),0,'an ambiguous total is not guessed or prompted on refresh');checks++;
 for(const marker of ['Half Proficient','Proficient','Expert','Jack of All Trades']){
  await page.evaluate(marker=>{clear();const s=document.createElement('span');s.dataset.prof='true';s.setAttribute('aria-label',marker);row().append(s);setNative(5);refresh();},marker);
  assert.equal((await value()).replace(/\s/g,''),'+5');assert.equal(await page.locator('[data-wb20-initiative-display]').count(),0);checks++;
 }
 await page.evaluate(()=>{clear();const s=document.createElement('span');s.dataset.prof='true';s.setAttribute('aria-label','Not Proficient');row().append(s);setNative(8);refresh();});assert.equal((await value()).replace(/\s/g,''),'+9','independent bonuses remain');checks++;
 await page.evaluate(()=>{clear();dex=-1;setNative(-1);refresh();});assert.equal((await value()).replace(/\s/g,''),'+0','the displayed sign changes with the corrected total');checks++;
 await page.evaluate(()=>{clear();pb=5;refresh();});assert.equal((await value()).replace(/\s/g,''),'+5','half proficiency rounds down');checks++;
 await page.evaluate(()=>{clear();dex=4;pb=3;setNative(4);refresh();});assert.equal((await value()).replace(/\s/g,''),'+5','live ability changes are reflected');checks++;
 await page.evaluate(()=>{clear();setNative(4);refresh();answer='missing';window.ambiguous=rollInitiative(row());});await page.evaluate(()=>ambiguous);assert.equal((await value()).replace(/\s/g,''),'+5','an explicit answer is reflected in the box');assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),'+5');checks++;
 await page.evaluate(()=>{clear();row().querySelector('button').innerHTML='<span class="styles_numberDisplay__fixture">+3</span>';refresh();});assert.equal((await value()).replace(/\s/g,''),'+4');assert.equal(await page.locator('[data-wb20-initiative-display]').count(),1,'React replacement does not duplicate the overlay');checks++;
 await page.evaluate(()=>{character={...originalOwner,_id:'other',hasClassFeature:()=>false};refresh();});assert.equal((await value()).replace(/\s/g,''),'+3','another character does not inherit the old display');checks++;
 await page.evaluate(()=>{clear();row().className='ct-combat-tablet__extra--initiative';refresh();});assert.equal((await value()).replace(/\s/g,''),'+4');checks++;
 await page.evaluate(()=>{row().className='styles_boxMobile__fixture';const box=document.createElement('div');box.className='ct-combat-mobile__extras';row().before(box);box.append(row());refresh();});assert.equal((await value()).replace(/\s/g,''),'+4');checks++;
 assert.equal(await page.locator('#skill').textContent(),'Stealth +5','other checks are untouched');checks++;
 assert.deepEqual(errors,[]);console.log('PASS Initiative display: '+checks+' cases; native preservation, one addition, toggle, provenance, rerender, stats, owner and layouts.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
