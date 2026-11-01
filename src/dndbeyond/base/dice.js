// One nonmodal, temporary local result panel. It never owns roll execution.
function wb20CreateLocalRollPanel() {
    const host = document.createElement('details');
    host.id = 'wb20-local-rolls'; host.hidden = true;
    host.setAttribute('aria-label', 'Local roll results');
    const label = document.createElement('summary');
    const title = document.createElement('span'); title.textContent = 'Local rolls';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close';
    close.setAttribute('aria-label', 'Dismiss local rolls');
    const records = document.createElement('div'); records.className = 'wb20-local-roll-records';
    label.append(title, close); host.append(label, records);
    let timer = null, fadeTimer = null;
    const clear = () => { clearTimeout(timer); clearTimeout(fadeTimer); timer = fadeTimer = null; };
    const outside = event => { if (!host.contains(event.target)) dismiss(); };
    const escape = event => { if (event.key === 'Escape') dismiss(); };
    function dismiss() {
        clear(); host.hidden = true; host.open = false;
        host.classList.remove('wb20-local-rolls-fading');
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', escape);
    }
    function arm() {
        clear(); host.classList.remove('wb20-local-rolls-fading');
        const raw = dndbeyondDiceRoller._settings?.['local-roll-display-duration'];
        const seconds = raw == null || raw === '' ? 5 : Number(raw);
        const duration = Number.isFinite(seconds) && seconds >= 0 && seconds <= 120 ? seconds : 5;
        if (!duration || host.hidden || host.matches(':hover') || host.contains(document.activeElement)) return;
        timer = setTimeout(() => {
            host.classList.add('wb20-local-rolls-fading');
            fadeTimer = setTimeout(dismiss, 180);
        }, duration * 1000);
    }
    host.wb20Present = () => {
        host.hidden = false; host.open = true;
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('keydown', escape);
        arm();
    };
    const pause = () => { clear(); host.classList.remove('wb20-local-rolls-fading'); };
    host.wb20Dismiss = dismiss;
    close.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); dismiss(); });
    host.addEventListener('pointerenter', pause);
    host.addEventListener('pointerleave', arm);
    host.addEventListener('focusin', pause);
    host.addEventListener('focusout', event => { if (!host.contains(event.relatedTarget)) arm(); });
    window.addEventListener('pagehide', dismiss, {once:true});
    document.body.append(host);
    if (typeof wayBeyond20ApplySheetTheme === 'function') wayBeyond20ApplySheetTheme(host, {panel:true});
    return host;
}

class DNDBDisplayer {
    constructor() {
        this._error = null;
    }

    postHTML(request, title, html, character, whisper, play_sound, source, attributes, description, attack_rolls, roll_info, damage_rolls, total_damages, open, presentation = {}) {
        let content = "<div class='beyond20-dice-roller'>";
        if (this._error) {
            content += "<div class='beyond20-roller-error'>" +
                "<span class='beyond20-tooltip'>Virtual Table Top Not Found" +
                "<span class='beyond20-tooltip-content'>" + this._error + "</span>" +
                "</span>" +
                "</div>";
        }
        content += "<div class='beyond20-dice-roller-content'>" + html + "</div>" +
            "</div>";
        // Avoid having duplicate results displayed
        if (!presentation.automatic) DigitalDiceManager.clearResults();
        let root,receipt=null;
        if(presentation.automatic){
            // Retain the completed result locally without opening an information
            // dialog over gameplay. Every result remains accessible through this
            // temporary, nonmodal panel; a tab match is not a render acknowledgment.
            let host=document.getElementById('wb20-local-rolls');
            if (!host) host = wb20CreateLocalRollPanel();
            const records=host.querySelector('.wb20-local-roll-records');
            const record=document.createElement('details');record.className='wb20-local-roll-card';record.hidden=true;
            const summary=document.createElement('summary');summary.textContent=title || 'Roll result';
            const body=document.createElement('div');body.innerHTML=content;record.append(summary,body);records.prepend(record);root=body.firstElementChild;
            while(records.children.length>20)records.lastElementChild.remove();
            // Only the outer panel has a frame; result cards inherit its theme.
            receipt={show:()=>{
                // A burst may evict this pending record from the bounded history.
                // Its completed result is still held by this closure until delivery settles.
                if(host.isConnected){if(!record.isConnected)records.prepend(record);
                    for (const previous of records.children) previous.open = false;
                    record.hidden=false;record.open=true;host.wb20Present();
                    while(records.children.length>20)records.lastElementChild.remove();}
            },discard:()=>{record.remove();if(!Array.from(records.children).some(n=>!n.hidden))host.wb20Dismiss();}};
        } else {
            const dlg=alertify.Beyond20Roll(title,content);
            dlg.set('onclose',()=>{dlg.set('onclose',null);dlg.destroy();});
            root=dlg.elements.content.firstElementChild;
            const dialog=root.closest?.('.ajs-dialog');
            if(dialog){dialog.classList.add('wb20-result-dialog');if(typeof wayBeyond20ApplySheetTheme==='function')wayBeyond20ApplySheetTheme(dialog, {panel:true});}
        }
        const element = $(root);
        const icon = chrome.runtime.getURL("images/icons/badges/custom20.png");
        element.find(".ct-beyond20-custom-icon").attr('src', icon);
        element.find(".ct-beyond20-custom-roll").on('click', (event) => {
            const roll = $(event.currentTarget).find(".beyond20-roll-formula").text();
            dndbeyondDiceRoller.rollDice(request, title, roll);
        });
        element.find(".beyond20-button-roll-damages").on('click', (event) => {
            request.rollAttack = false;
            request.rollDamage = true;
            request.rollCritical = attack_rolls.some(r => !r.discarded && r["critical-success"])
            dndbeyondDiceRoller.handleRollRequest(request);
        });
        return receipt;
    }

