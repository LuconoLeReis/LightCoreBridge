(() => {
    // Toolbar recovery does not ask a stuck character content script to respond.
    const key='wb20-beyond20-mode';
    if (document.getElementById('wb20-popup-recovery')) return;
    const box=document.createElement('section');box.id='wb20-popup-recovery';
    box.style.cssText='padding:12px;border-bottom:1px solid currentColor;font:13px system-ui';
    const button=document.createElement('button');button.type='button';button.style.cssText='padding:8px 12px;cursor:pointer;color:inherit;background:transparent;border:1px solid currentColor;border-radius:5px;font:inherit';
    const help=document.createElement('p');help.textContent='Emergency recovery reloads D&D Beyond and supported VTT pages. Your saved connections, dice and character resources are retained.';
    box.append(button,help);
    const header=document.querySelector('.wb20-settings-header');
    if (header) header.after(box); else document.body.prepend(box);
    chrome.storage.local.get({[key]:false},saved=>{
        const mode=saved[key]===true;
        button.textContent=mode?'Restore LightCore':'Use Beyond20 mode';
        button.addEventListener('click',()=>{
            button.disabled=true;
            chrome.storage.local.set({[key]:!mode},()=>{
                if (chrome.runtime.lastError) {button.disabled=false;help.textContent='Mode could not be saved. Try again.';return;}
                chrome.tabs.query({},tabs=>{
                    if (chrome.runtime.lastError) {help.textContent='Mode saved. Refresh your character sheet to finish switching.';return;}
                    for (const tab of tabs || []) {
                        try {
                            const url=new URL(tab.url);
                            if (wb20RecoveryKind(tab.url))
                                chrome.tabs.reload(tab.id,()=>void chrome.runtime.lastError);
                            else if (/Foundry Virtual Tabletop/i.test(tab.title || '') && chrome.permissions)
                                chrome.permissions.contains({origins:[`${url.protocol}//${url.hostname}/*`]},allowed=>{if(allowed)chrome.tabs.reload(tab.id,()=>void chrome.runtime.lastError);});
                        } catch (_) {}
                    }
                    help.textContent='Mode saved. D&D Beyond and supported VTT pages are reloading.';
                });
            });
        });
    });
})();
