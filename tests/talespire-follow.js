// Real companion producer, local preference, DDB state reducer and encounter
// functions. Fictional board only; never connects to the helper or live game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
let nativeBlob='{}',nativeReadFail=false,nativeWriteFail=false,nativeWriteGate=null,nativeWrites=0;const storage=new Map();let posts=[],board='board-a',campaign='campaign-a',active=0;
const names=Array.from({length:9},(_,i)=>'Combatant '+i);
function producer(){
 const nodes=Object.fromEntries(['return-status','connection','follow-turns','pick-target'].map(k=>[k,{textContent:'',value:'talespire://symbiote/fixture/',checked:false}]));
 const creatures=names.map((name,i)=>({id:'mini-'+i,name,boardId:board,position:{x:i,y:0,z:0,locId:0}}));
 const c=vm.createContext({console,Map,JSON,Array,crypto:{randomUUID:()=> 'fixture-session'},setInterval:()=>0,clearInterval:()=>{},
 document:{getElementById:k=>nodes[k]},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
 wb20LocalReturnKey:'a'.repeat(64),wb20TaleSpireCall:async p=>{const r=await p;if(r?.cause)throw Error(r.cause);return r;},
 TS:{localStorage:{global:{getBlob:async()=>nativeReadFail?{cause:'readFailed'}:nativeBlob,setBlob:async value=>{nativeWrites++;if(nativeWriteGate)await nativeWriteGate;if(nativeWriteFail)return {cause:'writeFailed'};nativeBlob=value;}}},boards:{whereAmI:async()=>({id:board})},campaigns:{whereAmI:async()=>({id:campaign})},
 initiative:{getQueue:async()=>({items:names.map((name,i)=>({id:'mini-'+i,name,kind:'creature'})),activeItemIndex:active})},
 creatures:{getSelectedCreatures:async()=>[],getCreaturesOwnedByPlayer:async()=>[],getMoreInfo:async()=>creatures.map(c=>({...c,boardId:board}))},
 players:{whoAmI:async()=> 'player'},units:{getDistanceUnitsForThisCampaign:async()=>({name:'ft',numberPerTile:5})},debug:{log:async()=>{}}}});
 vm.runInContext(read('companions/talespire/WayBeyond20/return-feed.js'),c);
 c.wb20ReturnFetch=async(route,data)=>{if(route==='/state')posts.push(JSON.parse(JSON.stringify(data)));return route==='/commands'?[]:{ok:true};};
 c.wb20ReturnState({kind:'hasInitialized'});
 return {c,nodes};
}
async function idle(c){await c.wb20ReturnFollowWrite;for(let i=0;i<30&&c.wb20ReturnBusy;i++)await new Promise(setImmediate);assert.equal(c.wb20ReturnBusy,false);}
function fn(source,name){const match=new RegExp('^(?:async )?function '+name+'\\(','m').exec(source);assert(match,name);
 const tail=source.slice(match.index+match[0].length),end=/^(?:async )?function |^(?:const|let|var|class) /m.exec(tail);
 return source.slice(match.index,end?match.index+match[0].length+end.index:undefined);}
