// A reaction grants one attack, not an Attack action. Keep the selected row,
// character, turn and grant request-local throughout native pane discovery.
let wayBeyond20OpportunityPending = false;

function wayBeyond20DefaultOpportunityEntry(entries) {
    let saved;
    try { saved = JSON.parse(character.getSetting("waybeyond20-opportunity-default", "")); }
    catch (_) { return null; }
    // Names describe the chosen entry, not rules. Ambiguous duplicates require
    // another explicit choice. Live numbers are never cached in the preference.
    const matches = entries.filter(entry => saved?.kind === 'spell'
        ? entry.kind === 'spell' && entry.name === saved.name && entry.spell.source === saved.source && entry.spell.level === saved.level
        : entry.kind !== 'spell' && entry.name === saved?.name && entry.meta === saved?.meta);
    return matches.length === 1 ? matches[0] : null;
}

function wayBeyond20OpportunityEntries(root) {
    return Array.from(root.querySelectorAll(".ct-combat-attack,.ddbc-combat-attack"))
        .filter(row => !row.matches(".wb20-feature-option,.wb20-opportunity-attack,.waybeyond20-bardic-feature-row,[data-wb20-duplicate-weapon]"))
        .map(row => {
            const label = row.querySelector(".ct-combat-attack__label,.ddbc-combat-attack__label");
            const meta = Array.from(row.querySelectorAll(".ct-combat-attack__meta-item,.ddbc-combat-attack__meta-item"))
                .map(el => el.textContent).join(" ");
            const hit = row.querySelector(".ct-combat-attack__tohit,.ddbc-combat-attack__tohit")?.textContent.trim() || "";
            const damage = row.querySelector(".ct-combat-attack__damage,.ddbc-combat-attack__damage")?.textContent.trim() || "";
            const rangeCell = row.querySelector(".ct-combat-attack__range,.ddbc-combat-attack__range");
            const range = (rangeCell?.innerText || rangeCell?.textContent || "").replace(/\s+/g, " ").trim();
            return {row, label, name: label?.textContent.trim() || "", meta, hit, damage, range};
        })
        // Spell attacks and saving-throw actions are not ordinary OA choices.
        // The full pane is validated again before any roll can be sent.
        .filter(entry => entry.label && /\bmelee\b/i.test(entry.meta) &&
            !/\bspell\b/i.test(entry.meta) && /^[+\-\u2212]?\s*\d+/.test(entry.hit));
}

function wayBeyond20OpportunityChoices(root,rules=wayBeyond20LiveFeatureRules()) {
    const entries=wayBeyond20OpportunityEntries(root);
    if(wayBeyond20ReactiveSpellRule(rules) && typeof wb20QuickSession==='function'){
        const descriptions=typeof wb20QuickSettings==='function'?wb20QuickSettings().descriptions || {}:{};
        for(const spell of wb20QuickSession().spells || []){
            if(spell.cost!=='action' || !/^1 Action$/i.test(spell.time || ''))continue;
            // Obvious self/point/area targets cannot be the provoking creature.
            // Full native time/target/range is still checked by the existing
            // reactive-spell confirmation before any resource can be spent.
            const text=descriptions[spell.key] || '';
            if(!wayBeyond20ReactiveSpellTargetAllowed({'Range/Area':spell.range},text))continue;
            entries.push({kind:'spell',spell,name:spell.name,meta:spell.source,hit:spell.hit,damage:spell.effect,range:spell.range});
        }
    }
    return entries;
}

function wayBeyond20ReactiveSpellTargetAllowed(properties,description) {
    const range=properties['Range/Area'] || properties.Range || '';
    const text=String(description || '');
    const point=text.search(/\b(?:point you choose|choose a point|point within range)\b/i);
    const creature=text.search(/\b(?:creature you (?:can )?(?:see|touch)|(?:choose|target|touch) (?:a|one|another) (?:willing )?creature|creature of your choice)\b/i);
    // A later destination point does not turn a creature-targeted teleport
    // into a point-targeted spell. Unknown targeting still needs confirmation.
    const primaryPoint=point>=0 && (creature<0 || point<creature);
    return !(/^Self$/i.test(range.trim()) || /\bSelf\b.*\b(?:cone|cube|cylinder|sphere|line)\b/i.test(range) || primaryPoint);
}

