var settings = getDefaultSettings()
let wayBeyond20SettingsReady = false;
let wayBeyond20SettingsGeneration = 0;
// A missing storage callback must not retain message channels/closures forever.
// Never guess a destination: expiry returns a quiet local-fallback verdict.
const wayBeyond20SettingsWaiters = new Set();
function wayBeyond20WaitForSettings(resume, respond) {
    const fail = () => respond({success:false, delivered:false, vtt:['dndbeyond'], error:null});
    if (wayBeyond20SettingsWaiters.size >= 64) {fail(); return;}
    const pending = {resume, timer:null};
    pending.timer = setTimeout(() => {
        if (wayBeyond20SettingsWaiters.delete(pending)) fail();
    }, 2500);
    wayBeyond20SettingsWaiters.add(pending);
}
function wayBeyond20ReleaseSettingsWaiters() {
    const waiting = [...wayBeyond20SettingsWaiters];
    wayBeyond20SettingsWaiters.clear();
    for (const pending of waiting) {
        clearTimeout(pending.timer);
        Promise.resolve().then(pending.resume);
    }
}
var fvtt_tabs = []
var custom_tabs = []
var roll20_tabs = []
var tabRemovalTimers = {};
var currentPermissions = {origins: []};
var openedChangelog = false;
var webNavigationReady = false;
const manifest = chrome.runtime.getManifest();
// Manifest V3 uses action instead of browserAction
const action = manifest.manifest_version >= 3 ? chrome.action : chrome.browserAction;

function sendMessageWithLog(tabId, request) {
    try {
        const maybePromise = chrome.tabs.sendMessage(tabId, request);
        if (maybePromise && typeof maybePromise.catch === "function") {
            maybePromise.catch((error) => {
                const message = String(error && error.message ? error.message : error || "");
                if (message.includes("Receiving end does not exist") ||
                    message.includes("message port closed before a response was received")) {
                    return;
                }
                console.debug("WayBeyond20: sendMessage failed for tab " + tabId + ":", message);
            });
        }
    } catch (error) {
        const message = String(error && error.message ? error.message : error || "");
        if (message.includes("Extension context invalidated")) return;
        console.debug("WayBeyond20: sendMessage failed for tab " + tabId + ":", message);
    }
}

let wayBeyond20DebugLogWriteQueue = Promise.resolve();

function wayBeyond20AppendDebugLogEntry(entry, sender = null) {
    if (!settings || !settings["waybeyond20-debug-log"]) return Promise.resolve(false);
    const normalized = Object.assign({}, entry || {});
    normalized.timestamp = normalized.timestamp || new Date().toISOString();
    normalized.scope = String(normalized.scope || "WayBeyond20");
    normalized.event = String(normalized.event || "event");
    if (sender && sender.tab) {
        normalized.tabId = sender.tab.id;
        if (!normalized.page && sender.tab.url) {
            try {
                const url = new URL(sender.tab.url);
                normalized.page = `${url.origin}${url.pathname}`;
            } catch (error) {
                normalized.page = sender.tab.url;
            }
        }
    }

    return new Promise(resolve => {
        getStorage().get({ [WAYBEYOND20_DEBUG_LOG_STORAGE_KEY]: [] }, items => {
            let entries = Array.isArray(items[WAYBEYOND20_DEBUG_LOG_STORAGE_KEY])
                ? items[WAYBEYOND20_DEBUG_LOG_STORAGE_KEY].slice()
                : [];
            entries.push(normalized);
            if (entries.length > WAYBEYOND20_DEBUG_LOG_MAX_ENTRIES) {
                entries = entries.slice(entries.length - WAYBEYOND20_DEBUG_LOG_MAX_ENTRIES);
            }
            while (entries.length > 1 && JSON.stringify(entries).length > WAYBEYOND20_DEBUG_LOG_MAX_CHARACTERS) {
                entries.shift();
            }
            getStorage().set({ [WAYBEYOND20_DEBUG_LOG_STORAGE_KEY]: entries }, () => resolve(!chrome.runtime.lastError));
        });
    });
}

function wayBeyond20QueueDebugLogEntry(entry, sender = null) {
    wayBeyond20DebugLogWriteQueue = wayBeyond20DebugLogWriteQueue
        .then(() => wayBeyond20AppendDebugLogEntry(entry, sender))
        .catch(error => console.debug("WayBeyond20: Debug log write failed", error));
}

function wayBeyond20BackgroundDebug(event, details = null) {
    if (!settings || !settings["waybeyond20-debug-log"]) return;
    wayBeyond20QueueDebugLogEntry({
        timestamp: new Date().toISOString(),
        scope: "Background",
        event,
        details: wayBeyond20DebugSafeValue(details)
    });
}

function wayBeyond20CloneForVTT(request) {
    try {
        return JSON.parse(JSON.stringify(request));
    } catch (err) {
        console.warn("WayBeyond20: Unable to clone VTT request for target-specific transforms", err);
        return request;
    }
}

