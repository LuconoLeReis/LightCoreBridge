// Isolated Chromium only. No real character, VTT, account or installed extension.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try {
        const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('https://www.dndbeyond.com/**',route=>{
            const relative=new URL(route.request().url()).pathname.slice(1);
            const file=path.join(root,'build/chrome',relative);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({body:fs.readFileSync(file),contentType:relative.endsWith('.css')?'text/css':'application/javascript'});
            return route.fulfill({body:'<html><body><main><div class="ct-ability-summary" style="background:rgb(35,36,38);color:rgb(240,241,242)">Fixture</div></main></body></html>',contentType:'text/html'});
        });
        await page.goto('https://www.dndbeyond.com/characters/7');
        const installChrome=()=>{
            window.store={'wb20-beyond20-mode':true,settings:{'migrated-sync-settings':true,'vtt-tab':{vtt:'talespire'},'talespire-url':'kept'},'character-7':{dice:[17,12],focus:2}};
            window.reloads=[];window.loaded=[];window.sent=[];
            const storage={get:(defaults,cb)=>cb(typeof defaults==='object'?{...defaults,...store}:store),set:(updates,cb)=>{Object.assign(store,updates);cb?.();},remove:()=>{}};
            window.chrome={storage:{local:storage,sync:storage,onChanged:{addListener:()=>{}}},runtime:{id:'fixture-extension',lastError:null,
                getURL:relative=>'https://www.dndbeyond.com/'+relative,getManifest:()=>({manifest_version:3}),onMessage:{addListener:()=>{}},
                sendMessage:(request,cb)=>{
                    sent.push(request);
                    if(request.action==='wb20-load-recovery-content') {
                        const file=store['wb20-beyond20-mode']?'dist/compat_dndbeyond_character.js':'dist/dndbeyond_character.js';loaded.push(file);
                        const script=document.createElement('script');script.src='https://www.dndbeyond.com/'+file;script.onload=()=>cb({ok:true});document.head.append(script);
                    } else if(request.action==='wb20-recovery-reload') {reloads.push('all-ddb');cb?.({ok:true});}
                    else cb?.({success:false,vtt:['dndbeyond'],error:null,request});
                }},tabs:{query:(query,cb)=>cb([{id:7,url:'https://www.dndbeyond.com/characters/7'}]),reload:(id,cb)=>{reloads.push(id);cb?.();}}};
        };
        await page.evaluate(installChrome);
        await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
        await page.addScriptTag({path:path.join(root,'libs/alertify.min.js')});
        await page.addScriptTag({path:path.join(root,'build/chrome/dist/recovery_boot.js')});
        await page.waitForFunction(()=>typeof sendRoll==='function');
        assert.deepEqual(await page.evaluate(()=>loaded),['dist/compat_dndbeyond_character.js']);
        assert.equal(await page.evaluate(()=>typeof wayBeyond20DispatchRollWithCharacter),'undefined');
        assert.equal(await page.evaluate(()=>typeof wayBeyond20InstallLongRestTracker),'undefined');
        assert.equal(await page.locator('#wb20-recovery-button').count(),0,'no permanent page recovery control');
        await page.evaluate(async()=>{
            initializeAlertify();
            dndbeyondDiceRoller.setSettings({...getDefaultSettings(),'use-digital-dice':false,'roll-to-game-log':false});
            const owner={type:()=> 'Character',getGlobalSetting:(key,fallback)=>key==='whisper-type'?0:key==='roll-type'?0:fallback,
                getDict:()=>({type:'Character',name:'Baseline fixture',settings:{}})};
            await sendRoll(owner,'attack','1d20+5',{name:'Baseline attack','to-hit':'+5',rollAttack:true,rollDamage:false});
        });
        await page.getByText('Baseline attack',{exact:false}).first().waitFor();
        assert.equal(await page.locator('.beyond20-dice-roller').count(),1,'one local result without a VTT');
        const before=await page.evaluate(()=>JSON.stringify({settings:store.settings,character:store['character-7']}));
        await page.addScriptTag({path:path.join(root,'build/chrome/dist/recovery_popup.js')});
        await page.getByRole('button',{name:'Restore LightCore',exact:true}).click();
        assert.equal(await page.evaluate(()=>store['wb20-beyond20-mode']),false);
        assert.equal(await page.evaluate(()=>JSON.stringify({settings:store.settings,character:store['character-7']})),before);
        // Toolbar still works when character runtime messaging is completely broken.
        await page.evaluate(()=>{document.getElementById('wb20-popup-recovery').remove();chrome.runtime.sendMessage=()=>{throw Error('worker unavailable');};});
        await page.addScriptTag({path:path.join(root,'build/chrome/dist/recovery_popup.js')});
        await page.getByRole('button',{name:'Use Beyond20 mode',exact:true}).click();
        assert.equal(await page.evaluate(()=>store['wb20-beyond20-mode']),true);
        assert.equal(await page.evaluate(()=>reloads.includes(7)),true);
        assert.equal(await page.evaluate(()=>JSON.stringify({settings:store.settings,character:store['character-7']})),before);
        assert.deepEqual(errors,[]);
        await page.goto('https://www.dndbeyond.com/characters/8');
        await page.evaluate(installChrome);
        await page.evaluate(()=>{store['wb20-beyond20-mode']=false;});
        await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
        await page.addScriptTag({path:path.join(root,'libs/alertify.min.js')});
        await page.addScriptTag({path:path.join(root,'build/chrome/dist/recovery_boot.js')});
        await page.waitForFunction(()=>typeof wayBeyond20DispatchRollWithCharacter==='function');
        assert.deepEqual(await page.evaluate(()=>loaded),['dist/dndbeyond_character.js']);
        const completed=await page.evaluate(async()=>{
            initializeAlertify();
            dndbeyondDiceRoller.setSettings({...getDefaultSettings(),'use-digital-dice':false,'roll-to-game-log':false});
            let sends=0;
            chrome.runtime.sendMessage=(request,cb)=>{if(request.action==='rendered-roll') sends++;else cb?.({});};
            const results=[];
            for (const destination of [null,{vtt:'roll20',id:999},{vtt:'fvtt',id:998},{vtt:'talespire'},{vtt:'dndbeyond'}]) {
                const owner={_id:'fixture',type:()=> 'Character',hasClassFeature:()=>false,getSetting:(key,fallback)=>fallback,
                    getGlobalSetting:(key,fallback)=>key==='whisper-type'?1:key==='roll-type'?0:key==='vtt-tab'?destination:fallback,
                    getDict:()=>({type:'Character',name:'Local-first fixture',settings:{}})};
                let capture;
                const result=await sendRoll(owner,'attack','1d20+5',{name:'Local-first attack','to-hit':'+5',rollAttack:true,rollDamage:false,
                    'waybeyond20-capture-result':(request,attacks)=>{capture={whisper:request.whisper,total:attacks[0]?.total};}});
                results.push({accepted:result,whisper:capture?.whisper,total:capture?.total});
            }
            return {results,sends,dialogs:document.querySelectorAll('.beyond20-dice-roller').length};
        });
        assert.equal(completed.results.length,5);
        assert.ok(completed.results.every(r=>r.accepted && r.whisper===1 && Number.isFinite(r.total)),JSON.stringify(completed));
        assert.equal(completed.sends,4,'unconfigured TaleSpire skips delivery; other optional sends never respond');
        assert.ok(completed.dialogs>0,'real local display remains available despite hung send callbacks');
        const optionalFailure=await page.evaluate(async()=>{
            dndbeyondDiceRoller._settings['discord-channels']={malformed:true};
            dndbeyondDiceRoller._settings['roll-to-game-log']=true;
            const original=sendCustomEvent;
            sendCustomEvent=(name,...args)=>{if(name==='MBFulfilledRoll')throw Error('simulated Game Log failure');return original(name,...args);};
            const owner={_id:'fixture',type:()=> 'Character',hasClassFeature:()=>false,getSetting:(key,value)=>value,
                getGlobalSetting:(key,value)=>key==='whisper-type'?1:key==='roll-type'?0:value,
                getDict:()=>({type:'Character',name:'Optional bridge fixture',settings:{}})};
            try{return await sendRoll(owner,'attack','1d20+5',{name:'Optional bridge attack','to-hit':'+5',rollAttack:true,rollDamage:false});}
            finally{sendCustomEvent=original;dndbeyondDiceRoller._settings['roll-to-game-log']=false;}
        });
        assert.equal(optionalFailure,true,'optional Game Log and malformed Discord settings cannot discard the result');
        const fallback=await page.evaluate(async()=>{
            const original=window.alertify;window.alertify={};
            const owner={_id:'fixture',type:()=> 'Character',hasClassFeature:()=>false,getSetting:(key,value)=>value,
                getGlobalSetting:(key,value)=>key==='whisper-type'?1:key==='roll-type'?0:value,
                getDict:()=>({type:'Character',name:'Fallback fixture',settings:{}})};
            try {return await sendRoll(owner,'attack','1d20+5',{name:'Fallback result','to-hit':'+5',rollAttack:true,rollDamage:false});}
            finally {window.alertify=original;}
        });
        assert.equal(fallback,true,'a broken dialog library cannot discard the completed roll');
        const fallbackRecord=page.locator('#wb20-local-rolls .wb20-local-roll-card').filter({hasText:'Fallback result'});
        await fallbackRecord.locator('.beyond20-dice-roller').waitFor({state:'visible',timeout:5000});
        assert.equal(await fallbackRecord.getAttribute('open'),'','latest local result is expanded after fallback verdict');
        assert.equal(await fallbackRecord.locator('.beyond20-dice-roller').isVisible(),true,'result remains accessible without alertify');
        assert.equal(await page.getByRole('dialog',{name:'Fallback result',exact:true}).count(),0,'automatic results do not open modal dialogs');
        assert.deepEqual(errors,[]);
        console.log('PASS real Chromium baseline bundle boot, absence of WB20 automation, basic attack/local result, menu mode switch/data preservation, toolbar recovery with failed worker messaging. Isolated fixture only.');
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
