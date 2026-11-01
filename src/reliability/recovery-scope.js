// The loader, worker and toolbar share one URL boundary. No host access is granted here.
function wb20RecoveryKind(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        if (url.hostname === 'app.roll20.net' && /^\/editor(?:\/|$)/.test(url.pathname)) return 'roll20';
        if (url.protocol !== 'https:' || !/(^|\.)dndbeyond\.com$/i.test(url.hostname)) return null;
        const path = url.pathname;
        if (/^\/(?:profile\/[^/]+\/)?characters\/\d+(?:\/(?!builder(?:\/|$))[^/]+)?\/?$/.test(path)) return 'character';
        if (/^\/(?:my-encounters|encounters|combat-tracker)(?:\/|$)/.test(path)) return 'encounter';
        if (/^\/monsters\/.+/.test(path)) return 'monster';
        if (/^\/vehicles\/.+/.test(path)) return 'vehicle';
        if (/^\/spells\/.+/.test(path)) return 'spell';
        if (/^\/(?:equipment|magic-items)\/.+/.test(path)) return 'item';
        if (/^\/feats\/.+/.test(path)) return 'feat';
        if (/^\/sources\/.+/.test(path)) return 'source';
        if (/^\/(?:classes|races|species|backgrounds)\/.+/.test(path) && !/\/edit\/?$/.test(path)) return 'source';
    } catch (_) {}
    return null;
}

function wb20RecoveryButtonPage(value) {
    return ['character', 'roll20'].includes(wb20RecoveryKind(value));
}