function wayBeyond20SavageFormulaForTarget(formula, target) {
    const original = String(formula || "").trim();
    if (!/\d*d\d+/i.test(original)) return original;
    // Savage Attacker compares two complete weapon-damage rolls. Doubling a 2d6
    // pool and dropping two individual dice is a different probability distribution.
    // Roll20 supports grouped rolls, so compare the complete formulas there. Preserve
    // the native formula on targets whose grouped-roll grammar we have not verified.
    if (target !== "roll20") return original;
    return `{${original}, ${original}}kh1`;
}

function wayBeyond20BedsideFormulaForTarget(formula, target) {
    const syntax = target === "roll20" ? "dl" : "kh";
    let changed = false;
    return String(formula || "").replace(/(\d*)d(\d+)((?:ro<=\d+|min\d+)*)/i, (match, amount, faces, modifiers) => {
        if (changed) return match;
        const count = parseInt(amount || "1");
        if (!Number.isFinite(count) || count <= 0) return match;
        changed = true;
        const rolled = count + 1;
        if (syntax === "dl") return `${rolled}d${faces}${modifiers || ""}dl1`;
        return `${rolled}d${faces}${modifiers || ""}kh${count}`;
    });
}

function wayBeyond20ApplyBedsideMannerTransform(request, target) {
    const bedside = request && request["waybeyond20-bedside-manner"];
    if (!bedside || bedside.mode !== "extra-die-drop-lowest") return request;

    const changed = [];
    if (bedside.field === "hit-dice") {
        const original = bedside.original || request["hit-dice"];
        const replacement = wayBeyond20BedsideFormulaForTarget(original, target);
        if (replacement !== original) {
            request["hit-dice"] = replacement;
            changed.push({ field: "hit-dice", from: original, to: replacement });
        }
    } else if (Array.isArray(request.damages)) {
        const selected = [...new Set(Array.isArray(bedside.selectedHealingIndexes) ? bedside.selectedHealingIndexes : [])]
            .filter(idx => Number.isFinite(idx) && idx >= 0 && idx < request.damages.length)
            .sort((a, b) => a - b);
        for (const idx of selected) {
            const recorded = Array.isArray(bedside.originalHealing)
                ? bedside.originalHealing.find(entry => entry && entry.index === idx)
                : null;
            const original = recorded ? recorded.formula : request.damages[idx];
            const replacement = wayBeyond20BedsideFormulaForTarget(original, target);
            if (replacement !== original) {
                request.damages[idx] = replacement;
                changed.push({
                    index: idx,
                    from: original,
                    to: replacement,
                    type: Array.isArray(request["damage-types"]) ? request["damage-types"][idx] || "Healing" : "Healing"
                });
            }
        }
    }

    request["waybeyond20-bedside-manner"] = {
        ...bedside,
        renderedTarget: target,
        changed
    };
    return request;
}

function wayBeyond20ApplySavageAttackerTransform(request, target) {
    if (!request || !Array.isArray(request.damages)) return request;
    const savage = request["waybeyond20-savage-attacker"];
    if (!savage || !["reroll-formula-keep-higher", "double-dice-drop-lowest"].includes(savage.mode)) return request;

    let selected = Array.isArray(savage.selectedDamageIndexes) ? savage.selectedDamageIndexes : [];
    if (selected.length === 0 && Array.isArray(savage.selected) && Array.isArray(request["waybeyond20-action-pool"])) {
        selected = request["waybeyond20-action-pool"]
            .filter(row => row && savage.selected.includes(row.id))
            .map(row => parseInt(String(row.id || "").replace(/^d/, "")))
            .filter(idx => Number.isFinite(idx));
    }
    selected = [...new Set(selected)].filter(idx => idx >= 0 && idx < request.damages.length).sort((a, b) => a - b);
    if (selected.length === 0) return request;

    const changed = [];
    for (const idx of selected) {
        const original = request.damages[idx];
        const replacement = wayBeyond20SavageFormulaForTarget(original, target);
        if (replacement !== original) {
            request.damages[idx] = replacement;
            changed.push({
                index: idx,
                from: original,
                to: replacement,
                type: Array.isArray(request["damage-types"]) ? request["damage-types"][idx] || "" : ""
            });
        }
    }

    request["waybeyond20-savage-attacker"] = {
        ...savage,
        renderedTarget: target,
        changed
    };
    return request;
}

function wayBeyond20ApplyTargetTransforms(request, target) {
    if (!request) return request;
    wayBeyond20ApplyBedsideMannerTransform(request, target);
    wayBeyond20ApplySavageAttackerTransform(request, target);
    return request;
}

function wayBeyond20PrepareRequestForTarget(request, target) {
    const cloned = wayBeyond20CloneForVTT(request);
    return wayBeyond20ApplyTargetTransforms(cloned, target);
}

function updateSettings(new_settings = null) {
    if (new_settings) {
        settings = new_settings
        wayBeyond20SettingsGeneration++;
        wayBeyond20SettingsReady = true;
        wayBeyond20ReleaseSettingsWaiters();
    } else {
        const generation = wayBeyond20SettingsGeneration;
        getStoredSettings((saved_settings) => {
            // A newer settings broadcast may arrive before this startup read.
            if (generation === wayBeyond20SettingsGeneration) updateSettings(saved_settings);
        })
    }
}

