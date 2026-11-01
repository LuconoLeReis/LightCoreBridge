// Compose the real worker bundle inputs with delayed storage, not an extracted helper.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = process.env.WB20_REVIEW_SOURCE || path.resolve(__dirname, '..');
const inputs = ['src/common/constants.js', 'src/common/utils.js', 'libs/FileSaver.min.js',
    'src/common/settings.js', 'src/talespire/bridge.js', 'src/talespire/return-client.js',
    'src/reliability/recovery-scope.js', 'src/reliability/recovery-background.js', 'src/extension/background.js'];
const tick = () => new Promise(resolve => setImmediate(resolve));
function worker(destination, delivery = (_id,_req,cb)=>cb({delivered:true})) {
    const pending = [], sent = [], replies = [], handoffs = [];
    const tabs = [
        {id:11, title:'Other Campaign | Roll20', url:'https://app.roll20.net/editor/'},
        {id:22, title:'Selected World • Foundry Virtual Tabletop', url:'http://localhost:30000/game'},
        {id:23, title:'Other World • Foundry Virtual Tabletop', url:'http://localhost:30000/other'}
    ];
    const stored = {'wb20-beyond20-mode':false};
    const event = () => ({addListener() {}});
    let listener;
    const chrome = {
        runtime:{id:'fixture', lastError:null,
            getManifest:()=>({manifest_version:3, version:'2.20.163', content_scripts:[]}),
            getURL:p=>'chrome-extension://fixture/'+p, onMessage:{addListener:f=>listener=f}},
        action:{setPopup() {}, onClicked:event()},
        tabs:{query:(q,cb)=>cb(q.url ? tabs.filter(t=>t.url.includes('roll20')) : tabs.slice()),
            sendMessage:(id,request,cb)=>{sent.push({id,request});if(cb)delivery(id,request,cb);return Promise.resolve();},
            onUpdated:event(), onRemoved:event(), create() {}, reload() {}},
        permissions:{getAll:cb=>cb({origins:['http://localhost/*']}),
            onAdded:event(), onRemoved:event(), contains:(_q,cb)=>cb(true)},
        storage:{local:{get:(defaults,cb)=>{
            if (Object.hasOwn(defaults,'settings') && !stored.settings) stored.settings = {
                ...defaults.settings,'migrated-sync-settings':true,'vtt-tab':destination
            };
            // Capture at read time: an older startup snapshot may arrive after a new broadcast.
            const snapshot = {...defaults};
            for (const key of Object.keys(defaults)) if (key in stored) snapshot[key] = stored[key];
            pending.push({settings:Object.hasOwn(defaults,'settings'),run:()=>cb(snapshot)});
        },set:(values,cb)=>{Object.assign(stored,values);cb?.();}}},
        scripting:{executeScript() {}, insertCSS() {}}
    };
    const context = vm.createContext({chrome, URL, setTimeout, clearTimeout, setInterval:()=>0,
        navigator:{userAgent:'Chrome'}, window:{}, console:{log() {},debug() {},warn() {},error() {}}});
    context.self = context;
    for (const file of process.argv.includes('--bundle') ? ['build/chrome/dist/background.js'] : inputs) {
        vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
    }
    context.wayBeyond20SendTaleSpire = (request,_sender,respond)=>{
        handoffs.push(request.title);respond({success:true,vtt:['talespire']});
    };
    const sender = {id:'fixture',tab:{id:5,url:'https://www.dndbeyond.com/characters/1'}};
    return {context, chrome, tabs, sent, handoffs, replies, stored,
        async flushStorage() {
            for (let i=0;i<8;i++) {while(pending.length) pending.shift().run();await tick();}
        },
        deliver(title) {
            const result = listener({action:'rendered-roll',request:{action:'roll'},title},sender,
                response=>replies.push({title,response}));
            assert.equal(result,true,'cold-start request keeps its response channel open');
        },
        broadcast(destination) {listener({action:'settings',type:'general',settings:{
            ...stored.settings,'vtt-tab':destination}},sender,()=>{});},
        async releaseSettings() {
            const index = pending.findIndex(p=>p.settings);
            assert.notEqual(index,-1);pending.splice(index,1)[0].run();
            for (let i=0;i<8;i++) {while(pending.length) pending.shift().run();await tick();}
        },
        rollTabs() {return sent.filter(s=>s.request.action==='rendered-roll').map(s=>s.id);}
    };
}
module.exports=worker;
if(require.main===module)(async()=>{
    const selected = {id:0,title:'Selected World',vtt:'fvtt'};
    for (const [destination, expected, handoffs] of [
        [selected,[22],0], [{id:0,title:null,vtt:'dndbeyond'},[],0],
        [{id:0,title:null,vtt:'talespire'},[],1], [null,[11,22,23],0],
        [{id:0,title:'Other Campaign',vtt:'roll20'},[11],0]
    ]) {
        const w = worker(destination);w.deliver('first');
        assert.deepEqual(w.rollTabs(),[],'saved destination must load before any remote send');
        assert.equal(w.replies.length,0,'request is queued, not prematurely accepted or discarded');
        await w.releaseSettings();
        assert.deepEqual(w.rollTabs(),expected);
        assert.equal(w.handoffs.length,handoffs);
        assert.equal(w.replies.length,1,'one response after startup');
        w.deliver('second');await tick();
        assert.deepEqual(w.rollTabs(),[...expected,...expected],'warm and cold routing agree');
        assert.equal(w.replies.length,2);
    }
    const concurrent = worker(selected);
    for (const title of ['one','two','three']) concurrent.deliver(title);
    assert.deepEqual(concurrent.rollTabs(),[]);
    await concurrent.releaseSettings();
    assert.deepEqual(concurrent.rollTabs(),[22,22,22],'each waiting request sends once');
    assert.deepEqual(concurrent.replies.map(r=>r.title),['one','two','three']);
    const newer = worker(selected);
    newer.deliver('queued');
    newer.broadcast({id:0,title:null,vtt:'dndbeyond'});
    await newer.releaseSettings();
    newer.deliver('after-old-callback');await tick();
    assert.deepEqual(newer.rollTabs(),[],'late startup callback must not overwrite newer settings');
    assert.equal(newer.replies.length,2);
    const ui = worker(selected), ownTab={id:51,url:'https://www.dndbeyond.com/characters/1'};
    const uiReplies=[];let cssLoads=0;
    ui.chrome.scripting.insertCSS=()=>cssLoads++;
    ui.context.onMessage({action:'get-current-tab'},{tab:ownTab},reply=>uiReplies.push(reply));
    assert.equal(uiReplies[0],ownTab,'own-tab lookup does not wait for VTT settings');
    ui.context.onMessage({action:'load-alertify'},{tab:ownTab},()=>{});
    assert.equal(cssLoads,1,'local UI dependencies start without VTT settings');
    assert.equal(vm.runInContext('wayBeyond20SettingsWaiters.size',ui.context),0,'local UI does not retain gated messages');
    await ui.releaseSettings();
    const stalled = worker(selected);
    stalled.deliver('expired');
    assert.equal(vm.runInContext('wayBeyond20SettingsWaiters.size',stalled.context),1);
    await new Promise(resolve=>setTimeout(resolve,2700));
    assert.equal(stalled.replies.length,1,'absent storage callback gets one bounded reply');
    assert.equal(stalled.replies[0].response.delivered,false);
    assert.deepEqual(stalled.rollTabs(),[],'unknown destination must never send');
    assert.equal(vm.runInContext('wayBeyond20SettingsWaiters.size',stalled.context),0,'expiry releases retained messages');
    await stalled.releaseSettings();
    assert.deepEqual(stalled.rollTabs(),[],'late readiness never replays an expired request');
    assert.equal(stalled.replies.length,1,'late readiness cannot reply twice');
    stalled.deliver('new-after-recovery');await tick();
    assert.deepEqual(stalled.rollTabs(),[22],'a new request uses recovered saved settings');
    const overflow = worker(selected);
    for(let i=0;i<65;i++)overflow.deliver('bounded-'+i);
    assert.equal(vm.runInContext('wayBeyond20SettingsWaiters.size',overflow.context),64);
    assert.equal(overflow.replies.length,1,'overflow fails locally without growing the queue');
    await overflow.releaseSettings();
    assert.equal(overflow.rollTabs().length,64,'only retained requests dispatch once');
    assert.equal(overflow.replies.length,65,'each request receives one reply');
    assert.equal(vm.runInContext('wayBeyond20SettingsWaiters.size',overflow.context),0);
    console.log('PASS composed cold-worker settings: selected Foundry/Roll20, local-only, TaleSpire, automatic, queued messages, newer settings broadcast, ungated local UI, 2.5s expiry, released closures and a64-request cap. No live game APIs.');
})().catch(error=>{console.error(error);process.exitCode=1;});

