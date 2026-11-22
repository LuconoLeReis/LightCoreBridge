// Familiar rules come from the owned feat and current spell/creature descriptions.
// Cast snapshots and companion HP are character-owned; rerenders never grant HP.
const wb20HelpfulSkills = new WeakSet();
const wb20ArmedHelpful = new WeakMap();
const WB20_COMPANIONS_KEY = 'waybeyond20-companions';
const wb20FamiliarDelivery = new WeakMap();
const wb20FamiliarCastPackets = new WeakSet();
const wb20FamiliarPrivacy = new WeakMap();

function wb20FamiliarCapturePrivacy(args, request) {
    const privacy=wb20FamiliarPrivacy.get(args);if(privacy)privacy.whisper=request.whisper;
}

function wb20FamiliarFriend(owner = character) {
    if (!owner || owner.getSetting('waybeyond20-feature-controls', true) === false) return null;
    const rule = wb20CurrentFeatureRules(owner).find(r => /^Familiar Friend(?:\s*\([^)]*\))?$/i.test(wb20RuleText(r.name)));
    const text = wb20RuleText(rule?.text);
    if (!rule || !/Find Familiar.*?spell prepared/i.test(text)) return null;
    const distance = text.match(/familiar is within\s*(\d+)\s*(?:ft\.?|feet)/i);
    const helpful = /skill in which you have proficiency/i.test(text) && /Advantage on the check/i.test(text);
    const fortified = /(?:HP max|hit point maximum).*?current (?:HP|hit points).*?increased by/i.test(text);
    return {rule, text, distance: helpful && distance ? Number(distance[1]) : null,
        // The owner explicitly requires twice character level, captured at casting.
        bonus: fortified && Number.isInteger(Number(owner._level)) && Number(owner._level)>0 ? 2 * Number(owner._level) : null,
        free: /without a spell slot or Material components/i.test(text)};
}

function wb20FamiliarPrepared(name, owner = character) {
    return /^Find Familiar$/i.test(wb20RuleText(name)) && !!wb20FamiliarFriend(owner);
}

function wb20FamiliarFreeControl(name, owner = character) {
    if (!wb20FamiliarPrepared(name, owner) || !wb20FamiliarFriend(owner).free) return null;
    const controls = Array.from(document.querySelectorAll('.ct-spell-pane .ct-spell-caster__casting-action > button,.ct-spell-pane .ddbc-spell-caster__casting-action > button'));
    return controls.length === 1 && /^use$/i.test(controls[0].textContent.trim()) ? controls[0] : null;
}

function wb20FamiliarFreeCommit(name) {
    const control = wb20FamiliarFreeControl(name);
    if (!control) return null;
    const owner = character;
    const rows = Array.from(document.querySelectorAll('.ct-spells-spell,.ddbc-spells-spell')).filter(row => {
        const identity = wayBeyond20NativeSpellIdentity(row);
        return identity && identity.name === name && /Familiar Friend/i.test(identity.source) &&
            Array.from(row.querySelectorAll('.ct-spells-spell__action button,.ddbc-spells-spell__action button'))
                .some(button => /^use$/i.test(button.textContent.trim()) && !button.disabled);
    });
    if (control.disabled || rows.length !== 1) return false;
    return wayBeyond20CommitNativeSpellCast(owner, wayBeyond20NativeSpellIdentity(rows[0]), 'use');
}

function wb20FamiliarWaiveMaterial(properties) {
    properties.Components = String(properties.Components || '').split(/[,/]\s*/).map(s => s.trim())
        .filter(s => /^(?:V|S)$/i.test(s)).join(', ');
}

function wb20FamiliarActionMetadata(name) {
    const clean=wb20RuleText(name).replace(/\s*\(Special\)\s*$/i,'');
    if (!/^(?:Familiar Friend:\s*)?Helpful Friend$/i.test(clean) || !wb20FamiliarFriend()?.distance) return null;
    return {activation:'Special', poolName:'Familiar Friend: Helpful Friend',
        activate: () => wb20ArmHelpfulFriend()};
}

async function wb20ArmHelpfulFriend() {
    const owner = character, rule = wb20FamiliarFriend(owner);
    if (!rule?.distance) return false;
    const choice = await dndbeyondDiceRoller.queryGeneric('Helpful Friend',
        'Use your familiar for your next proficient skill check. Arming spends nothing; its distance is confirmed when you roll.',
        {arm:'Use on my next proficient skill check', clear:'Cancel the armed use', cancel:'Close'},
        'waybeyond20-helpful-friend', ['arm','clear','cancel'], 'cancel');
    if (character !== owner) return false;
    if (choice === 'arm') { wb20ArmedHelpful.set(owner, {busy:false}); alertify.success('Helpful Friend armed. No use spent yet.'); return true; }
    if (choice === 'clear') { wb20ArmedHelpful.delete(owner); return true; }
    return false;
}

