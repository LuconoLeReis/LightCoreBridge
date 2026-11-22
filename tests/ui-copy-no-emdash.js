// Regression: LightCore Bridge authored UI copy uses no em dash (U+2014).
// The only literal em dashes allowed are inside the two regexes that read
// native D&D Beyond text, and those must still accept native dash placeholders.
// Source scan plus real regexes taken from source; no browser, network or game.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const DASH = '—';
const ALLOWED = [
    {file: 'src/dndbeyond/content-scripts/character.js', pattern: '/^(?:none|--|' + DASH + ')$/i'},
    {file: 'src/dndbeyond/content-scripts/feature-rules.js', pattern: '/^[-–' + DASH + '\\s]+(?:ft\\.?\\s*)?(?:Reach)?$/i'},
];
function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full, out); }
        else if (/\.(js|html|css|json)$/i.test(entry.name)) out.push(full);
    }
    return out;
}
let checks = 0;
const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'companions')),
    ...['manifest.json', 'manifest_ff.json'].map(f => path.join(root, f))];
const hits = [];
for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (!line.includes(DASH)) return;
        const allowed = ALLOWED.find(a => a.file === rel && line.includes(a.pattern));
        // Inside an allowed parser regex the dash is native input, not copy.
        const rest = allowed ? line.replace(allowed.pattern, '') : line;
        if (rest.includes(DASH)) hits.push(rel + ':' + (i + 1) + ': ' + line.trim().slice(0, 160));
    });
    checks++;
}
assert.deepEqual(hits, [], 'authored extension copy contains an em dash');

// The native parsers still exist and still accept DDB's dash placeholders.
const regexFrom = (file, pattern) => {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(text.includes(pattern), 'native parser regex kept in ' + file);
    const m = pattern.match(/^\/(.*)\/([a-z]*)$/);
    return new RegExp(m[1], m[2]);
};
const save = regexFrom(ALLOWED[0].file, ALLOWED[0].pattern);
for (const v of [DASH, '--', 'none', 'None']) { assert.equal(save.test(v), true, 'Attack/Save placeholder ' + v); checks++; }
for (const v of ['DC 13 CON', '+5']) { assert.equal(save.test(v), false, 'real Attack/Save ' + v); checks++; }
const reach = regexFrom(ALLOWED[1].file, ALLOWED[1].pattern);
for (const v of [DASH, '–', '-', DASH + ' ft.', '-- Reach']) { assert.equal(reach.test(v), true, 'native range placeholder ' + v); checks++; }
assert.equal(reach.test('5 ft.'), false); checks++;

// Flames: new display name uses a colon, and effects saved by earlier builds
// with the legacy separator keep their identity (label and removal).
const character = fs.readFileSync(path.join(root, 'src/dndbeyond/content-scripts/character.js'), 'utf8');
const labelSrc = character.match(/effect\.name\.replace\((\/[^\n]*?Flames\$\/), ""\)/);
assert.ok(labelSrc, 'buff label regex present');
const label = new RegExp(labelSrc[1].slice(1, -1));
for (const name of ['Everflame: Flames', 'Everflame ' + DASH + ' Flames']) { assert.equal(name.replace(label, ''), 'Everflame', name); checks++; }
const items = fs.readFileSync(path.join(root, 'src/dndbeyond/content-scripts/item-rules.js'), 'utf8');
assert.ok(items.includes("name=item.name+': Flames',legacy=item.name+' \\u2014 Flames'"), 'legacy Flames name still recognized');
assert.ok(items.includes('e.name === name || e.name === legacy'), 'legacy Flames effect still removable');
checks += 2;

console.log(`PASS UI copy: ${checks} checks; no authored em dash in ${files.length} extension files; native DDB dash parsers and legacy Flames identity kept.`);