function sendMessageTo(url, request, failure = null) {
    chrome.tabs.query({ url }, (tabs) => {
        if (failure)
            failure(tabs.length === 0)
        for (let tab of tabs)
            sendMessageWithLog(tab.id, request)
    })
}

function filterVTTTab(request, limit, tabs, titleCB, send = sendMessageWithLog) {
    let found = false
    for (let tab of tabs) {
        if ((limit.id == 0 || tab.id == limit.id) &&
            (limit.title == null || titleCB(tab.title) == limit.title)) {
            send(tab.id, request)
            found = true
        }
    }
    if (!found && limit.id != 0) {
        limit.id = 0
        mergeSettings({ "vtt-tab": limit })
        for (let tab of tabs) {
            if (titleCB(tab.title) == limit.title) {
                send(tab.id, request)
                found = true
                break
            }
        }
    }
    return found
}

function sendMessageToRoll20(request, limit = null, failure = null) {
    const targetRequest = wayBeyond20PrepareRequestForTarget(request, "roll20");
    if (limit) {
        const vtt = limit.vtt || "roll20"
        if (vtt == "roll20") {
            chrome.tabs.query({ "url": ROLL20_URL }, (tabs) => {
                console.log("[Roll20] limit path: tabs from URL query:", tabs.length, "tracked roll20_tabs:", roll20_tabs.length);
                // Also check tracked Roll20 tabs, including the no-trailing-slash URL variant.
                for (let rtab of roll20_tabs) {
                    if (!tabs.find(t => t.id === rtab.id)) {
                        tabs.push(rtab);
                    }
                }
                let found = filterVTTTab(targetRequest, limit, tabs, roll20Title)
                if (failure)
                    failure(!found)
            })
        } else {
            failure(true)
        }
    } else {
        chrome.tabs.query({ "url": ROLL20_URL }, (tabs) => {
            for (let rtab of roll20_tabs) {
                if (!tabs.find(t => t.id === rtab.id)) {
                    tabs.push(rtab);
                }
            }
            for (let tab of tabs) {
                sendMessageWithLog(tab.id, targetRequest)
            }
            if (failure) failure(tabs.length === 0)
        });
    }
}

// The MV3 service worker sleeps when idle and loses fvtt_tabs, while the Foundry content
// scripts keep running. Like the Roll20 route, ask Chrome for the live tabs on every send:
// registered tabs (with their current titles) plus permitted tabs titled as Foundry.
function wayBeyond20WithFVTTTabs(callback) {
    // A just-woken worker has not reloaded its permission list yet, so read it fresh.
    chrome.permissions.getAll(permissions => {
        if (permissions) currentPermissions = permissions;
        wayBeyond20QueryFVTTTabs(callback);
    });
}

function wayBeyond20QueryFVTTTabs(callback) {
    chrome.tabs.query({}, (tabs) => {
        const live = [];
        for (const tab of tabs || []) {
            if (!tab || !tab.title || !isFVTT(tab.title) || !tab.url) continue;
            const origin = wayBeyond20UrlOrigin(tab.url);
            // A registration (for example a one-time activation) speaks only for the origin it was
            // trusted for; a tab on any other origin needs its own host permission.
            const registered = fvtt_tabs.find(t => t.id === tab.id);
            const trusted = registered && (registered.wb20TrustedOrigin || wayBeyond20UrlOrigin(registered.url));
            if (trusted && trusted === origin) live.push({ ...tab, wb20TrustedOrigin: trusted });
            else if (wayBeyond20HasHostPermission(tab.url)) live.push({ ...tab, wb20TrustedOrigin: origin });
        }
        // Only freshly validated tabs are destinations; stale registrations are dropped.
        fvtt_tabs = live.slice();
        callback(live);
    });
}

function wayBeyond20HasHostPermission(url) {
    try {
        const origin = `${new URL(url).protocol}//${new URL(url).hostname}/*`;
        return !!(currentPermissions && currentPermissions.origins &&
            currentPermissions.origins.some(pattern => urlMatches(origin, pattern)));
    } catch (err) {
        return false;
    }
}

function sendMessageToFVTT(request, limit, failure = null) {
    const targetRequest = wayBeyond20PrepareRequestForTarget(request, "fvtt");
    if (limit && (limit.vtt || "fvtt") != "fvtt") {
        if (failure) failure(true);
        return;
    }
    wayBeyond20WithFVTTTabs(tabs => {
        if (limit) {
            const found = filterVTTTab(targetRequest, limit, tabs, fvttTitle)
            if (failure)
                failure(!found)
            return;
        }
        if (failure)
            failure(tabs.length == 0)
        for (let tab of tabs) {
            sendMessageWithLog(tab.id, targetRequest)
        }
    });
}

function sendMessageToCustomSites(request, limit, failure = null) {
    const targetRequest = wayBeyond20PrepareRequestForTarget(request, "generic");
    if (failure)
        failure(custom_tabs.length == 0)
    if (custom_tabs.length == 0) return;
    for (let tab of custom_tabs) {
        sendMessageWithLog(tab.id, targetRequest)
    }
}

