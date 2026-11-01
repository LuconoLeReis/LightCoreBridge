(() => {
    // Reject unrelated pages before creating UI, observers, timers or storage work.
    if (!wb20RecoveryKind(location.href)) return;
    if (wb20RecoveryKind(location.href) === 'character' &&
        new URL(location.href).searchParams.get('wb20-native-startup') === '1') {
        // Explicit per-tab diagnostic control. No engine, UI, settings read/write
        // or VTT bridge is started. The same finite read-only probe is retained.
        const report = (scope, event, details, _enabled, callback) => {
            try {
                chrome.runtime.sendMessage({action:'waybeyond20-debug-log',entry:{
                    timestamp:new Date().toISOString(),scope,event,details,
                    page:location.origin+location.pathname
                }}, response => {if (!chrome.runtime.lastError) callback?.(response);});
            } catch (_) {}
        };
        wb20StartSheetLoadDiagnostics(report);
        wb20WatchSheetLoadCompletion(report);
        return;
    }
    const previous = globalThis.__wb20RecoveryBoot;
    if (previous) {
        try { if (previous.runtime.id === chrome.runtime.id) return; } catch (_) {}
        // Only a real page reload removes an orphaned engine after an extension reload.
        location.reload(); return;
    }
    globalThis.__wb20RecoveryBoot = {runtime: chrome.runtime};
    // Recovery remains available in Settings and the extension menu. Loading the
    // selected bundle needs no page button, theme observer or extra storage read.
    try {
        chrome.runtime.sendMessage({action: 'wb20-load-recovery-content'}, () => {
            if (chrome.runtime.lastError) console.debug('WayBeyond20: page startup unavailable; native controls remain available.');
        });
    } catch (_) {
        console.debug('WayBeyond20: page startup unavailable; native controls remain available.');
    }
})();
