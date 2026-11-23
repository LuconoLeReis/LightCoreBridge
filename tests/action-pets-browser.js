// Offline rendered-DOM regression for the Actions pet toggles. Live DDB acceptance still requires a reload.
const {chromium} = require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.env.WB20_SOURCE_ROOT || path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/dndbeyond/content-scripts/character.js'), 'utf8');
function fn(name) {
    const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
    assert.ok(start >= 0, name);
    const end = source.slice(start + 1).search(/^(?:(?:async )?function |const |let |var |class )/m);
    return source.slice(start, end < 0 ? undefined : start + 1 + end);
}
function row(name, range, damage) {
    return `<div class="ddbc-combat-attack" style="display:flex;align-items:center;padding:4px 0"><span class="ddbc-combat-attack__icon wb20-full-attack" role="button" tabindex="0">⚔</span><span class="ddbc-combat-attack__name"><span class="ddbc-combat-attack__label">${name}</span></span><div class="ddbc-combat-attack__range">${range}</div><div class="ddbc-combat-attack__action">+5</div><div class="ddbc-combat-attack__damage">${damage}</div><div class="ddbc-combat-attack__notes">--</div></div>`;
}
function group(heading, rows, detail = '') {
    return `<div class="styles_actionsList__test"><div>${heading}</div><div><div class="styles_attackTable__test"><div>ATTACK　 RANGE　 HIT / DC　 DAMAGE　 NOTES</div><div>${rows.join('')}</div></div>${detail}</div></div>`;
}
// Real-shaped native detail talent: a feature snippet section with no attack table.
const snippet = '<div class="ct-feature-snippet ddbc-feature-snippet"><div class="ct-feature-snippet__heading">Steady Aim Detail.</div><div class="ct-feature-snippet__content"><p>Player detail talent text.</p></div></div>';
(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
        const page = await browser.newPage({viewport: {width: 1000, height: 800}}), errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.setContent(`<body style="background:#242424;color:rgb(238, 238, 238)"><div id="actions" style="width:700px">${group('ACTIONS • Attacks per Action: 1', [row('Sword','5 ft.','1d8+3'), row('Longbow','150 (600) ft.','1d8+3')])}${group('BONUS ACTIONS', [row('Bardic Inspiration','60 ft.','1d6')])}${group('REACTIONS', [row('Riposte','5 ft.','1d10+2')], snippet)}<div class="wb20-test-manage">Manage Custom Actions</div></div></body>`);
        // The real Bardic Inspiration producer adds a class whose later CSS
        // forces display:flex!important. Pet-only must still hide this row.
        await page.locator('.ddbc-combat-attack').filter({hasText:'Bardic Inspiration'}).evaluate(e=>e.classList.add('waybeyond20-bardic-feature-row'));
        await page.addStyleTag({path: path.join(root, 'src/extension/beyond20.css')});
        await page.addScriptTag({path: path.join(root, 'libs/jquery-3.4.1.min.js')});
        await page.addScriptTag({content: `
            var saved = {};
            function makeCharacter(id){return {_id:id,hasClassFeature:()=>false,getSetting:(key,fallback)=>saved[key]??fallback,
                mergeCharacterSettings:(data,cb)=>{Object.assign(saved,data);if(cb)cb();}};}
            var character = makeCharacter('one');
            // Live pets are supplied as the familiar/summon modules do: their own rows, tagged with a pet identity.
            var livePets = [];
            function petRow(root, key, name, category, group, pet){
                let el = Array.from(root.querySelectorAll(':scope > .wb20-test-pet-row')).find(r => r._wb20Key === key);
                if (!el) {
                    el = document.createElement('div'); el.className = 'ddbc-combat-attack wb20-feature-option wb20-test-pet-row'; el._wb20Key = key;
                    el.innerHTML = '<button type="button" class="wb20-feature-option-icon">◆</button><div class="ddbc-combat-attack__name"><button type="button" class="wb20-feature-option-name"></button><div class="wb20-talent-category"></div></div><div class="ddbc-combat-attack__range">—</div><div class="ddbc-combat-attack__action">—</div><div class="ddbc-combat-attack__damage">—</div><div class="ddbc-combat-attack__notes">—</div>';
                    root.append(el);
                }
                el.querySelector('.wb20-feature-option-name').textContent = name;
                el.querySelector('.wb20-talent-category').textContent = category;
                return {row: el, name, key, cost: 'special', group, defaultVisible: true, ...(pet ? {pet} : {})};
            }
            function wb20FamiliarRows(root){
                const fam = livePets.find(p => p.kind === 'familiar');
                const keep = new Set(), rows = [];
                const defs = fam ? [['card', fam.name+': Companion', 'Card', 'other'], ['actions', fam.name+': Familiar actions', 'Familiar Action', 'action'], ['senses', fam.name+': Share senses', 'Your Bonus Action', 'bonusAction'], ['delivery', fam.name+': Deliver touch spell', 'Familiar Reaction', 'reaction']]
                    : [['card', 'Companions: saved familiars', 'Cards', 'other']];
                for (const [key, name, category, group] of defs) {
                    const entry = petRow(root, 'familiar:'+key, name, category, group, fam ? {id: 'familiar:'+fam.id, name: fam.name} : null);
                    keep.add(entry.row); rows.push(entry);
                }
                for (const el of root.querySelectorAll(':scope > .wb20-test-pet-row')) if (el._wb20Key.startsWith('familiar:') && !keep.has(el)) el.remove();
                return rows;
            }
            function wb20SummonRows(root){
                const keep = new Set(), rows = [];
                for (const s of livePets.filter(p => p.kind === 'summon')) for (const action of s.actions) {
                    const entry = petRow(root, 'summon:'+s.id+':'+action, action, s.name+' · Creature Action', 'action', {id: 'summon:'+s.id, name: s.name});
                    keep.add(entry.row); rows.push(entry);
                }
                for (const el of root.querySelectorAll(':scope > .wb20-test-pet-row')) if (el._wb20Key.startsWith('summon:') && !keep.has(el)) el.remove();
                return rows;
            }
            ${['wayBeyond20ActionListMetadata','wayBeyond20ActionSortValue','wayBeyond20CollectFeatureOptions','wayBeyond20FillHitDieChoices','wb20SetActionRange','wb20DecorateActionValues','wb20MarkDuplicateWeapons','wayBeyond20MatchActionTypography','wayBeyond20RefreshNaturalAttackIcons','wayBeyond20ActionListPets','wayBeyond20ActionListPetSelection','wayBeyond20ActionListPetToggles','wayBeyond20RefreshCombinedActions'].map(fn).join('\n')}
            wayBeyond20RefreshCombinedActions();
        `});
        const visible = () => page.locator('#actions .ddbc-combat-attack').evaluateAll(es => es.filter(e => getComputedStyle(e).display !== 'none')
            .map(e => ({name: e.querySelector('.ddbc-combat-attack__label,.wb20-feature-option-name').textContent, y: e.getBoundingClientRect().y}))
            .sort((a, b) => a.y - b.y).map(e => e.name));
        const toggles = () => page.locator('.wb20-pet-toggle').evaluateAll(es => es.map(e => [e.textContent, e.getAttribute('aria-pressed')]));
        const refresh = () => page.evaluate(() => wayBeyond20RefreshCombinedActions());
        const player = ['Sword', 'Longbow', 'Bardic Inspiration', 'Riposte', 'Steady Aim Detail.'];
        const detailShown = () => page.evaluate(() => {const t = document.getElementById('actions').innerText; return t.includes('Player detail talent text') || t.includes('Manage Custom Actions');});
        const detailMarked = () => page.evaluate(() => ['.ct-feature-snippet', '.wb20-test-manage'].map(q => document.querySelector(q)?.closest('[data-wb20-list-layout="detail"]') ? 'detail' : 'other'));

        // 1. No qualifying pet: no toggles, saved-library access kept in the combined list, no Feature rules button.
        assert.deepEqual(await toggles(), [], 'no pet buttons without a live pet');
        assert.deepEqual(await visible(), [...player, 'Companions: saved familiars'], 'saved library is not a pet; it stays with the player list');
        assert.equal(await page.getByRole('button', {name: 'Feature rules', exact: true}).count(), 0);
        assert.equal(await detailShown(), true, 'player detail talents visible by default');
        assert.deepEqual(await detailMarked(), ['detail', 'detail'], 'fixture detail is real-shaped: marked detail by the refresh');

        // 2. Default with two pets: none pressed, player first, pets at the bottom, labeled by pet name.
        await page.evaluate(() => { livePets = [{kind: 'familiar', id: 'cast-1', name: 'Sparrow'}, {kind: 'summon', id: 'fx-1', name: 'Bigby', actions: ['Slam', 'Grapple']}]; });
        await refresh(); await refresh(); await refresh();
        assert.deepEqual(await toggles(), [['Bigby', 'false'], ['Sparrow', 'false']], 'one toggle per pet, no duplicates after repeated refresh');
        assert.equal(await page.locator('.wb20-test-pet-row').count(), 6, 'no duplicate pet rows');
        const combined = await visible();
        assert.deepEqual(combined.slice(0, 5), player, 'player talents come first');
        assert.deepEqual(combined.slice(5).sort(), ['Bigby', 'Grapple', 'Sparrow: Companion', 'Sparrow: Deliver touch spell', 'Sparrow: Familiar actions', 'Sparrow: Share senses', 'Slam'].filter(n => n !== 'Bigby').sort(), 'all pet rows follow');
        assert.equal(await page.locator('.wb20-test-pet-row').filter({hasText: 'Share senses'}).locator('.wb20-talent-category').textContent(), 'Your Bonus Action', 'caster-cost control keeps its own cost label');

        // 3. Select one pet: player rows and the other pet hide.
        await page.getByRole('button', {name: 'Sparrow', exact: true}).click();
        assert.deepEqual(await toggles(), [['Bigby', 'false'], ['Sparrow', 'true']]);
        assert.deepEqual((await visible()).sort(), ['Sparrow: Companion', 'Sparrow: Deliver touch spell', 'Sparrow: Familiar actions', 'Sparrow: Share senses'].sort());
        assert.equal(await detailShown(), false, 'pet-only view hides player detail talents and native detail text');
        assert.equal(await page.evaluate(() => document.getElementById('actions').hasAttribute('data-wb20-pet-only')), true);

        // 4. Select both pets: only pet rows, still sorted by the current selection.
        await page.getByRole('button', {name: 'Bigby', exact: true}).click();
        assert.deepEqual(await toggles(), [['Bigby', 'true'], ['Sparrow', 'true']]);
        assert.equal((await visible()).some(n => player.includes(n)), false, 'player talents stay hidden while any pet is selected');
        assert.equal((await visible()).length, 6);
        await page.getByLabel('Sort action list', {exact: true}).click();
        await page.locator('[data-sort="name"]').click();
        const byName = await visible();
        assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b)), 'selected pet rows follow the Name sort');
        assert.equal(await page.evaluate(() => saved['waybeyond20-action-list-sort']), 'name', 'existing sort option still persists');

        // 5. Deselect all: combined view restored, player first, then pets, each in Name order.
        await page.getByRole('button', {name: 'Sparrow', exact: true}).click();
        await page.getByRole('button', {name: 'Bigby', exact: true}).click();
        assert.deepEqual(await toggles(), [['Bigby', 'false'], ['Sparrow', 'false']]);
        const restored = await visible();
        assert.deepEqual(restored.slice(0, 5), [...player].sort((a, b) => a.localeCompare(b)), 'player talents return first, in Name order');
        assert.equal(restored.length, 11);
        assert.equal(await detailShown(), true, 'deselecting all restores player detail talents');
        assert.equal(await page.evaluate(() => document.getElementById('actions').hasAttribute('data-wb20-pet-only')), false, 'pet-only marker cleared on deselect');

        // 6. Dismissed pet: its toggle and stale selection disappear.
        await page.getByRole('button', {name: 'Bigby', exact: true}).click();
        await page.evaluate(() => { livePets = livePets.filter(p => p.kind !== 'summon'); });
        await refresh();
        assert.deepEqual(await toggles(), [['Sparrow', 'false']], 'stale summon selection is dropped');
        assert.equal((await visible()).length, 9, 'with no live selection the combined view returns');

        // 7. Character switch: no selection carries to another owner; old buttons are rebuilt.
        await page.getByRole('button', {name: 'Sparrow', exact: true}).click();
        await page.evaluate(() => { character = makeCharacter('two'); });
        await refresh();
        assert.deepEqual(await toggles(), [['Sparrow', 'false']], 'selection does not follow another character');
        await page.evaluate(() => { character = makeCharacter('three'); livePets = []; });
        await refresh();
        assert.deepEqual(await toggles(), [], 'no pet buttons once the pet is gone');
        assert.equal((await visible()).includes('Companions: saved familiars'), true);

        // 8. Theme and layout: legend centered above centered controls; toggles inherit native ink.
        await page.evaluate(() => { livePets = [{kind: 'familiar', id: 'cast-2', name: 'Sparrow'}]; });
        await refresh();
        const geometry = await page.evaluate(() => {
            const box = document.querySelector('.wb20-action-list-sort').getBoundingClientRect();
            const legend = document.querySelector('.wb20-action-list-legend').getBoundingClientRect();
            const controls = document.querySelector('.wb20-action-list-controls').getBoundingClientRect();
            const button = document.querySelector('.wb20-pet-toggle');
            return {mid: box.left + box.width / 2, legendMid: legend.left + legend.width / 2, controlsMid: controls.left + controls.width / 2,
                legendBottom: legend.bottom, controlsTop: controls.top, color: getComputedStyle(button).color,
                overflow: document.querySelector('.wb20-action-list-sort').scrollWidth > box.width + 1};
        });
        assert.ok(Math.abs(geometry.mid - geometry.legendMid) < 2, 'legend row centered');
        assert.ok(Math.abs(geometry.mid - geometry.controlsMid) < 2, 'toolbar centered');
        assert.ok(geometry.legendBottom <= geometry.controlsTop + 1, 'legend sits above the toolbar');
        assert.equal(geometry.color, 'rgb(238, 238, 238)', 'toggle follows the native theme');
        assert.equal(geometry.overflow, false);
        await page.evaluate(() => { document.body.style.color = 'rgb(20, 30, 40)'; document.body.style.background = 'rgb(245, 240, 230)'; });
        assert.equal(await page.locator('.wb20-pet-toggle').evaluate(e => getComputedStyle(e).color), 'rgb(20, 30, 40)', 'light theme inherits too');
        await page.evaluate(() => document.getElementById('actions').style.width = '320px');
        assert.equal(await page.evaluate(() => { const b = document.querySelector('.wb20-action-list-sort'); return b.scrollWidth > b.getBoundingClientRect().width + 1; }), false, 'phone-width panel wraps without overflow');
        // Cleanup: turning combined actions off clears the pet-only marker.
        await page.getByRole('button', {name: 'Sparrow', exact: true}).click();
        assert.equal(await page.evaluate(() => document.getElementById('actions').hasAttribute('data-wb20-pet-only')), true);
        await page.evaluate(() => { saved['waybeyond20-combined-actions'] = false; wayBeyond20RefreshCombinedActions(); });
        assert.equal(await page.evaluate(() => document.querySelector('[data-wb20-pet-only]')), null, 'cleanup clears pet-only');
        assert.equal(await detailShown(), true, 'native detail visible after cleanup');
        assert.deepEqual(errors, []);
        console.log('PASS action pets: no-pet, default order, two pets, select, multi-select, deselect, player and detail hide, cleanup, sort, stale pet and owner, duplicates, theme and centered layout.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
