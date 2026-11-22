// Regression: TaleSpire status holds through one missed check and changes only on
// confirmed loss. Real wb20TSRefresh/wb20TSRenderStatus in a page; the helper
// reply, clock and snapshot are fictional. No helper, network or native game.
const {chromium} = require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
        const page = await browser.newPage();
        await page.setContent('<div class="waybeyond20-combat-section"></div>');
        await page.addScriptTag({path: path.join(root, 'libs/jquery-3.4.1.min.js')});
        await page.addScriptTag({content: `
            var now = 100000, replies = [], applied = [], picks = [], intervals = 0;
            Date.now = () => now;
            var realSetInterval = window.setInterval; window.setInterval = () => {intervals++; return 0;};
            var settings = {'vtt-tab': {vtt: 'talespire'}};
            var values = {};
            function makeCharacter() {return {getSetting:(k,d)=>values[k]??d, mergeCharacterSettings:(n,cb)=>{Object.assign(values,n);cb?.();}};}
            var character = makeCharacter();
            function wayBeyond20IsMainCharacterSheet() {return true;}
            function wayBeyond20ScheduleActiveEffectBadgeRefresh() {}
            async function wayBeyond20SendRuntimeMessage() {
                const next = replies.shift();
                if (next === 'throw') throw new Error('runtime gone');
                if (next === 'error') return {ok: false};
                return {ok: true, response: next};
            }
            var chrome = {runtime: {lastError: null, sendMessage: (m, cb) => {picks.push(m); cb(pickReply);}}};
            var pickReply = {ok: true};
        `});
        await page.addScriptTag({content: fs.readFileSync(path.join(root, 'src/dndbeyond/content-scripts/talespire.js'), 'utf8')});
        await page.addScriptTag({content: `
            window.setInterval = realSetInterval;
            var snapshot = {v:1, campaignId:'camp', boardId:'board', tracking:true, activeIndex:0, units:{name:'ft',numberPerTile:5},
                order:[{id:'a',name:'Alpha'}], creatures:[{id:'a',name:'Alpha',boardId:'board',position:{x:0,y:0,z:0}}]};
            var good = () => ({connected: true, snapshot});
            // Spy at the call site; the real apply path is covered by the existing
            // TaleSpire suites.
            wb20TSApplySnapshot = (s, continuous) => {applied.push({continuous, s});};
            async function step(reply, advance = 1500) {now += advance; replies.push(reply); await wb20TSRefresh();}
            function view() {
                const bar = document.querySelector('.wb20-ts-status');
                return bar ? {label: bar.querySelector('span').textContent, disabled: [...bar.querySelectorAll('button')].map(b => b.disabled)} : null;
            }
        `});
        const view = () => page.evaluate(() => view());
        assert.equal(await page.evaluate(() => intervals), 1, 'existing single poll timer only; no new timers');

        // Initial unknown stays offline until confirmed good.
        await page.evaluate(() => step({connected: false}));
        let v = await view();
        assert.equal(v.label, 'TaleSpire: not connected', 'initial state is offline');
        assert.deepEqual(v.disabled, [true, true]);
        await page.evaluate(() => step('error'));
        assert.equal((await view()).label, 'TaleSpire: not connected', 'initial failures never show connected');

        await page.evaluate(() => step(good()));
        v = await view();
        assert.equal(v.label, 'TaleSpire: connected · link your mini');
        assert.deepEqual(v.disabled, [false, false]);
        assert.equal(await page.evaluate(() => applied.at(-1).continuous), false, 'first good observation is not continuous');
        await page.evaluate(() => step(good()));
        assert.equal(await page.evaluate(() => applied.at(-1).continuous), true, 'consecutive good checks are continuous');

        // Alternating one failure / one good: no flicker, no DOM churn, continuity broken.
        await page.evaluate(() => {
            window.mutations = 0;
            new MutationObserver(list => {window.mutations += list.length;})
                .observe(document.querySelector('.wb20-ts-status'), {subtree: true, childList: true, attributes: true, characterData: true});
        });
        for (let i = 0; i < 4; i++) {
            const kind = ['error', 'throw', {connected: false}, 'error'][i];
            const before = await page.evaluate(() => applied.length);
            await page.evaluate(k => step(k), kind);
            v = await view();
            assert.equal(v.label, 'TaleSpire: connected · link your mini', 'one miss holds status: ' + JSON.stringify(kind));
            assert.deepEqual(v.disabled, [false, false], 'one miss keeps buttons enabled');
            assert.equal(await page.evaluate(() => applied.length), before, 'a miss applies no snapshot (no stale data)');
            await page.evaluate(() => step(good()));
            assert.equal(await page.evaluate(() => applied.at(-1).continuous), false, 'recovered feed after a miss is not continuous');
            await page.evaluate(() => step(good()));
            assert.equal(await page.evaluate(() => applied.at(-1).continuous), true, 'continuity returns on the second good check');
        }
        await page.evaluate(() => new Promise(r => setTimeout(r, 20)));
        assert.equal(await page.evaluate(() => window.mutations), 0, 'held status causes no DOM churn');

        // Two quick misses inside the confirmation window still hold.
        await page.evaluate(() => step('error', 500));
        await page.evaluate(() => step('error', 500));
        assert.equal((await view()).label, 'TaleSpire: connected · link your mini', 'two checks within 1s are not confirmed loss');
        // Sustained failure confirms the loss and disables buttons.
        await page.evaluate(() => step('error', 1500));
        await page.evaluate(() => step('error', 1500));
        v = await view();
        assert.equal(v.label, 'TaleSpire: not connected', 'sustained failure shows offline');
        assert.deepEqual(v.disabled, [true, true], 'confirmed loss disables buttons');
        await page.evaluate(() => step(good()));
        v = await view();
        assert.equal(v.label, 'TaleSpire: connected · link your mini', 'recovers on a valid response');
        assert.equal(await page.evaluate(() => applied.at(-1).continuous), false, 'recovery after loss is not continuous');

        // Default poll timing: three failed 1.5s polls confirm loss (~3s).
        await page.evaluate(() => step(good()));
        await page.evaluate(() => step('error'));
        await page.evaluate(() => step('error'));
        assert.equal((await view()).label, 'TaleSpire: connected · link your mini', 'two 1.5s misses span 1.5s: held');
        await page.evaluate(() => step('error'));
        assert.equal((await view()).label, 'TaleSpire: not connected', 'third miss at 3s confirms loss');

        // A failed direct pick counts as a miss, not an immediate offline toggle.
        await page.evaluate(() => step(good()));
        await page.evaluate(() => step(good()));
        await page.evaluate(() => {pickReply = {ok: false}; document.querySelectorAll('.wb20-ts-status button')[1].click();});
        v = await view();
        assert.equal(v.label, 'TaleSpire: connected · link your mini', 'one failed pick does not toggle offline');
        assert.equal(await page.evaluate(() => picks.length), 1);
        await page.evaluate(() => step(good()));
        assert.equal(await page.evaluate(() => applied.at(-1).continuous), false, 'failed pick breaks continuity');
        await page.evaluate(() => {pickReply = {ok: true};});

        // Owner staleness: a different character starts offline and non-continuous.
        await page.evaluate(() => step(good()));
        await page.evaluate(() => {character = makeCharacter();});
        await page.evaluate(() => step('error'));
        assert.equal((await view()).label, 'TaleSpire: not connected', 'new character does not inherit connected status');
        await page.evaluate(() => step(good()));
        assert.equal(await page.evaluate(() => applied.at(-1).continuous), false, 'new character never inherits continuity');
        // A reply that resolves after the character changes is discarded.
        await page.evaluate(async () => {
            const before = applied.length; now += 1500; replies.push(good());
            const run = wb20TSRefresh(); character = makeCharacter(); await run;
            window.staleApplied = applied.length - before;
        });
        assert.equal(await page.evaluate(() => window.staleApplied), 0, 'reply for a stale owner is not applied');

        // Destination staleness: leaving TaleSpire resets to unknown.
        await page.evaluate(() => step(good()));
        await page.evaluate(() => step(good()));
        await page.evaluate(() => {settings['vtt-tab'].vtt = 'roll20';});
        await page.evaluate(() => step(good()));
        assert.equal(await page.evaluate(() => replies.splice(0).length), 1, 'no request is sent while TaleSpire is not selected');
        await page.evaluate(() => {settings['vtt-tab'].vtt = 'talespire';});
        await page.evaluate(() => step('error'));
        assert.equal((await view()).label, 'TaleSpire: not connected', 'returning to TaleSpire starts offline');
        await page.evaluate(() => step(good()));
        assert.equal(await page.evaluate(() => applied.at(-1).continuous), false, 'destination change breaks continuity');

        console.log('PASS TaleSpire status: initial offline, one-miss hold (error/throw/disconnected), no DOM churn, no stale apply, continuity broken on any miss, sustained loss disables, recovery, pick miss, owner and destination staleness. Synthetic fixture only.');
    } finally {
        await browser.close();
    }
})().catch(error => {console.error(error); process.exit(1);});
