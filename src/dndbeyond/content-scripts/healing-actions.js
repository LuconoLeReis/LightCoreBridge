// Prepare native feature actions; the existing rollAction/buildAttackRoll and
// resource transaction still own rolling, completion and spending. Never poll
// for feature use, manufacture a spell cast, or require a VTT/target list.
function wb20HealingActionName(name) {
    return wb20RuleText(name).replace(/^Channel Divinity:\s*/i, '').toLowerCase();
}

function wb20HealingActionOwned(owner, name) {
    const wanted = wb20HealingActionName(name);
    return wb20CurrentFeatureRules(owner).find(rule =>
        [rule.name, ...(rule.actions || []).map(action => action.replace(/:\s*\d*\s*(?:bonus action|action|reaction|special)\s*$/i, ''))]
            .some(action => wb20HealingActionName(action) === wanted));
}

async function wb20PrepareHealingAction(owner, name, description, native, context = {}) {
    if (owner.getSetting('waybeyond20-feature-controls', true) === false) return null;
    const kind = wb20HealingActionName(name);
    if (!['divine spark', 'turn undead', 'sear undead', 'preserve life', 'healing hands'].includes(kind)) return null;
    const rule = wb20HealingActionOwned(owner, name);
    if (!rule) return null;
    const ownerId = owner._id;
    const text = wb20RuleText(description || rule.text);
    const properties = {...native};
    properties['Attack Type'] = 'Special';
    properties['Action Type'] = '1 Action';
    const plan = {owner, ownerId, kind, properties, effects: [], followup: kind === 'sear undead'};
    const within = text.match(/\bwithin\s*(\d+)\s*(?:feet|ft\.?)(?=\s|[,.;:]|$)/i);
    if (within) { properties['Range/Area'] = within[1] + ' ft.'; delete properties.Reach; }
    const save = ability => {
        const value = String(native['Attack/Save'] || '');
        const dc = owner._spell_saves?.Cleric || value.match(/(\d+)\s*$/)?.[1];
        if (Number.isInteger(Number(dc)) && Number(dc) > 0) properties['Attack/Save'] = ability + ' ' + dc;
    };
    if (kind === 'divine spark') {
        // The live native action supplies the level-scaled dice. Its description
        // supplies the ability; no extra Disciple of Life applies to a feature.
        const ability = text.match(/add your (Wisdom|Intelligence|Charisma|Strength|Dexterity|Constitution) modifier/i);
        const dice = String(native.Damage || '').match(/^\s*(\d*d\d+)(?:\s*([+-])\s*(\d+))?\s*$/i);
        const mod = ability ? Number(owner.getAbility(ability[1].slice(0, 3).toUpperCase())?.mod) : NaN;
        if (!dice || !Number.isFinite(mod) || !/restore.*?(?:hit points|HP)/i.test(text)) {
            alertify.warning('Divine Spark: its healing/damage formula could not be read. The native action remains available; check the total and choice manually.');
            return null;
        }
        let choice = context.damageOnly ? (/^(Healing|Necrotic|Radiant)$/i.test(native['Damage Type'] || '') ? native['Damage Type'].toLowerCase() : null) : null;
        if (!choice) choice = await dndbeyondDiceRoller.queryGeneric(name, 'Choose Divine Spark’s effect on another creature within range.',
            {healing: 'Restore Hit Points', radiant: 'Radiant damage (Constitution save, half on success)', necrotic: 'Necrotic damage (Constitution save, half on success)'},
            'waybeyond20-divine-spark', ['healing', 'radiant', 'necrotic'], 'healing');
        if (!['healing', 'radiant', 'necrotic'].includes(choice)) return {canceled: true};
        // Preserve a native formula that already includes its modifier.
        properties.Damage = dice[2] ? String(native.Damage) : dice[1] + (mod >= 0 ? '+' : '') + mod;
        properties['Damage Type'] = choice[0].toUpperCase() + choice.slice(1);
        if (choice === 'healing' && typeof wb20SupremeHealingRows === 'function') {
            const healing = [properties.Damage]; wb20SupremeHealingRows(healing, ['Healing'], owner, 'channel'); properties.Damage = healing[0];
        }
        if (choice === 'healing') { delete properties['Attack/Save']; plan.effects.push('Restore HP to another creature; not a spell.'); }
        else { save('CON'); plan.effects.push('Constitution save: half damage on success (round down).'); }
    } else if (kind === 'turn undead' || kind === 'sear undead') {
        const sear = wb20HealingActionOwned(owner, 'Sear Undead');
        const searText = wb20RuleText(sear?.text);
        const damage = searText.match(/takes?\s*(\d+d\d+)\s*Radiant\s*damage/i);
        if (kind === 'sear undead') {
            if (!damage) { alertify.warning('Sear Undead: resolve its damage manually from the current feature. No additional Action or Channel Divinity is spent.'); return plan; }
            const answer = await dndbeyondDiceRoller.queryGeneric(name,
                'Roll follow-up damage only for Undead that failed the saving throw against your completed Turn Undead.',
                {yes: 'Roll Sear damage (no additional Action or Channel Divinity)', cancel: 'Cancel'},
                'waybeyond20-sear-undead', ['yes', 'cancel'], 'cancel');
            if (answer !== 'yes') return {canceled: true};
        }
        save('WIS');
        plan.effects.push('Chosen Undead only. Failed Wisdom save: Frightened and Incapacitated for 1 minute; move away. Ends on damage, your Incapacitation or death.');
        if (damage) {
            properties.Damage = damage[1]; properties['Damage Type'] = 'Radiant';
            plan.effects.push('Sear Undead: damage only on a failed Turn Undead save; none on success. This damage does not end the turning effect.');
        }
    } else if (kind === 'preserve life') {
        const pool = text.match(/restore\s*(\d+)\s*(?:HP|Hit Points)\b/i);
        if (pool) plan.effects.push('Divide up to ' + pool[1] + ' HP among Bloodied creatures in range, including yourself. Stop at half each recipient’s maximum HP. Apply each allocation on that recipient’s sheet.');
        else plan.effects.push('Divide the current feature’s HP pool among Bloodied creatures in range; no recipient can exceed half maximum HP. Apply allocations on their sheets.');
        // A fixed pool is neither damage dice nor a spell. Its native card and
        // shared Channel Divinity spend describe one use, not one per recipient.
        delete properties.Damage; delete properties['Damage Type']; delete properties['Attack/Save'];
    } else if (kind === 'healing hands') {
        if (!properties.Damage) {
            const healingText = wb20RuleText(text + ' ' + rule.text);
            const resolved = healingText.match(/(?:regain|restore|heal)[^.]*?(\d+d\d+)\s*(?:HP|Hit Points)\b/i);
            const proficiency = Number(owner._proficiency);
            const pbDie = healingText.match(/number of\s+d(\d+)s?\s+equal to your proficiency bonus/i);
            if (resolved) properties.Damage = resolved[1];
            else if (pbDie && Number.isInteger(proficiency) && proficiency > 0) properties.Damage = proficiency + 'd' + pbDie[1];
            else alertify.warning('Healing Hands: the current healing dice could not be read. Resolve its healing manually from the feature.');
        }
        properties['Damage Type'] = 'Healing';
        properties['Range/Area'] = 'Touch'; delete properties.Reach; delete properties['Attack/Save'];
        plan.effects.push('Healing Hands is not a spell: no Disciple of Life or Blessed Healer.');
    }
    if (owner !== character || owner._id !== ownerId) return {canceled: true};
    return plan;
}

function wb20ApplyHealingAction(plan, args, damageOnly = false) {
    if (!plan) return;
    // None of these features makes an attack roll. Do not enter on-hit riders,
    // critical damage, Smite or Unarmed Strike processing.
    args.rollAttack = false; args.rollCritical = false;
    args['waybeyond20-resource-costs'] = []; // One native limited-use intent, never an inferred second charge.
    delete args['to-hit']; delete args.reach;
    if (plan.properties['Range/Area']) args.range = plan.properties['Range/Area'];
    for (const effect of plan.effects) addEffect(args, effect);
    if (plan.perTurn && !damageOnly) args['waybeyond20-resource-per-turn'] = plan.perTurn;
    if (args['waybeyond20-turn-resource']) args['waybeyond20-turn-resource'].actionType = 'Magic';
    if (plan.kind !== 'healing hands' && !damageOnly && !plan.followup)
        wayBeyond20AttachLimitedUse(args, 'Channel Divinity', {name: args.name});
    if (plan.followup) {
        delete args['waybeyond20-limited-use']; delete args['waybeyond20-turn-resource'];
        delete args['waybeyond20-turn-resources'];
    }
}