function sendMessageToBeyond(request) {
    sendMessageTo(DNDBEYOND_CHARACTER_URL, request)
    sendMessageTo(DNDBEYOND_MONSTER_URL, request)
    sendMessageTo(DNDBEYOND_ENCOUNTER_URL, request)
    sendMessageTo(DNDBEYOND_ENCOUNTERS_URL, request)
    sendMessageTo(DNDBEYOND_COMBAT_URL, request)
    sendMessageTo(DNDBEYOND_SPELL_URL, request)
    sendMessageTo(DNDBEYOND_VEHICLE_URL, request)
    sendMessageTo(DNDBEYOND_SOURCES_URL, request)
    sendMessageTo(DNDBEYOND_CLASSES_URL, request)
    sendMessageTo(DNDBEYOND_EQUIPMENT_URL, request)
    sendMessageTo(DNDBEYOND_ITEMS_URL, request)
    sendMessageTo(DNDBEYOND_FEATS_URL, request)
}

function isFVTTTabAdded(tab) {
    return !!fvtt_tabs.find(t => t.id === tab.id);
}

function wayBeyond20UrlOrigin(url) {
    try { return new URL(url).origin; } catch (err) { return null; }
}

function addFVTTTab(tab) {
    // Foundry's title gains the world name after WB20 loads ("World • Foundry Virtual Tabletop").
    // Keep the newest title/URL snapshot so "send rolls to this World" can match it, but keep the
    // origin the registration was trusted for separate: a refresh that crosses to another origin
    // ends the registration instead of moving its trust.
    const index = fvtt_tabs.findIndex(t => t.id === tab.id);
    if (index >= 0) {
        const trusted = fvtt_tabs[index].wb20TrustedOrigin || wayBeyond20UrlOrigin(fvtt_tabs[index].url);
        if (trusted && tab.url && wayBeyond20UrlOrigin(tab.url) !== trusted) {
            fvtt_tabs.splice(index, 1);
            return;
        }
        fvtt_tabs[index] = { ...tab, wb20TrustedOrigin: trusted || wayBeyond20UrlOrigin(tab.url) };
        return;
    }
    fvtt_tabs.push({ ...tab, wb20TrustedOrigin: wayBeyond20UrlOrigin(tab.url) });
    console.log("Added ", tab.id, " to fvtt tabs.");
}

function removeFVTTTab(id) {
    for (let t of fvtt_tabs) {
        if (t.id == id) {
            fvtt_tabs = fvtt_tabs.filter(tab => tab !== t);
            console.log("Removed ", id, " from fvtt tabs.");
            return;
        }
    }
}

function isCustomTabAdded(tab) {
    return !!custom_tabs.find(t => t.id === tab.id);
}

function addCustomTab(tab) {
    if (isCustomTabAdded(tab)) return;
    custom_tabs.push(tab);
    console.log("Added ", tab.id, " to custom tabs.");
}

function removeCustomTab(id) {
    for (let t of custom_tabs) {
        if (t.id == id) {
            custom_tabs = custom_tabs.filter(tab => tab !== t);
            console.log("Removed ", id, " from custom tabs.");
            return;
        }
    }
}

function isRoll20TabAdded(tab) {
    return !!roll20_tabs.find(t => t.id === tab.id);
}

function addRoll20Tab(tab) {
    if (isRoll20TabAdded(tab)) return;
    roll20_tabs.push(tab);
    console.log("Added ", tab.id, " to roll20 tabs.");
}

function removeRoll20Tab(id) {
    roll20_tabs = roll20_tabs.filter(tab => tab.id !== id);
}

function onRollFailure(request, sendResponse) {
    sendResponse({success:false,vtt:["dndbeyond"],error:null,request});
}


const forwardedActions = [
    "roll",
    "rendered-roll",
    "hp-update",
    "conditions-update",
    "effects-update",
    "update-combat",
];

// Completed rolls use recipient acknowledgments, never tab presence as proof.
// Other state/legacy messages retain their existing dispatch behavior.
function wb20SendCompletedToTab(tabId, request) {
    return new Promise(resolve => {
        let settled=false;
        const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
        const timer=setTimeout(()=>finish(false),1800);
        try {
            chrome.tabs.sendMessage(tabId,request,response=>{
                const error=chrome.runtime.lastError;
                finish(!error && response?.delivered === true);
            });
        } catch (_) {finish(false);}
    });
}
function wb20DeliverCompletedRoll(request, sender, respond) {
    const limit=settings['vtt-tab'];
    if (limit?.vtt === 'dndbeyond') {respond({success:false,delivered:false,vtt:['dndbeyond']});return;}
    let finished=false, remaining=3;
    const delivered=new Set();
    const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);
        respond({success:delivered.size>0,delivered:delivered.size>0,vtt:[...delivered]});};
    const timer=setTimeout(finish,2500);
    const run=(vtt,tabs,titleCB)=>{
        if(finished)return;
        let selected=[];
        if(!limit) selected=tabs;
        else if((limit.vtt || 'roll20') === vtt)
            filterVTTTab(request,{...limit},tabs,titleCB,id=>selected.push(tabs.find(t=>t.id===id)));
        selected=[...new Map(selected.filter(Boolean).map(t=>[t.id,t])).values()];
        Promise.all(selected.map(t=>wb20SendCompletedToTab(t.id,wayBeyond20PrepareRequestForTarget(request,vtt))))
            .then(results=>{if(results.some(Boolean))delivered.add(vtt);if(--remaining===0)finish();});
    };
    try {chrome.tabs.query({url:[ROLL20_URL,ROLL20_URL_NO_SLASH]},tabs=>run('roll20',tabs || [],roll20Title));}
    catch(_){run('roll20',[],roll20Title);}
    try {wayBeyond20WithFVTTTabs(tabs=>run('fvtt',tabs,fvttTitle));}
    catch(_){run('fvtt',[],fvttTitle);}
    // Custom adapters must acknowledge receipt to suppress the local fallback.
    try {chrome.tabs.query({},tabs=>run('custom',tabs.filter(t=>custom_tabs.some(c=>c.id===t.id && c.url===t.url)),t=>t));}
    catch(_){run('custom',[],t=>t);}
    // A saved native connection is considered automatic only with a live board feed.
    if(!limit && String(settings['talespire-url'] || '').trim()) {
        remaining++;
        wb20TaleSpireReturnRequest('/state').then(state=>{
            if(finished || !state.connected || state.snapshot?.connection !== String(settings['talespire-url']).trim())return;
            return new Promise(resolve=>wayBeyond20SendTaleSpire(request,sender,result=>{
                if(result.delivered)delivered.add('talespire');resolve();}));
        }).catch(()=>{}).finally(()=>{if(--remaining===0)finish();});
    }
}

