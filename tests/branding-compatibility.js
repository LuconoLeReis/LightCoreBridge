// The public name changes; installed settings and companion identities do not.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const chrome=JSON.parse(read('manifest.json')),firefox=JSON.parse(read('manifest_ff.json'));
for(const manifest of [chrome,firefox]) {
    assert.equal(manifest.name,'LightCore Bridge');assert.equal(manifest.short_name,'LightCore');
    assert.equal(manifest.version,'2.20.204');
}
assert.equal(chrome.version_name,'LightCore Bridge 1.73.72');
assert.equal(firefox.browser_specific_settings.gecko.id,'beyond20@kakaroto.homelinux.net');
const symbiote=JSON.parse(read('companions/talespire/WayBeyond20/manifest.json'));
assert.equal(symbiote.name,'LightCore Bridge');
assert.equal(symbiote.api.interop.id,'e6cfa5cd-1ebd-4b45-a74b-60c01ecc8927');
assert.equal(symbiote.api.subscriptions.urls.onUrlMessage,'wb20TaleSpireMessage');
assert.equal(JSON.parse(read('FVTT-module/beyond20/module.json')).id,'beyond20');

// Load the actual settings definitions/accessors against an existing installation.
const saved={settings:{'migrated-sync-settings':true,'vtt-tab':{id:12,title:'My game',vtt:'fvtt'},
    'talespire-url':'talespire://symbiote/existing-connection/','discord-channels':[{name:'Table',secret:'fixture-only',active:true}],
    'waybeyond20-secondary-attacks':true},'character-123':{'waybeyond20-portent':{dice:[{id:'keep',value:17,used:false}]},focus:2},
    'wb20-beyond20-mode':false};
const initial=JSON.parse(JSON.stringify(saved));let writes=0;
const context=vm.createContext({console,URL,chrome:{runtime:{},storage:{local:{get:(query,cb)=>cb(query===null?structuredClone(saved):Object.fromEntries(Object.keys(query).map(k=>[k,structuredClone(saved[k]??query[k])]))),
    set:(data,cb)=>{writes++;Object.assign(saved,structuredClone(data));cb?.();}}}}});
vm.runInContext(read('src/common/constants.js')+'\n'+read('src/common/settings.js'),context);
vm.runInContext('getStoredSettings(value=>globalThis.restored=value)',context);
assert.deepEqual(JSON.parse(JSON.stringify(context.restored['vtt-tab'])),initial.settings['vtt-tab']);
assert.equal(context.restored['talespire-url'],initial.settings['talespire-url']);
assert.deepEqual(JSON.parse(JSON.stringify(context.restored['discord-channels'])),initial.settings['discord-channels']);
assert.deepEqual(saved['character-123'],initial['character-123']);
assert.equal(saved['wb20-beyond20-mode'],false);
assert.equal(writes,0,'branding does not migrate an existing installation');
assert.match(read('src/common/settings.js'),/allSettings\.beyond20 = \{format: 1\}/);
assert.match(read('src/common/settings.js'),/!allSettings\.beyond20 \|\| allSettings\.beyond20\.format !== 1/);
assert.match(read('src/common/utils.js'),/new CustomEvent\("Beyond20_" \+ name/);
assert.match(read('src/talespire/return-client.js'),/'X-WB20-Extension':chrome\.runtime\.id/);
assert.match(read('src/reliability/recovery-popup.js'),/mode\?'Restore LightCore':'Use Beyond20 mode'/);
console.log('PASS LightCore naming with legacy saved destination/resources/recovery, backup schema and companion identities retained.');
