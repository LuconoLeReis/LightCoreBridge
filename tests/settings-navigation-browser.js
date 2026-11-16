// Isolated built menus and synthetic extension APIs. No user Chrome/settings access.
const {chromium} = require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const boot = `<script>
window.saved={settings:{'migrated-sync-settings':true,'vtt-tab':{id:0,title:'Fixture World',vtt:'fvtt'},'talespire-url':'retained-link',
 'discord-channels':[{name:'Fixture channel',secret:'retained-secret',active:true}],'whisper-type':1,'debug-log':false,'future-setting':'retained-unknown'},
 'character-123':{'waybeyond20-portent':{dice:[{value:17,used:false}]},focus:2}};
window.writes=0;window.messages=[];
const tab={id:1,url:new URLSearchParams(location.search).has('vtt')?'https://foundry.test/game':new URLSearchParams(location.search).has('monster')?'https://www.dndbeyond.com/monsters/123-fixture':'https://www.dndbeyond.com/characters/123',
 title:new URLSearchParams(location.search).has('vtt')?'Fixture World • Foundry Virtual Tabletop':'Fixture Character'};
window.chrome={runtime:{id:'fixture',getURL:p=>location.origin+'/'+p,getManifest:()=>({version:'test'}),openOptionsPage:()=>{},
 sendMessage:(m,cb)=>{messages.push(m);if(m.action==='get-current-tab')cb?.(tab);else if(m.action==='forward'&&m.message.action==='get-character')
 cb?.({id:123,name:'Fixture Character',classes:{Bard:3},settings:{'waybeyond20-portent':saved['character-123']['waybeyond20-portent']},'racial-traits':[],'class-features':[],'feats':[]});else cb?.({});}},
 storage:{sync:{get:(d,cb)=>cb(d)},local:{get:(d,cb)=>cb(typeof d==='object'&&d!==null?{...d,...saved}:saved),set:(d,cb)=>{writes++;Object.assign(saved,d);cb?.();}}}};
</script>`;
(async()=>{
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try {
        for (const file of ['options.html','popup.html?sourceTab=1','popup.html','popup.html?vtt=1','popup.html?monster=1','default_popup.html']) {
            console.log('Checking built menu:', file);
            const page=await browser.newPage(),errors=[];
            await page.setViewportSize({width:720,height:900});
            page.on('pageerror',e=>errors.push(e.message));
            await page.route('https://settings.test/**',route=>{
                const relative=new URL(route.request().url()).pathname.slice(1);
                const asset=path.join(root,'build/chrome',relative);
                if(!fs.existsSync(asset))return route.fulfill({status:404,body:''});
                let body=fs.readFileSync(asset);
                if(relative.endsWith('.html'))body=body.toString().replace('<head>','<head>'+boot);
                return route.fulfill({contentType:relative.endsWith('.html')?'text/html; charset=utf-8':relative.endsWith('.js')?'application/javascript; charset=utf-8':relative.endsWith('.css')?'text/css':'application/octet-stream',body});
            });
            await page.goto('https://settings.test/'+file+'#wb20-theme='+encodeURIComponent(JSON.stringify({surface:'rgb(35, 36, 38)',text:'rgb(240, 241, 242)',accent:'rgb(128, 180, 140)'})));
            await page.getByRole('searchbox',{name:'Find a setting'}).waitFor();
            await page.waitForFunction(()=>document.querySelector('#vtt-tab')?.textContent==='World: Fixture World'||document.querySelector('#vtt-tab')?.textContent==='This World', null, {timeout:5000})
                .catch(async e=>{console.error({file, destination:await page.locator('#vtt-tab').allTextContents(), errors});throw e;});
            assert.equal(await page.locator('#vtt-tab').count(),1,'one destination control');
            assert.equal(await page.locator('.beyond20-options').evaluate(e=>e.firstElementChild.id),'beyond20-option-vtt-tab');
            const fullPage=file==='options.html'||file.includes('sourceTab=');
            const sections=page.locator('.wb20-settings-section');
            assert.ok(await sections.count()>0);
            assert.equal(await sections.locator(':scope[open]').count(),fullPage?await sections.count():0);
            const rollResults=page.locator('.wb20-settings-section[data-group="Roll results"]');
            if(fullPage){
                assert.ok(await rollResults.locator('[data-setting="use-digital-dice"]').count());
                assert.equal(await sections.first().getAttribute('data-group'),'Roll results');
            }
            assert.equal(await page.evaluate(()=>writes),0,'opening a menu does not save defaults');
            assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).color),'rgb(240, 241, 242)');
            assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(35, 36, 38)');
            const search=page.getByRole('searchbox',{name:'Find a setting'});
            if(file==='options.html'){
                await page.evaluate(()=>{
                    saved.settings['hotkeys-bindings']={KeyJ:'advantage',KeyK:'disadvantage'};
                    window.saveAs=async (blob,filename)=>{window.exportedPreferences={filename,body:JSON.parse(await blob.text())};};
                });
                await search.fill('export shortcuts');
                await page.locator('#beyond20-option-export-hotkey-preferences button').click();
                await page.waitForFunction(()=>window.exportedPreferences);
                const exported=await page.evaluate(()=>exportedPreferences);
                assert.equal(exported.filename,'LightCore-Bridge-preferences.json');
                assert.deepEqual(exported.body.beyond20,{format:2});
                assert.deepEqual(exported.body.preferences['hotkeys-bindings'],{KeyJ:'advantage',KeyK:'disadvantage'});
                assert.equal(exported.body.preferences['vtt-tab'],undefined);
                assert.equal(exported.body.preferences['discord-channels'],undefined);
                assert.equal(exported.body.preferences['talespire-url'],undefined);
                assert.equal(exported.body['character-123'],undefined);
                await search.fill('import shortcuts');
                const input=page.locator('#beyond20-option-import-hotkey-preferences input[type=file]');
                await input.setInputFiles({name:'transfer.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
                    beyond20:{format:2},
                    preferences:{'hotkeys-bindings':{KeyT:'normal_roll'},'sticky-hotkeys':true,'whisper-type':'invalid','discord-channels':[],
                        'talespire-url':'different-machine','vtt-tab':null,'custom-domains':['https://other.test/*'],'future-setting':'bad'},
                    'character-123':{focus:0}
                }))});
                await page.waitForFunction(()=>saved.settings['hotkeys-bindings']?.KeyT==='normal_roll');
                assert.deepEqual(await page.evaluate(()=>saved.settings['hotkeys-bindings']),{KeyT:'normal_roll'});
                assert.equal(await page.evaluate(()=>saved.settings['sticky-hotkeys']),true);
                assert.equal(await page.evaluate(()=>saved.settings['vtt-tab'].title),'Fixture World');
                assert.equal(await page.evaluate(()=>saved.settings['talespire-url']),'retained-link');
                assert.equal(await page.evaluate(()=>saved.settings['discord-channels'][0].secret),'retained-secret');
                assert.equal(await page.evaluate(()=>saved.settings['whisper-type']),1);
                assert.equal(await page.evaluate(()=>saved.settings['future-setting']),'retained-unknown');
                assert.equal(await page.evaluate(()=>saved['character-123'].focus),2);
                await search.fill('');
            }
            const before=await page.evaluate(()=>JSON.stringify(saved));
            await search.fill('talespire');
            await page.locator('#talespire-url').waitFor();
            await search.fill('no-such-setting');
            assert.equal(await page.locator('#vtt-tab').isVisible(),true,'destination remains visible during search');
            await search.fill('');
            assert.equal(await page.evaluate(()=>JSON.stringify(saved)),before,'search changes presentation only');
            if(file.startsWith('popup')) {
                const duplicates=await page.locator('.beyond20-option-input[id]').evaluateAll(nodes=>{
                    const ids=nodes.map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);
                });
                assert.deepEqual(duplicates,[],'context-specific controls do not duplicate globals');
            }
            await page.locator('#vtt-tab').click();
            const options=page.locator('#beyond20-option-vtt-tab .dropdown-menu');
            const trigger=await page.locator('#vtt-tab').boundingBox();
            const dropdown=await options.boundingBox();
            assert.ok(dropdown.y>=trigger.y+trigger.height,'destination list opens below the current choice');
            assert.equal(await options.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','menu has an opaque base under the theme');
            await options.getByText('D&D Beyond (no VTT)',{exact:true}).click();
            await page.waitForFunction(()=>saved.settings['vtt-tab']?.vtt==='dndbeyond');
            assert.equal(await page.locator('#vtt-tab').textContent(),'D&D Beyond (no VTT)');
            await page.locator('#vtt-tab').click();
            if(!file.includes('vtt='))assert.equal(await options.getByText('This Campaign',{exact:true}).count(),0,'DDB is never offered as a VTT campaign');
            await options.getByText('TaleSpire',{exact:true}).click();
            await page.waitForFunction(()=>saved.settings['vtt-tab']?.vtt==='talespire');
            assert.equal(await page.evaluate(()=>saved.settings['talespire-url']),'retained-link');
            assert.equal(await page.evaluate(()=>saved.settings['discord-channels'][0].secret),'retained-secret');
            assert.equal(await page.evaluate(()=>saved.settings['future-setting']),'retained-unknown');
            assert.equal(await page.evaluate(()=>saved['character-123'].focus),2);
            assert.equal(await page.evaluate(()=>saved['character-123']['waybeyond20-portent'].dice[0].value),17);
            assert.equal(await page.evaluate(()=>String(saved.settings['whisper-type'])),'1','privacy setting preserved');
            await search.fill('discord default');
            await page.locator('#discord-channels').click();
            await page.locator('#beyond20-option-discord-channels').getByText('Do not send to Discord',{exact:true}).click();
            await search.fill('discord');
            assert.equal(await page.locator('#discord-channels').isVisible(),true,'search survives replacement of a special control');
            assert.equal(await page.evaluate(()=>saved.settings['discord-channels'][0].secret),'retained-secret','channel disable retains its saved connection');
            await search.fill('');
            assert.deepEqual(errors,[]);
            if(process.env.WB20_SCREENSHOT_DIR && file==='options.html') {
                await page.screenshot({path:path.join(process.env.WB20_SCREENSHOT_DIR,'settings-dark.png'),fullPage:true});
                await page.evaluate(()=>{for(const name of ['surface','text','accent'])document.documentElement.style.removeProperty('--wb20-settings-'+name);});
                await page.emulateMedia({colorScheme:'light'});
                await page.screenshot({path:path.join(process.env.WB20_SCREENSHOT_DIR,'settings-light.png'),fullPage:true});
            }
            if (['options.html','popup.html'].includes(file)) {
                assert.equal(await page.getByRole('heading',{level:1}).count(),1,'a clear page heading');
                for (const width of [1440,390]) {
                    await page.setViewportSize({width,height:1000});
                    await page.evaluate(()=>document.querySelectorAll('details.wb20-settings-section').forEach(s=>s.open=false));
                    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'collapsed page fits viewport');
                    for(const section of ['Connections','Dice and rolls']) {
                        await page.getByText(section,{exact:true}).click();
                        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,section+' fits viewport');
                    }
                    if(process.env.WB20_SCREENSHOT_DIR && file==='popup.html' && width===1440) {
                        await page.mouse.move(0,0);
                        await page.screenshot({path:path.join(process.env.WB20_SCREENSHOT_DIR,'settings-expanded.png'),fullPage:true});
                    }
                    await page.evaluate(()=>document.querySelectorAll('details.wb20-settings-section').forEach(s=>s.open=false));
                    if(process.env.WB20_SCREENSHOT_DIR) {
                        await page.mouse.move(0,0);
                        await page.screenshot({path:path.join(process.env.WB20_SCREENSHOT_DIR,file.replace('.html','')+'-'+width+'.png'),fullPage:true});
                    }
                }
            }
            await page.close();
        }
        console.log('PASS built full/quick/default/VTT menus: first visible destination, searchable sections, no open/search writes, no duplicate controls, correct VTT context, theme colors, and saved private routing/character/unknown-data preservation after a real menu selection. Isolated Chromium only.');
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