function onMessage(request, sender, sendResponse, recoveryChecked = false) {
    // Opening settings must work even while worker settings are still loading.
    if (request.action === 'wb20-open-settings-tab') {
        if (sender.id !== chrome.runtime.id || !['popup.html', 'options.html'].includes(request.page)) {
            sendResponse({ok:false}); return false;
        }
        const source = sender.tab?.id;
        const theme = {};
        for (const key of ['surface', 'text', 'accent'])
            if (typeof request.theme?.[key] === 'string' && request.theme[key].length < 100)
                theme[key] = request.theme[key];
        const url = chrome.runtime.getURL(request.page) +
            (Number.isInteger(source) ? '?sourceTab=' + source : '') +
            '#wb20-theme=' + encodeURIComponent(JSON.stringify(theme));
        chrome.tabs.create({url, active:true}, tab => {
            sendResponse({ok:!chrome.runtime.lastError && !!tab});
        });
        return true;
    }

    if (request.action === 'wb20-load-recovery-content') {
        wb20LoadRecoveryContent(request,sender,sendResponse); return true;
    }
    if (request.action === 'wb20-recovery-reload') {
        if (sender.id !== chrome.runtime.id) {sendResponse({ok:false});return;}
        wb20ReloadRecoveryTabs(sendResponse); return true;
    }
    if (!recoveryChecked && typeof wb20RecoveryGuardMessage === 'function' &&
        wb20RecoveryGuardMessage(request,sendResponse,()=>onMessage(request,sender,sendResponse,true))) return true;

    // Listeners must register synchronously when MV3 wakes. Keep the channel open
    // while settings load instead of routing the first message using defaults.
    // A settings broadcast can itself satisfy readiness, without waiting on an
    // older storage snapshot. Recovery remains available independently above.
    // Local UI dependencies and the sender's own tab do not use a VTT choice.
    if (!wayBeyond20SettingsReady && !['settings','load-alertify','get-current-tab'].includes(request.action)) {
        wayBeyond20WaitForSettings(() => onMessage(request,sender,sendResponse,recoveryChecked), sendResponse);
        return true;
    }

    if (['wb20-talespire-state','wb20-talespire-pick'].includes(request.action)) {
        wb20TaleSpireReturnMessage(request,sender,sendResponse);
        return true;
    }
    console.log("Received message: ", request)
    if (settings['vtt-tab']?.vtt === 'talespire' && forwardedActions.includes(request.action)) {
        wayBeyond20SendTaleSpire(request, sender, sendResponse);
        return true;
    }
    if (request.action === "rendered-roll") {
        wb20DeliverCompletedRoll(request,sender,sendResponse); return true;
    }
    if (request.action === "character-core-update") {
        // Core sheet data belongs only in Roll20, not Foundry, Discord or a
        // generic custom endpoint. No open Roll20 game is a quiet no-op.
        sendMessageToRoll20(request, settings["vtt-tab"], failed => {
            sendResponse({ success: !failed, vtt: failed ? null : ["roll20"], error: null, request });
        });
        return true;
    }
    if (forwardedActions.includes(request.action)) {
        const makeFailureCB = (trackFailure, vtt, sendResponse) => {
            return (result) => {
                trackFailure[vtt] = result
                console.log("Result of sending to VTT ", vtt, ": ", result)
                if (trackFailure["roll20"] !== null && trackFailure["fvtt"] !== null &&
                    trackFailure["custom"] !== null) {
                    if (trackFailure["roll20"] == true && trackFailure["fvtt"] == true &&
                        trackFailure["custom"] == true) {
                        onRollFailure(request, sendResponse)
                    } else {
                        const vtts = []
                        for (let key in trackFailure) {
                            if (!trackFailure[key]) {
                                vtts.push(key)
                            }
                        }
                        sendResponse({ "success": true, "vtt": vtts, "error": null, "request": request })
                    }
                }
            }
        }
        const trackFailure = { "roll20": null, "fvtt": null, "custom": null }
        if (settings["vtt-tab"] && settings["vtt-tab"].vtt === "dndbeyond") {
            sendResponse({ "success": false, "vtt": ["dndbeyond"], "error": null, "request": request })
        } else {
            sendMessageToRoll20(request, settings["vtt-tab"], makeFailureCB(trackFailure, "roll20", sendResponse))
            sendMessageToFVTT(request, settings["vtt-tab"], makeFailureCB(trackFailure, "fvtt", sendResponse))
            sendMessageToCustomSites(request, null, makeFailureCB(trackFailure, "custom", sendResponse))
        }
        return true
    } else if (request.action == "waybeyond20-add-effect") {
        sendMessageToBeyond(request);
        sendResponse({ "success": true, "request": request });
    } else if (request.action == "waybeyond20-token-binding") {
        if (settings['vtt-tab']?.vtt === 'talespire') {sendResponse({success:true}); return;}
        sendMessageToBeyond(request);
        sendResponse({ "success": true, "request": request });
    } else if (request.action == "waybeyond20-turn-update") {
        if (settings['vtt-tab']?.vtt === 'talespire') {sendResponse({success:true}); return;}
        sendMessageToBeyond(request);
        sendResponse({ "success": true, "request": request });
    } else if (request.action == "waybeyond20-debug-log") {
        if (request.entry?.scope === 'sheet-load' && sender.tab?.id !== undefined) {
            // Inspect only the tab that sent this finite diagnostic; no new permissions.
            // A completed DOM alone does not establish that Chrome stopped loading.
            let done = false;
            const finish = loading => {
                if (done) return;
                done = true; clearTimeout(timer);
                wayBeyond20QueueDebugLogEntry({...request.entry, loading}, sender);
                sendResponse({success:true, loading});
            };
            const timer = setTimeout(() => finish({status:'unavailable'}), 500);
            try {
                chrome.tabs.get(sender.tab.id, tab => {
                    if (chrome.runtime.lastError || !tab) { finish({status:'unavailable'}); return; }
                    let pendingScheme = null;
                    try { if (tab.pendingUrl) pendingScheme = new URL(tab.pendingUrl).protocol; } catch (_) {}
                    finish({status:tab.status || 'unknown', pendingScheme});
                });
            } catch (_) { finish({status:'unavailable'}); }
            return true;
        }
        wayBeyond20QueueDebugLogEntry(request.entry || {}, sender);
        sendResponse({ "success": true });
    } else if (request.action == "waybeyond20-damage-result") {
        wayBeyond20BackgroundDebug("Forwarding resolved damage to D&D Beyond", {
            character: request.character ? { id: request.character.id, name: request.character.name } : null,
            totalDamage: request.totalDamage,
            source: request.source
        });
        sendMessageToBeyond(request);
        sendResponse({ "success": true, "request": request });
    } else if (request.action == "settings") {
        if (request.type == "general")
            updateSettings(request.settings)
        sendMessageToRoll20(request);
        sendMessageToBeyond(request);
        sendMessageToFVTT(request);
        sendMessageToCustomSites(request);
    } else if (request.action == "activate-icon") {
        // popup doesn't have sender.tab so we grab it from the request.
        const tab = request.tab || sender.tab;
        action.setPopup({ "tabId": tab.id, "popup": "popup.html" });
        if (isFVTT(tab.title)) {
            injectFVTTScripts([tab]);
            addFVTTTab(tab)
        } else if ((isCustomDomainUrl(tab) || isSupportedVTT(tab)) && !isCustomTabAdded(tab)) {
            injectGenericSiteScripts([tab]);
        }
        if (isRoll20(tab.title) && !isRoll20TabAdded(tab)) {
            addRoll20Tab(tab);
        }
        // maybe open the changelog
        if (!openedChangelog) {
            // Mark it true regardless of whether we opened it, so we don't check every time and avoid race conditions on setting save
            openedChangelog = true;
            const version = manifest.version;
            if (settings["show-changelog"] && settings["last-version"] != version) {
                mergeSettings({ "last-version": version })
                chrome.tabs.create({ "url": CHANGELOG_URL })
            }

        }
    } else if (request.action == "register-fvtt-tab") {
        addFVTTTab(sender.tab);
    } else if (request.action == "register-generic-tab") {
        action.setPopup({ "tabId": sender.tab.id, "popup": "popup.html" });
        addCustomTab(sender.tab);
    } else if (request.action == "discord-permissions-updated") {
        console.log("Discord permissions updated : ", request.permissions);
        if (request.permissions) {
            listenToDiscordFrames();
        } else {
            // The previous listener, if there was one, would have been removed automatically at this point
            webNavigationReady = false;
        }

    } else if (request.action == "reload-me") {
        chrome.tabs.reload(sender.tab.id)
    } else if (request.action == "load-alertify") {
        insertCSSs([sender.tab], ["libs/css/alertify.css", "libs/css/alertify-themes/default.css", "libs/css/alertify-themes/beyond20.css"]);
        executeScripts([sender.tab], ["libs/alertify.min.js"], sendResponse);
        return true
    } else if (request.action == "get-current-tab") {
        sendResponse(sender.tab)
    } else if (request.action == "forward") {
        chrome.tabs.sendMessage(request.tab, request.message, {frameId: 0}, sendResponse)
        return true
    }
    // Due to MV3 issues and a bug in chrome 99-101, apparently we need to always call sendResponse 
    // to prevent the socket from being closed
    sendResponse();
    return false
}

