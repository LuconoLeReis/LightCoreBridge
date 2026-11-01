const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function background(mode) {
    const calls=[],store={'wb20-beyond20-mode':mode,settings:{'vtt-tab':{vtt:'talespire'},'talespire-url':'saved-connection'},'character-7':{focus:2}};
    const c=vm.createContext({URL,isFVTT:title=>title.includes('Foundry Virtual Tabletop'),chrome:{runtime:{id:'extension',lastError:null},storage:{local:{get:(defaults,cb)=>cb({...defaults,...store})}},
        permissions:{contains:(request,cb)=>cb(request.origins[0]==='http://localhost/*')},
        scripting:{insertCSS:(request,cb)=>{calls.push(request);cb?.();},executeScript:(request,cb)=>{calls.push(request);cb?.();}},
        tabs:{query:(request,cb)=>cb([{id:7,url:'https://www.dndbeyond.com/characters/7'},
            {id:8,url:'https://app.roll20.net/editor/'},{id:9,url:'https://www.dndbeyond.com/monsters/9'},
            {id:10,url:'http://localhost:30000',title:'World · Foundry Virtual Tabletop'},
            {id:11,url:'https://unpermitted.test/',title:'Foundry Virtual Tabletop'}]),reload:(id,cb)=>{calls.push({reload:id});cb();}}}});
    vm.runInContext(read('src/reliability/recovery-scope.js')+'\n'+read('src/reliability/recovery-background.js'),c);
    return {c,calls,store};
}
for (const mode of [false,true]) {
    const t=background(mode),before=JSON.stringify(t.store);let reply;
    t.c.wb20LoadRecoveryContent({}, {id:'extension',tab:{id:7,url:'https://www.dndbeyond.com/characters/7'},frameId:2},r=>reply=r);
    assert.equal(reply.ok,true);
    assert.equal(t.calls[1].files[0],`dist/${mode?'compat_':''}dndbeyond_character.js`);
    assert.equal(t.calls[1].target.frameIds[0],2);
    assert.equal(t.calls.length,2,'one CSS and one exclusive code bundle');
    assert.equal(JSON.stringify(t.store),before,'no settings, counters, saved links or dice reset');
    let resumed=0;
    assert.equal(t.c.wb20RecoveryGuardMessage({action:'effects-update'},r=>reply=r,()=>resumed++),true);
    assert.equal(resumed,mode?0:1,'mode disables WB20 message automation as well as its UI');
    assert.equal(t.c.wb20RecoveryGuardMessage({action:'rendered-roll'},r=>reply=r,()=>resumed++),false,'basic Beyond20 roll delivery remains available');
    t.calls.length=0;
    t.c.wb20LoadRecoveryContent({}, {id:'other-extension',tab:{id:7,url:'https://www.dndbeyond.com/characters/7'}},r=>reply=r);
    assert.equal(reply.ok,false);assert.equal(t.calls.length,0);
    t.c.wb20LoadRecoveryContent({}, {id:'extension',tab:{id:7,url:'https://evil.test/characters/7'}},r=>reply=r);
    assert.equal(reply.ok,false);assert.equal(t.calls.length,0);
    t.c.wb20ReloadRecoveryTabs(r=>reply=r);
    assert.equal(reply.reloaded,3);assert.deepEqual(t.calls.map(c=>c.reload),[7,8,9,10],'only existing permitted Foundry hosts are reloaded');
}
const basic=read('vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/character.js');
assert.doesNotMatch(basic,/wayBeyond20DispatchRollWithCharacter|wb20CreateCharacterAttackWorkflow|wayBeyond20InstallNativeSpellCasting|wayBeyond20InstallLongRestTracker/,
    'baseline must not contain the WB20 character engine, trackers or interceptors');
