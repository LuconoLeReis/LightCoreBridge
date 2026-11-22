// Offline real input handlers -> owned handoff -> real document observer/parser
// -> execute boundary. No live page or gameplay state is touched.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=read('src/dndbeyond/content-scripts/character.js');
const ancestorSource=process.env.WB20_HANDOFF_ANCESTOR_SOURCE ? fs.readFileSync(process.env.WB20_HANDOFF_ANCESTOR_SOURCE,'utf8') : source;
function fn(name,code=source){
    const start=code.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));assert.ok(start>=0,name);
    const end=code.slice(start+1).search(/^(?:(?:async )?function |const |let |var |class )/m);
    return code.slice(start,end<0?undefined:start+1+end);
}
const row=(name='Fangs',kind='')=>`<div class="ddbc-combat-attack ${kind}"><span class="ddbc-combat-attack__icon" role="button" tabindex="0" aria-label="${name} full">Attack</span><div class="ddbc-combat-attack__name"><div class="ddbc-combat-attack__label">${name}</div></div><div class="ddbc-combat-attack__tohit"><button class="integrated-dice__container" aria-label="${name} to hit">+5</button></div><div class="ddbc-combat-attack__damage"><button class="integrated-dice__container" aria-label="${name} damage">1d6+3</button><button class="integrated-dice__container" aria-label="${name} versatile">1d8+3</button></div></div>`;
const properties='<div role="list"><div><span class="InfoItem_label">To Hit:</span><span class="InfoItem_value">+5</span></div><div><span class="InfoItem_label">Damage:</span><span class="InfoItem_value">1d6+3</span></div></div>';
const portal=(name='Fangs',data=properties)=>`<div class="ct-sidebar__portal"><div><header class="ct-sidebar__header"><h1 class="ct-sidebar__heading"><span class="ddbc-action-name">${name}</span></h1></header><section class="modern-action-detail">${data}</section></div></div>`;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(5000);
  await page.setContent('<main>'+row()+'</main><button id="outside">Outside</button>');
  await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
  await page.addScriptTag({content:`
   ${fn('reMatchAll',read('src/common/utils.js'))}
   var settings={},key_modifiers={},ddbRollHijackInstalled=false,ddbHijackPointerHandled=false;
   var quick_roll=false,quick_roll_force_attack=false,quick_roll_force_damage=false,quick_roll_force_versatile=false,
       quick_roll_force_mode=null,quick_roll_mode_target=null,quick_roll_timeout=0;
   var destination={id:1,vtt:'roll20',title:'Test'},turn='turn1',character={_id:'1',_name:'Hero',
       updateInfo(){},getGlobalSetting:(key,fallback)=>key==='vtt-tab'?destination:fallback};
   var calls=[],nativeDice=0,disconnected=false;
   var warnings=[],alertify={warning:message=>warnings.push(message)};
   var DigitalDiceManager={updateNotifications:()=>null};
   function wayBeyond20AttackActivationTurnKey(){return turn;}
   function isExtensionDisconnected(){return disconnected;}
   function deactivateQuickRolls(){}
   function execute(pane,options){calls.push({pane,options});}
   function handleSpellIntegratedDie(){return false;}function handleInitiativeIntegratedDie(){return false;}
   function handleAbilityIntegratedDie(){return false;}function handleSavingThrowIntegratedDie(){return false;}
   function handleSkillIntegratedDie(){return false;}
   ${['injectRollToSpellAttack','injectRollToSnippets','injectSettingsButton','wayBeyond20InjectCombatMenuAction',
   'wayBeyond20ScheduleActiveEffectBadgeRefresh','injectCustomRollButton','wayBeyond20InjectBloodAndBoneAction',
   'wayBeyond20InjectBardicInspirationButton','wayBeyond20InjectLayOnHandsControls','activateQuickRolls',
   'wayBeyond20RefreshCombinedActions','wayBeyond20ActionListPets','wayBeyond20ActionListPetSelection','wayBeyond20ActionListPetToggles','injectRollButton'].map(n=>`function ${n}(){}`).join('\n')}
   ${fn('propertyListToDict',read('src/dndbeyond/base/utils.js'))}
   ${process.env.WB20_HANDOFF_SOURCE ? fs.readFileSync(process.env.WB20_HANDOFF_SOURCE,'utf8') : read('src/dndbeyond/content-scripts/attack-handoff.js')}
   ${fn('wayBeyond20DDBRollInputAvailable')}
   ${['swallowRollEvent','canHandleDDBRollTarget','resetHijackQuickRollState','wayBeyond20QueueCombatAttackIcon',
   'handleCombatAttackIntegratedDie','executeQuickRoll','documentModified','installDDBRollHijack'].map(n=>fn(n,ancestorSource)).join('\n')}
   installDDBRollHijack();
   window.observer=new MutationObserver(documentModified);
   observer.observe(document.body,{subtree:true,childList:true,characterData:true});
   document.addEventListener('click',event=>{if(event.target.closest('.integrated-dice__container'))nativeDice++;});
  `});
  // Heading first, modern data later. No ct-available-actions or old body class.
  await page.evaluate(html=>{
   document.querySelector('.ddbc-combat-attack__label').addEventListener('click',()=>{
    const shell=document.createElement('div');shell.innerHTML=html;document.body.append(shell.firstElementChild);
   });
  },portal('Fangs',''));
  await page.getByRole('button',{name:'Fangs full',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.b20-action-pane'));
  assert.equal(await page.evaluate(()=>calls.length),0,'A heading is not a ready attack');
  await page.evaluate(async()=>{await new Promise(resolve=>setTimeout(resolve,120));});
  assert.equal(await page.evaluate(()=>calls.length),0,'No fixed50ms premature execution');
  await page.evaluate(html=>document.querySelector('.modern-action-detail').innerHTML=html,properties);
  await page.waitForFunction(()=>calls.length===1);
  assert.deepEqual(await page.evaluate(()=>calls[0]),{pane:'b20-action-pane',options:{force_to_hit_only:false,force_damages_only:false,force_versatile:false}});
  console.log('PASS modern heading/data split waits for actual parsed properties');
  // Real observer churn cannot execute twice.
  await page.evaluate(()=>{for(let i=0;i<30;i++){document.body.append(document.createTextNode(' '));documentModified();}});
  assert.equal(await page.evaluate(()=>calls.length),1);
  for(const [label,expected] of [['Fangs to hit',[true,false,false]],['Fangs damage',[false,true,false]],['Fangs versatile',[false,true,true]]]){
   const before=await page.evaluate(()=>calls.length);
   await page.getByRole('button',{name:label,exact:true}).click();
   await page.waitForFunction(n=>calls.length===n+1,before);
   assert.deepEqual(await page.evaluate(()=>{const o=calls.at(-1).options;return [o.force_to_hit_only,o.force_damages_only,o.force_versatile];}),expected);
  }
  assert.equal(await page.evaluate(()=>nativeDice),0,'No duplicate native dice click');
  console.log('PASS full/to-hit/damage/versatile share one executor with one dispatch');
  for(const paneClass of ['b20-item-pane']){
   const before=await page.evaluate(({html,paneClass})=>{
    document.querySelectorAll('.ct-sidebar__portal').forEach(e=>e.remove());
    const container=document.createElement('div');container.innerHTML=html;
    container.querySelector('.ct-sidebar__header').parentElement.classList.add(paneClass);
    document.body.append(container.firstElementChild);return calls.length;
   },{html:portal(),paneClass});
   await page.getByRole('button',{name:'Fangs full',exact:true}).click();
   await page.waitForFunction(n=>calls.length===n+1,before);
   assert.equal(await page.evaluate(()=>calls.at(-1).pane),paneClass);
  }
  console.log('PASS native item/action pane chooses existing executor branch');
  // A native row can retain its label while React replaces the mastery icon
  // during the item sidebar render. Keep the original request on that row.
  const beforeEverflame=await page.evaluate(html=>{
   document.querySelectorAll('.ct-sidebar__portal').forEach(e=>e.remove());
   document.querySelector('main').innerHTML=html;
   const row=document.querySelector('.ddbc-combat-attack--item');
   row.querySelector('.ddbc-combat-attack__label').innerHTML=
    '<span class="styles_itemName__native">Everflame<span class="styles_asterisk__native">*</span><span class="ddbc-attunement-icon"></span></span>';
   row.querySelector('.ddbc-combat-attack__icon').innerHTML='<svg width="18" height="18"><path d="M0 0H18V18H0Z"/></svg>';
   row.querySelector('.integrated-dice__container').textContent='+8';
   row.querySelector('.ddbc-combat-attack__label').onclick=()=>{
    const icon=row.querySelector('.ddbc-combat-attack__icon');
    icon.replaceWith(icon.cloneNode(true));
    const sidebar=document.createElement('div');
    sidebar.className='ct-sidebar__portal';
    sidebar.innerHTML='<div><header class="ct-sidebar__header"><h1 class="ct-sidebar__heading"><div><span class="styles_itemName__native">Everflame<span class="styles_asterisk__native">*</span></span><button aria-label="Edit name"></button></div></h1></header><div class="ct-item-detail"><div role="list"><div><p class="styles_label__native">Attack Type:</p><p class="styles_value__native">Melee</p></div><div><p class="styles_label__native">Damage:</p><p class="styles_value__native"><span class="ddbc-damage__value">1d6+11</span><span class="ct-item-detail__additional-damage">2d6<span class="ddbc-damage-type-icon" aria-label="fire damage"><span class="ddbc-tooltip" data-original-title="fire"></span></span><span class="ct-item-detail__additional-damage-info">While your fists are ablaze</span></span></p></div><div><p class="styles_label__native">Damage Type:</p><p class="styles_value__native">Bludgeoning</p></div></div></div></div>';
    document.body.append(sidebar);
   };
   return calls.length;
  },row('Everflame*','ddbc-combat-attack--item'));
  await page.getByRole('button',{name:'Everflame* full',exact:true}).locator('svg path').click();
  await page.waitForFunction(n=>calls.length===n+1,beforeEverflame,{timeout:1500});
  assert.deepEqual(await page.evaluate(()=>calls.at(-1)),{pane:'b20-item-pane',options:{force_to_hit_only:false,force_damages_only:false,force_versatile:false}});
  assert.equal(await page.evaluate(()=>nativeDice),0);
  await page.addScriptTag({content:`
   ${['descriptionToString','findToHit','damagesToCrits','applyRogueSneakAttack','buildAttackRoll'].map(n=>fn(n,read('src/dndbeyond/base/utils.js'))).join('\n')}
   ${['capitalize','rollItem','wayBeyond20IsProbablyMagicalItem','wayBeyond20SplitDamageFormula','wayBeyond20NextDamageId',
    'wayBeyond20AddDamage','wayBeyond20DamageRowIndex','wayBeyond20NormalizeActionPoolToDamages'].map(n=>fn(n)).join('\n')}
   var CriticalRules={PHB:0,HOMEBREW_MAX:1},weaponPackets=[],weaponError=null;
   Object.assign(character,{getSetting:(key,fallback)=>fallback,_cacheToHit(){},hasClass:()=>false,
    hasClassFeature:()=>false,hasFeat:()=>false});
   function isItemATool(){return false;} function isItemAnInstruction(){return false;}
   function applyGWFIfRequired(name,properties,damage){return damage;}
   function addCustomDamages(){}
   function handleSpecialGeneralAttacks(d,t,p,s,o){return o.to_hit;}
   function handleSpecialWeaponAttacks(d,t,p,s,o){return o.to_hit;}
   function handleSpecialMeleeAttacks(d,t,p,s,o){return o.to_hit;}
   function wayBeyond20ApplySavageAttacker(){}
   function wayBeyond20ApplyBedsideMannerIntent(){}
   function wayBeyond20IsSmiteEligibleAttack(){return false;}
   function wayBeyond20MaybeAddSmite(){}
   function wayBeyond20CommitAfterDispatch(){}
   function wayBeyond20AttachAttackActionResource(){}
   function sendRollWithCharacter(type,fallback,request){weaponPackets.push({type,fallback,request});}
  `});
  await page.evaluate(()=>{
   window.originalExecute=execute;
   execute=(pane,options)=>rollItem(false,options.force_to_hit_only,options.force_damages_only,options.force_versatile)
     .catch(error=>{weaponError=error.stack;});
  });
  await page.getByRole('button',{name:'Everflame* full',exact:true}).click();
  await page.waitForFunction(()=>weaponPackets.length===1 || weaponError);
  assert.equal(await page.evaluate(()=>weaponError),null);
  const [weapon]=await page.evaluate(()=>{execute=window.originalExecute;return weaponPackets;});
  assert.equal(weapon.type,'attack');
  assert.equal(weapon.request.name,'Everflame');
  assert.equal(weapon.request['to-hit'],'+8');
  assert.equal(weapon.request.rollAttack,true);
  assert.equal(weapon.request.rollDamage,true);
  assert.deepEqual(weapon.request.damages,['1d6+11','2d6']);
  assert.deepEqual(weapon.request['damage-types'],['Bludgeoning','Fire (While Your Fists Are Ablaze)']);
  console.log('PASS customized Everflame icon stays attached to its item attack through an icon-only redraw');
  // Captured live Starry Wisp structure: no To Hit/Damage/Attack-Save
  // properties. Heading, metadata and rules can arrive before caster controls.
  const spellBefore=await page.evaluate(html=>{
   document.querySelectorAll('.ct-sidebar__portal').forEach(e=>e.remove());
   document.querySelector('main').innerHTML=html;
   return calls.length;
  },row('Starry Wisp'));
  await page.getByRole('button',{name:'Starry Wisp full',exact:true}).click();
  await page.evaluate(()=>{
   const portal=document.createElement('div');portal.className='ct-sidebar__portal';
   portal.innerHTML='<div class="ct-spell-pane"><header class="ct-sidebar__header"><h1 class="ct-sidebar__heading"><span class="styles_spellName__live">Starry Wisp</span></h1></header><div class="ct-spell-detail"><span class="ct-spell-detail__level-school-item">Evocation</span><span class="ct-spell-detail__level-school-item">Cantrip</span><div role="list"><div><span class="InfoItem_label">Casting Time:</span><span class="InfoItem_value">1 action</span></div><div><span class="InfoItem_label">Range/Area:</span><span class="InfoItem_value">60 ft.</span></div></div><div class="ct-spell-detail__description">Make a ranged spell attack. On a hit, deal Radiant damage.</div></div></div>';
   document.body.append(portal);
  });
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,120)));
  assert.equal(await page.evaluate(()=>calls.length),spellBefore,'spell metadata alone must not execute before caster hydration');
  await page.evaluate(()=>{
   const caster=document.createElement('div');caster.className='ct-spell-caster';
   caster.innerHTML='<div class="ct-spell-caster__modifiers--damages"><div class="ct-spell-caster__modifier--damage"><span class="ct-spell-caster__modifier-amount">1d8</span></div></div>';
   document.querySelector('.ct-spell-pane').append(caster);
  });
  await page.waitForFunction(n=>calls.length===n+1,spellBefore,{timeout:1500});
  assert.equal(await page.evaluate(()=>calls.at(-1).pane),'ct-spell-pane');
  await page.evaluate(()=>{for(let i=0;i<20;i++)documentModified();});
  assert.equal(await page.evaluate(()=>calls.length),spellBefore+1,'native spell executes exactly once through the same boundary');
  console.log('PASS live spell-pane shape waits for caster controls and hands off once without weapon-only properties');
  await page.evaluate(html=>{document.querySelector('main').innerHTML=html;},row());
  // A React row replacement is valid only when an equivalent source is unique.
  const beforeReplacement=await page.evaluate(html=>{
   document.querySelectorAll('.ct-sidebar__portal').forEach(e=>e.remove());
   const old=document.querySelector('.ddbc-combat-attack__icon');
   wb20RequestCombatHandoff(old,{force_to_hit_only:false,force_damages_only:false,force_versatile:false});
   document.querySelector('main').innerHTML=html;
   return calls.length;
  },row());
  await page.evaluate(html=>document.body.insertAdjacentHTML('beforeend',html),portal());
  await page.waitForFunction(n=>calls.length===n+1,beforeReplacement);
  console.log('PASS React replacement rebinds unique equivalent source');
  // Cancellation while waiting cannot spend or roll later when data appears.
  for(const reason of ['owner','identity','destination','turn','outside','escape','removed','renamed','ambiguous','disconnected']){
   const before=await page.evaluate(({html,reason})=>{
    wb20CancelCombatHandoff();document.querySelectorAll('.ct-sidebar__portal').forEach(e=>e.remove());
    document.querySelector('main').innerHTML=html;
    character={_id:'1',_name:'Hero',updateInfo(){},getGlobalSetting:(key,fallback)=>key==='vtt-tab'?destination:fallback};
    const icon=document.querySelector('.ddbc-combat-attack__icon');
    wb20RequestCombatHandoff(icon,{force_to_hit_only:false,force_damages_only:false,force_versatile:false});
    if(reason==='owner')character={...character};
    if(reason==='identity')character._id='2';
    if(reason==='destination')destination.id++;
    if(reason==='turn')turn+='x';
    if(reason==='removed')icon.remove();
    if(reason==='renamed')document.querySelector('.ddbc-combat-attack__label').textContent='Different';
    if(reason==='ambiguous'){document.querySelector('main').innerHTML=html+html;}
    if(reason==='disconnected')disconnected=true;
    return calls.length;
   },{html:row(),reason});
   if(reason==='outside')await page.getByRole('button',{name:'Outside',exact:true}).click();
   if(reason==='escape')await page.keyboard.press('Escape');
   await page.evaluate(html=>document.body.insertAdjacentHTML('beforeend',html),portal());
   await page.evaluate(async()=>{await new Promise(resolve=>setTimeout(resolve,50));documentModified();});
   assert.equal(await page.evaluate(()=>calls.length),before,reason);
   await page.evaluate(()=>{wb20CancelCombatHandoff();disconnected=false;observer.observe(document.body,{subtree:true,childList:true,characterData:true});});
  }
  console.log('PASS owner/destination/turn/user cancellation and stale/ambiguous sources');
  const supersede=await page.evaluate(({rows,html})=>{
   document.querySelectorAll('.ct-sidebar__portal').forEach(e=>e.remove());document.querySelector('main').innerHTML=rows;
   const controls=document.querySelectorAll('.ddbc-combat-attack__icon');
   wb20RequestCombatHandoff(controls[0],{force_roll_mode:3});
   wb20RequestCombatHandoff(controls[1],{force_roll_mode:4});
   document.body.insertAdjacentHTML('beforeend',html);return calls.length;
  },{rows:row('Fangs')+row('Bite'),html:portal('Bite')});
  await page.waitForFunction(n=>calls.length===n+1,supersede);
  assert.equal(await page.evaluate(()=>calls.at(-1).options.force_roll_mode),4);
  assert.equal(await page.evaluate(()=>wb20CombatHandoff),null);
  console.log('PASS newer intent replaces unperformed intent instead of dispatching both');
  const expiry=await page.evaluate(html=>{
   document.querySelectorAll('.ct-sidebar__portal').forEach(e=>e.remove());document.querySelector('main').innerHTML=html;
   wb20RequestCombatHandoff(document.querySelector('.ddbc-combat-attack__icon'),{});return calls.length;
  },row());
  await page.waitForFunction(()=>wb20CombatHandoff===null,{},{timeout:6500});
  assert.deepEqual(await page.evaluate(()=>warnings),['LightCore Bridge could not open the attack. No roll was sent.']);
  await page.evaluate(html=>document.body.insertAdjacentHTML('beforeend',html),portal());
  await page.evaluate(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});
  assert.equal(await page.evaluate(()=>calls.length),expiry);
  console.log('PASS expired intent cannot fire when the user opens that pane later');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
