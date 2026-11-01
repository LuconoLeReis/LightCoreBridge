// Recovery is deliberately independent of character settings, resources and VTTs.
const WB20_RECOVERY_KEY = 'wb20-beyond20-mode';
function wb20RecoveryGuardMessage(request,respond,resume) {
    if (!/^(?:waybeyond20-|wb20-talespire-|character-core-update$|effects-update$)/.test(request.action || '')) return false;
    chrome.storage.local.get({[WB20_RECOVERY_KEY]:false},saved=>{
        if (saved[WB20_RECOVERY_KEY]) respond({success:false,disabled:true,error:null});
        else resume();
    });
    return true;
}
function wb20LoadRecoveryContent(request, sender, respond) {
    const kind = wb20RecoveryKind(sender.url || sender.tab?.url || '');
    if (sender.id !== chrome.runtime.id || !sender.tab?.id || !kind) {
        respond({ok:false}); return;
    }
    chrome.storage.local.get({[WB20_RECOVERY_KEY]:false}, saved => {
        const mode = saved[WB20_RECOVERY_KEY] === true;
        const prefix = mode ? 'compat_' : '';
        const target = {tabId:sender.tab.id, frameIds:[sender.frameId || 0]};
        const file = `dist/${prefix}${kind === 'roll20' ? 'roll20' : 'dndbeyond_'+kind}.js`;
        const css = mode ? 'dist/compat_beyond20.css' : 'dist/beyond20.css';
        const complete = () => respond({ok:!chrome.runtime.lastError, mode});
        if (chrome.scripting) {
            chrome.scripting.insertCSS({target,files:[css]}, () => {
                if (chrome.runtime.lastError) {respond({ok:false,mode});return;}
                chrome.scripting.executeScript({target,files:[file]}, complete);
            });
        } else {
            chrome.tabs.insertCSS(sender.tab.id,{file:css,frameId:sender.frameId || 0},()=>{
                if (chrome.runtime.lastError) {respond({ok:false,mode});return;}
                chrome.tabs.executeScript(sender.tab.id,{file,frameId:sender.frameId || 0},complete);
            });
        }
    });
}
function wb20ReloadRecoveryTabs(respond) {
    // Reloading actually removes old listeners/observers. Hiding panels would not.
    chrome.tabs.query({}, tabs => {
        let reloaded=0;
        for (const tab of tabs || []) if (wb20RecoveryKind(tab.url)) {
            chrome.tabs.reload(tab.id,()=>void chrome.runtime.lastError); reloaded++;
        } else if (typeof isFVTT === 'function' && isFVTT(tab.title || '')) {
            // Do not expand host access to recover a Foundry page.
            try {const url = new URL(tab.url);
                chrome.permissions.contains({origins:[`${url.protocol}//${url.hostname}/*`]},allowed=>{
                if (allowed) chrome.tabs.reload(tab.id,()=>void chrome.runtime.lastError);
            });} catch (_) {}
        }
        respond({ok:true,reloaded});
    });
}
