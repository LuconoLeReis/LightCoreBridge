// Regression: actual Combat Window -> persisted TaleSpire state -> paused feed -> active-window predicate.
// All game inputs are fictional; does not connect to a browser, helper or native game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
const characterSource=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name){const match=new RegExp('^(?:async )?function '+name+'\\(','m').exec(characterSource);assert(match,name);
    const tail=characterSource.slice(match.index+match[0].length),end=/^(?:async )?function |^(?:const|let|var|class) /m.exec(tail);
    return characterSource.slice(match.index,end?match.index+match[0].length+end.index:undefined);}
const values={},snapshot={v:1,campaignId:'fixture-campaign',boardId:'fixture-board',tracking:false,
    order:[{id:'enemy',name:'Enemy'},{id:'self',name:'Player'}],activeIndex:0,units:{name:'ft',numberPerTile:5},
    creatures:[{id:'enemy',name:'Enemy',boardId:'fixture-board',position:{x:1,y:0,z:0,locId:0}},
        {id:'self',name:'Player',boardId:'fixture-board',position:{x:0,y:0,z:0,locId:0}}]};
let paints=0;
const c=vm.createContext({console,Date,settings:{'vtt-tab':{vtt:'talespire'}},setInterval:()=>{},
    character:{getSetting:(key,fallback)=>values[key]??fallback,mergeCharacterSettings:(next,done)=>{Object.assign(values,next);done?.();}},
    wayBeyond20GetTrackedSpellEffects:()=>[],wayBeyond20ParseInteger:n=>Number.isFinite(Number(n))?Math.trunc(Number(n)):null,
    wayBeyond20BuildTurnResourceDefaults:()=>({action:1,bonusAction:1,reaction:1,movement:30,maxAction:1,maxBonusAction:1,maxReaction:1,maxMovement:30,maxHasteAction:0}),
    wayBeyond20ScheduleActiveEffectBadgeRefresh:()=>{paints++;},wayBeyond20InjectTurnResourceTracker:()=>{paints++;}});
vm.runInContext(fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/talespire.js'),'utf8'),c);
for(const name of ['wayBeyond20GetTurnTrackerState','wayBeyond20SetTurnTrackerState','wayBeyond20TurnTrackerStateEquals',
    'wayBeyond20NormalizeTurnTrackerState','wayBeyond20HasActiveCombatState','wayBeyond20StartCombat','wayBeyond20OpenCombatWindow',
    'wayBeyond20StartNewTurn','wayBeyond20EndCombat'])vm.runInContext(fn(name),c);
c.wb20TSApplySnapshot(snapshot);
c.wayBeyond20OpenCombatWindow();
let state=c.wayBeyond20GetTurnTrackerState();assert.equal(state.combatSource,'Manual Combat');
assert.equal(c.wayBeyond20HasActiveCombatState(state),true,'click opens a manual Combat Window');
state={...state,action:0,bonusAction:0,reaction:0,attacksRemaining:1};c.wayBeyond20SetTurnTrackerState(state);
const started=state.combatStartedAt;
for(let i=0;i<3;i++)c.wb20TSApplySnapshot({...snapshot,creatures:snapshot.creatures.map(x=>({...x,position:{...x.position,x:x.position.x+i}}))},true);
state=c.wayBeyond20GetTurnTrackerState();
assert.equal(c.wayBeyond20HasActiveCombatState(state),true,'paused TaleSpire polling must not close the manually opened Combat Window');
assert.deepEqual([state.combatSource,state.combatStartedAt,state.action,state.bonusAction,state.reaction,state.attacksRemaining],
    ['Manual Combat',started,0,0,0,1],'polls preserve manual identity and already spent resources');
assert.equal(state.knownTargets[0].position.x,3,'board positions still update while turn following is paused');
c.wayBeyond20StartNewTurn();assert.equal(c.wayBeyond20GetTurnTrackerState().action,1);
c.wb20TSApplySnapshot(snapshot,true);assert.equal(c.wayBeyond20GetTurnTrackerState().localTurnNumber,2);
c.wayBeyond20EndCombat();c.wb20TSApplySnapshot(snapshot,true);
assert.equal(c.wayBeyond20GetTurnTrackerState().inCombat,false,'End Combat remains ended');
c.wb20TSApplySnapshot({...snapshot,tracking:true},true);
assert.equal(c.wayBeyond20GetTurnTrackerState().combatSource,'TaleSpire','explicit following still adopts the native turn');
state={...c.wayBeyond20GetTurnTrackerState(),action:0,reaction:0};c.wayBeyond20SetTurnTrackerState(state);
c.wb20TSApplySnapshot(snapshot,true);
assert.equal(c.wayBeyond20GetTurnTrackerState().inCombat,false,'pausing native following still releases native combat');
assert.equal(c.wayBeyond20GetTurnTrackerState().reaction,0,'pausing grants no resource reset');
c.wayBeyond20OpenCombatWindow();c.wb20TSApplySnapshot(snapshot,true);
assert.equal(c.wayBeyond20HasActiveCombatState(c.wayBeyond20GetTurnTrackerState()),true,'manual reopen after native pause remains open');
assert(paints>0);
console.log('PASS actual Combat Window/start/save/poll predicate: paused TaleSpire preserves manual combat, positions, resources, New Turn and End Combat; native following/pause retained. Synthetic state only.');