async function wb20WithHelpfulFriend(type, args, dispatch) {
    const eligible = wb20HelpfulSkills.has(args);
    wb20HelpfulSkills.delete(args); // Never mark tool, raw ability, Initiative or save packets.
    const owner = character, armed = wb20ArmedHelpful.get(owner), rule = wb20FamiliarFriend(owner);
    if (!rule) wb20ArmedHelpful.delete(owner);
    if (!eligible || type !== 'skill' || !rule?.distance || !armed) return dispatch();
    if (armed.busy) return false;
    if (args['waybeyond20-rule-advantage'] || wayBeyond20RollAlreadyHasAdvantage(args)) return dispatch();
    armed.busy = true;
    const costs = args['waybeyond20-resource-costs'], prior = args['waybeyond20-rule-advantage'];
    try {
        const choice = await dndbeyondDiceRoller.queryGeneric('Helpful Friend',
            `Is your familiar present within ${rule.distance} feet of you for this ${args.name || 'skill'} check?`,
            {use:'Use Helpful Friend', skip:'Roll without it', cancel:'Cancel roll'},
            'waybeyond20-helpful-range', ['use','skip','cancel'], 'skip');
        if (owner !== character || choice === 'cancel' || choice == null) return false;
        if (choice !== 'use') return dispatch();
        args['waybeyond20-rule-advantage'] = true;
        args['waybeyond20-resource-costs'] = [...(costs || []), {name:'Familiar Friend: Helpful Friend', amount:1}];
        const result = await dispatch();
        if (result === true && wb20ArmedHelpful.get(owner) === armed) wb20ArmedHelpful.delete(owner);
        return result;
    } finally {
        armed.busy = false;
        if (costs === undefined) delete args['waybeyond20-resource-costs']; else args['waybeyond20-resource-costs'] = costs;
        if (prior === undefined) delete args['waybeyond20-rule-advantage']; else args['waybeyond20-rule-advantage'] = prior;
    }
}

function wb20Companions(owner = character) {
    const stored = owner.getSetting(WB20_COMPANIONS_KEY, []);
    const state=typeof wayBeyond20GetTurnTrackerState === 'function' ? wayBeyond20GetTurnTrackerState() : null;
    const turn=state ? JSON.stringify([state.combatStartedAt || 0,state.localTurnNumber || 0]) : null;
    return Array.isArray(stored) ? stored.filter(c => c && c.owner === String(owner._id) && c.kind === 'familiar')
        .map(c => c.senses && turn !== null && c.senses.turn !== turn ? {...c,senses:null} : c) : [];
}

async function wb20SaveFamiliar(owner, companion) {
    if (owner !== character || companion.owner !== String(owner._id)) return false;
    // Find Familiar permits one familiar; changing form replaces that record.
    let saved=false;
    await owner.mergeCharacterSettings({[WB20_COMPANIONS_KEY]:[companion]},()=>{saved=true;});
    if (owner === character && typeof wayBeyond20ScheduleActiveEffectBadgeRefresh === 'function') wayBeyond20ScheduleActiveEffectBadgeRefresh();
    if(!saved)alertify.warning('The familiar’s card could not be saved. Keep its HP result and check Companions before casting again.');
    return saved;
}

function wb20FamiliarHitPoints(base, bonus, rolled = null) {
    const baseHP = Number(rolled === null ? base.hp : rolled);
    if (!Number.isFinite(baseHP) || !Number.isInteger(bonus) || bonus < 0) return null;
    return {hp:Math.max(1,baseHP) + bonus, maxHP:Math.max(1,baseHP) + bonus,
        formula:base.formula ? '(' + base.formula + ')+' + bonus : String(baseHP + bonus)};
}

