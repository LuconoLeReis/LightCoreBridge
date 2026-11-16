const {chromium} = require(process.env.WB20_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.WB20_SOURCE_ROOT || path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const failures = [];
const form = '<form><h3>Healing</h3><p>Pool available</p><label>Amount <input value="3"></label>' +
    '<fieldset><legend>Target</legend><select><option>Self</option></select></fieldset>' +
    '<button type="button">Apply</button><details open><summary>Details</summary><a href="#">Rules</a></details></form>';

function sourceFunction(name, file) {
    const source = read(file);
    const start = source.indexOf('function ' + name + '(');
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}

async function contrast(page, name, selectors, dark) {
    for (const selector of selectors) {
        const result = await page.locator(selector).first().evaluate(node => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const context = canvas.getContext('2d', {willReadFrequently: true});
            const ancestors = [];
            for (let current = node; current; current = current.parentElement)
                ancestors.unshift(getComputedStyle(current).backgroundColor);
            context.fillStyle = '#fff';
            context.fillRect(0, 0, 1, 1);
            for (const background of ancestors) {
                context.fillStyle = background;
                context.fillRect(0, 0, 1, 1);
            }
            const luminance = () => {
                const [r, g, b] = Array.from(context.getImageData(0, 0, 1, 1).data, value => {
                    const n = value / 255;
                    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
                });
                return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            const surface = luminance();
            context.fillStyle = getComputedStyle(node).color;
            context.fillRect(0, 0, 1, 1);
            const text = luminance();
            return {surface, ratio: (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05)};
        });
        if (result.ratio < 4.5 || (dark === true && result.surface > 0.25) ||
            (dark === false && result.surface < 0.55))
            failures.push(name + ' ' + selector + ' ' + JSON.stringify(result));
    }
}

async function loadAlertify(page, ...styles) {
    for (const file of ['libs/css/alertify.css', 'libs/css/alertify-themes/default.css', ...styles])
        await page.addStyleTag({path: path.join(root, file)});
    await page.addScriptTag({path: path.join(root, 'libs/alertify.min.js')});
    await page.evaluate(() => { alertify.defaults.transition = 'none'; });
}

async function sheet(browser) {
    const page = await browser.newPage({colorScheme: 'light', viewport: {width: 1024, height: 850}});
    try {
        await page.setContent(`<body><main class="ct-character-sheet ct-character-sheet--dark-mode">
            <section class="ct-saving-throws-box"><span class="ct-signed-number">+5</span></section>
            <div class="beyond20-hotkeys-list"><span class="beyond20-hotkey-toggle beyond20-hotkey-enabled">Advantage</span><span class="beyond20-hotkey-checkmark">✔</span></div>
            <div class="wb20-action-sort-menu"><button type="button">Sort by name</button></div>
        </main><div class="waybeyond20-effects-popout"><header class="waybeyond20-effects-popout-header">Effects <button class="waybeyond20-effects-popout-close">×</button></header>
            <div class="waybeyond20-effects-popout-empty">No active effects</div></div>
        <details id="wb20-local-rolls" open><summary>Local roll <button>Close</button></summary>
            <article class="wb20-local-roll-card"><div class="beyond20-tooltip"><span class="beyond20-tooltip-content">Dice breakdown</span></div><button class="beyond20-button-roll-damages">Roll damage</button></article>
        </details></body>`);
        await loadAlertify(page, 'libs/css/alertify-themes/beyond20.css', 'src/extension/beyond20.css');
        await page.addStyleTag({content: `
            body { background: white; color: #151515 }
            body:has(.ct-character-sheet--dark-mode) { background:#181818 }
            .ct-saving-throws-box { background:#fafafa; color:#151515; border:1px solid #555 }
            .ct-character-sheet--dark-mode .ct-saving-throws-box {background:#252525;color:#eee}
            .ajs-content a { color: #000 }
            .alertify,.alertify * { animation-duration:0s !important; transition-duration:0s !important }
        `});
        for (const [name, file] of [
            ['wayBeyond20ApplySheetTheme', 'src/dndbeyond/content-scripts/portent.js'],
            ['wb20ThemeResourcePrompt', 'src/dndbeyond/content-scripts/resources.js'],
            ['initializeAlertify', 'src/common/utils.js']
        ]) await page.addScriptTag({content: sourceFunction(name, file)});
        await page.evaluate(() => {
            initializeAlertify();
            alertify.defaults.transition = 'none';
            wayBeyond20ApplySheetTheme(document.querySelector('#wb20-local-rolls'), {panel: true});
        });
        for (const [name, selectors] of [
            ['Hotkeys', ['.beyond20-hotkey-enabled', '.beyond20-hotkey-checkmark']],
            ['Effects', ['.waybeyond20-effects-popout-header', '.waybeyond20-effects-popout-close', '.waybeyond20-effects-popout-empty']],
            ['Sort', ['.wb20-action-sort-menu button']],
            ['Local rolls', ['#wb20-local-rolls > summary', '#wb20-local-rolls button', '#wb20-local-rolls .beyond20-button-roll-damages', '#wb20-local-rolls .beyond20-tooltip-content']]
        ]) await contrast(page, name, selectors, true);
        await page.evaluate(() => {
            document.querySelector('.waybeyond20-effects-popout').hidden = true;
            document.querySelector('#wb20-local-rolls').hidden = true;
        });

        const scope = '.alertify:not(.ajs-hidden) .ajs-dialog ';
        const chrome = ['.ajs-header', '.ajs-footer .ajs-ok', '.ajs-footer .ajs-cancel'].map(s => scope + s);
        await page.evaluate(() => alertify.confirm('Use this effect?', '<p>Confirm your choice</p>', () => {}, () => {}));
        await contrast(page, 'Stock confirm', [...chrome, scope + '.ajs-content p'], true);
        await page.evaluate(() => alertify.confirm().close());
        await page.evaluate(html => alertify.Beyond20Prompt('Choose targets', html, 'Proceed', 'Cancel', () => {}), form);
        await contrast(page, 'Generic prompt', [...chrome, ...['h3', 'p', 'legend', 'label', 'input', 'select', 'option', 'button', 'summary', 'a'].map(s => scope + '.ajs-content ' + s)], true);
        const themedPrompt = await page.locator(scope.trim()).first().evaluate(el => el.classList.contains('wb20-resource-dialog'));
        if (!themedPrompt) failures.push('Generic prompt did not pick up the native sheet palette');
        await page.evaluate(() => alertify.Beyond20Prompt().close());
        await page.evaluate(html => alertify.Beyond20Prompt('Correction', html.replace('<form>', '<form class="wb20-resource-correction">'), 'Save', 'Cancel', () => {}), form);
        await contrast(page, 'Resource correction', [...chrome, scope + 'input'], true);
        await page.evaluate(() => alertify.Beyond20Prompt().close());
        await page.evaluate(() => {
            const result = alertify.Beyond20Roll('Attack result', '<div class="beyond20-message"><header class="beyond20-header"><details open><summary><a href="#">Longsword</a></summary></details></header><span class="beyond20-roll-detail-normal">22</span></div>');
            result.elements.dialog.classList.add('wb20-result-dialog');
            wayBeyond20ApplySheetTheme(result.elements.dialog, {panel: true});
        });
        await contrast(page, 'Roll detail', [scope + '.ajs-header', scope + '.ajs-ok', scope + 'summary a', scope + '.beyond20-roll-detail-normal'], true);
        if (process.env.WB20_PRESENTATION_EVIDENCE)
            await page.locator(scope.trim()).screenshot({path: path.join(process.env.WB20_PRESENTATION_EVIDENCE, 'underdark-roll-dialog.png')});
        await page.evaluate(() => alertify.Beyond20Roll().close());

        await page.emulateMedia({colorScheme: 'dark'});
        await page.evaluate(() => document.querySelector('main').classList.remove('ct-character-sheet--dark-mode'));
        await page.evaluate(html => alertify.Beyond20Prompt('Choose targets', html, 'Proceed', 'Cancel', () => {}), form);
        await contrast(page, 'Light sheet under dark OS preference', [...chrome, scope + 'input', scope + 'select'], false);
    } finally {
        await page.close();
    }
}

async function settings(browser, dark) {
    const page = await browser.newPage({colorScheme: dark ? 'dark' : 'light'});
    try {
        await page.setContent('<body class="wb20-settings-page"><main>Settings</main></body>');
        await loadAlertify(page, 'options.css');
        await page.evaluate(() => alertify.prompt('Discord connection', 'Enter a friendly name', 'Test', () => {}, () => {}));
        await contrast(page, 'Settings ' + (dark ? 'dark' : 'light'), ['.ajs-header', '.ajs-content p', '.ajs-input', '.ajs-ok', '.ajs-cancel', '.ajs-close'], dark);
    } finally {
        await page.close();
    }
}

async function unrelatedPage(browser) {
    const page = await browser.newPage({colorScheme: 'dark'});
    try {
        await page.setContent('<html data-theme="dark"><body><main>Unrelated page</main></body></html>');
        await loadAlertify(page, 'src/extension/beyond20.css');
        await page.evaluate(() => alertify.confirm('Confirm', 'Message', () => {}, () => {}));
        assert.equal(await page.locator('.ajs-header').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(250, 250, 250)');
    } finally {
        await page.close();
    }
}

(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
        await sheet(browser);
        await settings(browser, true);
        await settings(browser, false);
        await unrelatedPage(browser);
        assert.deepEqual(failures, []);
        console.log('PASS sheet dialogs, roll results, flyouts and Settings controls meet 4.5:1 contrast in the tested themes');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