function injectFVTTScripts(tabs) {
    insertCSSs(tabs, ["libs/css/alertify.css", "libs/css/alertify-themes/default.css", "libs/css/alertify-themes/beyond20.css", "dist/beyond20.css"])
    executeScripts(tabs, ["libs/alertify.min.js", "libs/jquery-3.4.1.min.js", "dist/fvtt.js"])
}
function injectGenericSiteScripts(tabs) {
    insertCSSs(tabs, ["libs/css/alertify.css", "libs/css/alertify-themes/default.css", "libs/css/alertify-themes/beyond20.css", "dist/beyond20.css"])
    executeScripts(tabs, ["libs/alertify.min.js", "libs/jquery-3.4.1.min.js", "dist/generic_site.js"])
}
function injectRoll20Scripts(tabs, frame_id = 0) {
    insertCSSs(tabs, ["libs/css/alertify.css", "libs/css/alertify-themes/default.css", "libs/css/alertify-themes/beyond20.css", "dist/beyond20.css"], undefined, frame_id)
    executeScripts(tabs, ["libs/alertify.min.js", "libs/jquery-3.4.1.min.js", "dist/roll20.js"], undefined, frame_id)
}
function insertCSSs(tabs, css_files, callback, frame_id = 0) {
    for (let tab of tabs) {
        // Use new Manifest V3 scripting API 
        if (manifest.manifest_version >= 3) {
            chrome.scripting.insertCSS( {
                target: { tabId: tab.id, frameIds: [frame_id] },
                files: css_files
            }, callback);
        } else {
            for (let file of css_files) {
                chrome.tabs.insertCSS(tab.id, { "file": file, frameId: frame_id }, callback)
            }
        }
    }
}