function wb20FamiliarSpellRules(description) {
    const text = wb20RuleText(description);
    if (!/service of a familiar/i.test(text) || !/One Familiar Only/i.test(text)) return null;
    return {text, telepathy:Number(text.match(/within\s*(\d+)\s*feet of you.*?communicate.*?telepathically/i)?.[1]) || null,
        senses:/as a Bonus Action.*?see through the familiar/i.test(text),
        returnRange:Number(text.match(/reappear in an unoccupied space within\s*(\d+)\s*feet/i)?.[1]) || null,
        delivery:/range of touch.*?Reaction to deliver/i.test(text),
        dismiss:/Magic action.*?temporarily dismiss/i.test(text), cannotAttack:/familiar can[’']t attack/i.test(text)};
}

async function wb20PrepareFamiliarCast(args, {name, description, display, damageOnly, owner = character}) {
    if (display || damageOnly) return true;
    wb20FamiliarCastPackets.add(args);
    const rules = wb20FamiliarSpellRules(description);
    if (!rules) return true;
    const friend=wb20FamiliarFriend(owner);
    let omitFamiliarBonus=false;
    if(owner.hasFeat?.('Familiar Friend',true) && (!friend || friend.bonus===null)) {
        const choice=await dndbeyondDiceRoller.queryGeneric('Familiar Friend benefits unavailable',
            'The Familiar Friend benefits could not be read. Proceed without the familiar HP bonus, or cancel and open Features & Traits before trying again.',
            {proceed:'Proceed without the bonus',cancel:'Cancel'},'waybeyond20-familiar-benefits',['proceed','cancel'],'cancel');
        if(choice!=='proceed' || owner!==character)return false;
        omitFamiliarBonus=true;
        alertify.warning('Proceeding without the Familiar Friend HP bonus. Check the companion HP afterward.');
    }
    const selected=await wb20PickFamiliarForm(owner,description);
    if(!selected || owner!==character)return false;
    const existing = wb20Companions(owner)[0], base = selected.base, bonus = omitFamiliarBonus?0:(wb20FamiliarFriend(owner)?.bonus || 0);
    const level = Number(owner._level), castId = uuidv4();
    const privacy={whisper:null};wb20FamiliarPrivacy.set(args,privacy);
    let completion = null;
    wayBeyond20CommitAfterDispatch(args, () => completion ||= (async () => {
        if (owner !== character) return;
        let hp = null;
        if (base?.formula) {
            try {
                const roll = dndbeyondDiceRoller._roller.roll(base.formula);
                await dndbeyondDiceRoller._roller.resolveRolls(base.name+' Hit Points',[roll],
                    {type:'custom',name:base.name+' Hit Points',character:owner.getDict(),whisper:privacy.whisper ?? WhisperType.YES});
                if (!Number.isFinite(Number(roll.total))) throw Error('Unreadable familiar HP');
                hp = wb20FamiliarHitPoints(base,bonus,Number(roll.total));
            } catch (error) { hp = null; alertify.warning('Find Familiar completed, but its HP roll could not be resolved. Set its HP in Companions; do not cast again.'); }
        }
        if (owner !== character) return;
        await wb20SaveFamiliar(owner,{...existing,owner:String(owner._id),kind:'familiar',id:'familiar',
            name:selected.familiarName || base.name,familiarName:selected.familiarName,appearance:selected.appearance,creatureType:selected.type,base,nextBase:null,
            sourceNote:selected.sourceNote || '',castId,revision:castId,castLevel:level,bonus,rules,status:'present',action:1,bonusAction:1,reaction:1,turn:1,
            hp:hp?.hp ?? null,maxHP:hp?.maxHP ?? null,formula:hp?.formula || null,hpResolvedForCast:hp ? castId : null,senses:null,
            features:wb20CurrentFeatureRules(owner).filter(r=>/familiar/i.test(r.name+' '+r.text)).map(r=>({name:r.name,text:r.text}))});
        if(typeof wb20SaveFamiliarProfiles==='function') {
            const profiles=selected.familiarName?[{name:selected.familiarName,formName:base.name,url:base.url,source:base.source,
                appearance:selected.appearance,creatureType:selected.type,base,sourceNote:selected.sourceNote,eligibilityOverride:selected.eligibilityOverride}]:[];
            await wb20SaveFamiliarProfiles(profiles,owner,selected.familiarName);
        } else {
        let nameSaved=false;
        await mergeSettings({'waybeyond20-familiar-name':selected.familiarName},saved=>{
            nameSaved=true;
            if(owner===character){settings=saved;owner.setGlobalSettings(saved);}
        });
        if(!nameSaved)alertify.warning('The familiar completed, but its remembered name could not be saved.');
        }
        wb20FamiliarDelivery.delete(owner);
        if(typeof wb20FamiliarCard==='function')wb20FamiliarCard();
    })());
    return true;
}

async function wb20WithFamiliarDelivery(type,args,dispatch) {
    const isCast = wb20FamiliarCastPackets.has(args); wb20FamiliarCastPackets.delete(args);
    const owner = character, armed = wb20FamiliarDelivery.get(owner), familiar = wb20Companions(owner)[0];
    if (!isCast || !['spell-card','spell-attack'].includes(type) || !/^touch$/i.test(String(args.range || '').trim()) || !armed) return dispatch();
    if (armed.busy || !familiar || familiar.revision !== armed.revision || familiar.status !== 'present' || familiar.reaction !== 1) {
        const choice=await dndbeyondDiceRoller.queryGeneric('Familiar delivery unavailable',
            'The familiar or its Reaction could not be confirmed. Proceed with a normal cast without familiar delivery, or cancel.',
            {proceed:'Proceed with normal cast',cancel:'Cancel'},'waybeyond20-familiar-unavailable',['proceed','cancel'],'cancel');
        if(choice!=='proceed' || owner!==character)return false;
        if(wb20FamiliarDelivery.get(owner)===armed)wb20FamiliarDelivery.delete(owner);
        return dispatch();
    }
    armed.busy = true;
    try {
        const choice = await dndbeyondDiceRoller.queryGeneric('Familiar touch delivery',
            `Is ${familiar.name} within ${familiar.rules?.telepathy || 'the spell’s stated range in'} feet of you and already able to touch the intended target? This does not move it.`,
            {deliver:'Cast through familiar: spend its Reaction',self:'Cast normally',cancel:'Cancel cast'},
            'waybeyond20-familiar-touch',['deliver','self','cancel'],'cancel');
        if (owner !== character || choice == null || choice === 'cancel') return false;
        if (choice !== 'deliver') return dispatch();
        if (typeof addEffect === 'function') addEffect(args,'Touch delivered by '+familiar.name+' — familiar Reaction');
        const result = await dispatch();
        if (result === true && owner === character) {
            await wb20ResourceLocked(async () => {
                const current = wb20Companions(owner)[0];
                if (!current || current.revision !== familiar.revision) {alertify.warning('The spell completed; check the familiar’s Reaction in Companions.');return;}
                await wb20SaveFamiliar(owner,{...current,reaction:0,revision:uuidv4()});
            },owner);
            if (wb20FamiliarDelivery.get(owner) === armed) wb20FamiliarDelivery.delete(owner);
        }
        return result;
    } finally { armed.busy = false; }
}

// The opt-in attack adapter copies requests. Carry only local identities; none
// of this metadata is added to a VTT, game-log or Discord packet.
function wb20FamiliarCarryRequestState(from,to) {
    if(wb20FamiliarCastPackets.has(from))wb20FamiliarCastPackets.add(to);
    if(wb20HelpfulSkills.has(from))wb20HelpfulSkills.add(to);
    const privacy=wb20FamiliarPrivacy.get(from);if(privacy)wb20FamiliarPrivacy.set(to,privacy);
}

async function wb20ManageFamiliar(command = null) {
    const owner = character, familiar = wb20Companions(owner)[0];
    if (!familiar) { alertify.warning('No familiar is active. Cast Find Familiar to choose and summon one, or open Saved familiars to view your cards.'); return false; }
    const choices = {hp:'Set companion HP',initiative:'Set companion Initiative',turn:'Start familiar’s next turn — refresh its Reaction'};
    if (familiar.status === 'present' && familiar.rules?.senses) choices.senses='Share its senses — my Bonus Action';
    if (familiar.status === 'present' && familiar.rules?.dismiss) choices.dismiss='Dismiss to pocket — my Magic action';
    if (familiar.status !== 'gone' && /dismiss it forever/i.test(familiar.rules?.text || '')) choices.forever='Dismiss permanently — my Magic action';
    if (familiar.status === 'pocket' && familiar.rules?.returnRange) choices.return=`Return within ${familiar.rules.returnRange} ft. — my Magic action`;
    if (familiar.status === 'present' && familiar.rules?.delivery && familiar.reaction === 1) choices.delivery='Deliver my next touch spell';
    if (wb20FamiliarFriend(owner)?.distance) choices.helpful='Helpful Friend';
    choices.close='Close';
    const choice = command || await dndbeyondDiceRoller.queryGeneric('Companions — '+familiar.name,
        `HP ${familiar.hp ?? '?'}/${familiar.maxHP ?? '?'} · ${familiar.formula || 'choose a form in Extras'} · ${familiar.status} · Reaction ${familiar.reaction ?? '?'} · Initiative ${familiar.initiative ?? 'not rolled'}`,
        choices,'waybeyond20-companions',Object.keys(choices),'close');
    if (owner !== character || !choice || choice === 'close' || !Object.hasOwn(choices,choice)) return false;
    if (choice === 'helpful') return wb20ArmHelpfulFriend();
    if (choice === 'delivery') {wb20FamiliarDelivery.set(owner,{revision:familiar.revision,busy:false});alertify.success('Familiar delivery armed for your next touch spell. No Reaction spent yet.');return true;}
    let value, maximum;
    if (choice === 'hp' || choice === 'initiative') {
        const html = await dndbeyondDiceRoller._prompter.prompt('Companion '+(choice === 'hp' ? 'HP' : 'Initiative'),
            '<form><div class="beyond20-form-row"><label>'+ (choice === 'hp' ? 'Current HP' : 'Initiative') +'</label><input name="companion-value" type="number"'+(choice === 'hp' ? ' min="0"' : '')+'></div>'+ (choice === 'hp' ? '<div class="beyond20-form-row"><label>Maximum HP</label><input name="companion-max" type="number" min="1" value="'+(Number(familiar.maxHP) || '')+'"></div>' : '') +'</form>','Save','Cancel');
        if (!html) return false;
        const raw = String(html.find('[name="companion-value"]').val() || '').trim(); value = Number(raw);
        maximum = choice === 'hp' ? Number(html.find('[name="companion-max"]').val()) : null;
        if (!raw || !Number.isFinite(value) || choice === 'hp' && (!Number.isInteger(value) || value < 0 || !Number.isInteger(maximum) || maximum < 1 || value > maximum)) return false;
    }
    const patch = choice === 'hp' ? {hp:value,maxHP:maximum,...(value === 0 ? {status:'gone',senses:null} : {})} :
        choice === 'initiative' ? {initiative:value} : choice === 'turn' ? {reaction:1,action:1,bonusAction:1,turn:(familiar.turn || 0)+1} :
        choice === 'dismiss' ? {status:'pocket',senses:null} : choice === 'forever' ? {status:'gone',senses:null} : choice === 'return' ? {status:'present'} :
        choice === 'senses' ? {senses:{turn:JSON.stringify([wayBeyond20GetTurnTrackerState().combatStartedAt || 0,wayBeyond20GetTurnTrackerState().localTurnNumber || 0])}} : null;
    if (!patch) return false;
    if (['senses','dismiss','return','forever'].includes(choice)) {
        const args = {name:'Find Familiar: '+choice,description:familiar.rules.text};
        wayBeyond20AttachTurnResource(args,choice === 'senses' ? 'bonusAction' : 'action');
        wayBeyond20CommitAfterDispatch(args,async () => {
            const current = wb20Companions(owner)[0];
            if (owner === character && current?.revision === familiar.revision) await wb20SaveFamiliar(owner,{...current,...patch,revision:uuidv4()});
        });
        return sendRollWithCharacter('trait',0,args);
    }
    return wb20ResourceLocked(async () => {
        const current = wb20Companions(owner)[0];
        if (owner !== character || current?.revision !== familiar.revision) return false;
        return wb20SaveFamiliar(owner,{...current,...patch,revision:uuidv4()});
    },owner);
}

function wb20FamiliarControls() {
    const anchor = document.querySelector('.ct-extras .ct-extras__header button') ||
        Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Manage Extras');
    if (anchor) {
        let list=anchor.parentElement.querySelector('.wb20-companion-list');
        if (!list) {
            list=document.createElement('details');list.className='wb20-companion-list';
            const summary=document.createElement('summary');summary.textContent='Companions';list.append(summary);anchor.after(list);
        }
        let button=list.querySelector('button');
        if (!button) {button=anchor.cloneNode(false);button.removeAttribute('id');list.append(button);button.onclick=()=>wb20FamiliarCard().catch(console.warn);}
        const familiar=wb20Companions()[0];
        const label=familiar ? `${familiar.name} · LCB HP ${familiar.hp ?? '?'}/${familiar.maxHP ?? '?'} · ${familiar.status}${familiar.senses ? ' · Sharing senses' : ''}` : 'No familiar tracked — open it in Extras';
        if (button.textContent !== label) button.textContent=label;
    }

}

function wb20FamiliarAttackBlocked(actor) {
    if (!/^Familiar$/i.test(wb20RuleText(actor?._creatureType))) return false;
    const text = wb20RuleText(actor._stat_block?.text?.());
    if (!/familiar can[’']t attack/i.test(text)) return false;
    // An owned, live exception is not silently removed (e.g. an empowered form).
    return !wb20CurrentFeatureRules(actor._parent_character).some(r => /familiar.{0,100}(?:can attack|make an attack)/i.test(wb20RuleText(r.text)));
}
