// Real MV3 extension in a disposable test profile and synthetic DDB page.
// No user Chrome profile, login, native gameplay, external roll or secret is used.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),extension=path.join(root,'build/chrome');
(async()=>{
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'wb20-mv3-recovery-'));
    const context=await chromium.launchPersistentContext(profile,{executablePath:process.env.WB20_EXTENSION_CHROME || chromium.executablePath(),headless:true,
        ignoreDefaultArgs:['--disable-extensions'],
        args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
    try {
        await context.route('**/*',route=>{
            const url=new URL(route.request().url());
            if(url.protocol==='chrome-extension:') return route.continue();
            if(url.hostname==='www.dndbeyond.com') return route.fulfill({contentType:'text/html',body:`<html><body>
                <h1>Synthetic extension test</h1><div class="ct-ability-summary" style="background:#fff;color:#111">Fixture</div>
                <div class="ddbc-character-tidbits__heading">Test wizard</div></body></html>`});
            return route.abort();
        });
        let worker=context.serviceWorkers()[0];if(!worker)worker=await context.waitForEvent('serviceworker');
        await worker.evaluate(async()=>{
            await chrome.storage.local.set({'wb20-beyond20-mode':false,'character-700000000':{
                'waybeyond20-portent':{dice:[{id:'keep',value:17,used:false}]},focus:2}});
        });
        const nativePage=await context.newPage(),nativeLogs=[];
        nativePage.on('console',m=>{if(m.text().includes('bounded load completion diagnostic'))nativeLogs.push(m.text());});
        await nativePage.goto('https://www.dndbeyond.com/characters/700000001?wb20-native-startup=1');
        for(let n=0;n<100&&!nativeLogs.length;n++)await new Promise(r=>setTimeout(r,30));
        assert.ok(nativeLogs.length,'native-only control retains finite diagnostic evidence');
        const nativeControl=await worker.evaluate(async()=>{
            const tabs=await chrome.tabs.query({url:'https://www.dndbeyond.com/characters/700000001*'});
            return (await chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:()=>({
                engine:typeof wayBeyond20DispatchRollWithCharacter,roller:typeof sendRoll,
                recovery:!!document.getElementById('wb20-recovery-button'),
                diagnostic:!!globalThis.__wb20SheetLoadDiagnostics
            })}))[0].result;
        });
        assert.deepEqual(nativeControl,{engine:'undefined',roller:'undefined',recovery:false,diagnostic:true});
        assert.equal((await worker.evaluate(()=>chrome.storage.local.get('wb20-beyond20-mode')))['wb20-beyond20-mode'],false);
        await nativePage.close();
        const page=await context.newPage();await page.goto('https://www.dndbeyond.com/characters/700000000');
        assert.equal(await page.locator('#wb20-recovery-button').count(),0);
        async function evaluateContent(probe) {
            return worker.evaluate(async probe=>{
                const tabs=await chrome.tabs.query({url:'https://www.dndbeyond.com/characters/700000000'});
                const result=await chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:async kind=>{
                    if (kind==='ready') return typeof wayBeyond20DispatchRollWithCharacter==='function';
                    if (kind==='base') return typeof sendRoll;
                    if (kind==='wb20') return typeof wayBeyond20DispatchRollWithCharacter;
                    if (kind!=='attack') throw Error('Unknown test probe');
                    initializeAlertify();
                    dndbeyondDiceRoller.setSettings({...getDefaultSettings(),'use-digital-dice':false,'roll-to-game-log':false});
                    const owner={_id:'synthetic',type:()=> 'Character',hasClassFeature:()=>false,getSetting:(key,fallback)=>fallback,
                        getGlobalSetting:(key,fallback)=>key==='whisper-type'?1:key==='roll-type'?0:fallback,
                        getDict:()=>({type:'Character',name:'Synthetic fixture',settings:{}})};
                    const accepted=await sendRoll(owner,'attack','1d20+5',{name:'Synthetic attack','to-hit':'+5',rollAttack:true,rollDamage:false});
                    return {accepted,records:document.querySelectorAll('.wb20-local-roll-card').length,
                        expanded:!!document.querySelector('#wb20-local-rolls')?.open,modals:document.querySelectorAll('.alertify:not(.ajs-hidden) .ajs-dialog').length};
                },args:[probe]});
                if(result[0]?.error)throw Error(JSON.stringify(result[0].error));
                return result[0]?.result;
            },probe);
        }
        for(let i=0;i<100 && !await evaluateContent('ready');i++)await new Promise(r=>setTimeout(r,50));
        assert.equal(await evaluateContent('ready'),true,'real worker injects WB20 bundle');
        const attack=await evaluateContent('attack');
        assert.equal(attack.accepted,true);assert.equal(attack.records,1,'actual MV3, no VTT, one local receipt');await page.locator('#wb20-local-rolls[open]:not([hidden])').waitFor({timeout:5000});assert.equal(attack.modals,0);
        const recovery=await context.newPage();
        await recovery.goto(worker.url().split('/').slice(0,3).join('/')+'/default_popup.html');
        await Promise.all([page.waitForEvent('domcontentloaded'),recovery.getByRole('button',{name:'Use Beyond20 mode',exact:true}).click()]);
        for(let i=0;i<100 && (await evaluateContent('base'))!=='function';i++)await new Promise(r=>setTimeout(r,50));
        assert.equal(await evaluateContent('wb20'),'undefined','actual reload removes WB20 code');
        assert.equal(await evaluateContent('base'),'function','upstream Beyond20 rolling is available');
        const retained=await worker.evaluate(async()=>chrome.storage.local.get(['wb20-beyond20-mode','character-700000000']));
        assert.equal(retained['wb20-beyond20-mode'],true);
        assert.equal(retained['character-700000000'].focus,2);
        assert.equal(retained['character-700000000']['waybeyond20-portent'].dice[0].value,17);
        await recovery.reload();
        await Promise.all([page.waitForEvent('domcontentloaded'),recovery.getByRole('button',{name:'Restore WB20',exact:true}).click()]);
        for(let i=0;i<100 && !await evaluateContent('ready');i++)await new Promise(r=>setTimeout(r,50));
        assert.equal(await evaluateContent('ready'),true);
        assert.equal(await page.locator('#wb20-recovery-button').count(),0);
        console.log('PASS actual Chromium MV3: worker/manifest boot, local attack without VTT, emergency menu reload, exclusive Beyond20 mode, saved pool preservation and WB20 restore. Synthetic account only.');
    }finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