(async()=>{
 let p=producer();await idle(p.c);assert.equal(posts.at(-1).tracking,false);assert.equal(posts.at(-1).order.length,9);
 p.nodes['follow-turns'].checked=true;p.nodes['follow-turns'].onchange();await idle(p.c);assert.equal(posts.at(-1).tracking,true);assert.equal(nativeWrites,1,'explicit choice is saved through the native Symbiote API');
 p=producer();await idle(p.c);assert.equal(p.nodes['follow-turns'].checked,true,'explicit choice survives panel reload');assert.equal(posts.at(-1).tracking,true);
 board='board-b';await p.c.wb20ReturnPoll();assert.equal(posts.at(-1).tracking,false,'new board starts paused');
 board='board-a';await p.c.wb20ReturnPoll();assert.equal(posts.at(-1).tracking,true,'return restores this board choice');
 campaign='campaign-b';await p.c.wb20ReturnPoll();assert.equal(posts.at(-1).tracking,false,'different campaign never inherits choice');
 campaign='campaign-a';await p.c.wb20ReturnPoll();assert.equal(posts.at(-1).tracking,true);
 const following=posts.at(-1);
 p.nodes['follow-turns'].checked=false;p.nodes['follow-turns'].onchange();await idle(p.c);
 p=producer();await idle(p.c);assert.equal(posts.at(-1).tracking,false,'explicit pause survives reload too');
 nativeBlob='broken-json';p=producer();await idle(p.c);assert.equal(posts.at(-1).tracking,false,'bad storage defaults paused');
 nativeBlob=JSON.stringify({lightcoreFollow:[['campaign-a|board-a','true']]});p=producer();await idle(p.c);assert.equal(posts.at(-1).tracking,false,'string true is not consent');
 nativeBlob=JSON.stringify({unrelated:{preserve:7}});p=producer();await idle(p.c);
 p.nodes['follow-turns'].checked=true;p.nodes['follow-turns'].onchange();await idle(p.c);assert.equal(JSON.parse(nativeBlob).unrelated.preserve,7,'unrelated native storage survives');
 nativeReadFail=true;p=producer();await idle(p.c);assert.equal(posts.at(-1).tracking,false);p.nodes['follow-turns'].checked=true;p.nodes['follow-turns'].onchange();await idle(p.c);assert.equal(posts.at(-1).tracking,true,'native read failure never blocks explicit following');assert.equal(p.c.wb20ReturnFollowSaved,false);nativeReadFail=false;
 nativeWriteFail=true;p=producer();await idle(p.c);p.nodes['follow-turns'].checked=false;p.nodes['follow-turns'].onchange();await idle(p.c);assert.equal(posts.at(-1).tracking,false);assert.equal(p.c.wb20ReturnFollowSaved,false,'native write error is reported');nativeWriteFail=false;
 let release;const before=nativeWrites;nativeWriteGate=new Promise(resolve=>{release=resolve;});
 p.nodes['follow-turns'].checked=true;p.nodes['follow-turns'].onchange();p.nodes['follow-turns'].checked=false;p.nodes['follow-turns'].onchange();
 await new Promise(setImmediate);assert.equal(nativeWrites-before,1,'second native write waits for the first');release();await idle(p.c);nativeWriteGate=null;
 assert.equal(JSON.parse(nativeBlob).lightcoreFollow.at(-1)[1],false,'queued writes preserve latest rapid choice');
 const values={},owner={getSetting:(k,d)=>values[k]??d,mergeCharacterSettings:(n,cb)=>{Object.assign(values,n);cb?.();}};
 const c=vm.createContext({console,Date,settings:{'vtt-tab':{vtt:'talespire'}},setInterval:()=>{},character:owner,
 wayBeyond20GetTrackedSpellEffects:()=>[],wayBeyond20ParseInteger:n=>Number.isFinite(Number(n))?Math.trunc(Number(n)):null,
 wayBeyond20BuildTurnResourceDefaults:()=>({action:1,bonusAction:1,reaction:1,movement:30,maxAction:1,maxBonusAction:1,maxReaction:1,maxMovement:30,maxHasteAction:0}),
 wayBeyond20ScheduleActiveEffectBadgeRefresh:()=>{},wayBeyond20InjectTurnResourceTracker:()=>{}});
 vm.runInContext(read('src/dndbeyond/content-scripts/talespire.js'),c);
 const src=read('src/dndbeyond/content-scripts/character.js');
 for(const n of ['wayBeyond20GetTurnTrackerState','wayBeyond20SetTurnTrackerState','wayBeyond20TurnTrackerStateEquals','wayBeyond20NormalizeTurnTrackerState','wayBeyond20HasActiveCombatState','wayBeyond20StartCombat','wayBeyond20EndCombat'])vm.runInContext(fn(src,n),c);
 values['waybeyond20-talespire-turn-states']={'':{inCombat:true,combatSource:'D&D Beyond Initiative',combatStartedAt:1,action:0}};
 assert.equal(Object.keys(c.wayBeyond20GetTurnTrackerState()).length,0,'old persisted unscoped state is not exposed to pre-feed resource or Correction writes');
 c.wayBeyond20StartCombat('D&D Beyond Initiative',true,17);
 c.wayBeyond20SetTurnTrackerState({...c.wayBeyond20GetTurnTrackerState(),action:0,bonusAction:0});
 c.wb20TSApplySnapshot({...following,tracking:false});
 let s=c.wayBeyond20GetTurnTrackerState();assert.equal(c.wayBeyond20HasActiveCombatState(s),true,'first board response cannot close Initiative combat');
 assert.equal(s.combatSource,'D&D Beyond Initiative');assert.equal(s.initiativeTotal,17);assert.equal(s.action,0);assert.equal(s.bonusAction,0);
 values['waybeyond20-talespire-mini']={campaignId:following.campaignId,id:'mini-1'};
 c.wb20TSApplySnapshot(following,false);s=c.wayBeyond20GetTurnTrackerState();assert.equal(s.combatSource,'TaleSpire');assert.equal(s.currentRoll20Turn.tokenName,names[0]);assert.equal(s.knownTargets.length,9);assert.equal(s.action,0,'initial adoption grants no free Action');
 c.wb20TSApplySnapshot({...following,activeIndex:1},true);s=c.wayBeyond20GetTurnTrackerState();assert.equal(s.currentRoll20Turn.tokenName,names[1]);assert.equal(s.action,1,'continuous native transition resets linked own turn');
 c.wayBeyond20SetTurnTrackerState({...s,action:0});c.wb20TSApplySnapshot({...following,activeIndex:1},true);assert.equal(c.wayBeyond20GetTurnTrackerState().action,0,'repeated snapshot never resets');
 c.wb20TSApplySnapshot({...following,boardId:'new-board',tracking:false},false);assert.equal(c.wayBeyond20HasActiveCombatState(c.wayBeyond20GetTurnTrackerState()),false,'another board does not inherit combat');
 c.wb20TSContext='';c.wb20TSPendingState=null;c.wb20TSApplySnapshot(following);assert.equal(c.wayBeyond20HasActiveCombatState(c.wayBeyond20GetTurnTrackerState()),true,'existing board keeps its own followed encounter');
 delete values['waybeyond20-talespire-turn-states']['campaign-a|board-a'];c.wb20TSContext='';c.wb20TSPendingState=null;c.wb20TSApplySnapshot({...following,tracking:false});assert.equal(c.wayBeyond20HasActiveCombatState(c.wayBeyond20GetTurnTrackerState()),false,'old unscoped record is never revived');
 c.wb20TSContext='';c.wayBeyond20StartCombat('D&D Beyond Initiative',true,18);c.character={getSetting:(_k,d)=>d,mergeCharacterSettings:()=>{}};c.wb20TSApplySnapshot({...following,tracking:false});assert.equal(c.wayBeyond20HasActiveCombatState(c.wayBeyond20GetTurnTrackerState()),false,'pending combat belongs only to its original owner');
 console.log('PASS TaleSpire follow and startup: real nine-entry producer, explicit follow/pause persistence, board/campaign isolation, malformed preferences, Initiative before first feed, spent resources retained, native own-turn reset once, no stale unscoped/owner migration. Synthetic game only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