async function executeScripts(tabs, js_files, callback, frame_id = 0) {
    const recovery=await new Promise(resolve=>chrome.storage.local.get({'wb20-beyond20-mode':false},resolve));
    if (recovery['wb20-beyond20-mode']) js_files=js_files.map(file=>
        /^dist\/(?:roll20|roll20_script|fvtt|fvtt_script|fvtt_test|generic_site)\.js$/.test(file) ? file.replace('dist/','dist/compat_') : file);
    for (let tab of tabs) {
        // Use new Manifest V3 scripting API 
        if (manifest.manifest_version >= 3) {
            console.log("Target is : ", tab);
            chrome.scripting.executeScript( {
                target: { tabId: tab.id, frameIds: [frame_id] },
                files: js_files
            }, callback);
        } else {
            for (let file of js_files) {
                chrome.tabs.executeScript(tab.id, { file: file, frameId: frame_id }, callback)
            }
        }
    }
}

function onTabsUpdated(id, changes, tab) {
    if (changes.title && isFVTTTabAdded(tab) && isFVTT(tab.title)) addFVTTTab(tab);
    if (isFVTTTabAdded(tab) &&
        ((changes.url && !urlMatches(changes.url, FVTT_URL)) ||
         (changes["status"] == "loading"))) {
        // Delay tab removal because the 'loading' could be caused by the injection of the page script itself
        // 100ms should be fast enough for page script but not so slow that a reload on a localhost would
        // fail to remove/add the tab, as it should
        tabRemovalTimers[id] = setTimeout(() => removeFVTTTab(id), 100);
    } else if (isCustomTabAdded(tab) &&
        ((changes.url && !isCustomDomainUrl(tab) && !isSupportedVTT(tab)) ||
         (changes["status"] == "loading"))) {
        // Delay tab removal because the 'loading' could be caused by the injection of the page script itself
        // 100ms should be fast enough for page script but not so slow that a reload on a localhost would
        // fail to remove/add the tab, as it should
        tabRemovalTimers[id] = setTimeout(() => removeCustomTab(id), 100);
    } else if (isRoll20TabAdded(tab) &&
        ((changes.url && !urlMatches(changes.url, ROLL20_URL) && !urlMatches(changes.url, ROLL20_URL_NO_SLASH)) ||
         (changes["status"] == "loading"))) {
        tabRemovalTimers[id] = setTimeout(() => removeRoll20Tab(id), 100);
    }
    /* Load WayBeyond20 on custom urls that have been added to our permissions */
    if (changes["status"] === "complete" &&
        (isFVTT(tab.title) || isRoll20(tab.title) || isCustomDomainUrl(tab) || isSupportedVTT(tab))) {
        // Cancel tab removal if we go back to complete within 100ms as the page script loads
        if (tabRemovalTimers[id]) {
            clearTimeout(tabRemovalTimers[id]);
        }
        if (!isFVTTTabAdded(tab) && !isCustomTabAdded(tab)) {
            // We cannot use the url or its origin, because Firefox, in its great magnificent wisdom
            // decided that ports in the origin would break the whole permissions system
            const origin = `${new URL(tab.url).protocol}//${new URL(tab.url).hostname}/*`;
            const hasPermission = currentPermissions.origins.some(pattern => urlMatches(origin, pattern));
            if (hasPermission) {
                if (isFVTT(tab.title)) {
                    executeScripts([tab], ["dist/fvtt_test.js"]);
                } else if (isRoll20(tab.title) && !urlMatches(tab.url, ROLL20_URL)) {
                    console.log("[Roll20] Auto-injecting into no-slash tab:", tab.id, tab.url);
                    injectRoll20Scripts([tab]);
                    addRoll20Tab(tab);
                } else if (!isRoll20(tab.title)) {
                    injectGenericSiteScripts([tab])
                }
            }
        }
    }

}

