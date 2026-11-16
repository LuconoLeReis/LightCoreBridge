const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(name,source){const m=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(source);assert.ok(m,name);const tail=source.slice(m.index+m[0].length),end=/^(?:async )?function |^(?:const|let|var|class) /m.exec(tail);return source.slice(m.index,end?m.index+m[0].length+end.index:undefined);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<body style="background:#181e23;color:#eee"><section class="ct-saving-throws-box" style="width:281px;height:60px;background:#181e23;color:#eee;border:1px solid #ac7b26"></section><button id="other">Combat controls remain available</button></body>');
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
 await page.addScriptTag({content:fn('wayBeyond20ApplySheetTheme',read('src/dndbeyond/content-scripts/portent.js'))});
 await page.addScriptTag({content:`
  var character={_name:'Local player'},chrome={runtime:{getURL:p=>p}},discordSends=0,runtimeSends=0,deliveries=[],WhisperType={NO:0,YES:1,HIDE_NAMES:3},RollType={NORMAL:0};
  function getDiscordChannel(){return null;}
  function postToDiscord(){discordSends++;return Promise.resolve();}
  function sendRollRequestToDOM(){}
  function wayBeyond20SendRuntimeMessage(req){runtimeSends++;return new Promise(resolve=>deliveries.push({req,resolve}));}
  var DigitalDiceManager={clearResults(){},isEnabled(){return false;}};
  ${read('src/common/constants.js')}
  ${read('src/common/dice.js')}
  ${read('src/common/roll_renderer.js')}
  ${read('src/dndbeyond/base/dice.js').split('class DNDBPrompter')[0]}
  var dndbeyondDiceRoller=new Beyond20RollRenderer(new DNDBRoller(),{},new DNDBDisplayer());
  dndbeyondDiceRoller.setSettings({'local-roll-display-duration':0});
  async function numberRoll(n){var r=new DNDBRoll(String(n));await r.roll();return r;}
  async function damageCard(group,phase,rows){var request={name:'Everflame',character:{name:'Local player',settings:{}},whisper:0,sendMessage:true,rollDamage:true,
   'waybeyond20-local-result-group':group,'waybeyond20-followup-phase':phase};
   await dndbeyondDiceRoller.postDescription(request,'Everflame',null,{},'',[],[],rows);}
 `});
 await page.evaluate(async()=>{
  var base=[['Bludgeoning',await numberRoll(8),DAMAGE_FLAGS.REGULAR],['Fire',await numberRoll(6),DAMAGE_FLAGS.ADDITIONAL]];
  var smite=[['Radiant',await numberRoll(7),DAMAGE_FLAGS.REGULAR],['Another target',await numberRoll(9),DAMAGE_FLAGS.CONDITIONAL]];
  await damageCard('attack1','damage',base);await damageCard('attack1','smite',smite);
  await wb20ShowLocalAttackTotal({name:'Everflame','waybeyond20-local-result-group':'attack1'},[],base.concat(smite),0);
 });
 assert.equal(await page.evaluate(()=>runtimeSends),2,'summary never sends another VTT packet');assert.equal(await page.evaluate(()=>discordSends),2,'summary never posts another Discord message');
 assert.equal(await page.locator('#wb20-local-rolls').isVisible(),false,'wait for the existing delivery verdict');
 await page.evaluate(()=>{for(const d of deliveries)d.resolve({ok:false});});
 await page.waitForFunction(()=>document.querySelector('#wb20-local-rolls')?.hidden===false);
 assert.equal(await page.locator('.wb20-local-roll-card:not([hidden])').count(),1);
 assert.match(await page.locator('.wb20-local-roll-title').textContent(),/Everflame.*Total/);
 const card=page.locator('.wb20-local-roll-card:not([hidden])');
 assert.match(await card.locator('.beyond20-total-damage:not(.beyond20-conditional-total)').innerText(),/21/,'base, fire and smite counted once; another target excluded');
 assert.equal(await card.locator('.beyond20-conditional-total .beyond20-roll-total').count(),0,'conditional damage cannot look like the attack total');
 if(process.env.WB20_PRESENTATION_EVIDENCE)await page.screenshot({path:path.join(process.env.WB20_PRESENTATION_EVIDENCE,'local-attack-total.png')});
 await page.evaluate(()=>document.getElementById('wb20-local-rolls').remove());
 await page.evaluate(async()=>{
  deliveries=[];var rows=[['Slashing',await numberRoll(5),DAMAGE_FLAGS.REGULAR]];
  await damageCard('attack2','damage',rows);await wb20ShowLocalAttackTotal({name:'Sword','waybeyond20-local-result-group':'attack2'},[],rows,0);
  deliveries.forEach(d=>d.resolve({ok:true,response:{delivered:true}}));
 });
 await page.waitForFunction(()=>!document.querySelector('.wb20-local-roll-card'));
 assert.equal(await page.locator('#wb20-local-rolls').isVisible(),false,'all delivered packets suppress the grouped local summary');
 await page.evaluate(async()=>{
  document.getElementById('wb20-local-rolls').remove();deliveries=[];
  var rows=[['One handed',await numberRoll(8),DAMAGE_FLAGS.REGULAR],['Two handed',await numberRoll(10),DAMAGE_FLAGS.VERSATILE],['Smite',await numberRoll(7),DAMAGE_FLAGS.ADDITIONAL]];
  await damageCard('versatile','damage',rows);await wb20ShowLocalAttackTotal({name:'Sword','waybeyond20-local-result-group':'versatile'},[],rows,0);
  deliveries.forEach(d=>d.resolve({ok:false}));
 });
 await page.waitForFunction(()=>document.querySelector('#wb20-local-rolls')?.hidden===false);
 const versatile=page.locator('.wb20-local-roll-card:not([hidden]) .beyond20-total-damage');
 const versatileText=(await versatile.allInnerTexts()).join(' ');
 assert.match(versatileText,/15/);assert.match(versatileText,/17/,'rider applies to both handedness choices');
 await page.evaluate(async()=>{
  document.getElementById('wb20-local-rolls').remove();deliveries=[];
  dndbeyondDiceRoller.setSettings({'vtt-tab':{vtt:'dndbeyond'},'hide-results-on-whisper-to-discord':true});
  var rows=[['Slashing',await numberRoll(5),DAMAGE_FLAGS.REGULAR]];
  await dndbeyondDiceRoller.postDescription({name:'Private','waybeyond20-local-result-group':'private',character:{name:'Local player',settings:{}},whisper:1,sendMessage:true,rollDamage:true},'Private',null,{},'',[],[],rows);
  await wb20ShowLocalAttackTotal({name:'Private','waybeyond20-local-result-group':'private'},[],rows,1);
  deliveries.forEach(d=>d.resolve({ok:false}));
 });
 await page.waitForTimeout(30);assert.equal(await page.locator('#wb20-local-rolls').isVisible(),false,'summary cannot bypass private-result suppression');
 await page.evaluate(()=>dndbeyondDiceRoller.setSettings({'local-roll-display-duration':0}));
 // The local button enters the real renderer continuation branch and the same
 // one-shot coordinator. It does not build an independent damage roll.
 await page.addScriptTag({content:read('src/dndbeyond/content-scripts/attack-followups.js')});
 // Real continuation -> summary conversion -> real renderer/displayer. A flat
 // weapon critical has no weapon critical dice to seed the rider's subtotal.
 for(const flatWeapon of [true,false]){
  await page.evaluate(async flatWeapon=>{
   document.getElementById('wb20-local-rolls').remove();deliveries=[];
   var weapon=flatWeapon?[['Bludgeoning',await numberRoll(5),DAMAGE_FLAGS.REGULAR]]:[];
   var rider=[['Radiant',await numberRoll(8),DAMAGE_FLAGS.REGULAR],['Radiant critical',await numberRoll(13),DAMAGE_FLAGS.REGULAR|DAMAGE_FLAGS.CRITICAL]];
   window.wayBeyond20MaybeAddSmite=async()=>({smite:{name:'Divine Smite'}});
   const args={name:'Unarmed Strike','waybeyond20-local-result-group':'flat-'+flatWeapon};
   await wayBeyond20FinishAttackDamage({owner:character,args,rollType:'attack',critical:true,whisper:0,smiteOptions:true},async(type,fallback,request)=>{
    const rows=request['waybeyond20-followup-phase']==='damage'?weapon:rider;
    request['waybeyond20-capture-result']({whisper:0},[],rows);
    await damageCard(request['waybeyond20-local-result-group'],request['waybeyond20-followup-phase'],rows);
    return true;
   });
   deliveries.forEach(d=>d.resolve({ok:false}));
  },flatWeapon);
  await page.waitForFunction(()=>document.querySelector('#wb20-local-rolls')?.hidden===false);
  const criticalTotals=(await page.locator('.wb20-local-roll-card:not([hidden]) .beyond20-total-damage').allInnerTexts()).join(' | ');
  assert.match(criticalTotals,flatWeapon?/\b26\b/:/\b21\b/,'critical rider counted even without matching weapon subtotal');
  const ink=await page.locator('.wb20-local-roll-card:not([hidden]) .beyond20-roll-detail-normal').first().evaluate(n=>getComputedStyle(n).color);
  assert.equal(ink,'rgb(238, 238, 238)','row values inherit the dark sheet text color');
  if(flatWeapon && process.env.WB20_PRESENTATION_EVIDENCE)await page.screenshot({path:path.join(process.env.WB20_PRESENTATION_EVIDENCE,'local-flat-critical-total.png')});
 }
 // Drive the actual hit decision, roll builder, dice and local presentation.
 // Only the native digital-dice availability and delivery boundaries are stubbed.
 await page.addScriptTag({content:`
  var phases=[];
  var testDelivery=wayBeyond20SendRuntimeMessage;
  var testResolve=dndbeyondDiceRoller._roller.resolveRolls.bind(dndbeyondDiceRoller._roller);
  window.wayBeyond20NormalizeAttackSemantics=()=>{};
  window.wayBeyond20ApplyDrainingAttackIntent=()=>{};
  window.wayBeyond20MayHaveSmiteAfterHit=()=>true;
  window.wayBeyond20MaybeAddSmite=async()=>null;
  window.wayBeyond20CaptureResolvedRoll=(request,attacks,damage)=>request['waybeyond20-capture-result']?.(request,attacks,damage);
  window.sendRollWithCharacter=async(type,fallback,args)=>{
   phases.push(args['waybeyond20-followup-phase']);
   const request={type,whisper:0,...args,character:{name:'Local player',settings:{}},sendMessage:true};
   await dndbeyondDiceRoller.handleRollRequest(request);
   return true;
  };
  function startDamageSequence(auto, hide) {
   document.getElementById('wb20-local-rolls')?.remove();
   phases=[];
   wayBeyond20SendRuntimeMessage=async()=>({ok:false});
   dndbeyondDiceRoller.setSettings({'local-roll-display-duration':0.05,'use-digital-dice':hide,'hide-results-with-digital-dice':hide});
   dndbeyondDiceRoller._roller.resolveRolls=async(name,rolls,request)=>{
    await testResolve(name,rolls,request);
    if(hide && request.rollAttack)request['waybeyond20-digital-dice-fallback']=false;
   };
   dndbeyondDiceRoller._prompter.prompt=()=>new Promise(resolve=>{
    const hit=document.querySelector('#other');
    hit.onclick=()=>{hit.onclick=null;resolve(true);};
    window.declineHit=()=>{hit.onclick=null;resolve(false);};
   });
   window.damageSequence=wayBeyond20ResolveAttackFollowup('attack',null,{name:'Fixture sword',rollAttack:true,rollDamage:auto,
    'to-hit':'+8',advantage:0,rollCritical:true,damages:['1d6+11','2d6'],'damage-types':['Bludgeoning','Fire'],
    'critical-damages':['1d6','2d6'],'critical-damage-types':['Bludgeoning','Fire'],'waybeyond20-smite-eligible':true});
  }
 `});
 const rollDamages=page.getByRole('button',{name:'Roll Damages',exact:true});
 for(const hide of [true,false]){
  await page.evaluate(hide=>startDamageSequence(false,hide),hide);
  await rollDamages.waitFor({timeout:2500});
  if(hide) assert.match(await page.locator('#wb20-local-rolls').innerText(),/^Damage pending\s*Close\s*Roll Damages$/,'a hidden hit exposes only the control');
  await page.locator('#other').click();
  assert.equal(await page.evaluate(()=>damageSequence),true);
  await page.waitForTimeout(250);
  assert.equal(await rollDamages.isVisible(),true,'confirming the hit and result fade never hide pending damage');
  assert.deepEqual(await page.evaluate(()=>phases),['base']);
  await page.evaluate(()=>dndbeyondDiceRoller._settings['local-roll-display-duration']=0);
  await rollDamages.click();
  await card.locator('.beyond20-combined-damage').waitFor({timeout:2000});
  assert.deepEqual(await page.evaluate(()=>phases),['base','damage'],'exactly one real damage pass');
  assert.match(await card.innerText(),/Bludgeoning Critical Damage/);
  assert.match(await card.innerText(),/Fire Critical Damage/);
 }
 await page.evaluate(()=>startDamageSequence(false,true));
 await rollDamages.waitFor({timeout:2500});
 await page.evaluate(async()=>{declineHit();await damageSequence;});
 assert.equal(await rollDamages.count(),0,'Miss removes the pending local control');
 assert.deepEqual(await page.evaluate(()=>phases),['base']);
 await page.evaluate(()=>startDamageSequence(true,false));
 await page.waitForFunction(()=>typeof document.querySelector('#other').onclick==='function');
 await page.locator('#other').click();
 assert.equal(await page.evaluate(()=>damageSequence),true);
 assert.deepEqual(await page.evaluate(()=>phases),['base','damage'],'automatic mode rolls damage after Hit without another click');
 await page.evaluate(()=>{wayBeyond20SendRuntimeMessage=testDelivery;dndbeyondDiceRoller._roller.resolveRolls=testResolve;dndbeyondDiceRoller.setSettings({'local-roll-display-duration':0});});
 await page.addScriptTag({content:`
  var finishes=0;wayBeyond20FinishAttackDamage=async()=>{finishes++;return true;};
  wayBeyond20PendingAttackDamage.set('local-button',{ready:true,owner:character});
 `});
 await page.evaluate(async()=>{
  await dndbeyondDiceRoller.postDescription({name:'Sword',character:{name:'Local player',settings:{}},sendMessage:true,rollAttack:true,rollDamage:false,damages:['1d8+4'],
   'waybeyond20-local-only':true,'waybeyond20-attack-continuation':{id:'local-button',tab:null}},'Sword',null,{},'',[],[],[]);
 });
 await page.getByRole('button',{name:'Roll Damages',exact:true}).click();
 await page.evaluate(()=>wayBeyond20ContinueAttackDamage('local-button'));
 assert.equal(await page.evaluate(()=>finishes),1,'repeated local clicks share one continuation');
 await page.evaluate(()=>{wayBeyond20PendingAttackDamage.set('local-button',{ready:true,declined:true});});
 await page.evaluate(()=>wayBeyond20ContinueAttackDamage('local-button'));assert.equal(await page.evaluate(()=>finishes),1,'Miss/Skip never executes damage');
 // Real renderer and page broker, with a fixture for DDB's native envelopes.
 await page.addScriptTag({content:read('src/common/utils.js')+'\n'+read('src/dndbeyond/base/message-broker.js')});
 await page.evaluate(()=>{
  window.nativeLog=[];
  const subscribers=[];
  window.nativeDDBBroker={
   userId:'player',gameId:'campaign',subscribe(callback){subscribers.push(callback);},
   dispatch(event){nativeLog.push(structuredClone(event));subscribers.forEach(callback=>callback(event));}
  };
  window[Symbol.for('@dndbeyond/message-broker-lib')]=nativeDDBBroker;
 });
 await page.addScriptTag({content:read('src/dndbeyond/page-scripts/message-broker.js')});
 await page.addScriptTag({content:`
  async function phaseRows(values) {
   return Promise.all(values.map(async ([label,n,flags])=>{
    const roll=await numberRoll(n);roll.setRollType(flags & DAMAGE_FLAGS.CRITICAL?'critical-damage':'damage');
    return [label,roll,flags];
   }));
  }
  function nativePhase(group,id,name,rows,whisper=0,log=true) {
   const request={rollDamage:true,rollAttack:false,whisper,'waybeyond20-local-result-group':group};
   const gameLog=log ? {id,group} : undefined;
   if (log) {
    sendCustomEvent('MBPendingRoll',[{name,gameLog}]);
    for (const eventType of ['dice/roll/pending','dice/roll/fulfilled']) nativeDDBBroker.dispatch({
     eventType,id:eventType+id,messageScope:whisper?'userId':'gameId',messageTarget:whisper?'player':'campaign',
     data:{rollId:id,action:'Custom Roll',rolls:[]}
    });
   }
   sendCustomEvent('MBFulfilledRoll',[{name,gameLog,request,rolls:rows.map(([,roll])=>roll.toJSON())}]);
  }
  const completedLog=()=>nativeLog.filter(entry=>entry.eventType==='dice/roll/fulfilled');
 `});
 await page.evaluate(async()=>{
  dndbeyondDiceRoller.setSettings({'roll-to-game-log':true,'hide-results-with-digital-dice':true,'use-digital-dice':true});
  window.weaponRows=await phaseRows([['Bludgeoning Damage',17,DAMAGE_FLAGS.REGULAR]]);
  window.smiteRows=await phaseRows([['Fire Damage',12,DAMAGE_FLAGS.ADDITIONAL],
   ['Bludgeoning Critical Damage',6,DAMAGE_FLAGS.REGULAR|DAMAGE_FLAGS.CRITICAL],
   ['Fire Critical Damage',12,DAMAGE_FLAGS.ADDITIONAL|DAMAGE_FLAGS.CRITICAL],
   ['Other target Damage',9,DAMAGE_FLAGS.CONDITIONAL]]);
  nativePhase('first-attack','weapon','Everflame',weaponRows,1);
  nativePhase('first-attack','smite','Divine Smite',smiteRows,1);
 });
 assert.equal(await page.evaluate(()=>completedLog().length),0,'completed damage phases wait for the one attack summary');
 await page.evaluate(()=>wb20ShowLocalAttackTotal({name:'Everflame','waybeyond20-local-result-group':'first-attack'},[],weaponRows.concat(smiteRows),1));
 const posted=await page.evaluate(()=>completedLog());
 assert.equal(posted.length,1);
 assert.equal(posted[0].data.action,'Everflame');
 assert.equal(posted[0].messageScope,'userId');
 assert.equal(posted[0].messageTarget,'player');
 assert.deepEqual(posted[0].data.rolls.map(roll=>[roll.rollType,roll.rollKind,roll.result.total]),[
  ['damage','',47],
  ['Bludgeoning','',17],
  ['Fire','',12],
  ['Bludgeoning','critical hit',6],
  ['Fire','critical hit',12],
  ['Conditional Other target','',9]
 ]);
 assert.equal(posted[0].data.rolls[0].result.text,'17+12+6+12');

 await page.evaluate(async()=>{
  nativePhase('second-attack','weapon-2','Everflame',weaponRows);
  await wb20ShowLocalAttackTotal({name:'Everflame','waybeyond20-local-result-group':'second-attack'},[],weaponRows,0);
 });
 assert.deepEqual(await page.evaluate(()=>completedLog().map(entry=>[entry.data.action,entry.data.rolls[0].result.total])),[['Everflame',47],['Everflame',17]]);
 assert.deepEqual(await page.evaluate(()=>completedLog()[1].data.rolls.map(roll=>[roll.rollType,roll.result.total])),[['Bludgeoning',17]],'one component is the total and is shown only once');

 await page.evaluate(async()=>{
  nativePhase('mixed','public','Everflame',weaponRows,0);
  nativePhase('mixed','private','Private rider',smiteRows,1,false);
  await wb20ShowLocalAttackTotal({name:'Everflame','waybeyond20-local-result-group':'mixed'},[],weaponRows.concat(smiteRows),0);
 });
 const mixed=await page.evaluate(()=>completedLog().at(-1));
 assert.equal(mixed.data.action,'Everflame','mixed audiences fall back to the original safe entry');
 assert.deepEqual(mixed.data.rolls.map(roll=>roll.result.total),[17],'a private local rider never joins a public Game Log post');
 await page.evaluate(()=>{
  nativePhase('interrupted','interrupted-base','Everflame',weaponRows,0);
  sendCustomEvent('MBAttackDamageEnd',['interrupted']);
  sendCustomEvent('MBAttackDamageEnd',['interrupted']);
 });
 assert.equal(await page.evaluate(()=>completedLog().length),4,'an interrupted workflow releases its entry once');
 await page.evaluate(async()=>{
  const rows=await phaseRows([['Slashing Damage',8,DAMAGE_FLAGS.REGULAR],
   ['Slashing Damage',10,DAMAGE_FLAGS.VERSATILE],['Radiant Damage',7,DAMAGE_FLAGS.ADDITIONAL]]);
  nativePhase('hands','sword','Longsword',rows);
  await wb20ShowLocalAttackTotal({name:'Longsword','waybeyond20-local-result-group':'hands'},[],rows,0);
 });
 const versatileLog=await page.evaluate(()=>completedLog().at(-1).data);
 assert.equal(versatileLog.action,'Longsword');
 assert.deepEqual(versatileLog.rolls.map(roll=>[roll.rollType,roll.result.total]),[
  ['One-handed damage',15],['Two-handed damage',17],
  ['Slashing (1-Hand)',8],['Slashing (2-Hand)',10],['Radiant',7]
 ]);
 assert.deepEqual(errors,[]);console.log('PASS combined local and Game Log damage, critical and conditional totals, privacy, split-attack isolation, and one-shot damage continuation. Isolated Chrome only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
