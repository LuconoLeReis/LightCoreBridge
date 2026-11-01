function sendMessageToTab(tab_id, message, callback) {
    if (chrome.tabs) {
        chrome.tabs.sendMessage(tab_id, message, {frameId: 0}, callback);
    } else {
        chrome.runtime.sendMessage({ "action": "forward", "tab": tab_id, "message": message }, callback);
    }
}

var character = null;
var settings = null;



function gotSettings(stored_settings) {
    settings = stored_settings;
    $("ul").removeClass("disabled");
    wayBeyond20OrganizeSettings();
}

function createOptionList() {
    const options = [];
    for (let option in options_list) {
        const child = createHTMLOption(option, false, options_list, {advanced: !!options_list[option].advanced});
        if (child) {
            options.push(child);
        }
    }
    $("main").prepend(E.ul({ class: "list-group beyond20-options" }, ...options));
    $(".beyond20-options").append(
        E.li({ class: "list-group-item beyond20-option" },
            E.div({ class: "list-content", style: "padding-right: 0px;"},
                E.span({style: "display: flex;"},
                    E.a({ id: "openOptions", href: '#', style: "flex-grow: 1;" },
                        E.h4({}, "More Options")
                    )
                )
            )
        )
    );
    const img = $("#donate").find("img");
    img.attr({
        "src": img.attr("src").replace("donate.png", "donate32.png"),
        "width": 32,
        "height": 32
    });
    $("#openOptions").on('click', (ev) => {
        ev.preventDefault();
        // Continue in this settings tab; never send an open-options command to the sheet.
        if (new URLSearchParams(location.search).has('sourceTab'))
            window.location.href = chrome.runtime.getURL('options.html') + window.location.hash;
        else chrome.runtime.openOptionsPage();
    });

}

function save_settings() {
    saveSettings((settings) => {
        chrome.runtime.sendMessage({ "action": "settings", "type": "general", "settings": settings });
    });
    if (character !== null) {
        saveSettings((settings) => {
            chrome.runtime.sendMessage({ "action": "settings", "type": "character", "id": character.id, "settings": settings })
        }, "character-" + character.id, character_settings);
    }
}

function setupHTML() {
    createOptionList();
    $('.beyond20-option-input').change(save_settings);
    $(".beyond20-options").on("markaChanged", save_settings);
    $(document).on('click', 'a', function (ev) {
        const href = this.getAttribute('href');
        if (href.length > 0 && href != "#") {
            window.open(this.href);
        }
        return false;
    });
    $("ul").addClass("disabled");
}

