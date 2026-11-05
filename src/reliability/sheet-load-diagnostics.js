// Read-only startup evidence. Three finite samples; no polling or UI changes.
// A separate one-shot completion record can identify slow resources after the
// startup samples stop. It records origins/types/timings, never URL paths or data.
function wb20WatchSheetLoadCompletion(debugLog = typeof wayBeyond20DebugLog === 'function' ? wayBeyond20DebugLog : null) {
    if (globalThis.__wb20SheetLoadCompletion) return;
    const state = {finished:false, completed:false, deadline:null, deferred:null, frameLoads:[], lateReports:0};
    globalThis.__wb20SheetLoadCompletion = state;
    const origin = value => {
        try {const url = new URL(value, location.href); return url.origin === 'null' ? url.protocol : url.origin;}
        catch (_) {return 'unknown';}
    };
    function onFrameLoad(event) {
        try {
            const frame = event.target;
            if (state.finished || frame?.tagName !== 'IFRAME') return;
            const action = frame.closest('form')?.getAttribute('action');
            state.frameLoads.push({origin:origin(frame.getAttribute('src') || 'about:blank'),
                formTargetOrigin:action ? origin(action) : null, loadedAtMs:Math.round(performance.now())});
            if (state.frameLoads.length > 8) state.frameLoads.shift();
            const navigation = performance.getEntriesByType('navigation')[0];
            const detail = state.frameLoads[state.frameLoads.length-1];
            if (state.completed && detail.loadedAtMs-(navigation?.loadEventEnd || 0)>=10000) {
                if (!chrome.runtime?.id) {cleanup();return;}
                const details = {...detail, documentReady:document.readyState};
                console.info('WayBeyond20: bounded late frame diagnostic', JSON.stringify(details));
                if (debugLog) debugLog('sheet-load', 'Late frame load', details, true, response => {
                    try {
                        if (chrome.runtime?.id && response?.loading)
                            console.info('WayBeyond20: late frame browser loading diagnostic', JSON.stringify({...details,...response.loading}));
                    } catch (_) {}
                });
                if (++state.lateReports >= 8) cleanup();
            }
        } catch (_) { /* A diagnostic listener never interrupts native loading. */ }
    }
    function cleanup() {
        state.finished = true;
        clearTimeout(state.deadline); clearTimeout(state.deferred);
        window.removeEventListener('load', onLoad);
        document.removeEventListener('load', onFrameLoad, true);
        window.removeEventListener('pagehide', cleanup);
    }
    function finish(reason) {
        if (state.finished || state.completed) return;
        state.completed = true;
        clearTimeout(state.deferred);
        window.removeEventListener('load', onLoad);
        try {
            if (!chrome.runtime?.id) return;
            const navigation = performance.getEntriesByType('navigation')[0];
            const slowResources = performance.getEntriesByType('resource').slice(-250)
                .sort((a,b) => b.duration-a.duration).slice(0,8).map(entry => ({
                    origin:origin(entry.name), type:String(entry.initiatorType || '').slice(0,30),
                    startMs:Math.round(entry.startTime), durationMs:Math.round(entry.duration)
                }));
            const details = {reason, documentReady:document.readyState,
                elapsedMs:Math.round(performance.now()), loadEventEnd:Math.round(navigation?.loadEventEnd || 0),
                slowResources, frameLoads:state.frameLoads};
            console.info('WayBeyond20: bounded load completion diagnostic', JSON.stringify(details));
            if (debugLog) debugLog('sheet-load', 'Load completion', details, true);
        } catch (_) { /* Optional evidence never changes page loading. */ }
    }
    function onLoad() {state.deferred = setTimeout(() => finish('load'), 0);}
    // Native subframe navigation can start AFTER the top-level load event. Keep
    // only this event listener, with at most8 late reports and a30-minute cutoff.
    // There is no poll or long-task observer during this extended window.
    state.deadline = setTimeout(() => {finish('deadline');cleanup();}, 1800000);
    document.addEventListener('load', onFrameLoad, true);
    window.addEventListener('pagehide', cleanup, {once:true});
    if (document.readyState === 'complete') state.deferred = setTimeout(() => finish('already-complete'), 0);
    else window.addEventListener('load', onLoad, {once:true});
}

function wb20StartSheetLoadDiagnostics(debugLog = typeof wayBeyond20DebugLog === 'function' ? wayBeyond20DebugLog : null) {
    if (globalThis.__wb20SheetLoadDiagnostics) return;
    const state = {stopped:false, timers:[], observer:null, longTasks:0, longTaskMs:0, maxLongTaskMs:0};
    globalThis.__wb20SheetLoadDiagnostics = state;
    const stop = () => {
        state.stopped = true;
        state.timers.forEach(clearTimeout);
        state.observer?.disconnect();
        window.removeEventListener('pagehide', stop);
    };
    const available = () => {
        try { return !!chrome.runtime?.id; } catch (_) { return false; }
    };
    const origin = value => {
        try { const url = new URL(value, location.href); return url.origin === 'null' ? url.protocol : url.origin; }
        catch (_) { return 'unknown'; }
    };
    try {
        if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
            state.observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    state.longTasks++;
                    state.longTaskMs += entry.duration;
                    state.maxLongTaskMs = Math.max(state.maxLongTaskMs, entry.duration);
                }
            });
            state.observer.observe({type:'longtask', buffered:true});
        }
    } catch (_) { state.observer?.disconnect(); state.observer = null; }
    window.addEventListener('pagehide', stop, {once:true});
    for (const delay of [2000, 10000, 30000]) state.timers.push(setTimeout(() => {
        if (state.stopped || !available()) { stop(); return; }
        try {
            const navigation = performance.getEntriesByType('navigation')[0];
            const frames = Array.from(document.querySelectorAll('iframe')).slice(0, 12).map(frame => {
                let ready = 'cross-origin';
                try { ready = frame.contentDocument?.readyState || 'unavailable'; } catch (_) {}
                // Never log query strings, form values, request headers or response bodies.
                const form = frame.closest('form');
                return {origin:origin(frame.getAttribute('src') || 'about:blank'), ready,
                    formTargetOrigin:form?.getAttribute('action') ? origin(form.getAttribute('action')) : null};
            });
            const details = {sampleMs:delay, documentReady:document.readyState,
                loadEventEnd:Math.round(navigation?.loadEventEnd || 0), frames,
                incompleteImages:Array.from(document.images).slice(0, 64).filter(image => !image.complete).length,
                longTasks:state.longTasks, longTaskMs:Math.round(state.longTaskMs), maxLongTaskMs:Math.round(state.maxLongTaskMs)};
            console.info('WayBeyond20: bounded load diagnostic', JSON.stringify(details));
            if (debugLog)
                debugLog('sheet-load', 'Startup sample', details, true, response => {
                    if (available() && response?.loading)
                        console.info('WayBeyond20: browser loading diagnostic', JSON.stringify({sampleMs:delay, ...response.loading}));
                });
        } catch (_) { /* Optional evidence must never affect sheet startup. */ }
        if (delay === 30000) stop();
    }, delay));
}
