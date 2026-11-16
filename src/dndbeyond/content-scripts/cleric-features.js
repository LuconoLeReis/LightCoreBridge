// Owned descriptions provide the rules; the shared roller, hit continuation and
// resource transaction provide execution. No level/character/campaign table.
const wb20ArmedLuck = new WeakMap();
const wb20ClericAttackTurns = new WeakMap();
function wb20ClericRules(owner = character) { return wb20CurrentFeatureRules(owner); }
function wb20ClericRule(name, owner = character) { return wb20ClericRules(owner).find(r => wb20RuleText(r.name).toLowerCase() === name.toLowerCase()); }
function wb20HasModernDivineStrike(owner = character) {
    if(owner.getSetting('waybeyond20-feature-controls',true)===false)return false;
    return wb20ClericRules(owner).some(r => /blessed strikes/i.test(r.name) && /Divine Strike/i.test(r.text) &&
        /weapon/i.test(r.text) && /Necrotic or Radiant/i.test(r.text));
}
function wb20DivineStrikeDie(owner = character) {
    const improved = wb20ClericRule('Improved Blessed Strikes', owner) || wb20ClericRule('Improved Blessed Strikes 2024', owner);
    return wb20RuleText(improved?.text).match(/Divine Strike.*?increases to\s*(\d+d\d+)/i)?.[1] ||
        wb20ClericRules(owner).find(r => /blessed strikes/i.test(r.name) && /Divine Strike/i.test(r.text))?.text.match(/extra\s*(\d+d\d+)/i)?.[1] || null;
}
function wb20HasSupremeHealing(owner = character, kind = 'spell') {
    const rule=wb20ClericRules(owner).find(r => /^Supreme Healing(?: 2024)?$/i.test(r.name));
    // Retain the established spell behavior if its description is temporarily
    // unavailable. Do not extend a legacy spell-only rule to Channel Divinity.
    if(!rule || !rule.text)return kind==='spell' && !!owner.hasClassFeature?.('Supreme Healing');
    return (kind==='channel' ? /Channel Divinity/i : /spell/i).test(rule.text);
}
function wb20MaxHealingFormula(formula) {
    // Preserve constants, arithmetic and kept-dice counts (e.g. Bedside Manner).
    return String(formula).replace(/(\d*)d(\d+)((?:(?:ro<=|min)\d+)*)(?:(kh|kl)(\d+))?/gi,
        (all, count, faces, mods, keep, kept) => String(Number(keep ? kept : count || 1) * Number(faces)));
}
function wb20SupremeHealingRows(damages, types, owner = character, kind = 'spell') {
    if (!wb20HasSupremeHealing(owner,kind)) return;
    for (let i = 0; i < damages.length; i++) if (/Healing/i.test(types[i] || '')) damages[i] = wb20MaxHealingFormula(damages[i]);
}
function wb20ClericControl(rule) {
    const text = wb20RuleText(rule.text);
    if (/^Lucky(?: 2024)?$/i.test(rule.name) && /give yourself Advantage/i.test(text) && /Luck Points/i.test(text)) return 'lucky';
    if (/^Celestial Revelation$/i.test(rule.name) && /Inner Radiance/i.test(text)) return 'radiance';
    return null;
}
function wb20ClericOwnTurn(args = {}) {
    return args['waybeyond20-attack-context']?.isOwnTurn !== false &&
        wayBeyond20GetTurnTrackerState()?.currentRoll20Turn?.isThisCharactersTurn !== false;
}
function wb20ClericAvailable(name, owner = character) {
    const turn = wayBeyond20AttackActivationTurnKey();
    return !turn || wb20ResourceStore(owner).turns[name] !== turn;
}
function wb20InnerRadianceRule(owner = character) {
    const r = wb20ClericRule('Celestial Revelation', owner);
    return r && /Inner Radiance/i.test(r.text) ? r : null;
}
function wb20InnerRadianceBonus(owner = character) {
    return Number(wb20RuleText(wb20InnerRadianceRule(owner)?.text).match(/additional\s*(\d+)\s*Radiant damage/i)?.[1]) || null;
}
function wb20ClericNeedsHit(args) {
    if(character.getSetting('waybeyond20-feature-controls',true)===false)return false;
    if (!args || !args.rollAttack || !args['to-hit'] || args['waybeyond20-followup-phase'] || !wb20ClericOwnTurn(args)) return false;
    const eligible=args['attack-source'] === 'item' && !args['waybeyond20-unarmed-strike'] && wb20HasModernDivineStrike() && wb20ClericAvailable('Divine Strike') ||
        character.getSetting('waybeyond20-inner-radiance-active', false) && wb20InnerRadianceBonus() && wb20ClericAvailable('Inner Radiance');
    if(eligible && !wb20ClericAttackTurns.has(args))wb20ClericAttackTurns.set(args,wayBeyond20AttackActivationTurnKey());
    return eligible;
}
async function wb20ClericAfterHit(args, resolved, dispatch, critical) {
    const owner = character, turn = wayBeyond20AttackActivationTurnKey(), rows = [];
    if(owner.getSetting('waybeyond20-feature-controls',true)===false)return rows;
    const originalTurn=wb20ClericAttackTurns.get(args) ?? args['waybeyond20-attack-context']?.turnKey;
    if(originalTurn !== undefined && originalTurn !== turn)return rows;
    if (!wb20ClericOwnTurn(args)) return rows;
    const choices = [];
    if (args['attack-source'] === 'item' && !args['waybeyond20-unarmed-strike'] && wb20HasModernDivineStrike(owner) && wb20ClericAvailable('Divine Strike', owner))
        choices.push({name:'Divine Strike', formula:wb20DivineStrikeDie(owner), types:['Radiant','Necrotic'], dice:true});
    if (owner.getSetting('waybeyond20-inner-radiance-active', false) && wb20InnerRadianceBonus(owner) && wb20ClericAvailable('Inner Radiance', owner))
        choices.push({name:'Inner Radiance',formula:String(wb20InnerRadianceBonus(owner)),types:['Radiant'],dice:false});
    for (const option of choices) {
        if (!option.formula || owner !== character || turn !== wayBeyond20AttackActivationTurnKey()) return rows;
        const options = {skip:'Skip',...Object.fromEntries(option.types.map(t=>[t,t+' — '+option.formula]))};
        const type = await dndbeyondDiceRoller.queryGeneric(option.name,
            option.name === 'Inner Radiance' ? 'Did this attack actually deal damage? Apply the once-on-your-turn bonus to one damaged target?' : 'Apply Divine Strike to this weapon hit on your turn?',
            options, 'waybeyond20-cleric-rider', ['skip',...option.types], 'skip');
        if (!option.types.includes(type)) continue;
        if (owner !== character || turn !== wayBeyond20AttackActivationTurnKey()) return rows;
        const rider = {name:option.name,description:'Extra damage from the completed hit; once on your turn. No additional Action or use.',
            'attack-source':'feature',rollAttack:false,rollDamage:true,rollCritical:!!critical && option.dice,
            damages:[option.formula],'damage-types':[type],
            'critical-damages':option.dice ? damagesToCrits(owner,[option.formula],[type]) : [],'critical-damage-types':option.dice ? [type] : [],
            'waybeyond20-followup-phase':'cleric-rider','waybeyond20-resource-costs':[],
            'waybeyond20-resource-per-turn':option.name};
        if (resolved.request?.whisper !== undefined) rider.whisper=resolved.request.whisper;
        let captured=[];rider['waybeyond20-capture-result']=(request,attacks,damages)=>{captured=damages;};
        if (await dispatch('attack',option.formula,rider) === true) rows.push(...captured);
    }
    return rows;
}
async function wb20ActivateClericControl(rule) {
    const owner=character,kind=wb20ClericControl(rule);if(!kind)return false;
    if(owner.getSetting('waybeyond20-feature-controls',true)===false)return false;
    if(kind==='lucky') {
        const choice=await dndbeyondDiceRoller.queryGeneric('Lucky','Choose how to use Lucky. Arming a roll spends nothing until that roll completes.',
            {arm:'Give my next d20 Test Advantage',defend:'Impose Disadvantage on an attack against me now',clear:'Cancel the armed use',skip:'Close'},
            'waybeyond20-lucky-use',['arm','defend','clear','skip'],'skip');
        if(owner!==character)return false;
        if(choice==='arm'){wb20ArmedLuck.set(owner,{busy:false});alertify.success('Lucky armed for your next d20 Test. No point spent yet.');return true;}
        if(choice==='clear'){wb20ArmedLuck.delete(owner);alertify.success('Armed Lucky use canceled.');return true;}
        if(choice==='defend')return sendRollWithCharacter('trait',0,{name:'Lucky',description:'Spend 1 Luck Point to impose Disadvantage on this attack roll against me. The attacker/DM applies it to their roll.',
            'waybeyond20-resource-costs':[{name:'Luck Points',amount:1}]});
        return false;
    }
    const active=owner.getSetting('waybeyond20-inner-radiance-active',false);
    const choice=await dndbeyondDiceRoller.queryGeneric('Celestial Revelation — Inner Radiance',
        'The transformation lasts 1 minute. Its native selection is not evidence that you activated it. End it here when it expires or you end it early.',
        active?{end:'End transformation',skip:'Keep active'}:{activate:'Activate: 1 Bonus Action + 1 use',track:'Track an activation I already paid for',skip:'Cancel'},
        'waybeyond20-inner-radiance',['activate','track','end','skip'],'skip');
    if(owner!==character || !['activate','track','end'].includes(choice))return false;
    if(choice==='activate') {
        const args={name:'Celestial Revelation — Inner Radiance',description:rule.text,'waybeyond20-resource-costs':[{name:'Celestial Revelation',amount:1}]};
        wayBeyond20AttachTurnResource(args,'bonusAction');
        if(await sendRollWithCharacter('trait',0,args)!==true || owner!==character)return false;
    }
    await new Promise(resolve=>owner.mergeCharacterSettings({'waybeyond20-inner-radiance-active':choice!=='end'},resolve));
    alertify.success(choice==='end'?'Inner Radiance ended.':'Inner Radiance tracked. Use the Searing Light entry at the end of your turn; end this transformation after 1 minute.');return true;
}
async function wb20WithArmedLuck(rollType,args,dispatch) {
    const owner=character,armed=wb20ArmedLuck.get(owner);
    if (armed && (owner.getSetting('waybeyond20-feature-controls',true)===false || !wb20ClericRules(owner).some(r=>wb20ClericControl(r)==='lucky'))) {wb20ArmedLuck.delete(owner);return dispatch();}
    const d20=['skill','ability','saving-throw','death-save','initiative'].includes(rollType) || ['attack','spell-attack'].includes(rollType) && args.rollAttack && args['to-hit'];
    if(!armed || armed.busy || !d20)return dispatch();
    armed.busy=true;
    const prior=args['waybeyond20-rule-advantage'],costs=args['waybeyond20-resource-costs'];
    args['waybeyond20-rule-advantage']=true;
    args['waybeyond20-resource-costs']=[...(costs || []),{name:'Luck Points',amount:1}];
    try {
        const result=await dispatch();
        if(result===true && wb20ArmedLuck.get(owner)===armed)wb20ArmedLuck.delete(owner);
        return result;
    } finally {
        armed.busy=false;
        if(prior===undefined)delete args['waybeyond20-rule-advantage'];else args['waybeyond20-rule-advantage']=prior;
        if(costs===undefined)delete args['waybeyond20-resource-costs'];else args['waybeyond20-resource-costs']=costs;
    }
}
async function wb20PrepareClericRiderAction(owner,name,description,native) {
    if(owner.getSetting('waybeyond20-feature-controls',true)===false)return null;
    const clean=wb20RuleText(name);
    const strike=/^Divine Strike$/i.test(clean) && wb20HasModernDivineStrike(owner);
    const radiance=/^Inner Radiance:\s*(?:Bonus Damage|Searing Light)$/i.test(clean) && wb20InnerRadianceRule(owner);
    if(!strike && !radiance)return null;
    const answer=await dndbeyondDiceRoller.queryGeneric(clean,strike?'This is extra damage for a completed weapon hit on your turn, not another attack. Choose its damage type.':'Resolve the selected Inner Radiance effect only while transformed; Searing Light happens at the end of your turn.',
        strike?{Radiant:'Radiant',Necrotic:'Necrotic',skip:'Cancel'}:{Radiant:'Roll Radiant damage',skip:'Cancel'},'waybeyond20-cleric-followup',strike?['Radiant','Necrotic','skip']:['Radiant','skip'],'skip');
    if(owner!==character || !['Radiant','Necrotic'].includes(answer))return {canceled:true};
    const properties={...native,'Attack Type':'Special','Damage Type':answer};
    delete properties.Reach;delete properties['Attack/Save'];
    if(strike){properties.Damage ||= wb20DivineStrikeDie(owner);properties['Range/Area']='Special';}
    else {properties.Damage ||= String(wb20InnerRadianceBonus(owner));properties['Range/Area']=/Searing Light/i.test(clean)?'10 ft.':'Special';}
    return {owner,kind:'cleric-followup',followup:true,properties,
        effects:[strike?'Divine Strike: extra weapon-hit damage; once on your turn. No additional Action.':'Inner Radiance: resolve only its qualifying bonus/end-of-turn effect. No additional Action.'],
        perTurn:strike?'Divine Strike':/Searing Light/i.test(clean)?'Inner Radiance: Searing Light':'Inner Radiance'};
}
function wb20InterventionProperties(owner,source,properties,level) {
    if(!/Divine Intervention/i.test(source) || !wb20ClericRule('Divine Intervention',owner))return false;
    if (/Reaction/i.test(properties['Casting Time'] || '') || wayBeyond20SpellCastLevel(level,'') > 5) {
        alertify.warning('This spell does not meet Divine Intervention’s level/casting-time restriction. Check the native choice with your DM; LightCore is retaining the native spell.');return false;
    }
    properties['Casting Time']='1 Action';
    if(properties.Components)properties.Components=properties.Components.replace(/\bM\b(?:\s*\([^)]*\))?/g,'').replace(/,\s*,/g,',').replace(/,\s*$/,'').trim();
    return true;
}
function wb20InterventionHealing(owner,damages,types,level,castas) {
    const rule=wb20ClericRule('Disciple of Life',owner),text=wb20RuleText(rule?.text);
    const base=text.match(/additional\s*(\d+)\s*(?:\+|plus)\s*(?:the )?spell slot/);
    if(!base || !/spell.*?spell slot/i.test(text))return;
    const extra=Number(base[1])+wayBeyond20SpellCastLevel(level,castas);
    const wisdom=Number(owner._spell_modifiers?.Cleric ?? owner.getAbility('WIS')?.mod);
    // DDB may already omit Disciple for a native free cast. Remove only its
    // identifiable slot-funded bonus, never a fixed heal or an unknown bonus.
    for(let i=0;i<damages.length;i++)if(/^Healing$/i.test(types[i] || '')) {
        const match=String(damages[i]).match(/^(\d*d\d+)\s*\+\s*(\d+)$/i);
        if(match && Number(match[2])===wisdom+extra)damages[i]=match[1]+(wisdom>=0?'+':'')+wisdom;
    }
}
function wb20InterventionPacket(args) {
    args['waybeyond20-no-slot-cast']=true;
    addEffect(args,'Divine Intervention: 1 Magic Action, no spell slot or Material components. Native Use/Cast records the feature use.');
}
function wb20HealingPoolPacket(owner,args,context) {
    if(args['waybeyond20-no-slot-cast'] || args['waybeyond20-healing-pool'])return;
    const text=wb20RuleText(args.description),pool=text.match(/restore (?:up to )?(\d+) (?:Hit Points|HP),? divided/i);
    const disciple=wb20RuleText(wb20ClericRule('Disciple of Life',owner)?.text);
    const base=disciple.match(/additional\s*(\d+)\s*(?:\+|plus)\s*(?:the )?spell slot/i);
    const level=wayBeyond20SpellCastLevel(context.level,context.castas);
    if(!pool || !base || level<1 || level>9)return;
    const amount=Number(pool[1]),extra=Number(base[1])+level;
    const index=(args.damages || []).findIndex((v,i)=>/^Healing$/i.test(args['damage-types']?.[i] || '') &&
        [amount,amount+extra].includes(Number(v)));
    if(index<0)return;
    args.damages[index]=String(amount);args['waybeyond20-healing-pool']=true;
    addEffect(args,`Divide the ${amount} HP base pool. If a spell slot was used, Disciple of Life adds ${extra} HP to each creature that regains HP, outside that pool. Apply allocations on recipients' sheets.`);
}
async function wb20ClericRest(owner) {
    wb20ArmedLuck.delete(owner);
    if(owner.getSetting('waybeyond20-inner-radiance-active',false))await new Promise(resolve=>owner.mergeCharacterSettings({'waybeyond20-inner-radiance-active':false},resolve));
}