assert.match(basic,/Beyond20: DDB roll hijack installed/,'baseline retains upstream Beyond20 controls');
const {existingPairingKey}=require('../companions/talespire/local-bridge.cjs');
const os=require('node:os');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wb20-pairing-test-'));
const key='a'.repeat(64);fs.writeFileSync(path.join(temp,'local-config.js'),`var wb20LocalReturnKey = "${key}";\n`);
assert.equal(existingPairingKey(temp),key,'restart retains the installed key');
fs.writeFileSync(path.join(temp,'local-config.js'),'var wb20LocalReturnKey = "";');
assert.equal(existingPairingKey(temp),undefined,'unpaired install may generate a key');
console.log('PASS exclusive upstream/WB20 recovery loading, frame isolation, sender/host checks, data preservation, reload isolation and stable helper pairing.');
const settingsSource=read('src/common/settings.js');
const normalize=settingsSource.slice(settingsSource.indexOf('function wayBeyond20NormalizeVTTDestination('),settingsSource.indexOf('function getStoredSettings('));
const discord=settingsSource.slice(settingsSource.indexOf('function getDiscordChannel('),settingsSource.indexOf('let key_bindings'));
const schema=vm.createContext({});vm.runInContext(normalize+'\n'+discord,schema);
for(const destination of [null,{vtt:'roll20',id:5,title:'Game'},{vtt:'fvtt',id:'0',title:'World'},{vtt:'talespire',id:0,title:null}])
    assert.equal(JSON.stringify(schema.wayBeyond20NormalizeVTTDestination(destination)),JSON.stringify(destination));
for(const destination of ['broken',{vtt:'unknown'},{vtt:'roll20',id:'oops'},{vtt:'fvtt',title:{}}])
    assert.equal(schema.wayBeyond20NormalizeVTTDestination(destination).vtt,'dndbeyond','malformed choice stays local, never expands recipients');
for(const channels of [{},42,[null,{secret:123}],false])
    assert.equal(schema.getDiscordChannel({'discord-channels':channels},{}),undefined,'malformed optional channel data never throws');
assert.equal(schema.getDiscordChannel({'discord-channels':'legacy-secret'},{}).secret,'legacy-secret');
console.log('PASS VTT schema safety, valid setting preservation, and malformed/legacy Discord settings.');
let reloads=0;
const stale=vm.createContext({URL,chrome:{runtime:{id:'live'}},__wb20RecoveryBoot:{runtime:{id:undefined}},location:{href:'https://www.dndbeyond.com/characters/7',reload:()=>reloads++}});
vm.runInContext(read('src/reliability/recovery-scope.js')+'\n'+read('src/reliability/recovery-boot.js'),stale);
assert.equal(reloads,1,'an orphaned loader reloads the page instead of installing duplicate handlers');
const alive=vm.createContext({URL,chrome:{runtime:{id:'live'}},__wb20RecoveryBoot:{runtime:{id:'live'}},location:{href:'https://www.dndbeyond.com/characters/7',reload:()=>reloads++}});
vm.runInContext(read('src/reliability/recovery-scope.js')+'\n'+read('src/reliability/recovery-boot.js'),alive);
assert.equal(reloads,1,'a duplicate injection in the same live context does nothing');
console.log('PASS loader duplicate/orphan context guards.');
const native=vm.createContext({console:{warn:()=>{}},sendCustomEvent:()=>{},dndbeyondDiceRoller:{_settings:{}},clicks:0});
vm.runInContext(read('src/dndbeyond/base/digital-dice-new.js')+'\nthis.Native=DigitalDiceManager;',native);
native.Native._ensureRollerOpenWithRetry=async()=>true;
native.Native._selectRollTargetWithRetry=async()=>false;
native.Native._clickRollButtonWithRetry=async()=>{native.clicks++;return true;};
native.Native._wait=async()=>{};
(async()=>{
    await assert.rejects(()=>native.Native._makeRoll({whisper:true}),/audience/);
    assert.equal(native.clicks,0,'do not roll native dice publicly when the private audience cannot be selected');
    console.log('PASS native dice unavailable-audience guard leaves the local fallback in charge.');
})().catch(error=>{console.error(error);process.exitCode=1;});