function wayBeyond20SuggestedOpportunityEntry(entries) {
    const score=entry=>{
        const text=String(entry.damage || '').replace(/\s/g,''),dice=text.match(/^(\d*)d(\d+)([+-]\d+)?/i);
        const average=dice?Number(dice[1] || 1)*(Number(dice[2])+1)/2+Number(dice[3] || 0):/^\d+$/.test(text)?Number(text):0;
        return average+(Number(String(entry.hit || '').replace(/[^\d+-]/g,'')) || 0)/100;
    };
    // A no-slot melee suggestion based on displayed base damage/bonus, not a
    // claim about unknown target defenses or a reason to auto-cast a spell.
    return entries.filter(entry=>entry.kind!=='spell').reduce((best,entry)=>!best || score(entry)>score(best)?entry:best,null);
}

function wayBeyond20SaveOpportunityEntry(entry) {
    const saved=entry.kind==='spell'?{kind:'spell',name:entry.name,source:entry.spell.source,level:entry.spell.level}:{name:entry.name,meta:entry.meta};
    const owner=character;
    owner.mergeCharacterSettings({'waybeyond20-opportunity-default':JSON.stringify(saved)},()=>{if(owner===character && typeof wayBeyond20RefreshCombinedActions==='function')wayBeyond20RefreshCombinedActions();});
}

function wayBeyond20AttackContextCurrent(context) {
    return !!context && context.activation.owner === character &&
        context.activation.turnKey === wayBeyond20AttackActivationTurnKey();
}

function wayBeyond20LiveFeatureRules() {
    if (typeof wb20CurrentFeatureRules === "function") return wb20CurrentFeatureRules();
    return Array.from(document.querySelectorAll(".ct-feature-snippet,.ddbc-feature-snippet")).map(node => ({
        name: node.querySelector(".ct-feature-snippet__heading,.ddbc-feature-snippet__heading")?.textContent.trim() || "",
        text: node.textContent.replace(/\s+/g, " ").trim()
    })).filter(entry => entry.name);
}

// Interpret timing words from the character's actual rule, not from the attack
// producer's name. Missing/ambiguous text is a review requirement, not a ban.
function wayBeyond20AttackRiderTiming(text, context, ongoing = false) {
    if (!text) return {allowed: true, reason: "Full rule unavailable: verify timing and prerequisites."};
    const normalized = text.replace(/\s+/g, " ").toLowerCase();
    const clauses = normalized.split(/[.!?;]/).filter(clause =>
        /\b(?:attack|damage|hit|strike)\b/.test(clause) && /\b(?:deal|add|extra|bonus|advantage)\b/.test(clause));
    const restrictions = [];
    if (!context.attackAction && clauses.some(clause =>
        /\battack action\b/.test(clause) && /when|as part|during|using|take/.test(clause)))
        restrictions.push("Requires the Attack action.");
    if (context.isOwnTurn === false && clauses.some(clause =>
        /(?:on|during) (?:each of |any of )?your turns?\b|once (?:on each of|on) your turns?/.test(clause)))
        restrictions.push("Own-turn benefit; this attack is off-turn.");
    if (!ongoing && clauses.some(clause =>
        /(?:use|take|spend|as) (?:a |your |one )?reaction\b/.test(clause) ||
        context.isOwnTurn === false && /(?:use|take|spend|as) (?:a |your |one )?bonus action\b/.test(clause)))
        restrictions.push("Requires a separate Bonus Action or Reaction.");
    // Only a single, unqualified damage benefit can be automatically excluded.
    // Multiple benefits, alternatives and exceptions need the actual rule checked.
    const unambiguous = clauses.length === 1 && !/\b(?:or|unless|except|instead|also)\b/.test(normalized);
    if (restrictions.length) return {
        allowed: !unambiguous,
        reason: restrictions.join(" ") + (unambiguous ? " Omitted from this attack." : " Check which benefit applies.")
    };
    // Even free riders can require a particular ability, weapon, target or
    // remaining once-per-turn use. Present their live text for confirmation.
    return {allowed: true, reason: "Verify trigger, ability/weapon prerequisites and any once-per-turn limit."};
}

