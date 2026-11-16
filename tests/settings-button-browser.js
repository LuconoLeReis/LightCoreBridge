// Isolated DOM lifecycle regression; does not open the user's settings or Chrome.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function unit(name){const start=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(source);assert.ok(start,name);const tail=source.slice(start.index+start[0].length),end=/^(?:async )?function |^(?:const|let|var|class) /m.exec(tail);return source.slice(start.index,end?start.index+start[0].length+end.index:undefined);}
(async()=>{
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try {
        const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.setContent('<div class="ct-character-header-desktop"><div class="ct-character-header-desktop__group--gap"></div></div>');
        for(const file of ['libs/jquery-3.4.1.min.js','src/common/utils.js']) await page.addScriptTag({path:path.join(root,file)});
        await page.evaluate(()=>{
            window.chrome={runtime:{getURL:path=>'https://fixture.invalid/'+path}};
            window.opens=0;window.hotkeyClicks=0;window.alertQuickSettings=()=>{opens++;};
            window.updateHotkeysList=popup=>popup.html('<button data-fixture-hotkey>Normal</button>').find('button').on('click',()=>hotkeyClicks++);
        });
        await page.addScriptTag({content:['showHotkeysList','hideHotkeysList','injectSettingsButton'].filter(name=>source.includes('function '+name+'(')).map(unit).join('\n')});
        await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
        await page.evaluate(()=>injectSettingsButton());
        await page.locator('.ct-beyond20-settings-button').click();
        assert.equal(await page.evaluate(()=>opens),1);
        await page.evaluate(()=>{
            const group=document.querySelector('.ct-character-header-desktop__group--beyond20');
            group.replaceWith(group.cloneNode(true)); // DOM retained, JS handlers absent.
            for(let i=0;i<8;i++) injectSettingsButton();
        });
        await page.locator('.ct-beyond20-settings-button').click();
        assert.equal(await page.evaluate(()=>opens),2,'retained markup must not suppress live button wiring');
        await page.evaluate(()=>{
            document.querySelector('.ct-character-header-desktop').innerHTML='<div class="ct-character-header-desktop__group--gap"></div>';
            for(let i=0;i<8;i++) injectSettingsButton();
        });
        await page.locator('.ct-beyond20-settings-button').click();
        assert.equal(await page.evaluate(()=>opens),3,'new header opens once, not once per observer update');
        assert.equal(await page.locator('.ct-beyond20-settings-button').count(),1);
        await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/header.js')});
        await page.evaluate(()=>wb20HeaderKeyboard(document.querySelector('.ct-beyond20-settings-button')));
        await page.getByRole('button',{name:'LightCore',exact:true}).press('Enter');
        assert.equal(await page.evaluate(()=>opens),4,'keyboard follows the same delegated click');
        await page.evaluate(()=>{
            const creature=document.createElement('button');creature.id='creature-settings';
            creature.className='ct-beyond20-settings-button';creature.textContent='Creature settings';
            window.creatureOpens=0;creature.onclick=()=>{creatureOpens++;};document.body.append(creature);
        });
        await page.locator('#creature-settings').click();
        assert.equal(await page.evaluate(()=>opens),4,'creature settings keep their own handler');
        assert.equal(await page.evaluate(()=>creatureOpens),1);
        for(const type of ['tablet','mobile']) {
            await page.evaluate(type=>{
                document.body.innerHTML=`<div class="ct-character-header-${type}"><div class="ct-character-header-${type}__group--gap"></div></div>`;
                injectSettingsButton();
                const group=document.querySelector(`.ct-character-header-${type}__group--beyond20`);
                group.replaceWith(group.cloneNode(true));injectSettingsButton();
            },type);
            await page.locator('.ct-beyond20-settings-button').click();
        }
        assert.equal(await page.evaluate(()=>opens),6,'tablet/mobile replacements are covered');
        await page.setViewportSize({width:1440,height:750});
        await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
        await page.evaluate(()=>{
            document.body.innerHTML=`<div class="ct-character-header-desktop" style="max-width:1200px;height:100px;margin:auto">
                <div class="ct-character-header-desktop__group-tidbits"><div class="ddbc-character-tidbits__menu-callout"><button>Manage</button></div></div>
                <div class="ct-character-header-desktop__group--gap"></div>
                <div class="ct-character-header-desktop__group--share"><div>Share</div></div>
                <div class="ct-character-header-desktop__group--short-rest"><div class="ct-character-header-desktop__button">Short Rest</div></div>
                <div class="ct-character-header-desktop__group--long-rest"><div class="ct-character-header-desktop__button">Long Rest</div></div>
            </div>`;
            window.share=document.querySelector('.ct-character-header-desktop__group--share');
            injectSettingsButton();
            wb20RefreshCompactHeader();
        });
        const trigger=page.locator('.ct-beyond20-settings-button'),flyout=page.locator('.beyond20-hotkeys-list');
        await page.mouse.move(10,700);
        assert.equal(await flyout.isVisible(),false,'flyout is hidden before hover');
        for(const hasShare of [false,true,false]){
            await page.evaluate(hasShare=>{
                if(hasShare && !share.isConnected)document.querySelector('.ct-character-header-desktop').append(share);
                if(!hasShare)share.remove();
                wb20RefreshCompactHeader();
            },hasShare);
            await trigger.hover();
            assert.equal(await flyout.isVisible(),true);
            const triggerBox=await trigger.boundingBox(), flyoutBox=await flyout.boundingBox();
            assert.ok(Math.abs(flyoutBox.y-(triggerBox.y+triggerBox.height))<=1,
                `flyout must meet the bottom of the LightCore button, Share=${hasShare}, flyout=${flyoutBox.y}, button bottom=${triggerBox.y+triggerBox.height}`);
            const before=await page.evaluate(()=>opens);
            await trigger.click({timeout:1000});
            assert.equal(await page.evaluate(()=>opens),before+1,'flyout cannot intercept the settings click');
            await flyout.locator('[data-fixture-hotkey]').click({timeout:1000});
            assert.equal(await page.evaluate(()=>opens),before+1,'hotkey clicks do not open settings');
            await page.mouse.move(10,700);
            assert.equal(await flyout.isVisible(),false);
        }
        assert.equal(await page.evaluate(()=>hotkeyClicks),3,'hotkeys remain clickable after moving from the trigger');
        assert.deepEqual(errors,[]);
        console.log('PASS settings button: desktop/tablet/mobile replacements and keyboard; flyout stays below the button with Share added/removed, settings and hotkeys remain separately clickable. Fixture only.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
