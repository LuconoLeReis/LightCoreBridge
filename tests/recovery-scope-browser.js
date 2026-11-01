// Isolated Chromium. Never attaches to an account, VTT or installed extension.
const {chromium} = require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.env.WB20_REVIEW_SOURCE || path.resolve(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'build/chrome/dist/recovery_boot.js'), 'utf8');
(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
        for (const [url, loads, buttons] of [
            ['https://unrelated.test/characters/7', 0, 0],
            ['https://www.dndbeyond.com/forums/discuss', 0, 0],
            ['https://www.dndbeyond.com/characters', 0, 0],
            ['https://www.dndbeyond.com/characters/7/builder', 0, 0],
            ['https://www.dndbeyond.com/sources/book/chapter', 1, 0],
            ['https://www.dndbeyond.com/classes/1-wizard', 1, 0],
            ['https://www.dndbeyond.com/classes/1-wizard/edit', 0, 0],
            ['https://www.dndbeyond.com/spells/1-example', 1, 0],
            ['https://www.dndbeyond.com/monsters/1-example', 1, 0],
            ['https://www.dndbeyond.com/profile/fixture/characters/7', 1, 0],
            ['https://www.dndbeyond.com/characters/7', 1, 0],
            ['https://www.dndbeyond.com/characters/7?wb20-native-startup=1', 0, 0],
            ['https://www.dndbeyond.com/characters/7/shared-token', 1, 0],
            ['https://www.dndbeyond.com/profile/fixture/characters/7/shared-token/', 1, 0],
            ['https://www.dndbeyond.com/characters/7/builder/class/manage', 0, 0],
            ['https://app.roll20.net/editor/', 1, 0]
        ]) {
            const page = await browser.newPage(), errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<html><body><div id="theme"><div class="ct-ability-summary" style="background:rgb(35,36,38);color:rgb(240,241,242)">Fixture</div></div><main></main></body></html>'}));
            await page.goto(url);
            await page.evaluate(() => {
                window.observations = []; window.reads = 0; window.loads = 0; window.writes = 0;
                window.store = {'wb20-beyond20-mode': false, settings: {secret: 'retained'}, 'character-7': {dice: [17,12], focus: 2}};
                const Native = MutationObserver;
                window.MutationObserver = class extends Native {
                    constructor(cb) { super(cb); }
                    observe(target, options) {
                        // Playwright itself observes removals of its injected helpers.
                        if (!new Error().stack.includes('InjectedScript._setupGlobalListenersRemovalDetection')) observations.push(options);
                        return super.observe(target, options);
                    }
                };
                window.chrome = {runtime: {id: 'fixture', sendMessage: (m, cb) => { if (m.action === 'wb20-load-recovery-content') loads++; cb?.({ok: true}); }},
                    storage: {local: {get: (d, cb) => {reads++; cb({...d, ...store});}, set: (values, cb) => {writes++; Object.assign(store, values); cb?.();}}}};
            });
            await page.addScriptTag({content: bundle});
            await page.addScriptTag({content: bundle});
            // Snapshot before locator initialization creates Playwright's own DOM observer.
            const observers = await page.evaluate(() => observations.slice());
            assert.equal(await page.evaluate(() => loads), loads, url);
            assert.equal(await page.locator('#wb20-recovery-button').count(), buttons, url);
            assert.ok(observers.every(o => !o.subtree), 'no persistent whole-page subtree observer on a loaded sheet');
            if (!buttons) assert.equal(observers.length, 0, 'reference/unrelated pages have no recovery UI observer: ' + url);
            if (!loads) assert.equal(await page.evaluate(() => reads), 0, 'unrelated pages do not read storage');
            assert.equal(await page.evaluate(() => writes), 0, 'boot never changes saved state');
            assert.equal(observers.length,0,'recovery boot creates no page observer');
            assert.equal(await page.evaluate(()=>reads),0,'bundle selection belongs to the worker, not a duplicate boot storage read');
            assert.deepEqual(errors, []); await page.close();
        }
        // A slow sheet can use a short discovery observer, but it must expire.
        const page = await browser.newPage();
        await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<html><body></body></html>'}));
        await page.goto('https://www.dndbeyond.com/characters/8');
        await page.evaluate(() => {
            window.activeSubtrees = 0;
            const Native = MutationObserver;
            window.MutationObserver = class extends Native {
                observe(target, o) { if (o.subtree) { this.subtree = true; activeSubtrees++; } super.observe(target, o); }
                disconnect() { if (this.subtree) {activeSubtrees--; this.subtree = false;} super.disconnect(); }
            };
            const realTimeout = setTimeout;
            window.setTimeout = (f, ms) => realTimeout(f, ms === 5000 ? 20 : ms);
            window.chrome = {runtime: {id: 'fixture', sendMessage: (_m, cb) => cb({ok: true})}, storage: {local: {get: (d, cb) => cb(d)}}};
        });
        await page.addScriptTag({content: bundle});
        await page.waitForFunction(() => activeSubtrees === 0);
        assert.equal(await page.locator('#wb20-recovery-button').count(), 0);
        await page.close();
        console.log('PASS recovery URL boundary, no permanent page button, no reference-page UI/observers, no unrelated storage work, no hydration/theme observer and repeated injection. Isolated Chromium only.');
    } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
