// TaleSpire owns board observations. WB20 owns rules, counters and target notes.
var wb20TSFeed=null, wb20TSContext='', wb20TSBusy=false, wb20TSConnected=false;
// A locally started encounter can precede the first board response. Carry only
// a state written by this page/owner into that first identified board; never
// revive an old unscoped record or carry combat between different boards.
var wb20TSPendingState=null;
// Displayed status changes to "not connected" only after a confirmed loss:
// at least two failed checks spanning a few seconds. One missed poll keeps the
// status and buttons steady. Turn continuity is separate and breaks on any
// miss, so the first observation after a gap can never reset or spend.
var wb20TSLive=false, wb20TSMisses=0, wb20TSFirstMissAt=0, wb20TSStatusOwner=null;
var WB20_TS_LOSS_CHECKS=2, WB20_TS_LOSS_MS=3000;
function wb20TSNoteGood() {
    wb20TSMisses=0; wb20TSFirstMissAt=0; wb20TSConnected=true; wb20TSLive=true;
}
function wb20TSNoteMiss(now = Date.now()) {
    wb20TSLive=false;
    if (!wb20TSMisses) wb20TSFirstMissAt=now;
    wb20TSMisses++;
    if (wb20TSConnected && wb20TSMisses >= WB20_TS_LOSS_CHECKS && now-wb20TSFirstMissAt >= WB20_TS_LOSS_MS) wb20TSConnected=false;
}
// A different character or destination starts from unknown: offline until a
// good reply, with no continuity carried over.
function wb20TSResetConnection(owner = null) {
    wb20TSStatusOwner=owner; wb20TSConnected=false; wb20TSLive=false; wb20TSMisses=0; wb20TSFirstMissAt=0;
}
// A sheet choice supersedes the last board pick. Repeated observations (including
// a stale settings reload) cannot replay that pick over the user's newer choice.
var wb20TSSheetTarget=null;
function wb20TSTargetEvent(snapshot) {
    return JSON.stringify([snapshot.targetSession || '', snapshot.targetRevision ?? 0, snapshot.targetId || '']);
}
function wb20TSRememberSheetTarget(key) {
    if (!wb20TSSelected() || !wb20TSFeed) return;
    wb20TSSheetTarget={owner:character,context:wb20TSContext,key,event:wb20TSTargetEvent(wb20TSFeed)};
}
function wb20TSSelected() {return typeof settings !== 'undefined' && settings?.['vtt-tab']?.vtt === 'talespire';}
function wb20TSStateKey() {return 'waybeyond20-talespire-turn-states';}
function wb20TSGetState() {
    if (!wb20TSContext && wb20TSPendingState?.owner === character) return wb20TSPendingState.state;
    const states=character.getSetting(wb20TSStateKey(),{});
    return states?.[wb20TSContext] || {};
}
function wb20TSSetState(state,callback) {
    if (!wb20TSContext) wb20TSPendingState={owner:character,state};
    const states=character.getSetting(wb20TSStateKey(),{});
    return character.mergeCharacterSettings({[wb20TSStateKey()]:{...states,[wb20TSContext]:state}},callback);
}
function wb20TSKey(id) {return 'ts:'+wb20TSContext+':'+id;}
function wb20TSApplySnapshot(snapshot, continuous = false) {
    if (!snapshot || snapshot.v !== 1 || !Array.isArray(snapshot.creatures) || !Array.isArray(snapshot.order) ||
        snapshot.creatures.length > 200 || snapshot.order.length > 200 || !snapshot.boardId || !snapshot.campaignId) return;
    const oldContext=wb20TSContext;
    const pending=!oldContext && wb20TSPendingState?.owner === character ? wb20TSPendingState.state : null;
    wb20TSPendingState=null;
    wb20TSContext=snapshot.campaignId+'|'+snapshot.boardId;
    wb20TSFeed=snapshot;
    const previous=pending || wb20TSGetState();
    let state=wayBeyond20NormalizeTurnTrackerState(previous,wayBeyond20GetTrackedSpellEffects());
    const ordered=snapshot.order.map(entry=>snapshot.creatures.find(c=>c.id === entry.id)).filter(Boolean);
    const rest=snapshot.creatures.filter(c=>!ordered.some(o=>o.id === c.id));
    // The compass only follows the native order; out-of-order picked minis are
    // available in the target selector through extraTargets, never appended as turns.
    const target=c=>({tokenId:wb20TSKey(c.id),nativeId:c.id,name:c.name,initiative:'',position:{...c.position,
        pageId:c.boardId,scale:snapshot.units.numberPerTile,units:snapshot.units.name,system:'talespire'}});
    state.knownTargets=ordered.map(target);
    state.extraTargets=rest.map(target);
    const active=snapshot.order[snapshot.activeIndex] || (snapshot.activeHidden?{id:'_hidden_',name:'Hidden combatant'}:null);
    const binding=character.getSetting('waybeyond20-talespire-mini',null);
    const isOwn=!!active && binding?.campaignId === snapshot.campaignId && binding.id === active.id;
    const turnKey=active?wb20TSKey(active.id):'';
    // A reconnect or first observation never resets counters. A verified change
    // from another native combatant to this linked mini resets exactly once.
    const changed=previous.currentRoll20Turn?.tokenId && previous.currentRoll20Turn.tokenId !== turnKey;
    if (continuous && snapshot.tracking && active && changed && isOwn && previous.inCombat && oldContext === wb20TSContext) {
        state=wayBeyond20NormalizeTurnTrackerState(state,wayBeyond20GetTrackedSpellEffects(),{reset:true});
        state.localTurnNumber=(previous.localTurnNumber || 0)+1;
    }
    if (snapshot.tracking && active) {
        if (state.suppressedRoll20TurnKey === turnKey) {state.inCombat=false; state.combatSource=''; state.currentRoll20Turn=null;}
        else {
            state.inCombat=true; state.suppressedRoll20TurnKey='';
            state.combatSource='TaleSpire'; state.combatStartedAt=state.combatStartedAt || Date.now();
            state.currentRoll20Turn={tokenId:turnKey,tokenName:active.name,turnKey,isThisCharactersTurn:isOwn,pr:''};
        }
    } else if (!snapshot.tracking && state.combatSource === 'TaleSpire') {
        state.inCombat=false;
        // Pausing releases only TaleSpire's turn authority. A manually opened
        // Combat Window remains active while board observations keep updating.
        // Retain counters, observations and turn history; pausing is not a reset.
    }
    const sheetTarget=wb20TSSheetTarget;
    const preserveSheetTarget=sheetTarget?.owner === character && sheetTarget.context === wb20TSContext && sheetTarget.event === wb20TSTargetEvent(snapshot);
    if (preserveSheetTarget) state.selectedTargetKey=sheetTarget.key;
    else if (snapshot.targetId && (previous.tsTargetRevision !== snapshot.targetRevision || previous.tsTargetSession !== snapshot.targetSession || previous.tsTargetId !== snapshot.targetId || oldContext !== wb20TSContext)) {
        wb20TSSheetTarget=null;
        state.selectedTargetKey=wb20TSKey(snapshot.targetId);
        state.tsTargetRevision=snapshot.targetRevision;
        state.tsTargetId=snapshot.targetId;
        state.tsTargetSession=snapshot.targetSession;
    }
    if (pending || !wayBeyond20TurnTrackerStateEquals(previous,state)) wb20TSSetState(state,wayBeyond20ScheduleActiveEffectBadgeRefresh);
}
function wb20TSLinkMini() {
    const owner=character, feed=wb20TSFeed;
    if (!feed || !wb20TSConnected) {wb20TSRenderStatus(); return;}
    const form=$('<form>').append($('<p>').text('Choose your mini. This saves only the LightCore link; it does not move or change the mini.'));
    const select=$('<select>').attr({name:'ts-mini','aria-label':'TaleSpire character mini'}).append($('<option>').val('').text('Select your mini'));
    const binding=owner.getSetting('waybeyond20-talespire-mini',null);
    feed.creatures.forEach(c=>select.append($('<option>').val(c.id).text(c.name+' · '+c.id.slice(-6))));
    select.val(binding?.campaignId === feed.campaignId?binding.id:''); form.append(select);
    return wayBeyond20Prompt('Link TaleSpire Mini',form[0].outerHTML,'Link mini','Cancel').then(result=>{
        if (!result || character !== owner || wb20TSContext !== feed.campaignId+'|'+feed.boardId) return;
        const id=String(result.find('select').val() || '');
        if (!feed.creatures.some(c=>c.id === id)) return;
        owner.mergeCharacterSettings({'waybeyond20-talespire-mini':{campaignId:feed.campaignId,id}},()=>{
            wb20TSApplySnapshot(feed); wayBeyond20ScheduleActiveEffectBadgeRefresh();
        });
    });
}
function wb20TSRenderStatus() {
    if (!wb20TSSelected() || !wayBeyond20IsMainCharacterSheet()) { $('.wb20-ts-status').remove(); return; }
    const host=$('.waybeyond20-combat-section').first();
    const fallback=$('.ct-character-header-desktop:visible,.ct-character-header-tablet:visible,.ct-character-header-mobile:visible,.ddbc-character-header-desktop:visible,.ct-character-header:visible,.ddbc-character-header:visible').first();
    let bar=$('.wb20-ts-status').first();
    if (!bar.length) {
        bar=$('<div>').addClass('wb20-ts-status').css({display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',fontSize:'12px',padding:'4px 0'});
        bar.append($('<span>').addClass('wb20-ts-label'),$('<button type="button">').text('Link mini').on('click',wb20TSLinkMini),
            $('<button type="button">').text('Pick target in TaleSpire').on('click',()=>{
                if (!wb20TSConnected) return;
                try {chrome.runtime.sendMessage({action:'wb20-talespire-pick'},response=>{
                    if (chrome.runtime.lastError || !response?.ok) {wb20TSNoteMiss();wb20TSRenderStatus();}
                });} catch (_) {wb20TSNoteMiss();wb20TSRenderStatus();}
            }));
    }
    const binding=character.getSetting('waybeyond20-talespire-mini',null);
    const mini=wb20TSFeed?.creatures.find(c=>c.id === binding?.id && binding?.campaignId === wb20TSFeed.campaignId);
    const following=wb20TSFeed?.tracking === true;
    const label='TaleSpire: '+(wb20TSConnected?(mini?'linked to '+mini.name:'connected · link your mini')+
        (following?' · following turns':' · turn following paused'):'not connected');
    if (bar.find('span').text() !== label) bar.find('span').text(label);
    const title=wb20TSConnected && !following?
        'In the LightCore panel inside TaleSpire, enable Follow this board’s turn order to use its initiative in the combat tracker.':'';
    if (bar.find('span').attr('title') !== title) bar.find('span').attr('title',title);
    bar.find('button').prop('disabled',!wb20TSConnected);
    if (host.length) {if (bar.parent()[0] !== host[0]) host.append(bar);}
    else if (fallback.length && bar.parent()[0] !== fallback[0]) fallback.append(bar);
}
async function wb20TSRefresh() {
    if (wb20TSBusy) return;
    if (typeof character === 'undefined' || !character || !wb20TSSelected()) {if (wb20TSStatusOwner) wb20TSResetConnection(); return;}
    if (wb20TSStatusOwner !== character) wb20TSResetConnection(character);
    wb20TSBusy=true;
    try {
        const owner=character;
        const result=await wayBeyond20SendRuntimeMessage({action:'wb20-talespire-state'});
        const reply=result.ok ? result.response : null;
        if (character !== owner || !wb20TSSelected() || wb20TSStatusOwner !== owner) return;
        if (reply?.connected) {
            // Continuous only when the previous check was also good.
            const continuous=wb20TSLive;
            wb20TSNoteGood();
            wb20TSApplySnapshot(reply.snapshot,continuous);
        } else wb20TSNoteMiss();
        wb20TSRenderStatus();
    } catch (_) {wb20TSNoteMiss();wb20TSRenderStatus();}
    finally {wb20TSBusy=false;}
}
setInterval(()=>wb20TSRefresh().catch(()=>{wb20TSBusy=false;}),1500);