function populateCharacter(response) {
    const options = $(".beyond20-options");
    character = response;
    if (response) {
        console.log("Received character: ", response);
        options.append(
            E.li({
                class: "list-group-item beyond20-option",
                id: "character-option",
                style: "text-align: center; padding: 10px 15px;"
            },
                E.h4({ style: "margin: 0px;" }, " == Character Specific Options =="),
                E.p({ style: "margin: 0px;" }, response.name))
        );

        let e = createHTMLOption("custom-roll-dice", false, character_settings);
        e.classList.add("advanced-option");
        options.append(e);
        e = createHTMLOption("custom-damage-dice", false, character_settings);
        e.classList.add("advanced-option");
        options.append(e);
        e = createHTMLOption("custom-ability-modifier", false, character_settings);
        e.classList.add("advanced-option");
        options.append(e);
        e = createHTMLOption("custom-critical-limit", false, character_settings);
        e.classList.add("advanced-option");
        options.append(e);
        // effects
        e = createHTMLOption("effects-exhaustion-2024", false, character_settings);
        e.classList.add("effects-option");
        options.append(e);
        e = createHTMLOption("effects-exhaustion-2014", false, character_settings);
        e.classList.add("effects-option");
        options.append(e);
        e = createHTMLOption("effects-bless", false, character_settings);
        e.classList.add("effects-option");
        options.append(e);
        e = createHTMLOption("effects-bane", false, character_settings);
        e.classList.add("effects-option");
        options.append(e);
        e = createHTMLOption("effects-enlarge", false, character_settings);
        e.classList.add("effects-option");
        options.append(e);
        e = createHTMLOption("effects-reduce", false, character_settings);
        e.classList.add("effects-option");
        options.append(e);
        $("#openEffects").show();

        e = createHTMLOption("versatile-choice", false, character_settings);
        options.append(e);

        e = createHTMLOption("toll-choice", false, character_settings);
        options.append(e);

        // Helper switches are offered for every character; each helper still
        // checks for the actual feature, spell, or effect before it appears.
        for (const helper of WAYBEYOND20_CHARACTER_HELPER_SETTINGS) {
            e = createHTMLOption(helper, false, character_settings);
            e.classList.add("waybeyond20-helper-option");
            options.append(e);
        }
        if ((response["class-features"] || []).some(feature => /\bPortent\b/.test(feature))) {
            for (const key of ["portent-auto-proceed", "portent-prompts"])
                options.append(createHTMLOption(key, false, character_settings));
        }

        if (response["racial-traits"].includes("Lucky") ||
            response["racial-traits"].includes("Luck")) {
            e = createHTMLOption("halfling-lucky", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Brutal Critical") ||
            response["racial-traits"].includes("Savage Attacks")) {
            e = createHTMLOption("brutal-critical", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Brutal Strike")) {
            e = createHTMLOption("brutal-strike", false, character_settings);
            options.append(e);
        }
        if (Object.keys(response.classes).includes("Rogue")) {
            e = createHTMLOption("rogue-sneak-attack", false, character_settings);
            options.append(e);
        }
        if (Object.keys(response.classes).includes("Rogue") && response["class-features"].includes("Sneak Attack 2024") && response["class-features"].includes("Cunning Strike")) {
            e = createHTMLOption("rogue-cunning-strike", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Jack of All Trades")) {
            e = createHTMLOption("bard-joat", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Remarkable Athlete")) {
            e = createHTMLOption("champion-remarkable-athlete", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Favored Foe")) {
            e = createHTMLOption("ranger-favored-foe", false, character_settings);
            options.append(e);
        }
        if (response["feats"].includes("Sharpshooter")) {
            e = createHTMLOption("sharpshooter", false, character_settings);
            options.append(e);
        }
        if (response["feats"].includes("Great Weapon Master")) {
            e = createHTMLOption("great-weapon-master", false, character_settings);
            options.append(e);
        }
        if (response["feats"].includes("Great Weapon Master 2024")) {
            e = createHTMLOption("great-weapon-master-2024", false, character_settings);
            options.append(e);
        }
        if (response["feats"].includes("Savage Attacker") || response["feats"].includes("Savage Attacker 2024")) {
            options.append(createHTMLOption("savage-attacker-prompt", false, character_settings));
            e = createHTMLOption("savage-attacker", false, character_settings);
            options.append(e);
        }
        console.log("response", response)
        if (response["feats"].includes("Healer 2024")) {
            e = createHTMLOption("healer-rerolls-feat-2024", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Rage")) {
            e = createHTMLOption("barbarian-rage", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Reckless Attack")) {
            e = createHTMLOption("barbarian-reckless", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Divine Fury")) {
            e = createHTMLOption("barbarian-divine-fury", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Crimson Rite")) {
            e = createHTMLOption("bloodhunter-crimson-rite", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Dread Ambusher") || response["class-features"].includes("Dread Ambusher 2024")) {
            e = createHTMLOption("ranger-dread-ambusher", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Planar Warrior")) {
            e = createHTMLOption("ranger-planar-warrior", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Hunter’s Prey: Colossus Slayer")) {
            e = createHTMLOption("ranger-colossus-slayer", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Slayer’s Prey")) {
            e = createHTMLOption("ranger-slayers-prey", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Gathered Swarm")) {
            e = createHTMLOption("ranger-gathered-swarm", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Improved Divine Smite")) {
            e = createHTMLOption("paladin-improved-divine-smite", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Radiant Strikes")) {
            e = createHTMLOption("paladin-radiant-strikes", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Hexblade’s Curse")) {
            e = createHTMLOption("warlock-hexblade-curse", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Assassinate")) {
            e = createHTMLOption("rogue-assassinate", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Assassinate 2024")) {
            e = createHTMLOption("rogue-assassinate-2024", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Giant’s Might")) {
            e = createHTMLOption("fighter-giant-might", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Arcane Firearm")) {
            e = createHTMLOption("artificer-arcane-firearm", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Divine Strike")) {
            e = createHTMLOption("cleric-divine-strike", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Psychic Blades") &&
            Object.keys(response.classes).includes("Bard")) {
            e = createHTMLOption("bard-psychic-blades", false, character_settings);
            options.append(e);
        }
        if (response["racial-traits"].includes("Radiant Soul")) {
            e = createHTMLOption("protector-aasimar-radiant-soul", false, character_settings);
            options.append(e);
        }
        if (response["racial-traits"].includes("Celestial Revelation: Radiant Soul")) {
            e = createHTMLOption("motm-aasimar-radiant-soul", false, character_settings);
            options.append(e);
        }
        if (response["racial-traits"].includes("Surprise Attack")) {
            e = createHTMLOption("motm-bugbear-surprise-attack", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Bladesong")) {
            e = createHTMLOption("wizard-bladesong", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Dreadful Strikes")) {
            e = createHTMLOption("fey-wanderer-dreadful-strikes", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Alchemical Savant")) {
            e = createHTMLOption("artificer-alchemical-savant", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Invincible Conqueror")) {
            e = createHTMLOption("paladin-invincible-conqueror", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Enhanced Bond")) {
            e = createHTMLOption("wildfire-spirit-enhanced-bond", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Channel Divinity: Channel Divinity: Sacred Weapon") || response["class-features"].includes("Sacred Weapon")) {
            e = createHTMLOption("paladin-sacred-weapon", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Blessed Strikes 2024: Divine Strike")) {
            e = createHTMLOption("cleric-blessed-strikes", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Blessed Strikes")) {
            e = createHTMLOption("cleric-blessed-strikes-tasha", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Trance of Order")) {
            e = createHTMLOption("sorcerer-trance-of-order", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Symbiotic Entity")) {
            e = createHTMLOption("druid-symbiotic-entity", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Eldritch Invocations: Lifedrinker")) {
            e = createHTMLOption("eldritch-invocation-lifedrinker", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Arcane Jolt")) {
            e = createHTMLOption("artificer-arcane-jolt", false, character_settings);
            options.append(e);
        }
        if (response["feats"].includes("Charger") || response["feats"].includes("Charger 2024")) {
            e = createHTMLOption("charger-feat", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Genie’s Vessel")) {
            e = createHTMLOption("genies-vessel", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Empowered Evocation")) {
            e = createHTMLOption("empowered-evocation", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Natural Explorer")) {
            e = createHTMLOption("ranger-natural-explorer", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Spiritual Focus")) {
            e = createHTMLOption("bard-spiritual-focus", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Durable Magic")) {
            e = createHTMLOption("wizard-durable-magic", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Grave Touched")) {
            e = createHTMLOption("warlock-grave-touched", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Radiant Soul")) {
            e = createHTMLOption("warlock-the-celestial-radiant-soul", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Diamond Soul")) {
            e = createHTMLOption("monk-diamond-soul", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Circle of Mortality")) {
            e = createHTMLOption("cleric-circle-of-mortality", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Lunar Form: Wild Shape: Improved Lunar Radiance")) {
            e = createHTMLOption("druid-improved-lunar-radiance", false, character_settings);
            options.append(e);
        }
        if (response["class-features"].includes("Druid Subclass: Circle of Mutation") && response["class-features"].includes("Circle Forms")) {
            e = createHTMLOption("druid-circle-of-mutation-circle-forms", false, character_settings);
            options.append(e);
        }
    }
    $('.beyond20-option-input').off('change', save_settings);
    $('.beyond20-option-input').change(save_settings);
    initializeSettings(s => {
        gotSettings(s);

        if (response) {
            e = createHTMLOption("discord-target", false, character_settings);
            e.classList.add("advanced-option");
            $("#character-option").after(e);

            // Load character specific setttings after global settings in case
            // an option (like discord-target) needs the global variable `settings`
            // to be pre-populated
            // Helper switches default on; fill them if the sheet has not loaded
            // its stored settings yet so a later save cannot write them off.
            const characterSettings = Object.assign({}, response.settings);
            for (const helper of WAYBEYOND20_CHARACTER_HELPER_SETTINGS) {
                if (characterSettings[helper] === undefined)
                    characterSettings[helper] = character_settings[helper].default;
            }
            loadSettings(characterSettings, character_settings);
            // When loading settings, the discord target combobox gets replaced in order to be filled,
            // so we need to fetch it again to add the advanced-option class to it
            $("#beyond20-option-discord-target").addClass("advanced-option");
        
        }
        wayBeyond20OrganizeSettings();
    });
}

function addMonsterOptions() {
    // Global monster privacy settings are already present in the shared menu.
    const options = $(".beyond20-options");
    options.append(
        E.li({ class: "list-group-item beyond20-option", style: "text-align: center; padding: 10px;" },
            E.h4({}, " == Stat Block Specific Options ==")
        )
    );

    $('.beyond20-option-input').off('change', save_settings);
    $('.beyond20-option-input').change(save_settings);
    initializeSettings(gotSettings);
}

function addEncounterOptions() {
    const options = $(".beyond20-options");
    // The global control is already rendered once in Sheet and combat.
}

function tabMatches(tab, url) {
    return tab.url.match(url.replace(/\*/g, "[^]*")) != null;
}

function actOnCurrentTab(tab) {
    setCurrentTab(tab);
    if (isRoll20(tab.title) || isFVTT(tab.title)) {
        const vtt = isFVTT(tab.title) ? "Foundry VTT" : "Roll20";
        const options = $(".beyond20-options");
        options.append(
            E.li({ class: "list-group-item beyond20-option", style: "text-align: center; margin: 10px;" },
                E.h4({}, ` == ${vtt} Tab Specific Options ==`)
            )
        );
        // Replace the existing destination with context-aware World/Tab choices.
        $("#beyond20-option-vtt-tab").replaceWith(options_list["vtt-tab"].createHTMLElement("vtt-tab", true));
        $('.beyond20-option-input').off('change', save_settings);
        $('.beyond20-option-input').change(save_settings);
        initializeSettings(gotSettings);
    } else if (urlMatches(tab.url, DNDBEYOND_CHARACTER_URL)) {
        sendMessageToTab(tab.id, { "action": "get-character" }, populateCharacter);
    } else if (urlMatches(tab.url, DNDBEYOND_MONSTER_URL) || urlMatches(tab.url, DNDBEYOND_VEHICLE_URL)) {
        addMonsterOptions();
    } else if (urlMatches(tab.url, DNDBEYOND_COMBAT_URL) || urlMatches(tab.url, DNDBEYOND_ENCOUNTERS_URL) || urlMatches(tab.url, DNDBEYOND_ENCOUNTER_URL)) {
        addEncounterOptions();
        addMonsterOptions();
    } else {
        initializeSettings(gotSettings);
    }
    // Do not check for permissions if it's running from inside the page script
    const chromeOrBrowser = getBrowser() === "Firefox" ? browser : chrome;
    console.log("Checking permissions for ", tab.url, chrome.permissions, chromeOrBrowser.permissions);
    if (!chromeOrBrowser.permissions) return;
    // We cannot use the url or its origin, because Firefox, in its great magnificent wisdom
    // decided that ports in the origin would break the whole permissions system
    const origin = `${new URL(tab.url).protocol}//${new URL(tab.url).hostname}/*`;
    const permissions = urlMatches(origin, DISCORD_URL) ? DISCORD_ACTIVITY_PERMISSION_DETAILS : {origins: [origin]};
    chromeOrBrowser.permissions.contains(permissions).then((hasPermission) => {
        if (!hasPermission) {
            const options = $(".beyond20-options");
            const request = createHTMLOptionEx("default-popup", {
                "title": "No permanent permission for this URL",
                "description": "Click here to give permission to WayBeyond20 to load automatically on this URL.",
                "type": "info"
            });
            options.prepend(request);
            request.addEventListener("click", (ev) => {
                console.log("Clicked, requesting permissions!");
                chromeOrBrowser.permissions.request(permissions).then((response) => {
                    if (response) {
                        console.log("Permission was granted");
                        request.remove();
                        if (urlMatches(origin, DISCORD_URL)) {
                            chrome.runtime.sendMessage({ "action": "discord-permissions-updated", permissions: true });
                        }
                    } else {
                        console.log("Permission was refused");
                    }
                })
            });
        }
    });
}


setupHTML();
// A separate settings tab must inspect the originating sheet, not itself or a
// different sheet the user has since activated. A closed source keeps globals usable.
const sourceTab = new URLSearchParams(location.search).get('sourceTab');
if (chrome.tabs && sourceTab !== null) {
    if (/^\d+$/.test(sourceTab)) {
        chrome.tabs.get(Number(sourceTab), tab => {
            if (chrome.runtime.lastError || !tab) initializeSettings(gotSettings);
            else actOnCurrentTab(tab);
        });
    } else initializeSettings(gotSettings);
} else if (chrome.tabs) {
    chrome.tabs.query({active:true, currentWindow:true}, tabs => {
        if (tabs?.[0]) actOnCurrentTab(tabs[0]);
        else initializeSettings(gotSettings);
    });
} else {
    chrome.runtime.sendMessage({action:'get-current-tab'}, tab => {
        if (chrome.runtime.lastError || !tab) initializeSettings(gotSettings);
        else actOnCurrentTab(tab);
    });
}