function wayBeyond20AttackRiderAllowed(context, name, ongoing = false) {
    if (!context) return true;
    // Do not merge legacy and revised rules merely because the names are similar.
    const normalize = text => String(text).toLowerCase().replace(/['’]/g, "").trim();
    const matches = context.rules.filter(entry => normalize(entry.name) === normalize(name) ||
        normalize(entry.name).endsWith(": " + normalize(name)));
    const text = matches.length === 1 ? matches[0].text : "";
    const timing = wayBeyond20AttackRiderTiming(text, context, ongoing);
    context.review.set(name, {text, ongoing, ...timing});
    return timing.allowed;
}

async function wayBeyond20ConfirmAttackContext(context, rollProperties) {
    if (!context) return true;
    if (!wayBeyond20AttackContextCurrent(context)) return false;
    if (context.review.size) {
        const escape = wayBeyond20EscapeFollowupText;
        const granting = context.activation.resource === "bonusAction" ? "Bonus Action" : "Reaction";
        const html = `<form><p>These enabled modifiers need a rules check for this ${granting} attack. ` +
            "Confirm that each is legal now, including its trigger and any once-per-turn limit. " +
            "An Attack-action benefit does not apply. A new Bonus Action cannot be used off-turn, " +
            `and this attack already uses your ${granting}. Previously active effects may still apply.</p>` +
            Array.from(context.review, ([name, rule]) =>
                `<p><strong>${escape(name)}</strong>${rule.ongoing ? " (already active)" : ""}<br>` +
                `${escape(rule.reason)}<br>` +
                `${escape(rule.text || "Full rule text is not currently available on this sheet.")}</p>`).join("") +
            "<p>Cancel to adjust the enabled modifiers before attacking. No resource has been spent.</p></form>";
        if (!await dndbeyondDiceRoller._prompter.prompt(`${granting} attack: check modifiers`, html, "Confirm remaining modifiers", "Cancel"))
            return false;
    }
    if (!wayBeyond20AttackContextCurrent(context)) return false;
    rollProperties["waybeyond20-attack-activation"] = context.activation;
    rollProperties["waybeyond20-attack-context"] = {
        kind: context.kind, isOwnTurn: context.isOwnTurn, attackAction: false,
        turnKey: context.activation.turnKey
    };
    if (context.kind === "feature") {
        rollProperties["waybeyond20-unarmed-strike"] = true;
        rollProperties["waybeyond20-monk-type-chosen"] = true;
        rollProperties["waybeyond20-monk-free-harm"] = context.freeHarm;
        if (context.featureCost) Object.assign(rollProperties,wb20FeatureCost(context.featureCost));
        if (context.damageType === "Force") {
            if (rollProperties["damage-types"]?.length) rollProperties["damage-types"][0] = "Force";
            if (rollProperties["critical-damage-types"]?.length) rollProperties["critical-damage-types"][0] = "Force";
        }
    }
    return true;
}

function wayBeyond20ReactiveSpellRule(rules) {
    // A rule capability, not a feat-name lookup. Preserve its full trigger for
    // the player: e.g. leaving reach is narrower than all possible OA triggers.
    return rules.find(rule => /opportunity attack/i.test(rule.text) &&
        /cast (?:a |the )?spell/i.test(rule.text) && /instead|rather than/i.test(rule.text) &&
        /(?:one|1) action/i.test(rule.text) && /target only (?:that|the) creature/i.test(rule.text));
}

function wayBeyond20ReactiveSpellTiming(row) {
    const node=row.querySelector('.ct-spells-spell__activation,.ddbc-spells-spell__activation');
    const text=(node?.querySelector('[data-original-title]')?.getAttribute('data-original-title') || node?.textContent || '').trim().toLowerCase().replace(/\s+/g,' ');
    if(/^(?:1|one)\s*(?:a|action)$/.test(text))return true;
    if(/^(?:1|one)\s*(?:ba|bonus action|r|reaction)$/.test(text) || /\b(?:minutes?|mins?|hours?|hrs?|days?|rounds?)\b/.test(text))return false;
    return null; // Unknown markup is rechecked against the full native pane.
}

async function wayBeyond20ChooseReactiveSpell(context, preferred = null) {
    await new Promise(resolve => setTimeout(resolve, 0));
    const previousTab = wayBeyond20ActiveCharacterSheetTab();
    const spellsTab = wayBeyond20CharacterSheetTab("Spells");
    if (!spellsTab || !wayBeyond20AttackContextCurrent(context)) return false;
    try {
        spellsTab.click();
        let entries = [];
        for (let attempt = 0; attempt < 25 && wayBeyond20AttackContextCurrent(context); attempt++) {
            entries = Array.from(document.querySelectorAll(".ct-spells-spell,.ddbc-spells-spell"))
                .map(row => {
                    const identity = wayBeyond20NativeSpellIdentity(row);
                    const button = Array.from(row.querySelectorAll(".ct-spells-spell__action button,.ddbc-spells-spell__action button"))
                        .find(button => /^(cast|use)$/i.test(button.textContent.trim()) && !button.disabled);
                    return {row, identity, button, timing:wayBeyond20ReactiveSpellTiming(row)};
                }).filter(entry => entry.identity && entry.button && entry.timing!==false);
            if (entries.length) break;
            await new Promise(resolve => setTimeout(resolve, 75));
        }
        if (!entries.length) {
            alertify.warning("No available one-Action spells were found for Reactive Spell. Nothing was spent.");
            return false;
        }
        const escape = wayBeyond20EscapeFollowupText;
        let entry;
        if(preferred){
            const matches=entries.filter(candidate=>candidate.identity.name===preferred.name && candidate.identity.source===preferred.source && candidate.identity.level===preferred.level);
            if(matches.length!==1){alertify.warning('That saved spell is not available at its selected level. Choose another opportunity option. Nothing was spent.');return false;}
            entry=matches[0];
        } else {
        const response = await dndbeyondDiceRoller._prompter.prompt("Reactive spell", "<form><p>" +
            escape(context.spellRule.text) + "</p><p>Choose a spell and casting level. Its full casting time " +
            "will be checked before casting. A cantrip or a spell using a slot can qualify. Only the provoking creature may be targeted; this use spends a Reaction.</p>" +
            '<select name="spell">' + entries.map((entry, index) =>
                `<option value="${index}">${escape(entry.identity.name)} | ${escape(entry.identity.source)} | ` +
                `${escape(entry.row.closest(".ct-content-group,.ddbc-content-group")?.querySelector(".ct-content-group__header,.ddbc-content-group__header")?.textContent || "")}${entry.timing===null?' | Casting time unverified':''}</option>`
            ).join("") + '</select></form>', "Choose spell", "Cancel");
        if (!response || !wayBeyond20AttackContextCurrent(context)) return false;
        const value = response.find('[name="spell"]').val();
        entry = /^\d+$/.test(String(value)) ? entries[Number(value)] : null;
        }
        if (!entry || !entry.row.isConnected) return false;
        context.kind = "reactive-spell";
        context.activation.kind = "spell";
        await new Promise(resolve => setTimeout(resolve, 0));
        if (!wayBeyond20AttackContextCurrent(context) || !entry.row.isConnected) return false;
        resetHijackQuickRollState();
        entry.identity.label.click();
        for (let attempt = 0; attempt < 25 && wayBeyond20AttackContextCurrent(context); attempt++) {
            if (wayBeyond20NativeSpellPaneMatches(entry.identity)) {
                const result=await execute("ct-spell-pane", {
                    attack_context: context,
                    force_roll_mode: context.mode,
                    nativeCast: wayBeyond20CommitNativeSpellCast(character, entry.identity, entry.button.textContent.trim().toLowerCase())
                });
                if(result===true && context.activation.owner===character)wayBeyond20SaveOpportunityEntry({kind:'spell',name:entry.identity.name,spell:entry.identity});
                return result;
            }
            await new Promise(resolve => setTimeout(resolve, 75));
        }
        alertify.warning("The selected spell pane did not finish opening. Nothing was spent.");
        return false;
    } finally {
        if (context.activation.owner === character) wayBeyond20RestoreCharacterSheetTab(previousTab);
    }
}

async function wayBeyond20ConfirmReactiveSpell(context, properties, name, description) {
    if (!context) return true;
    if (context.kind !== "reactive-spell" || !wayBeyond20AttackContextCurrent(context)) return false;
    if (!/^(?:1|one)\s+action$/i.test((properties["Casting Time"] || "").trim())) {
        alertify.warning("This replacement requires a spell with a casting time of one Action. Nothing was spent.");
        return false;
    }
    if(!wayBeyond20ReactiveSpellTargetAllowed(properties,description)){
        alertify.warning('Reactive Spell must target the provoking creature; this spell targets yourself or a point/area. Nothing was spent.');return false;
    }
    const escape = wayBeyond20EscapeFollowupText;
    const result = await dndbeyondDiceRoller._prompter.prompt("Confirm reactive spell", "<form><p><strong>" +
        escape(name) + "</strong></p><p>" + escape(description) + "</p><p>Confirm that the actual feat trigger occurred " +
        "and this casting targets only the provoking creature, within the spell's range and restrictions. " +
        "If the spell creates several attacks or missiles, every target must be that same creature. " +
        "Do not select additional targets in any following effect dialog. Check applicable spell-slot-per-turn limits. " +
        "This casting spends one Reaction, not an Action.</p></form>", "Cast at that creature", "Cancel");
    return !!result && wayBeyond20AttackContextCurrent(context);
}

async function wayBeyond20OpenGrantedAttack(entry, context, mode) {
    // A prompt resolves during its confirmation click. Let that click finish
    // bubbling through DDB's outside-click handler before opening a sidebar.
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!entry.row.isConnected || !wayBeyond20AttackContextCurrent(context)) return false;
    resetHijackQuickRollState();
    entry.label.click(); // Open details, never click the attack/roll button here.
    await new Promise(resolve => setTimeout(resolve, 75));
    for (let attempt = 0; attempt < 30; attempt++) {
        // Opening a native sidebar can replace the list row. Its DOM lifetime
        // does not own the pending attack: character/turn plus the matching
        // pane name, melee properties and attack bonus validate the handoff.
        if (!wayBeyond20AttackContextCurrent(context)) return false;
        for (const paneClass of ["b20-item-pane", "b20-action-pane", "ct-custom-action-pane", "b20-custom-action-pane"]) {
            const pane = document.querySelector("." + paneClass);
            if (!pane || pane.querySelector(".ct-sidebar__heading")?.textContent.trim() !== entry.name) continue;
            const properties = propertyListToDict($(pane).find("[role=list] > div"));
            if (!properties["Damage"] || !properties["To Hit"]) continue;
            // Native natural-attack panes omit Attack Type and express melee as
            // Range/Area: 5 ft. Reach. Do not infer it from the feature's name.
            const melee = properties["Attack Type"]
                ? /^(?:melee|unarmed strike)$/i.test(properties["Attack Type"].trim())
                : /\breach\b/i.test(properties["Range/Area"] || properties["Reach"] || "");
            if (!melee || String(properties["To Hit"]).replace(/\s/g, "") !== entry.hit.replace(/\s/g, "")) {
                alertify.warning("This entry is not a melee weapon attack or Unarmed Strike. Nothing was spent.");
                return false;
            }
            return await execute(paneClass, {force_roll_mode: mode, attack_context: context});
        }
        await new Promise(resolve => setTimeout(resolve, 75));
    }
    alertify.warning("The selected attack details did not finish opening. No Reaction was spent.");
    return false;
}

async function wayBeyond20ChooseOpportunityAttack(root, {useDefault = false, mode: shortcutMode = null} = {}) {
    if (wayBeyond20OpportunityPending) return false;
    const owner = character;
    wayBeyond20OpportunityPending = true;
    try {
        const rules = wayBeyond20LiveFeatureRules();
        const entries = wayBeyond20OpportunityChoices(root,rules);
        const spellRule = wayBeyond20ReactiveSpellRule(rules);
        if (!entries.length && !spellRule) {
            alertify.warning("No melee weapon or Unarmed Strike is visible. Show the Actions list and try again.");
            return false;
        }
        const activation = wayBeyond20CreateAttackActivation({resource: "reaction", attacks: 1});
        const state = wayBeyond20GetTurnTrackerState();
        const knownOwnTurn = state.combatSource === "Roll20" ? state.currentRoll20Turn?.isThisCharactersTurn : undefined;
        const escape = wayBeyond20EscapeFollowupText;
        const savedEntry = wayBeyond20DefaultOpportunityEntry(entries);
        const suggestedEntry = savedEntry || wayBeyond20SuggestedOpportunityEntry(entries);
        if (useDefault && savedEntry) {
            let ownTurn = knownOwnTurn;
            // A manual tracker does not know whose turn it is. Ask rather than
            // silently treating all reactions as off-turn (they can be either).
            if (typeof ownTurn !== "boolean") {
                const response = await dndbeyondDiceRoller._prompter.prompt("Opportunity Attack: whose turn?",
                    '<form class="wb20-opportunity-prompt"><p class="wb20-opportunity-summary"><strong>' +
                    escape(savedEntry.name) + '</strong><br>1 Reaction · 1 attack</p>' +
                    '<label class="wb20-opportunity-field">Whose turn?<select name="ownTurn" aria-label="Whose turn?"><option value="no">Another creature</option>' +
                    '<option value="yes">Mine</option></select></label></form>', "Make attack", "Cancel");
                if (!response || owner !== character) return false;
                ownTurn = response.find('[name="ownTurn"]').val() === "yes";
            }
            const context = {kind: "opportunity", activation, attackAction: false, mode: shortcutMode,
                isOwnTurn: ownTurn, rules, spellRule, review: new Map()};
            const result=savedEntry.kind==='spell'?await wayBeyond20ChooseReactiveSpell(context,savedEntry.spell):await wayBeyond20OpenGrantedAttack(savedEntry, context, shortcutMode);
            if(result===true && owner===character && savedEntry.kind!=='spell')wayBeyond20SaveOpportunityEntry(savedEntry);
            return result;
        }
        const html = '<form class="wb20-opportunity-prompt">' +
            '<p class="wb20-opportunity-summary"><strong>1 Reaction · 1 attack</strong></p>' +
            '<label class="wb20-opportunity-field">Attack<select name="attack" aria-label="Attack">' + entries.map((entry, index) =>
                `<option value="${index}"${entry === suggestedEntry ? " selected" : ""}>${escape(entry.name)} | ${escape(entry.hit)} | ${escape(entry.damage)}${entry.range ? " | " + escape(entry.range) : ""}</option>`).join("") +
            (spellRule ? `<option value="spell">Cast a spell instead (${escape(spellRule.name)})</option>` : "") +
            '</select></label><label class="wb20-opportunity-field">Roll with<select name="mode" aria-label="Roll with">' +
            `<option value="${RollType.NORMAL}">Flat (one die)</option>` +
            `<option value="${RollType.ADVANTAGE}">Advantage</option>` +
            `<option value="${RollType.DISADVANTAGE}">Disadvantage</option></select></label>` +
            (typeof knownOwnTurn === "boolean" ? `<p class="wb20-opportunity-note">${knownOwnTurn ? "Your turn" : "Another combatant's turn"} (Roll20).</p>` :
                '<label class="wb20-opportunity-field">Whose turn?<select name="ownTurn" aria-label="Whose turn?"><option value="no">Another creature</option><option value="yes">Mine</option></select></label>') +
            '<p class="wb20-opportunity-note">Your last successful weapon or reactive-spell choice becomes the default. Cancel spends nothing.</p>' +
            '<details class="wb20-opportunity-rules"><summary>Trigger and rules reminder</summary><ul>' +
            '<li>Use only when an Opportunity Attack is provoked. The usual trigger is a creature you can see leaving your reach; attack before it leaves.</li>' +
            '<li>Make one melee weapon attack or Unarmed Strike within reach. This is not the Attack action and does not grant Extra Attack.</li>' +
            '<li>Disengage, teleportation, and movement that uses none of the creature’s movement, Action, Bonus Action, or Reaction normally do not provoke.</li>' +
            '<li>Apply any exceptions in your actual features.</li></ul></details></form>';
        const response = await dndbeyondDiceRoller._prompter.prompt("Opportunity Attack", html, "Make attack", "Cancel");
        if (!response || owner !== character) return false;
        const value = response.find('[name="attack"]').val();
        const entry = /^\d+$/.test(String(value)) ? entries[Number(value)] : null;
        const mode = Number(response.find('[name="mode"]').val());
        if ((!entry && !(value === "spell" && spellRule)) ||
            ![RollType.NORMAL, RollType.ADVANTAGE, RollType.DISADVANTAGE].includes(mode)) return false;
        const context = {kind: "opportunity", activation, attackAction: false, mode,
            isOwnTurn: typeof knownOwnTurn === "boolean" ? knownOwnTurn : response.find('[name="ownTurn"]').val() === "yes",
            rules, spellRule, review: new Map()};
        if (value === "spell") return await wayBeyond20ChooseReactiveSpell(context);
        if(entry.kind==='spell')return await wayBeyond20ChooseReactiveSpell(context,entry.spell);
        const result = await wayBeyond20OpenGrantedAttack(entry, context, mode);
        if (result === true && owner === character) {
            wayBeyond20SaveOpportunityEntry(entry);
        }
        return result;
    } finally {
        wayBeyond20OpportunityPending = false;
    }
}

function wayBeyond20OpportunityRow(root) {
    let row = root.querySelector(":scope > .wb20-opportunity-attack");
    if (!row) {
        row = document.createElement("div");
        row.className = "ddbc-combat-attack wb20-opportunity-attack";
        const template = root.querySelector(".ddbc-combat-attack:not(.wb20-feature-option)");
        for (const cls of template?.classList || [])
            if (cls.startsWith("styles_attack__")) row.classList.add(cls);
        const icon = document.createElement("button");
        icon.type = "button"; icon.className = "wb20-feature-option-icon"; icon.textContent = "↶";
        icon.setAttribute("aria-label", "Opportunity Attack: choose a melee attack");
        const name = document.createElement("div"); name.className = "ddbc-combat-attack__name";
        const label = document.createElement("button"); label.type = "button";
        label.className = "wb20-feature-option-name"; label.textContent = "Opportunity Attack";
        const category = document.createElement("div"); category.className = "wb20-talent-category wb20-opportunity-choice";
        category.textContent = "Melee Attack";
        name.append(label, category); row.append(icon, name);
        for (const [field, text] of [["range", "Reach"], ["action", "Weapon"], ["damage", "Weapon"], ["notes", ""]]) {
            const cell = document.createElement("div");
            cell.className = `ddbc-combat-attack__${field}`; cell.textContent = text; row.append(cell);
        }
        const choose = document.createElement("button"); choose.type = "button";
        choose.className = "wb20-hit-die-choice wb20-opportunity-choose"; choose.textContent = "Choose different Attack";
        row.lastElementChild.append(choose);
        for (const button of [icon, label, choose]) button.addEventListener("click", event => {
            event.preventDefault(); event.stopPropagation();
            if (row._wb20Owner !== character || !row.isConnected) return;
            wayBeyond20ChooseOpportunityAttack(root, {useDefault: button !== choose}).catch(error => {
                console.warn("WayBeyond20: Opportunity Attack failed", error);
                alertify.warning("The attack did not finish. Check the roll and counters before retrying.");
            });
        });
        for (const button of [icon, label]) button.addEventListener("contextmenu", event => {
            event.preventDefault(); event.stopPropagation();
            if (row._wb20Owner !== character || !row.isConnected) return;
            wayBeyond20ShowAttackMenu(button, mode =>
                wayBeyond20ChooseOpportunityAttack(root, {useDefault: true, mode}).catch(error => {
                    console.warn("WayBeyond20: Opportunity Attack failed", error);
                    alertify.warning("The attack did not finish. Check the roll and counters before retrying.");
                }),
                () => row._wb20Owner === character && row.isConnected);
        });
        root.append(row);
    }
    row._wb20Owner = character;
    const choices=wayBeyond20OpportunityChoices(root),saved=wayBeyond20DefaultOpportunityEntry(choices);
    const selected = saved || wayBeyond20SuggestedOpportunityEntry(choices);
    const setText = (selector, text) => {
        const cell = row.querySelector(selector);
        if (selector === ".ddbc-combat-attack__range" && typeof wb20SetActionRange === "function") wb20SetActionRange(cell,text);
        else if (cell.textContent !== text) cell.textContent = text;
    };
    row._wb20PresentationSource = selected?.row || null;
    row._wb20PresentationSpell = selected?.spell || null;
    const category=row.querySelector('.wb20-talent-category');
    let select=category.querySelector('select');
    if(!select){select=document.createElement('select');select.className='wb20-opportunity-select';select.setAttribute('aria-label','Default opportunity attack or reactive spell');category.replaceChildren(select);
        select.addEventListener('change',event=>{event.stopPropagation();if(row._wb20Owner!==character || !row.isConnected)return;const entry=row._wb20Choices?.[Number(select.value)];if(entry)wayBeyond20SaveOpportunityEntry(entry);});}
    row._wb20Choices=choices;
    const labels=choices.map(entry=>{
        const level=entry.spell?.level,ordinal=level===1?'1st':level===2?'2nd':level===3?'3rd':level+'th';
        return entry.kind==='spell'?`${level?ordinal+' · ':''}${entry.name} (${entry.spell.source || 'Spell'})`:entry.name;
    });
    const signature=JSON.stringify([labels,saved?null:choices.indexOf(selected)]);
    if(select.dataset.options!==signature){select.replaceChildren(...labels.map((label,index)=>new Option(label+(choices[index]===selected && !saved?' (suggested)':''),String(index))));select.dataset.options=signature;}
    const selection=selected?String(choices.indexOf(selected)):'';if(select.value!==selection)select.value=selection;
    if(select.disabled!==!choices.length)select.disabled=!choices.length;
    setText(".ddbc-combat-attack__range", selected?.range || "--");
    setText(".ddbc-combat-attack__action", selected?.hit || "--");
    const damage = row.querySelector(".ddbc-combat-attack__damage");
    let value = damage.querySelector(".ddbc-damage__value");
    if (!value) { value = document.createElement("span"); value.className = "ddbc-damage__value"; damage.replaceChildren(value); }
    if (value.textContent !== (selected?.damage || "--")) value.textContent = selected?.damage || "--";
    const icon = row.querySelector(".wb20-feature-option-icon");
    const title = selected ? `Opportunity Attack: ${selected.name}. Uses one Reaction. Right-click for roll mode.` : "Opportunity Attack: choose a melee attack";
    if (icon.getAttribute("aria-label") !== title) { icon.setAttribute("aria-label", title); icon.title = title; }
    return {row, name: "Opportunity Attack", cost: "reaction", group: "reaction"};
}