    async sendMessageToDOM(request, title, html, character, whisper, play_sound, source, attributes, description, attack_rolls, roll_info, damage_rolls, total_damages, open) {
        const req = {
            action: "rendered-roll",
            request,
            title,
            html,
            character,
            whisper,
            play_sound,
            source,
            attributes,
            description,
            attack_rolls,
            roll_info,
            damage_rolls,
            total_damages,
            open
        }
        sendRollRequestToDOM(req);
        return req;
    }
    async sendMessage(request, title, html, character, whisper, play_sound, source, attributes, description, attack_rolls, roll_info, damage_rolls, total_damages, open) {
        const args=[request,title,html,character,whisper,play_sound,source,attributes,description,
            attack_rolls,roll_info,damage_rolls,total_damages,open];
        const delivery=typeof wayBeyond20RollDeliveries !== "undefined" ? wayBeyond20RollDeliveries.get(request) : null;
        if (delivery) {wayBeyond20RollDeliveries.delete(request);delivery.invoked=true;}
        let receipt;
        try {
            this.setError(null);
            receipt=this.postHTML(...args,{automatic:true});
        } catch (error) {
            const shown=typeof wayBeyond20LocalResultFallback === "function" && wayBeyond20LocalResultFallback(title,html);
            if (!shown) {
                if (delivery) delivery.resolve({ok:false,error:String(error)});
                return;
            }
        }
        // Commit the completed local result before touching any optional bridge.
        if (delivery) delivery.resolve({ok:true,local:true});
        // Internal completion is independent of where the result is displayed.
        // Respect the existing privacy/digital-dice suppression settings on fallback.
        const displaySettings=dndbeyondDiceRoller._settings || {};
        const suppressLocal=(whisper === WhisperType.YES && displaySettings['vtt-tab']?.vtt === 'dndbeyond' &&
            displaySettings['hide-results-on-whisper-to-discord']) ||
            (displaySettings['use-digital-dice'] && displaySettings['hide-results-with-digital-dice']);
        const showLocal=()=>{if(!suppressLocal)receipt?.show?.();else receipt?.discard?.();};
        if (request["waybeyond20-local-only"]) {showLocal();return;}
        try {
            const req=await this.sendMessageToDOM(...args);
            const outcome=await wayBeyond20SendRuntimeMessage(req);
            // Do not call handleRollError here: it can reroll a raw request or
            // show the same rendered result twice. A failed send is just a send.
            if (!outcome.ok || outcome.response?.error || outcome.response?.delivered!==true) {
                showLocal();
            } else {
                receipt?.discard?.();
            }
        } catch (error) {
            showLocal();
        }
    }
    displayError(message) {
        alertify.error(message);
    }

