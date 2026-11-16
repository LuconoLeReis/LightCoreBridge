// Spell completion is the trigger, not a refresh tick or the possession of a
// resource. Plans and owner references stay in this sheet, never in roll packets.
const wb20CompletedHealingCasts = new WeakSet();

function wb20HealingCastPlan(owner, args, context = {}) {
    if (!owner || !args || context.forceDisplay || context.forceDamagesOnly ||
        context.ritualMode !== 'normal' || args['waybeyond20-followup-phase'] || args['waybeyond20-no-slot-cast']) return null;
    const slotLevel = wayBeyond20SpellCastLevel(context.level, context.castas);
    if (!Number.isInteger(slotLevel) || slotLevel < 1 || slotLevel > 9) return null;
    // Temporary HP is not restored HP. A description-only healing spell can
    // qualify too, but the player must confirm that it actually healed now.
    const heals = (args['damage-types'] || []).some(type => /^healing$/i.test(String(type).trim())) ||
        /\b(?:restore[sd]?|regains?)\s+(?:(?:a|the)\s+)?(?:number of\s+)?(?:\d+[\s\S]{0,35}?\s+)?hit points\b/i.test(args.description || '');
    if (!heals) return null;
    // A plain Self spell that only heals the caster cannot trigger the feature.
    // Self emanations and spells describing other creatures still ask, rather
    // than mistaking their origin for the recipients.
    if (/^self$/i.test(String(args.range || '').trim()) &&
        /\byou regain\b/i.test(args.description || '') &&
        !/\b(?:creatures?|targets?|allies|another)\b/i.test(args.description || '')) return null;
    const rules = typeof wb20CurrentFeatureRules === 'function' ? wb20CurrentFeatureRules(owner) : [];
    const rule = rules.find(rule => /^blessed healer(?: 2024)?$/i.test(rule.name.trim()));
    const text = typeof wb20RuleText === 'function' ? wb20RuleText(rule?.text) : String(rule?.text || '');
    // DDB's retained Features snippet uses "regain 2 + ... level HP", while
    // the full pane uses "regain Hit Points equal to 2 plus ... level".
    const formula = text.match(/you (?:regain|recover)\s*(?:(?:hit points|HP)\s+equal to\s+)?(\d+)\s*(?:plus|\+)\s*(?:the\s+)?spell(?:\s+slot)?'?s?\s+level(?:\s*(?:hit points|HP))?/i);
    if (!rule || !formula || !/(?:other than yourself|others|other creatures)/i.test(text)) {
        if (owner.hasClassFeature?.('Blessed Healer', true))
            return {owner, ownerId: owner._id, rule: 'Blessed Healer', unreadable: true};
        return null;
    }
    return {owner, ownerId: owner._id, rule: rule.name, slotLevel,
        amount: Number(formula[1]) + slotLevel,
        requiresSlot: /(?:with|using) a spell slot/i.test(text), spell: String(args.name || 'This spell')};
}

function wb20HealingCastCurrent(plan) {
    return plan && plan.owner === character && plan.owner._id === plan.ownerId;
}

async function wb20OpenHealingCastControl(plan) {
    if (wayBeyond20FindHitPointsAdjuster() || !wb20HealingCastCurrent(plan)) return;
    // Use only the native Heal control in the character's health block, never
    // a generic page button or a Temporary HP control.
    const roots = wayBeyond20FindTempHpHealthRoots();
    const heal = roots.flatMap(root => Array.from(root.querySelectorAll('button,[role="button"]')))
        .find(button => /^heal$/i.test(button.textContent.trim()) && wayBeyond20IsVisibleElement(button));
    if (!heal) return;
    wayBeyond20NativeClick(heal);
    for (let attempt = 0; attempt < 8 && wb20HealingCastCurrent(plan); attempt++) {
        if (wayBeyond20FindHitPointsAdjuster()) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function wb20CompleteHealingCast(plan) {
    if (!plan || wb20CompletedHealingCasts.has(plan) || !wb20HealingCastCurrent(plan)) return;
    wb20CompletedHealingCasts.add(plan); // Claim before any asynchronous prompt.
    if (plan.unreadable) {
        alertify.warning('Blessed Healer is present, but its current description could not be read. Resolve it manually and open Features to refresh the rule text. The spell already completed.');
        return;
    }
    const choices = {
        other: plan.requiresSlot ? 'Yes — a spell slot was used and someone else regained HP' : 'Yes — someone else regained HP',
        skip: 'No / already applied / skip'
    };
    const choice = await dndbeyondDiceRoller.queryGeneric(plan.rule,
        `${plan.spell} completed. Did it restore Hit Points to at least one creature other than you?`,
        choices, 'waybeyond20-healing-cast-confirmation', ['other', 'skip'], 'skip',
        {prefix: `If eligible, regain ${plan.amount} HP once (${Number(plan.amount) - plan.slotLevel} + level ${plan.slotLevel}). This does not change the spell's healing or spend another resource.`});
    if (choice !== 'other' || !wb20HealingCastCurrent(plan)) return;
    await wb20OpenHealingCastControl(plan);
    if (!wb20HealingCastCurrent(plan)) return;
    const result = await wayBeyond20ApplyHealingToSelf(plan.amount, {source: plan.rule});
    if (!wb20HealingCastCurrent(plan)) return;
    if (result?.applied) {
        const regained = Math.max(0, Number(result.after) - Number(result.before));
        alertify.success(`${plan.rule}: regained ${regained} HP.`);
    } else {
        alertify.warning(`${plan.rule}: regain ${plan.amount} HP, up to your maximum. LightCore could not update the sheet; apply it manually. Do not cast again.`);
    }
}

async function wb20SendHealingSpellCast(rollType, fallback, args, context) {
    let plan = null, planError = null;
    try {
        if (typeof wb20HealingPoolPacket === 'function') wb20HealingPoolPacket(character,args,context);
        plan = wb20HealingCastPlan(character, args, context);
    }
    catch (error) { planError = error; }
    const result = await sendRollWithCharacter(rollType, fallback, args);
    if (result === true && planError) {
        console.warn('LightCore: healing feature discovery failed', planError);
        alertify.warning('The spell completed. LightCore could not check its healing features; resolve any extra healing manually. Do not cast again.');
    }
    // sendRollWithCharacter owns rolling and accounting. This runs outside its
    // resource lock, after success, and cannot cancel or repeat the completed cast.
    if (result === true && plan) {
        try { await wb20CompleteHealingCast(plan); }
        catch (error) {
            console.warn('LightCore: post-cast healing could not complete', error);
            if (wb20HealingCastCurrent(plan)) alertify.warning(`${plan.rule}: check the healing manually (${plan.amount} HP if eligible). The spell already completed; do not cast again.`);
        }
    }
    return result;
}