function onTabRemoved(id, info) {
    removeFVTTTab(id)
    removeCustomTab(id)
    removeRoll20Tab(id)
}

function onPermissionsUpdated() {
    const chromeOrBrowser = getBrowser() === "Firefox" ? browser : chrome;
    chromeOrBrowser.permissions.getAll((permissions) => {
        currentPermissions = permissions;
    });
}

function browserActionClicked(tab) {
    console.log("Browser action clicked for tab : ", tab.id, tab.url);
    executeScripts([tab], ["dist/fvtt_test.js"])
}

updateSettings()
chrome.runtime.onMessage.addListener(onMessage)
chrome.tabs.onUpdated.addListener(onTabsUpdated)
chrome.tabs.onRemoved.addListener(onTabRemoved)
const chromeOrBrowser = getBrowser() === "Firefox" ? browser : chrome;
chromeOrBrowser.permissions.onAdded.addListener(onPermissionsUpdated)
chromeOrBrowser.permissions.onRemoved.addListener(onPermissionsUpdated)

chromeOrBrowser.permissions.getAll((permissions) => {
    currentPermissions = permissions;
    for (const pattern of currentPermissions.origins) {
        // Inject script in existing tabs
        chrome.tabs.query({ "url": pattern }, (tabs) => {
            // Skip if it's not a FVTT or custom tab
            const fvttTabs = tabs.filter(tab => isFVTT(tab.title));
            const customTabs = tabs.filter(tab => isCustomDomainUrl(tab) || isSupportedVTT(tab));
            // No-slash Roll20 tabs (issue #1381): the manifest content_scripts
            // pattern is *://app.roll20.net/editor/* so a tab at /editor with
            // no trailing slash is not auto-injected. On Firefox the origin
            // *://app.roll20.net/* permission is normally already granted, so
            // inject explicitly here. Without this, users who had Roll20 open
            // at /editor before the extension started (install, browser
            // restart, MV3 service-worker wake) end up with an unwired tab
            // and every roll falls through to "No VTT found". PR #1386 handles
            // the on-navigation case via onTabsUpdated; this covers the
            // startup-scan case it left open.
            const roll20NoSlashTabs = tabs.filter(tab =>
                isRoll20(tab.title) && !urlMatches(tab.url, ROLL20_URL)
            );
            console.log("Permissions : ", pattern, fvttTabs, customTabs, roll20NoSlashTabs);
            executeScripts(fvttTabs, ["dist/fvtt_test.js"]);
            injectGenericSiteScripts(customTabs);
            if (roll20NoSlashTabs.length > 0) {
                injectRoll20Scripts(roll20NoSlashTabs);
                for (const tab of roll20NoSlashTabs) addRoll20Tab(tab);
            }
        })
    }
});

function listenToDiscordFrames() {
    if (!chrome.webNavigation || webNavigationReady) return;
    console.log("Listening to webNavigation events");
    chrome.webNavigation.onCompleted.addListener((details) => {
        if (urlMatches(details.url, ROLL20_DISCORD_ACTIVITY_DOMAIN) &&
            ((details.documentLifecycle === "active" && details.frameType == "sub_frame") ||
              details.documentLifecycle === undefined /* Firefox... */)) {
            console.log("Injecting roll20 content script into frame : ", details.frameId);
            injectRoll20Scripts([{id: details.tabId}], details.frameId);
        }
    });
    webNavigationReady = true;
}
listenToDiscordFrames();

if (getBrowser() == "Chrome") {
    // Re-inject scripts when reloading the extension, on Chrome
    for (let script of manifest.content_scripts) {
        cb = (js_files, css_files) => {
            return (tabs) => {
                if (js_files) {
                    executeScripts(tabs, js_files)
                }
                if (css_files) {
                    insertCSSs(tabs, css_files)
                }
            }
        }
        chrome.tabs.query({ "url": script.matches }, cb(script.js, script.css))
    }
}
action.onClicked.addListener(browserActionClicked);

// With MV3, background script is actually a service worker, which would get terminated after 30 seconds if it doesn't
// call an API, so we call a local storage API every 20 seconds to keep it alive
if (manifest.manifest_version >= 3) {
    setInterval(() => {
        chrome.storage.local.get({"ignore": "me"}, () => {});
    }, 20000);
}


