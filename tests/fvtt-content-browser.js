// Compose the built content bundle with real DOM events/storage callbacks.
// The page-side handshake is synthetic; this does not claim live Foundry delivery.
const {chromium} = require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.env.WB20_REVIEW_SOURCE || path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({channel:'chrome', headless:true});
    try {
        for (const orphan of process.argv.includes('--orphan-only') ? [true] : [false, true]) {
            const page = await browser.newPage(), errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.route('https://foundry.test/**', route => {
                const file = new URL(route.request().url()).pathname.slice(1);
                if (file === 'dist/fvtt_script.js') return route.fulfill({contentType:'application/javascript', body:
                    'window.pageBoots++;window.finishBoot=()=>{document.title="Foundry Virtual Tabletop";document.title="Fixture • Foundry Virtual Tabletop";};'});
                if (file.startsWith('libs/')) return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,file))});
                return route.fulfill({contentType:'text/html',body:'<html><head><title>Fixture • Foundry Virtual Tabletop</title></head><body><div id="chat-controls"></div></body></html>'});
            });
            await page.goto('https://foundry.test/game');
            await page.evaluate(() => {
                window.pageBoots=0; window.sent=[]; window.reads=0; window.writes=0; window.handlers=new Set();
                const local={get:(d,cb)=>{reads++; cb({...d, settings:{...d.settings,'migrated-sync-settings':true}});},set:()=>writes++};
                window.chrome={storage:{local},runtime:{id:'fixture',getURL:p=>'https://foundry.test/'+p,
                    onMessage:{addListener:f=>handlers.add(f),removeListener:f=>handlers.delete(f)},
                    sendMessage:(m,cb)=>{sent.push(m);cb?.({});}}};
            });
            await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
            await page.addScriptTag({path:path.join(root,'build/chrome/dist/fvtt.js')});
            await page.waitForFunction(() => typeof finishBoot === 'function');
            if (orphan) await page.evaluate(() => {delete chrome.storage;});
            await page.evaluate(() => finishBoot());
            if (!orphan) {
                await page.waitForFunction(() => handlers.size === 1);
                for (let i=0; i<3; i++) await page.addScriptTag({path:path.join(root,'build/chrome/dist/fvtt.js')});
                assert.equal(await page.evaluate(() => pageBoots),1,'worker reinjection reuses the live bridge');
                assert.equal(await page.evaluate(() => sent.filter(m=>m.action==='register-fvtt-tab').length),1);
                assert.equal(await page.evaluate(() => handlers.size),1);
                assert.equal(await page.locator('.beyond20-settings').count(),1);
                await page.evaluate(() => document.dispatchEvent(new CustomEvent('Beyond20_SendMessage',{detail:[{action:'waybeyond20-turn-update',source:'Foundry'}]})));
                assert.equal(await page.evaluate(() => sent.filter(m=>m.action==='waybeyond20-turn-update').length),1);
            } else {
                assert.equal(await page.evaluate(() => reads),0,'orphan title callback never enters persistent storage');
                assert.equal(await page.evaluate(() => handlers.size),0);
                assert.deepEqual(errors,[],'orphan callbacks must stop before accessing unavailable storage');
                assert.equal(await page.evaluate(() => __wb20FvttContent.active),false);
                await page.evaluate(() => document.title='Another • Foundry Virtual Tabletop');
            }
            assert.equal(await page.evaluate(() => writes),0,'no default settings overwrite');
            assert.deepEqual(errors,[]); await page.close();
        }
        console.log('PASS built Foundry content bundle: repeated worker injection, single page bridge/message listener, return delivery once, and missing-storage title callback teardown without a read/write. Synthetic page handshake, isolated Chromium only.');
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
