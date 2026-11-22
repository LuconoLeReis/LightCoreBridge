const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function(page,root,src,fn){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 await page.addScriptTag({content:`var WhisperType={YES:1};var familiarStore={},globalStore={},nextHP=0,hpCount=0,freePaid=0,castCounter=0,selectCanceled=false;
 owner._level=4;owner.getSetting=(k,d)=>familiarStore[k]??d;owner.getGlobalSetting=(k,d)=>k==='waybeyond20-secondary-attacks'?secondary:k==='auto-roll-damage'?autoDamage:globalStore[k]??d;
 owner.getDict=()=>({name:'Caster'});owner.setGlobalSettings=s=>{globalStore=s;};owner.mergeCharacterSettings=async(p,cb)=>{Object.assign(familiarStore,p);cb?.(familiarStore);};
 function wb20RuleText(v){return String(v||'').replace(/\\s+/g,' ').trim();}
 function wb20CurrentFeatureRules(){return [{name:'Familiar Friend (Charisma)',text:'You always have the Find Familiar spell prepared. Cast without a spell slot or Material components. Your familiar’s HP max and current HP are increased by 8. A skill in which you have proficiency while your familiar is within 5 ft. of you gains Advantage on the check.'}];}
 function uuidv4(){return 'familiar-'+(++castCounter);}function wayBeyond20ScheduleActiveEffectBadgeRefresh(){}
 async function mergeSettings(p,cb){Object.assign(globalStore,p);cb?.(globalStore);}function resetHijackQuickRollState(){}
 function wayBeyond20SpellRowLevel(row){return Number(row.dataset.level);}
 const wayBeyond20NativeCastReplays=new WeakSet();
 function wayBeyond20RollAlreadyHasAdvantage(){return false;}
 async function wb20PickFamiliarForm(){return selectCanceled?null:{base:{name:'Owl',hp:1,formula:'1d4-1'},type:'Fey',familiarName:'Sparrow',appearance:'songbird'};}
 dndbeyondDiceRoller._roller={roll:f=>({formula:f,total:nextHP}),resolveRolls:async()=>{hpCount++;}};
 function resetFamiliar(){character=owner;secondary=false;managed=false;autoDamage=true;resetSlots();failCast=false;throwCast=false;selectCanceled=false;ritualMode='normal';freePaid=0;hpCount=0;familiarStore={};events=[];packets=[];key_modifiers={};
 document.querySelector('.ct-sidebar__header-parent').textContent='Familiar Friend (Charisma)';document.querySelector('.ct-spell-name').textContent='Find Familiar';
 document.querySelector('.ct-spell-detail__description').textContent='You gain the service of a familiar. Within 100 feet of you, communicate telepathically. As a Bonus Action, see through the familiar. A spell with a range of touch requires a Reaction to deliver. A familiar can’t attack. As a Magic action, temporarily dismiss it. Reappear in an unoccupied space within 30 feet. One Familiar Only.';
 document.querySelector('.ct-spell-caster__modifiers--damages')?.remove();document.querySelector('.ct-spell-caster__casting-level-current').textContent='1st Level';
 document.querySelector('.ct-spell-caster__casting-action button').textContent='Use';
 document.querySelector('#native-familiar')?.remove();var row=document.createElement('div');row.id='native-familiar';row.className='ct-spells-spell';row.dataset.level='1';
 row.innerHTML='<span class="ct-spell-name">Find Familiar</span><span class="ct-spells-spell__meta">Familiar Friend (Charisma)</span><div class="ct-spells-spell__action"><button>Use</button></div>';
 row.querySelector('button').onclick=()=>{freePaid++;row.querySelector('button').disabled=true;};document.body.append(row);}
 `});
 for(const name of ['wayBeyond20NativeSpellIdentity','wayBeyond20CommitNativeSpellCast'])await page.addScriptTag({content:fn(src,name)});
 await page.addScriptTag({content:read('src/dndbeyond/content-scripts/familiars.js')});
 let cases=0;
 await page.evaluate(async()=>{resetFamiliar();await execute('ct-spell-pane');});
 assert.deepEqual(await page.evaluate(()=>[freePaid,wayBeyond20SpellSlotState(1).available,hpCount,wb20Companions()[0]?.hp]),[1,4,1,9]);cases++;
 for(const flag of ['selectCanceled','failCast']) {
  await page.evaluate(async flag=>{resetFamiliar();window[flag]=true;await execute('ct-spell-pane');},flag);
  assert.deepEqual(await page.evaluate(()=>[freePaid,wayBeyond20SpellSlotState(1).available,hpCount,wb20Companions().length]),[0,4,0,0]);cases++;
 }
 await page.evaluate(async()=>{resetFamiliar();ritualMode='ritual';await execute('ct-spell-pane');});
 assert.deepEqual(await page.evaluate(()=>[freePaid,wayBeyond20SpellSlotState(1).available,hpCount]),[0,4,1]);cases++;
 await page.evaluate(async()=>{resetFamiliar();document.querySelector('.ct-spell-caster__casting-action button').textContent='Cast';await execute('ct-spell-pane');});
 assert.deepEqual(await page.evaluate(()=>[freePaid,wayBeyond20SpellSlotState(1).available,hpCount]),[0,3,1]);cases++;
 await page.evaluate(async()=>{resetFamiliar();await rollSpell(true);});
 assert.deepEqual(await page.evaluate(()=>[freePaid,wayBeyond20SpellSlotState(1).available,hpCount]),[0,4,0]);cases++;
 await page.evaluate(async()=>{resetFamiliar();document.querySelector('#native-familiar button').disabled=true;await execute('ct-spell-pane');});
 assert.deepEqual(await page.evaluate(()=>[freePaid,hpCount,packets.length]),[0,0,0]);cases++;
 console.log('PASS familiar cast composition: '+cases+' cases; actual execute/rollSpell/resource transaction, free use, slot, ritual, cancel and display.');
};
