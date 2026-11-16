// The baseline has no WB20 rules/UI/automation. Only delivery is hardened here.
if (typeof Character !== "undefined") {
    const wb20BaselineCharacterDict = Character.prototype.getDict;
    Character.prototype.getDict = function () {
        const result = wb20BaselineCharacterDict.call(this);
        delete result.settings["waybeyond20-turn-state"];
        delete result.settings["waybeyond20-foundry-turn-state"];
        delete result.settings["waybeyond20-talespire-turn-states"];
        return result;
    };
}
const wb20BaselineDiscordChannel = getDiscordChannel;
getDiscordChannel = function(...args) {
    try {
        const channel=wb20BaselineDiscordChannel(...args);
        if (typeof channel==='string') return {secret:channel,active:true};
        return channel && typeof channel.secret==='string' ? channel : null;
    }
    catch (_) {return null;}
};
const wb20BaselineCustomEvent = sendCustomEvent;
sendCustomEvent = function(name,...args) {
    if (name !== 'MBFulfilledRoll') return wb20BaselineCustomEvent(name,...args);
    try {return wb20BaselineCustomEvent(name,...args);}
    catch (_) {console.warn('Beyond20 mode: optional Game Log delivery unavailable.');}
};
DNDBDisplayer.prototype.sendMessage = async function(...args) {
    this.setError(null);
    try {this.postHTML(...args);}
    catch (_) {if (!wayBeyond20LocalResultFallback(args[1],args[2])) return;}
    // Never wait for a VTT in the baseline escape path.
    try {
        const req=await this.sendMessageToDOM(...args);
        chrome.runtime.sendMessage(req,()=>void chrome.runtime.lastError);
    } catch (error) { console.warn('Beyond20 mode: optional delivery unavailable.',error); }
};
