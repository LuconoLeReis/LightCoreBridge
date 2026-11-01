var settings = null;

function createOptionList() {
    $("main").prepend(E.ul({ class: "list-group beyond20-options" }));
    const options = $(".beyond20-options");
    for (const name of ['vtt-tab', 'talespire-url', 'discord-channels']) options.append(createHTMLOption(name, false));
    options.append(createHTMLOptionEx("default-popup", {
        "title": "Global connections",
        "description": "Choose where to send rolls here. Open a character sheet for character options and current effects.",
        "type": "info"
    }));
    options.append(createHTMLOptionEx("donate", options_list["donate"], true));
    options.append(
        E.li({ class: "list-group-item beyond20-option" },
            E.a({ id: "openOptions", class: "list-content", href: '#' },
                E.h4({}, "WayBeyond20 Options")
            )
        )
    );
    const img = $("#donate").find("img");
    img.attr({
        "src": img.attr("src").replace("donate.png", "donate32.png"),
        "width": 32,
        "height": 32
    });
    $("#openOptions").bind('click', (ev) => {
        chrome.runtime.openOptionsPage();
    });
}

function setupHTML() {
    createOptionList();
    initializeMarka();
    loadSettings(settings);
    wayBeyond20OrganizeSettings();
    const save = () => saveSettings(saved => {
        settings = saved;
        chrome.runtime.sendMessage({action: 'settings', type: 'general', settings: saved});
    });
    $('.beyond20-option-input').change(save);
    $('.beyond20-options').on('markaChanged', save);
    $(document).on('click', 'a', function (ev) {
        const href = this.getAttribute('href');
        if (href.length > 0 && href != "#")
            window.open(this.href);
        return false;
    }
    );
}

function actOnCurrentTab(tab) {
    if (isFVTT(tab.title) || isCustomDomainUrl(tab) || isSupportedVTT(tab)) {
        // If FVTT, then inject the actual popup, instead of the default one.;
        chrome.runtime.sendMessage({ "action": "activate-icon", "tab": tab });
        injectPageScript("dist/popup.js");
    } else {
        setupHTML();
    }
}


getStoredSettings((saved_settings) => {
    settings = saved_settings;
    if (chrome.tabs != undefined) {
        chrome.tabs.query({ "active": true, "currentWindow": true }, (tabs) => actOnCurrentTab(tabs[0]));
    } else {
        chrome.runtime.sendMessage({ "action": "get-current-tab" }, actOnCurrentTab);
    }
});
