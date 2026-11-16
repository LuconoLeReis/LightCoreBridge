// Reorganize the existing controls; IDs, values and persistence stay unchanged.
function wayBeyond20SettingsGroup(name, row) {
    if (row.classList.contains('effects-option')) return 'Current effects';
    if (name === 'character-option' || name in character_settings && !(name in options_list)) return 'Character options';
    if (['use-digital-dice', 'roll-to-game-log', 'hide-results-with-digital-dice',
        'hide-results-on-whisper-to-discord', 'local-roll-display-duration'].includes(name)) return 'Roll results';
    if (/^(?:vtt-tab|talespire-url|discord|custom-domains|roll20-discord)/.test(name)) return 'Connections';
    if (/hotkey|sticky-hotkeys/.test(name)) return 'Shortcuts';
    if (/debug|backup|restore|donate|support|changelog|version|last-version/.test(name)) return 'Support and backup';
    if (/whisper|hide|display|description|roll20-template/.test(name)) return 'Display and privacy';
    if (/roll|critical|damage|advantage|initiative-tiebreaker/.test(name)) return 'Dice and rolls';
    return 'Sheet and combat';
}

function wayBeyond20OrganizeSettings() {
    const list = document.querySelector('main .beyond20-options');
    if (!list) return;
    const fullPage = location.pathname.endsWith('/options.html') || new URLSearchParams(location.search).has('sourceTab');
    let search = document.getElementById('wb20-settings-search');
    if (!search) {
        const bar = document.createElement('div'); bar.className = 'wb20-settings-search';
        const label = document.createElement('label'); label.htmlFor = 'wb20-settings-search'; label.textContent = 'Find a setting';
        search = document.createElement('input'); search.type = 'search'; search.id = 'wb20-settings-search';
        search.placeholder = 'Search settings';
        const status = document.createElement('p'); status.id = 'wb20-settings-search-status'; status.setAttribute('role', 'status');
        bar.append(label, search, status); list.before(bar);
        search.addEventListener('input', wayBeyond20FilterSettings);
    }
    const groups = new Map();
    for (const section of list.querySelectorAll('details.wb20-settings-section')) groups.set(section.dataset.group, section);
    const rows = Array.from(list.querySelectorAll('li.beyond20-option'));
    for (const row of rows) {
        if (row.querySelector('#openOptions')) continue;
        const name = row.dataset.setting || row.id.replace(/^beyond20-option-/, '') ||
            row.querySelector('.beyond20-option-input')?.id || row.querySelector('label[id]')?.id || 'other';
        // Generic rows don't have IDs; prefer their input before the fallback.
        const key = name === 'other' ? row.querySelector('.beyond20-option-input')?.id || name : name;
        row.dataset.setting = key;
        const definition = options_list[key] || character_settings[key];
        row.dataset.search = [definition?.title, definition?.description, definition?.short, key, row.querySelector('h4')?.textContent].filter(Boolean).join(' ').toLowerCase();
        row.style.removeProperty('display');
        if (key === 'vtt-tab') { list.prepend(row); continue; }
        const group = wayBeyond20SettingsGroup(key, row);
        let section = groups.get(group);
        if (!section) {
            const li = document.createElement('li'); li.className = 'wb20-settings-group';
            section = document.createElement('details'); section.className = 'wb20-settings-section'; section.dataset.group = group;
            section.open = fullPage;
            const summary = document.createElement('summary'); summary.textContent = group;
            const body = document.createElement('ul'); body.className = 'list-group wb20-section-options';
            section.append(summary, body); li.append(section); list.append(li); groups.set(group, section);
        }
        section.querySelector('ul').append(row);
    }
    const order = ['Roll results', 'Connections', 'Dice and rolls', 'Sheet and combat', 'Character options', 'Current effects', 'Display and privacy', 'Shortcuts', 'Support and backup'];
    for (const group of order) if (groups.has(group)) list.append(groups.get(group).parentElement);
    const footer = list.querySelector('#openOptions')?.closest('li.beyond20-option');
    if (footer) list.append(footer);
    wayBeyond20FilterSettings();
}

function wayBeyond20FilterSettings() {
    const query = (document.getElementById('wb20-settings-search')?.value || '').trim().toLowerCase();
    let matches = 0;
    for (const section of document.querySelectorAll('details.wb20-settings-section')) {
        if (query && section.dataset.searchOpen === undefined) section.dataset.searchOpen = String(section.open);
        let visible = 0;
        for (const row of section.querySelectorAll('li.beyond20-option')) {
            // Special controls may replace their row after a choice (Discord channels).
            const text = row.dataset.search || [row.id, row.querySelector('h4')?.textContent].filter(Boolean).join(' ').toLowerCase();
            row.hidden = !!query && !text.includes(query);
            if (!row.hidden) visible++;
        }
        section.parentElement.hidden = !visible;
        if (query) section.open = true;
        else if (section.dataset.searchOpen !== undefined) {
            section.open = section.dataset.searchOpen === 'true'; delete section.dataset.searchOpen;
        }
        matches += visible;
    }
    const status = document.getElementById('wb20-settings-search-status');
    if (status) status.textContent = query ? `${matches} matching settings. Send rolls to remains available above the sections.` : '';
}

function wayBeyond20ApplySettingsTheme(theme) {
    if (!theme || typeof theme !== 'object') return;
    for (const [name, value] of Object.entries(theme))
        if (['surface', 'text', 'accent'].includes(name) && typeof value === 'string' && CSS.supports('color', value))
            document.documentElement.style.setProperty(`--wb20-settings-${name}`, value);
}
try {
    wayBeyond20ApplySettingsTheme(JSON.parse(new URLSearchParams(location.hash.slice(1)).get('wb20-theme') || 'null'));
} catch (_) {}
window.addEventListener('message', event => {
    if (event.source === parent && event.data?.type === 'wb20-settings-theme') wayBeyond20ApplySettingsTheme(event.data.theme);
});
