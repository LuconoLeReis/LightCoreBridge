// Isolated browser only. Native structure modeled from the owner's authorized
// read-only inspection: DEX+3, PB+2, Initiative+3, no proficiency breakdown.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name,optional=false){const a=src.search(new RegExp('^(?:async )?function '+name+'\\(','m'));if(a<0&&optional)return '';assert.ok(a>=0,name);const b=src.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return src.slice(a,b<0?undefined:a+1+b);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent(`<div class="ct-combat__summary-group ct-combat__summary-group--initiative"><section><div data-testid="combat-initiative-label">Initiative</div><div class="styles_value__fixture"><h2>Initiative</h2><button class="integrated-dice__container"><span class="styles_numberDisplay__fixture">+3</span></button></div></section></div>`);
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.addScriptTag({content:`
 var rolls=[],starts=[],warnings=[],queries=[],answer='native',queryAction=null,feature=true,enabled=true,dex=3,pb=2,tie=false,turn='turn',fail=false;
 var RollType={OVERRIDE_ADVANTAGE:3},character={_id:'fixture-owner',getAbility:()=>({mod:dex,score:16}),get _proficiency(){return pb;},
 hasClassFeature:name=>feature && name==='Jack of All Trades',hasFeat:()=>false,getSetting:(key,fallback)=>key==='bard-joat'?enabled:fallback,getGlobalSetting:key=>key==='initiative-tiebreaker'&&tie};
 var originalOwner=character,alertify={warning:t=>warnings.push(t)};
 var dndbeyondDiceRoller={queryGeneric:async(...args)=>{queries.push(args);if(queryAction)queryAction();return answer;}};
 function wayBeyond20AttackActivationTurnKey(){return turn;}
 function wayBeyond20StartCombat(source,reset,total){starts.push({source,total});}
 function resetHijackQuickRollState(){}function addEffect(props,name){(props.effects||=[]).push(name);}
 function wayBeyond20GetTrackedSpellEffects(){return [];}
 async function sendRollWithCharacter(type,formula,data){rolls.push({type,formula,name:data.name,initiative:data.initiative,modifier:data.modifier,effects:data.effects,advantage:data.advantage});if(fail)return false;data['waybeyond20-capture-result']?.(data,[{total:12+Number(data.initiative),isDiscarded:()=>false}]);return true;}
 `});
 for(const name of ['wayBeyond20ReadInitiativeModifier','wayBeyond20InitiativeProficiencyLabels','wayBeyond20RefreshInitiativeDisplay','wayBeyond20InitiativeJoatModifier','wayBeyond20FinalizeInitiativeProficiency','wb20InitiativeRow','rollInitiative','wayBeyond20FormatSignedNumber','handleInitiativeIntegratedDie']){
  const text=fn(name,name.startsWith('wayBeyond20Read')||name==='wayBeyond20InitiativeProficiencyLabels','wayBeyond20RefreshInitiativeDisplay','wayBeyond20InitiativeJoatModifier'||name==='wayBeyond20FinalizeInitiativeProficiency');if(text)await page.addScriptTag({content:text});
 }
 // Use the actual final gate; the111 control follows its actual modifier helper.
 await page.evaluate(()=>window.finalGate=async(properties,tie=0)=>{
  const row=document.querySelector('.ct-combat__summary-group--initiative');
  if(typeof wayBeyond20FinalizeInitiativeProficiency==='function')return wayBeyond20FinalizeInitiativeProficiency(row,properties,tie);
  const adjusted=await wayBeyond20InitiativeJoatModifier(row,Number(properties.initiative)-tie);
  if(!adjusted)return false;properties.initiative=wayBeyond20FormatSignedNumber(adjusted.modifier+tie);
  if(adjusted.applied)addEffect(properties,'Jack of All Trades');return true;
 });
 const repeated=await page.evaluate(async()=>{
  const label=document.createElement('span');label.setAttribute('aria-label','Not Proficient');document.querySelector('section').append(label);
  const properties={initiative:'+3'};await finalGate(properties);await finalGate(properties);label.remove();return properties;
 });
 assert.equal(repeated.initiative,'+4','reprocessing one Initiative request must never add half proficiency twice');
 assert.deepEqual(repeated.effects,['Jack of All Trades']);
 await page.evaluate(()=>{const actual=rollInitiative;rollInitiative=(...args)=>window.pending=actual(...args);document.querySelector('button').addEventListener('click',event=>handleInitiativeIntegratedDie(event.target));});
 const click=async()=>{await page.locator('button').click();return page.evaluate(()=>pending);};
 assert.equal(await click(),true);assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),'+4','DEX+3 and PB+2 must roll Initiative+4 with Jack of All Trades');
 assert.deepEqual(await page.evaluate(()=>rolls.at(-1).effects),['Jack of All Trades']);
 assert.equal(await page.locator('.styles_numberDisplay__fixture').textContent(),'+3','native sheet value is not rewritten');
 let checks=2;
 async function setup(v){await page.evaluate(v=>{dex=v.dex??3;pb=v.pb??2;feature=v.feature??true;enabled=v.enabled??true;tie=!!v.tie;answer=Object.prototype.hasOwnProperty.call(v,'answer')?v.answer:'native';queryAction=null;queries=[];dndbeyondDiceRoller.queryGeneric=async(...args)=>{queries.push(args);if(queryAction)queryAction();return answer;};warnings=[];rolls=[];starts=[];fail=false;character=originalOwner;document.querySelector('.styles_numberDisplay__fixture').textContent=String(v.native??dex);document.querySelector('[data-prof]')?.remove();if(v.marker){const s=document.createElement('span');s.dataset.prof='true';s.setAttribute('aria-label',v.marker);document.querySelector('section').append(s);}if(typeof wayBeyond20InitiativeJoatModifier==='function')delete wayBeyond20InitiativeJoatModifier.answers;},v);}
 for(const v of [{dex:-1,pb:3,expected:'+0'},{dex:2,pb:4,expected:'+4'},{dex:2,pb:5,expected:'+4'},{dex:5,pb:6,expected:'+8'},
  {feature:false,expected:'+3'},{enabled:false,expected:'+3'},
  {native:4,marker:'Half Proficient',expected:'+4'},{native:5,marker:'Proficient',expected:'+5'},{native:7,marker:'Expert',expected:'+7'},
  {native:8,marker:'Not Proficient',expected:'+9'}]){
  await setup(v);assert.equal(await click(),true);assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),v.expected,JSON.stringify(v));assert.equal(await page.evaluate(()=>queries.length),0);checks++;
 }
 await setup({native:8,answer:'missing'});await click();await click();
 assert.deepEqual(await page.evaluate(()=>rolls.map(r=>r.initiative)),['+9','+9']);assert.equal(await page.evaluate(()=>queries.length),1,'unlabeled extra bonuses are resolved once for the current sheet/signature');checks++;
 await setup({native:4,answer:'native'});await click();await click();assert.deepEqual(await page.evaluate(()=>rolls.map(r=>r.initiative)),['+4','+4']);assert.equal(await page.evaluate(()=>queries.length),1,'already-included half proficiency is not added again');checks++;
 await setup({native:5,answer:'native'});await click();assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),'+5');assert.equal(await page.evaluate(()=>queries[0][5]),'native','uncertain existing proficiency defaults to keeping the native total');checks++;
 await setup({native:8,answer:null});assert.equal(await click(),false);assert.equal(await page.evaluate(()=>rolls.length),0);assert.equal(await page.evaluate(()=>starts.length),0);checks++;
 await setup({native:8,answer:'missing'});await page.evaluate(()=>queryAction=()=>{character={...originalOwner,_id:'other-owner'};});assert.equal(await click(),false);assert.equal(await page.evaluate(()=>rolls.length),0);checks++;
 await setup({native:8,answer:'missing'});await page.evaluate(()=>queryAction=()=>{pb=4;});assert.equal(await click(),false);assert.equal(await page.evaluate(()=>rolls.length),0);checks++;
 await setup({native:8,answer:'missing'});await page.evaluate(()=>queryAction=()=>{document.querySelector('.styles_numberDisplay__fixture').textContent='9';});assert.equal(await click(),false);assert.equal(await page.evaluate(()=>rolls.length),0);checks++;
 await setup({tie:true});await page.evaluate(()=>document.querySelector('section').insertAdjacentHTML('beforeend','<span class="styles_advantage__fixture"></span>'));await click();
 assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),'+4.16');assert.equal(await page.evaluate(()=>rolls.at(-1).advantage),3);assert.equal(await page.evaluate(()=>starts.at(-1).total),16.16);checks++;
 await setup({pb:'unreadable'});await click();assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),'+3');assert.equal(await page.evaluate(()=>warnings.length),1);checks++;
 await setup({native:8,answer:'missing'});await click();await page.evaluate(()=>document.querySelector('.styles_numberDisplay__fixture').textContent='9');await click();assert.equal(await page.evaluate(()=>queries.length),2,'changed native modifier invalidates the remembered answer');assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),'+10');checks++;
 await setup({native:8,answer:null});assert.equal(await click(),false);await page.evaluate(()=>answer='missing');assert.equal(await click(),true);assert.equal(await page.evaluate(()=>queries.length),2,'cancellation is not cached as an answer');checks++;
 await setup({native:8,answer:'missing'});
 await page.evaluate(()=>{dndbeyondDiceRoller.queryGeneric=(...args)=>{queries.push(args);return new Promise(resolve=>window.resolveChoice=resolve);};const row=document.querySelector('.ct-combat__summary-group--initiative');window.both=Promise.all([rollInitiative(row),rollInitiative(row)]);});
 assert.equal(await page.evaluate(()=>queries.length),1,'concurrent requests share a single unresolved prompt');await page.evaluate(()=>resolveChoice('missing'));assert.deepEqual(await page.evaluate(()=>both),[true,true]);assert.deepEqual(await page.evaluate(()=>rolls.map(r=>r.initiative)),['+9','+9']);checks++;
 await page.addScriptTag({content:fn('applyAbilityOrSavingThrowEffects')});await setup({});
 await page.evaluate(()=>applyAbilityOrSavingThrowEffects({rollType:'ability',ability_name:'Dexterity',ability:'DEX',modifier:'+3'}));
 assert.equal(await page.evaluate(()=>rolls.at(-1).modifier),'+4','existing raw ability checks still receive half proficiency once');checks++;
 await page.evaluate(()=>applyAbilityOrSavingThrowEffects({rollType:'saving-throw',ability_name:'Dexterity',ability:'DEX',modifier:'+5',proficiency:'Proficiency'}));
 assert.equal(await page.evaluate(()=>rolls.at(-1).modifier),'+5','saving throw proficiency is unchanged');checks++;
 for(const v of [
  {native:3,properties:{initiative:'+4',effects:['Jack of All Trades']},expected:'+4',queries:0},
  {native:3,properties:{initiative:'+5',proficiency:'Proficiency'},expected:'+5',queries:0},
  {native:3,properties:{initiative:'+4',proficiency:'Half Proficiency'},expected:'+4',queries:0},
  {native:3,marker:'Not Proficient',properties:{initiative:'+4'},expected:'+4',queries:1},
  {native:4,marker:'Not Proficient',properties:{initiative:'+4'},expected:'+5',queries:0},
  {native:5,marker:'Proficient',properties:{initiative:'+5'},expected:'+5',queries:0},
  {native:3,tie:true,properties:{initiative:'+3.16'},offset:0.16,expected:'+4.16',queries:0}
 ]){
  await setup(v);const result=await page.evaluate(async v=>{const properties=v.properties;const results=await Promise.all([finalGate(properties,v.offset||0),finalGate(properties,v.offset||0)]);await finalGate(properties,v.offset||0);return {properties,results,queryCount:queries.length};},v);
  assert.equal(result.properties.initiative,v.expected,JSON.stringify(v));assert.deepEqual(result.results,[true,true]);assert.equal(result.queryCount,v.queries);
  assert.ok((result.properties.effects||[]).filter(e=>e==='Jack of All Trades').length<=1);checks++;
 }
 await setup({native:8,answer:'missing'});
 await page.evaluate(()=>{dndbeyondDiceRoller.queryGeneric=(...args)=>{queries.push(args);return new Promise(resolve=>window.resolveChoice=resolve);};window.guardProperties={initiative:'+8'};window.guardBoth=Promise.all([finalGate(guardProperties),finalGate(guardProperties)]);});
 assert.equal(await page.evaluate(()=>queries.length),1);await page.evaluate(()=>resolveChoice('missing'));assert.deepEqual(await page.evaluate(()=>guardBoth),[true,true]);assert.deepEqual(await page.evaluate(()=>guardProperties),{initiative:'+9',effects:['Jack of All Trades']});checks++;
 await setup({tie:true});
 await page.evaluate(()=>{const actual=wayBeyond20FinalizeInitiativeProficiency;window.beforeFinal=[];wayBeyond20FinalizeInitiativeProficiency=(row,properties,offset)=>{beforeFinal.push({initiative:properties.initiative,advantage:properties.advantage,offset});return actual(row,properties,offset);};});
 await click();assert.deepEqual(await page.evaluate(()=>beforeFinal),[{initiative:'+3.16',advantage:3,offset:0.16}]);assert.equal(await page.evaluate(()=>rolls.at(-1).initiative),'+4.16');checks++;
 await setup({native:8,answer:'missing'});const mutated=await page.evaluate(async()=>{const props={initiative:'+8'};dndbeyondDiceRoller.queryGeneric=async()=>{props.initiative='+10';return 'missing';};return {ok:await finalGate(props),props};});assert.equal(mutated.ok,false);assert.equal(mutated.props.initiative,'+10');checks++;
 await setup({native:8,answer:'missing'});const labelChange=await page.evaluate(async()=>{const props={initiative:'+8'};dndbeyondDiceRoller.queryGeneric=async()=>{document.querySelector('section').insertAdjacentHTML('beforeend','<span data-prof="true" aria-label="Proficient"></span>');return 'missing';};return {ok:await finalGate(props),props};});assert.equal(labelChange.ok,false);assert.equal(labelChange.props.initiative,'+8');checks++;
 await setup({});assert.equal(await page.evaluate(()=>finalGate({initiative:'unreadable'})),false);checks++;
 await setup({native:8,answer:'missing'});const lateProficiency=await page.evaluate(async()=>{const props={initiative:'+8'};dndbeyondDiceRoller.queryGeneric=async()=>{props.proficiency='Proficient';return 'missing';};return {ok:await finalGate(props),props};});assert.equal(lateProficiency.ok,false);assert.equal(lateProficiency.props.initiative,'+8');checks++;
 await setup({});const changedAfter=await page.evaluate(async()=>{const props={initiative:'+3'};await finalGate(props);props.initiative='+8';return {ok:await finalGate(props),props};});assert.equal(changedAfter.ok,false);assert.equal(changedAfter.props.initiative,'+8');checks++;
 await setup({native:8,answer:null});await page.evaluate(()=>{window.settingsWrites=[];character.hasClassFeature=name=>['Jack of All Trades','Assassinate 2024'].includes(name);character.getSetting=(key,fallback)=>key==='bard-joat'||key==='rogue-assassinate-2024'?true:fallback;character.mergeCharacterSettings=changes=>settingsWrites.push(changes);});assert.equal(await click(),false);assert.equal(await page.evaluate(()=>settingsWrites.length),0,'canceling the final check cannot consume Initiative advantage');checks++;
 await setup({});await click();assert.deepEqual(await page.evaluate(()=>settingsWrites),[{'rogue-assassinate-2024':false}]);checks++;
 assert.deepEqual(errors,[]);console.log('PASS Jack-of-All-Trades Initiative: '+checks+' cases; native click, rounding, native proficiency, ambiguous bonuses, cancellation, stale state and tiebreaker.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
