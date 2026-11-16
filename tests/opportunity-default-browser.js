// Real selector/preference/native-spell discovery/confirmation composition.
// execute is an instrumented native-executor boundary, not live gameplay.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<button id="actions-tab">Actions</button><button id="spells-tab">Spells</button><div id="root"><div class="ddbc-combat-attack"><div class="ddbc-combat-attack__name"><button class="ddbc-combat-attack__label">Everflame</button><span class="ddbc-combat-attack__meta-item">Melee Weapon</span></div><div class="ddbc-combat-attack__tohit">+8</div><div class="ddbc-combat-attack__damage">1d6+11</div><div class="ddbc-combat-attack__range">5 ft. Reach</div></div></div><div id="spells"></div><div id="pane"></div><div id="prompt"></div>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
 await page.addStyleTag({content:'.ddbc-combat-attack select{border:1px solid #d74d32;background:#ffe2d9;appearance:auto}'});
 await page.evaluate(()=>{
  window.saved={},window.turn=1,window.completed=[],window.warnings=[],window.restore=0,window.activeIdentity=null,window.prompts=[];
  window.character={getSetting:(k,d)=>saved[k]??d,mergeCharacterSettings:(patch,done)=>{Object.assign(saved,patch);done?.();}};
  window.nativeSpells=[
   {name:'Cure Wounds',level:3,source:'Paladin',cost:'action',time:'1 Action',range:'Touch',effect:'6d8+5'},
   {name:'Inflict Wounds',level:3,source:'Paladin',cost:'action',time:'1 Action',range:'Touch',effect:'4d10'},
   {name:'Fire Bolt',level:0,source:'Feat',cost:'action',time:'1 Action',range:'120 ft.',effect:'2d10'},
   {name:'Hex',level:1,source:'Paladin',cost:'bonusAction',time:'1 Bonus Action',range:'90 ft.',effect:'1d6'},
   {name:'Shield',level:1,source:'Paladin',cost:'reaction',time:'1 Reaction',range:'Self',effect:'Effect'},
   {name:'Fireball',level:3,source:'Feat',cost:'action',time:'1 Action',range:'150 ft.',effect:'8d6'},
   {name:'Self Ward',level:1,source:'Paladin',cost:'action',time:'1 Action',range:'Self',effect:'Effect'},
   {name:'Long Ritual',level:1,source:'Feat',cost:'extended',time:'10 minutes',range:'Touch',effect:'Effect'}
  ].map(spell=>({...spell,key:JSON.stringify([spell.name,spell.source,spell.level]),hit:'—',action:'Cast'}));
  for(const spell of nativeSpells){const row=document.createElement('div');row.className='ct-spells-spell';row._identity=spell;row.innerHTML='<button class="native-label"></button><div class="ct-spells-spell__activation"></div><div class="ct-spells-spell__action"><button>Cast</button></div>';row.querySelector('.native-label').textContent=spell.name;row.querySelector('.ct-spells-spell__activation').textContent=spell.time;row.querySelector('.native-label').onclick=()=>{activeIdentity=spell;document.querySelector('#pane').innerHTML='<div class="ct-spell-pane"></div>';};document.querySelector('#spells').append(row);}
  window.wb20QuickSession=()=>({spells:nativeSpells});window.wb20QuickSettings=()=>({descriptions:Object.fromEntries(nativeSpells.map(s=>[s.key,s.name==='Fireball'?'Choose a point within range.':'A creature you touch or choose within range.']))});
  window.rules=[{name:'War Caster',text:'When a creature provokes an Opportunity Attack by leaving your reach, you can cast a spell rather than making an Opportunity Attack. The spell must have a casting time of one action and must target only that creature.'}];
  window.wb20CurrentFeatureRules=()=>rules;
  window.wayBeyond20AttackActivationTurnKey=()=>turn;window.wayBeyond20CreateAttackActivation=()=>({owner:character,turnKey:turn,resource:'reaction',attacks:1});window.wayBeyond20GetTurnTrackerState=()=>({combatSource:'Roll20',currentRoll20Turn:{isThisCharactersTurn:false}});
  window.wayBeyond20ActiveCharacterSheetTab=()=>document.querySelector('#actions-tab');window.wayBeyond20CharacterSheetTab=()=>document.querySelector('#spells-tab');window.wayBeyond20RestoreCharacterSheetTab=()=>restore++;
  window.wayBeyond20NativeSpellIdentity=row=>({...row._identity,label:row.querySelector('.native-label')});window.wayBeyond20NativeSpellPaneMatches=identity=>activeIdentity?.name===identity.name && activeIdentity?.source===identity.source && activeIdentity?.level===identity.level;
  window.wayBeyond20EscapeFollowupText=value=>String(value).replaceAll('<','&lt;');window.resetHijackQuickRollState=()=>{};window.wayBeyond20CommitNativeSpellCast=(owner,identity)=>({owner,identity});window.alertify={warning:message=>warnings.push(message)};
  window.dndbeyondDiceRoller={_prompter:{prompt:(title,html,yes,no)=>new Promise(resolve=>{prompts.push(title);const host=document.querySelector('#prompt');host.innerHTML=html;for(const [name,ok] of [[yes,true],[no,false]]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{const response=ok?$(host.querySelector('form')):null;host.replaceChildren();resolve(response);};host.append(b);}})}};
  window.execute=async(pane,options)=>{const ctx=options.attack_context;const identity=activeIdentity;if(!await wayBeyond20ConfirmReactiveSpell(ctx,{'Casting Time':identity.time,'Range/Area':identity.range},identity.name,'A creature you choose.'))return false;completed.push({identity,resource:ctx.activation.resource,kind:ctx.kind,commitIdentity:options.nativeCast.identity});return true;};
  window.wayBeyond20RefreshCombinedActions=()=>wayBeyond20OpportunityRow(document.querySelector('#root'));
 });
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/opportunity-attacks.js')});
 await page.evaluate(()=>wayBeyond20OpportunityRow(document.querySelector('#root')));
 const row=page.locator('.wb20-opportunity-attack'),select=row.locator('select');
 const appearance=()=>select.evaluate(el=>({border:getComputedStyle(el).borderTopColor,arrow:getComputedStyle(el.parentElement,'::after').opacity,appearance:getComputedStyle(el).appearance}));
 assert.deepEqual(await appearance(),{border:'rgba(0, 0, 0, 0)',arrow:'0',appearance:'none'},'inline choice reads as a label at rest');
 const idleBox=await select.boundingBox();
 await select.hover();assert.deepEqual(await appearance(),{border:'rgb(183, 201, 218)',arrow:'1',appearance:'none'});
 assert.deepEqual(await select.boundingBox(),idleBox,'hover does not shift the picker');
 await page.mouse.move(1200,680);assert.equal((await appearance()).arrow,'0');
 await row.locator('.wb20-feature-option-name').focus();await page.keyboard.press('Tab');
 assert.equal(await select.evaluate(el=>el.matches(':focus-visible')),true);
 assert.equal((await appearance()).arrow,'1','keyboard users get the same affordance');
 await page.keyboard.press('Tab');assert.equal((await appearance()).arrow,'0','leaving the picker restores its idle look');
 const names=await select.locator('option').allTextContents();assert.deepEqual(names,['Everflame (suggested)','3rd · Cure Wounds (Paladin)','3rd · Inflict Wounds (Paladin)','Fire Bolt (Feat)']);
 assert.equal(await page.evaluate(()=>wayBeyond20ReactiveSpellTargetAllowed({'Range/Area':'90 ft.'},'You twist space around another creature you can see within range. You teleport it to a point you choose.')),true,'a destination point does not exclude a creature-targeted spell');
 assert.equal(await page.evaluate(()=>Object.keys(saved).length),0,'suggestion does not write a preference or attack');
 await select.selectOption('1');assert.equal(await page.evaluate(()=>completed.length),0,'explicit choice saves without casting');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(saved['waybeyond20-opportunity-default'])),{kind:'spell',name:'Cure Wounds',source:'Paladin',level:3});
 await page.evaluate(()=>{document.querySelector('.wb20-opportunity-attack').remove();wayBeyond20OpportunityRow(document.querySelector('#root'));});assert.equal(await select.inputValue(),'1','specific spell/source/level survives row replacement');
 await row.locator('.wb20-feature-option-icon').click();await page.getByRole('button',{name:'Cast at that creature',exact:true}).click();await page.waitForFunction(()=>!wayBeyond20OpportunityPending);
 assert.equal(await page.evaluate(()=>completed.length),1);assert.deepEqual(await page.evaluate(()=>[completed[0].identity.name,completed[0].identity.level,completed[0].resource,completed[0].kind]),['Cure Wounds',3,'reaction','reactive-spell']);
 assert.equal(await page.evaluate(()=>prompts.filter(name=>name==='Reactive spell').length),0,'remembered spell skips second choice dialog, retaining rules confirmation');
 assert.equal(await page.evaluate(()=>completed[0].commitIdentity.name),'Cure Wounds','same native cast commit receives the selected identity');
 await select.selectOption('2');await row.locator('.wb20-feature-option-icon').click();await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForFunction(()=>!wayBeyond20OpportunityPending);assert.equal(await page.evaluate(()=>completed.length),1,'Cancel does not complete a cast');
 await row.locator('.wb20-feature-option-icon').click();await page.getByRole('button',{name:'Cast at that creature',exact:true}).waitFor({state:'visible'});await page.evaluate(()=>turn++);await page.getByRole('button',{name:'Cast at that creature',exact:true}).click();await page.waitForFunction(()=>!wayBeyond20OpportunityPending);assert.equal(await page.evaluate(()=>completed.length),1,'stale turn does not cast or update successful selection');
 await page.evaluate(()=>{rules=[];wayBeyond20OpportunityRow(document.querySelector('#root'));});assert.deepEqual(await select.locator('option').allTextContents(),['Everflame (suggested)'],'losing actual rule capability removes reactive spell options');
 assert.equal(await page.evaluate(()=>JSON.parse(saved['waybeyond20-opportunity-default']).name),'Inflict Wounds','eligibility refresh never deletes saved data');
 assert.equal(await page.evaluate(()=>restore),3,'native tab restoration kept for success, cancel and stale turn');
 const idle=await page.evaluate(async()=>{let n=0;const w=new MutationObserver(r=>n+=r.length);w.observe(document.querySelector('#root'),{subtree:true,childList:true,characterData:true,attributes:true});for(let i=0;i<10;i++)wayBeyond20OpportunityRow(document.querySelector('#root'));await new Promise(r=>setTimeout(r,35));w.disconnect();return n;});assert.equal(idle,0,'stable dropdown refresh is mutation-inert');
 assert.deepEqual(errors,[]);console.log('PASS concrete weapon/one-Action spell options including healing/save/cantrip; exclude bonus/reaction/long/self/point; explicit saved source+level without cast; native execution boundary uses Reaction and original cast identity; skip redundant choice, retain confirmation/Cancel/stale/owner guards and tab restore; remove options without capability; idle. No live gameplay.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
