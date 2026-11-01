/*from utils import sendCustomEvent, injectPageScript, alertQuickSettings, alertFullSettings;
from settings import getDefaultSettings, getStoredSettings;
from elementmaker import E;
*/

(() => {
// A worker wake can inject this bundle again in the same isolated world.
// The bundle is scoped; a healthy bridge is reused instead of stacking listeners.
const previousFvttContent = globalThis.__wb20FvttContent;
if (previousFvttContent) {
    try { if (previousFvttContent.active && previousFvttContent.runtime.id === chrome.runtime.id && chrome.runtime.id) return; }
    catch (_) {}
    previousFvttContent.stop();
}
let observer = null;
const contentEvents = [];
const contentState = {active: true, runtime: chrome.runtime, stop: stopFvttContent};
globalThis.__wb20FvttContent = contentState;

function stopFvttContent() {
    contentState.active = false;
    observer?.disconnect();
    for (const event of contentEvents) document.removeEventListener(...event);
    try { contentState.runtime.onMessage.removeListener(handleMessage); } catch (_) {}
}

function fvttContentAvailable() {
    try {
        if (contentState.active && chrome.runtime?.id && chrome.storage?.local) {
            chrome.runtime.getURL("");
            return true;
        }
    } catch (_) {}
    stopFvttContent();
    return false;
}

if (!fvttContentAvailable()) return;
console.log("WayBeyond20: Foundry VTT module loaded.");

var settings = getDefaultSettings();
// Only the opaque continuation ID goes back to the originating sheet; never a second roll.
contentEvents.push(addCustomEventListener("ResumeAttack", continuation => {
    if (!fvttContentAvailable()) return;
    if (!Number.isInteger(continuation?.tab) || typeof continuation?.id !== "string") return;
    chrome.runtime.sendMessage({ action: "forward", tab: continuation.tab,
        message: { action: "waybeyond20-continue-attack", id: continuation.id } });
}));

// The page script cannot reach chrome.runtime. Relay only WayBeyond20's own
// return envelopes, and go quiet once this content script has been orphaned by
// an extension reload (its replacement listens to the same page events).
const WB20_FVTT_RETURN_ACTIONS = ["waybeyond20-turn-update", "waybeyond20-token-binding", "waybeyond20-damage-result"];
let wayBeyond20FvttBridgeAvailable = true;
contentEvents.push(addCustomEventListener("SendMessage", message => {
    if (!message || !WB20_FVTT_RETURN_ACTIONS.includes(message.action) || message.source !== "Foundry") return;
    if (!wayBeyond20FvttBridgeAvailable) return;
    const dead = text => /Extension context invalidated|message channel closed|Receiving end does not exist/.test(text);
    try {
        const runtime = typeof chrome !== "undefined" && chrome.runtime ? chrome.runtime : null;
        if (!runtime || typeof runtime.sendMessage !== "function") { wayBeyond20FvttBridgeAvailable = false; return; }
        runtime.sendMessage(message, () => {
            const err = runtime.lastError;
            if (err && dead(String(err.message || err))) wayBeyond20FvttBridgeAvailable = false;
        });
    } catch (err) {
        if (dead(String(err && err.message ? err.message : err))) wayBeyond20FvttBridgeAvailable = false;
    }
}));

function updateSettings(new_settings = null) {
    if (!fvttContentAvailable()) return;
    if (new_settings) {
        settings = new_settings;
        sendCustomEvent("NewSettings", [settings, chrome.runtime.getURL("")]);
    } else {
        getStoredSettings(updateSettings)
    }
}

function handleMessage(request, sender, sendResponse) {
    if (!fvttContentAvailable()) return;
    console.log("Received message:", request);
    if (request.action == "settings") {
        if (request.type == "general")
            updateSettings(request.settings);
    } else if (request.action == "open-options") {
        alertFullSettings();
    } else if (request.action == "hp-update") {
        if (settings["update-hp"])
            sendCustomEvent("UpdateHP", [request.character.name, request.character.hp, request.character["max-hp"], request.character["temp-hp"]]);
    } else if (request.action == "conditions-update") {
        if (settings["display-conditions"])
            sendCustomEvent("UpdateConditions", [request, request.character.name, request.character.conditions, request.character.exhaustion]);
    } else if (request.action == "effects-update") {
        sendCustomEvent("UpdateEffects", [request, request.character.name, request.effects || [], request.concentration || null]);
    } else if (request.action == "roll") {
        sendCustomEvent("Roll", [request]);
    } else if (request.action == "rendered-roll") {
        const id=crypto.randomUUID();
        let done=false;
        const finish=delivered=>{if(done)return;done=true;clearTimeout(timer);
            document.removeEventListener(...listener);sendResponse({delivered});};
        const listener=addCustomEventListener('DeliveryResult',(reply)=>{
            if(reply?.id === id)finish(reply.delivered === true);
        });
        const timer=setTimeout(()=>finish(false),1500);
        try {sendCustomEvent("RenderedRoll", [{...request,wb20DeliveryId:id}]);}
        catch(_){finish(false);}
        return true;
    }
}

function titleSet(mutations, observer) {
    // Disconnect first, including when this old context has lost extension APIs.
    observer.disconnect();
    if (!fvttContentAvailable()) return;
    updateSettings();
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.runtime.sendMessage({ "action": "register-fvtt-tab" });
    injectSettingsButton();
}

function injectSettingsButton() {
    $(".beyond20-settings").remove();

    const icon = chrome.runtime.getURL("images/icons/badges/normal24.png");
    // pre-v13
    let button = E.div({ class: "beyond20-settings", style: "flex: 0 0 32px;" },
        E.img({ class: "beyond20-settings-logo", src: icon, style: "margin: 0px 5px; border: 0px;" })
    );
    $("#chat-controls").append(button);
    $(button).on('click', (event) => { if (fvttContentAvailable()) alertQuickSettings(); });
    // post-v13
    button = E.button({ class: "beyond20-settings ui-control", style: "flex: 0 0 32px;" },
        E.img({ class: "beyond20-settings-logo", src: icon, style: "margin: 0px 5px; border: 0px;" })
    );
    $("#chat .chat-controls .control-buttons").append(button);
    $(button).on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (fvttContentAvailable()) alertQuickSettings();
    });
}

observer = new window.MutationObserver(titleSet);
observer.observe(document.getElementsByTagName("title")[0], { "childList": true });
sendCustomEvent("disconnect");
injectPageScript(chrome.runtime.getURL("libs/alertify.min.js"), () => {
    if (!fvttContentAvailable()) return;
    initializeAlertify();
    injectPageScript(chrome.runtime.getURL('dist/fvtt_script.js'));
});
})();
