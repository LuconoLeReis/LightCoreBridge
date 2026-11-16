const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/dndbeyond/content-scripts/character.js');
function fn(name, code=source){const m=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(code);assert.ok(m,name);const tail=code.slice(m.index+m[0].length),end=/^(?:async )?function |^(?:const|let|var|class) /m.exec(tail);return code.slice(m.index,end?m.index+m[0].length+end.index:undefined);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<main style="min-height:100px"></main>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
 await page.addScriptTag({content:`
  var state={},settings={'vtt-tab':null},bindings={},character={_name:'Local player',getSetting:(k,d)=>bindings[k] ?? d};
  let wayBeyond20AttackFollowupQueue=Promise.resolve(), wb20ResourceQueue=Promise.resolve(), saveCallbacks=false;
  const wb20DismissedLocalTurnOffers=new WeakMap();
  function wayBeyond20GetTurnTrackerState(){return state;}
  function wayBeyond20SetTurnTrackerState(value,done){state=structuredClone(value);if(saveCallbacks)done?.();}
  function wayBeyond20ScheduleActiveEffectBadgeRefresh(){wayBeyond20InjectTurnResourceTracker();}
  function wayBeyond20GetTrackedSpellEffects(){return [];}
  function wayBeyond20IsMainCharacterSheet(){return true;}
  function wayBeyond20BuildTurnResourceDefaults(){return {action:1,bonusAction:1,reaction:1,movement:30,maxAction:1,maxBonusAction:1,maxReaction:1,maxMovement:30,maxHasteAction:0,hasteAction:0};}
  function wayBeyond20ParseInteger(n){return Number.isFinite(Number(n))?Math.trunc(Number(n)):null;}
  function wayBeyond20AttacksPerAttackAction(){return 2;}
  function wayBeyond20CharacterDebug(){}
  ${['wayBeyond20HasActiveCombatState','wayBeyond20NormalizeTurnTrackerState','wayBeyond20StartCombat','wayBeyond20StartNewTurn','wayBeyond20EndCombat','wayBeyond20OpenCombatWindow','wayBeyond20BuildCombatResource','wayBeyond20FindCombatSectionHost','wayBeyond20InjectTurnResourceTracker','wayBeyond20ResetTurnResourcesFromRoll20','wayBeyond20AttackActivationTurnKey','wayBeyond20SpendTurnResource'].map(name=>fn(name)).join('\n')}
  ${['wb20LocalTurnReady','wb20BuildLocalTurnOffer','wb20CombatInitiativeTotal'].filter(name=>source.includes('function '+name+'(')).map(name=>fn(name)).join('\n')}
  ${['wb20ResourceLocked','wb20CombatOwnTurn','wb20CommitCombatRequest'].map(name=>fn(name,read('src/dndbeyond/content-scripts/resources.js'))).join('\n')}
  function spendAttack(){wb20CommitCombatRequest({combatAttack:true,resource:'action',
      attackPool:state.attacksRemaining>0?'attacksRemaining':null},'Longsword');}
 `});
 await page.evaluate(()=>wayBeyond20StartCombat('D&D Beyond Initiative',true,19.18));
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Turn 1/);
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative: 19\.18/);
 await page.getByRole('button',{name:'Action: 1',exact:true}).click();assert.equal(await page.evaluate(()=>state.action),0);
 for(const turn of [2,3,4]) {
  await page.evaluate(()=>wayBeyond20ResetTurnResourcesFromRoll20({active:false},'Roll20'));
  await page.getByRole('button',{name:'New Turn',exact:true}).click();
  assert.equal(await page.evaluate(()=>state.localTurnNumber),turn);assert.equal(await page.evaluate(()=>state.action),1);
  assert.match(await page.locator('.waybeyond20-combat-source').textContent(),new RegExp('Turn '+turn));
  assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative: 19\.18/);
 }
 const offer=page.locator('.wb20-local-turn-offer');
 const start=page.getByRole('button',{name:'Start Next Turn',exact:true});
 await page.evaluate(()=>{saveCallbacks=true;});
 await page.getByRole('button',{name:'Bonus Action: 1',exact:true}).click();
 await page.evaluate(()=>spendAttack());
 assert.equal(await page.evaluate(()=>state.attacksRemaining),1);
 assert.equal(await offer.count(),0,'Extra Attack remains available');
 await page.evaluate(()=>spendAttack());
 await start.waitFor({timeout:1500});
 assert.equal(await offer.count(),1);
 assert.equal(await page.evaluate(()=>state.localTurnNumber),4,'no automatic advance');
 await page.evaluate(()=>{wayBeyond20AttackFollowupQueue=new Promise(resolve=>window.finishAttack=resolve);});
 await start.click();
 assert.equal(await start.isDisabled(),true);
 assert.equal(await page.evaluate(()=>state.localTurnNumber),4,'waits for the last hit and damage follow-up');
 await page.evaluate(()=>finishAttack());
 await page.getByRole('button',{name:'Action: 1',exact:true}).waitFor({timeout:1500});
 assert.deepEqual(await page.evaluate(()=>[state.localTurnNumber,state.action,state.bonusAction,state.reaction,state.attacksRemaining]),[5,1,1,1,0]);
 assert.equal(await offer.count(),0);

 await page.evaluate(()=>{
  state={...state,action:0,bonusAction:0,attacksRemaining:0,hasteAttacksRemaining:1};
  state.featureGrants={bonus:{unit:'attack',remaining:1,turnKey:wayBeyond20AttackActivationTurnKey()}};
  wayBeyond20InjectTurnResourceTracker();
 });
 assert.equal(await offer.count(),0);
 await page.evaluate(()=>{state.hasteAttacksRemaining=0;wayBeyond20InjectTurnResourceTracker();});
 assert.equal(await offer.count(),0,'a granted attack also keeps the offer closed');
 await page.evaluate(()=>{state.featureGrants.bonus.remaining=0;wayBeyond20InjectTurnResourceTracker();});
 await page.getByRole('button',{name:'Keep Playing',exact:true}).click();
 await page.evaluate(()=>{wayBeyond20SpendTurnResource('reaction');wayBeyond20InjectTurnResourceTracker();});
 assert.equal(await page.evaluate(()=>state.localTurnNumber),5);
 assert.equal(await offer.count(),0,'dismissing keeps this turn and does not repeat on refresh or reaction');

 await page.getByRole('button',{name:'New Turn',exact:true}).click();
 await page.evaluate(()=>{
  wayBeyond20SpendTurnResource('action');
  wayBeyond20SpendTurnResource('bonusAction');
  wayBeyond20AttackFollowupQueue=new Promise(resolve=>window.finishAttack=resolve);
 });
 await start.click();
 await page.getByRole('button',{name:'New Turn',exact:true}).click();
 await page.evaluate(()=>finishAttack());
 assert.equal(await page.evaluate(()=>state.localTurnNumber),7,'a stale offer cannot advance a different turn');
 for(const combatSource of ['Roll20','Foundry','TaleSpire']) {
  await page.evaluate(source=>{state={...state,combatSource:source,action:0,bonusAction:0};wayBeyond20InjectTurnResourceTracker();},combatSource);
  assert.equal(await offer.count(),0,`no local reminder during ${combatSource} turns`);
 }
 await page.evaluate(()=>{
  bindings['waybeyond20-roll20-token-id']='self';
  state={...state,combatSource:'Roll20',currentRoll20Turn:{tokenId:'opponent',pr:22,isThisCharactersTurn:false},
   knownTargets:[{tokenId:'opponent',initiative:22},{tokenId:'self',initiative:'0'}]};
  wayBeyond20InjectTurnResourceTracker();
 });
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative: 0/,'show the linked character even when an opponent acts');
 await page.evaluate(()=>{state.knownTargets[1].initiative='14.5';wayBeyond20InjectTurnResourceTracker();});
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative: 14\.5/,'an initiative-only update refreshes the tracker');
 await page.evaluate(()=>{state.initiativeOverride=-2.75;wayBeyond20InjectTurnResourceTracker();});
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative: -2\.75/,'manual correction applies to the sheet during an external turn');
 assert.equal(await page.evaluate(()=>state.knownTargets[1].initiative),'14.5','local correction does not edit VTT order or initiative');
 await page.getByRole('button',{name:'End Combat',exact:true}).click();assert.equal(await page.locator('.waybeyond20-combat-section').count(),0);
 assert.equal(await page.evaluate(()=>state.initiativeTotal),undefined);
 assert.equal(await page.evaluate(()=>state.initiativeOverride),undefined);
 await page.evaluate(()=>wayBeyond20StartCombat('Manual Combat',true));
 assert.doesNotMatch(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative/,'fresh combat does not inherit a previous roll');
 await page.evaluate(()=>{wayBeyond20EndCombat();state.initiativeOverride=14.16;wayBeyond20StartCombat('Manual Combat',true);wayBeyond20StartNewTurn();});
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative: 14\.16/,'pre-entered score carries into manual combat and later turns');
 await page.evaluate(()=>wayBeyond20StartCombat('D&D Beyond Initiative',true,18.1));
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Your initiative: 18\.1/,'a fresh roll supersedes the correction');
 // Real TaleSpire scoped persistence and the real Combat Window action. A paused
 // feed may update positions, but it cannot close or reset the user's manual combat.
 await page.evaluate(()=>{
  settings={'vtt-tab':{vtt:'talespire'}};
  character.mergeCharacterSettings=(next,done)=>{Object.assign(bindings,next);done?.();return Promise.resolve();};
  window.wayBeyond20SendRuntimeMessage=async()=>({ok:true,response:{connected:false}});
  document.querySelector('.waybeyond20-combat-section')?.remove();
  document.querySelector('main').insertAdjacentHTML('afterbegin','<button id="test-open-combat" type="button">Open Combat Window</button>');
  window.pausedBoard={v:1,campaignId:'fixture-campaign',boardId:'fixture-board',tracking:false,
   order:[{id:'enemy',name:'Enemy'},{id:'self',name:'Player'}],activeIndex:0,units:{name:'ft',numberPerTile:5},
   creatures:[{id:'enemy',name:'Enemy',boardId:'fixture-board',position:{x:1,y:0,z:0,locId:0}},
    {id:'self',name:'Player',boardId:'fixture-board',position:{x:0,y:0,z:0,locId:0}}]};
 });
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/talespire.js')});
 await page.addScriptTag({content:['wayBeyond20GetTurnTrackerState','wayBeyond20SetTurnTrackerState','wayBeyond20TurnTrackerStateEquals'].map(name=>fn(name)).join('\n')});
 await page.evaluate(()=>{wb20TSApplySnapshot(pausedBoard);document.getElementById('test-open-combat').onclick=wayBeyond20OpenCombatWindow;});
 await page.getByRole('button',{name:'Open Combat Window',exact:true}).click();
 await page.getByRole('button',{name:'Action: 1',exact:true}).waitFor();
 await page.getByRole('button',{name:'Action: 1',exact:true}).click();
 const windowIdentity=await page.evaluate(()=>wayBeyond20GetTurnTrackerState().combatStartedAt);
 await page.evaluate(()=>{for(let n=0;n<3;n++)wb20TSApplySnapshot({...pausedBoard,
  creatures:pausedBoard.creatures.map(c=>({...c,position:{...c.position,x:c.position.x+n}}))},true);});
 assert.equal(await page.locator('.waybeyond20-combat-section').count(),1,'paused feed must keep the manual Combat Window visible');
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Manual Combat/);
 assert.equal(await page.getByRole('button',{name:'Action: 0',exact:true}).count(),1,'no free action from a position refresh');
 assert.equal(await page.evaluate(()=>wayBeyond20GetTurnTrackerState().combatStartedAt),windowIdentity);
 await page.getByRole('button',{name:'New Turn',exact:true}).click();
 await page.evaluate(()=>wb20TSApplySnapshot(pausedBoard,true));
 assert.match(await page.locator('.waybeyond20-combat-source').textContent(),/Turn 2/);
 await page.getByRole('button',{name:'End Combat',exact:true}).click();
 await page.evaluate(()=>wb20TSApplySnapshot(pausedBoard,true));
 assert.equal(await page.locator('.waybeyond20-combat-section').count(),0,'ended combat stays ended');
 assert.deepEqual(errors,[]);console.log('PASS manual combat, completed attack pools, turn offer/dismiss/reset, follow-up and stale-turn guards, VTT isolation, and real TaleSpire paused-feed Combat Window persistence. Isolated Chrome only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