    setError(error) {
        this._error = error;
    }
}

class DNDBRoller {
    roll(formula, data) {
        return new DNDBRoll(formula, data);
    }

    async applyDamageBasedTempHP(totalDamage, request={}) {
        const current = parseInt(request?.character?.["temp-hp"] || 0);
        const desired = Math.max(0, parseInt(totalDamage || 0));
        if (!Number.isFinite(desired) || desired <= current) return false;
        if (typeof wayBeyond20SetTemporaryHitPoints !== "function") {
            console.warn("WayBeyond20: Temporary HP setter is unavailable on this page.");
            return false;
        }
        return wayBeyond20SetTemporaryHitPoints(desired);
    }

    async resolveRolls(name, rolls, request={}) {
        
        if (dndbeyondDiceRoller._settings['use-digital-dice'] && DigitalDiceManager.isEnabled() &&
            (request["waybeyond20-portent-value"] === undefined || rolls.some(roll => roll.dice.length > 0))) {
            const digital = new DigitalDice(name, rolls, {whisper: request.whisper === WhisperType.YES});
            try {
                await digital.roll();
            } catch (err) {
                console.warn("DNDBRoller: digital dice failed, falling back to native roll", err);
                await Promise.all(rolls.map(roll => roll.roll()))
            }
        } else {
            await Promise.all(rolls.map(roll => roll.roll()))
        }
        
        if (typeof wb20RuleRerollD20 === "function") {
            try { await wb20RuleRerollD20(rolls,request,this); }
            catch (error) { console.warn("WayBeyond20: optional feature reroll did not finish; the original result remains available",error); }
        }
        const rollInfo = {
            name,
            rolls: rolls.map(r => r.toJSON()),
            request
        }
        if (dndbeyondDiceRoller._settings["roll-to-game-log"]) {
            try {sendCustomEvent("MBFulfilledRoll", [rollInfo]);}
            catch (_) {console.warn("WayBeyond20: optional Game Log delivery unavailable; the roll remains local.");}
        }
    }
}

class DNDBPrompter {
    async prompt(title, html, ok_label = "OK", cancel_label = "Cancel") {
        return wayBeyond20Prompt(title, html, ok_label, cancel_label);
    }
}

const dndbeyondDiceRoller = new Beyond20RollRenderer(new DNDBRoller(), new DNDBPrompter(), new DNDBDisplayer());
dndbeyondDiceRoller.setBaseURL(chrome.runtime.getURL(""));
dndbeyondDiceRoller.setSettings(getDefaultSettings());
dndbeyondDiceRoller.handleRollError = (request, error) => {
    dndbeyondDiceRoller._displayer.setError(error);
    if (request.action === "rendered-roll") {
        // If it was a custom digital dice roll, then don't show it would be redundant
        if (request.request.type === "digital-dice") return;
        
        const isWhispering = request.whisper === WhisperType.YES;
        const isSendingResultToDiscordOnly = settings["vtt-tab"] && settings["vtt-tab"].vtt === "dndbeyond";
        const shouldHideResultsOnWhispersToDiscord = settings["hide-results-on-whisper-to-discord"];
        const useDD = settings["use-digital-dice"];
        const shouldHideResultswithDD = settings["hide-results-with-digital-dice"];

        if (isWhispering && isSendingResultToDiscordOnly && shouldHideResultsOnWhispersToDiscord) {
            // If we are whispering to Discord and the user has set to hide results, then don't show it
            // and clear the digital dice results so the user doesn't see the whispered results
            DigitalDiceManager.clearResults();
            return
        }
        if (useDD && shouldHideResultswithDD) {
            // If we are using digital dice and the user has set to hide results, then don't show it
            return;
        }

        return dndbeyondDiceRoller._displayer.postHTML(request.request, request.title,
            request.html, request.character, request.whisper,
            request.play_sound, request.source, request.attributes, 
            request.description, request.attack_rolls, request.roll_info, 
            request.damage_rolls, request.total_damages, request.open);
    }
    request['original-whisper'] = request.whisper;
    // Local fallback retains the chosen audience; missing delivery is never
    // permission to make a private Discord/Game Log roll public.
    delete request.sendMessage;
    return dndbeyondDiceRoller.handleRollRequest(request);
}
