// Interpret the current character's descriptions. No campaign/character IDs or
// catalogue of homebrew rules. Native values remain authoritative.
const WB20_RULES_KEY = "waybeyond20-feature-rules";
const wb20RuleRerolledRequests = new WeakSet();
let wb20RuleBusy = false;
// Synchronous presentation pass only; never cache across a native DOM change,
// user activation, character change or asynchronous operation.
let wb20RuleRenderState = null;

function wb20RuleText(value) { return String(value || "").replace(/[’‘]/g,"'").replace(/\s+/g," ").trim(); }
function wb20RuleName(node) {
    return Array.from(node?.childNodes || []).filter(n=>n.nodeType === 3).map(n=>n.textContent).join("").trim() || "";
}
function wb20ReadNativeFeatureRules() {
    return Array.from(document.querySelectorAll('.ct-features .ct-feature-snippet,.ct-features .ddbc-feature-snippet,.ct-features [class~="ct-feature-snippet--class"],.ct-features [class~="ct-feature-snippet--racial-trait"],.ct-features [class~="ct-feature-snippet--feat"]')).map(node=>{
        const heading=node.querySelector('.ct-feature-snippet__heading,.ddbc-feature-snippet__heading,[class*="styles_heading"]');
        const content=node.querySelector('.ct-feature-snippet__content,.ddbc-feature-snippet__content,[class*="styles_content"]');
        const actions=Array.from(node.querySelectorAll('.ct-feature-snippet__action-summary,.ddbc-feature-snippet__action-summary')).map(n=>wb20RuleText(wb20RuleName(n)));
        const options=Array.from(node.querySelectorAll('.ct-feature-snippet__option-content,.ddbc-feature-snippet__option-content')).filter(n=>!content?.contains(n)).map(n=>n.textContent);
        return {name:wb20RuleName(heading),text:wb20RuleText([content?.textContent,...options].filter(Boolean).join(' ')),actions};
    }).filter(rule=>rule.name && (rule.text || rule.actions.length));
}
// A filtered Features tab unmounts the other categories. Its contents are an
// update to those rules, not proof that every other owned feature was removed.
function wb20NativeFeatureRulesComplete() {
    if (typeof document === "undefined") return false;
    return Array.from(document.querySelectorAll('.ct-features button')).some(button =>
        wb20RuleText(button.textContent).toLowerCase() === 'all' &&
        (button.getAttribute('aria-pressed') === 'true' || /(?:styles_active__|--active\b)/.test(button.className)));
}
function wb20MergeNativeFeatureRules(owner, live, complete = wb20NativeFeatureRulesComplete()) {
    const owned=[...(owner?._class_features || []),...(owner?._racial_traits || []),...(owner?._feats || [])].map(wb20ResourceId);
    const saved=owner?.getSetting?.(WB20_RULES_KEY,[]) || [];
    const retained=Array.isArray(saved) ? saved.filter(rule=>rule && typeof rule.name === "string" && typeof rule.text === "string" &&
        owned.some(name=>name === wb20ResourceId(rule.name) || name.startsWith(wb20ResourceId(rule.name)+" "))).map(rule=>({...rule,actions:Array.isArray(rule.actions)?rule.actions:[]})) : [];
    // Even an active All tab can be mid-render. Missing descriptions do not
    // revoke features still present in the owner's list. Replacement is safe
    // only when every retained owned rule is represented; otherwise merge.
    if (complete && live.length && retained.every(saved=>live.some(rule=>
        wb20ResourceId(rule.name)===wb20ResourceId(saved.name)))) return live;
    for (const rule of live) {
        const index=retained.findIndex(saved=>wb20ResourceId(saved.name)===wb20ResourceId(rule.name));
        if (index<0) retained.push(rule); else retained[index]=rule;
    }
    return retained;
}
function wb20CurrentFeatureRules(owner = character) {
    if(wb20RuleRenderState?.owner===owner)return wb20RuleRenderState.rules;
    const live=typeof document === "undefined" ? [] : wb20ReadNativeFeatureRules();
    const retained=wb20MergeNativeFeatureRules(owner,live);
    if (!live.length && typeof document !== "undefined") for (const node of document.querySelectorAll('.ct-actions .ct-feature-snippet,.ct-actions .ddbc-feature-snippet')) {
        const heading=node.querySelector('.ct-feature-snippet__heading,.ddbc-feature-snippet__heading,[class*="styles_heading"]');
        const name=wb20RuleName(heading),text=wb20RuleText(node.querySelector('.ct-feature-snippet__content,.ddbc-feature-snippet__content,[class*="styles_content"]')?.textContent);
        if (name && text && !retained.some(rule=>wb20ResourceId(rule.name) === wb20ResourceId(name) ||
            (wb20RuleOperators(rule).stabilize && wb20ResourceId(name).startsWith(wb20ResourceId(rule.name)+' ')))) retained.push({name,text,actions:[]});
    }
    return retained;
}
function wb20RuleReductionRoll(type,args) {
    // A damage-prevention spell is a utility roll, not damage inflicted on its
    // target. Preserve its already-attached Reaction/slot/commit intents.
    if (type !== 'spell-attack' || args?.rollAttack || !args?.damages?.length ||
        !/damage is reduced by\s+\d+d\d+/i.test(wb20RuleText(args.description))) return null;
    return {type:'custom',fallback:args.damages[0],args:{...args,name:args.name+': Damage reduction',modifier:args.damages[0],rollAttack:false,rollDamage:false,'waybeyond20-damage-reduction':true}};
}
function wb20RuleOperators(rule) {
    const text=wb20RuleText(rule.text), result={};
    if (typeof wb20ClericControl === 'function') result.clericControl=wb20ClericControl(rule);
    if (result.clericControl==='radiance') result.activation='bonusAction';
    const natural=text.match(/your unarmed strikes deal\s+(\d*d\d+)/i);
    if (natural) {result.unarmedDie=natural[1];result.unarmedNames=(rule.actions || []).map(s=>s.replace(/:\s*\d*\s*(?:bonus action|action|reaction|special)\s*$/i,"").trim());}
    if (/when you hit with an unarmed strike,? you gain temporary (?:hit points|hp) equal to the damage dealt/i.test(text)) result.drain=true;
    const wards=text.match(/automatically succeed on (?:saving throws|saves) against magical effects that would (?:give you|make you) (.+?)(?:\.|$)/i);
    if (wards) result.wards=[...wards[1].matchAll(/\b(Incapacitated|Stunned|Unconscious)\b/gi)].map(m=>m[1]);
    const reroll=text.match(/roll\s+(\d+)\s+or lower on the d20.*?spend\s+(\d+)\s+([A-Za-z ]+?points?)\s+to reroll/i);
    if (reroll && /must (?:accept|use) the second result/i.test(text)) result.reroll={threshold:Number(reroll[1]),amount:Number(reroll[2]),pool:reroll[3].trim().replace(/point$/i,'Points')};
    const stabilize=text.match(/spend\s+(\d+)\s+([A-Za-z ]+?points?)\s+to drop to\s+(\d+)\s+HP instead/i);
    if (stabilize && /reduced to 0 HP and not killed outright/i.test(text)) result.stabilize={amount:Number(stabilize[1]),pool:stabilize[2].trim().replace(/point$/i,'Points'),hp:Number(stabilize[3])};
    if (/when an ally is next to a creature at the start of your turn,? you have advantage on attacks against it/i.test(text)) result.pack=true;
    const casting=text.match(/^as (?:an? )?(magic action|bonus action|reaction|action)\b/i);
    if (casting && !result.reroll && !result.wards) result.activation=({"magic action":"action","bonus action":"bonusAction",reaction:"reaction",action:"action"})[casting[1].toLowerCase()];
    // These are native options of one shared pool, including Bill's explicit
    // Control Undead clarification. No class or character identity gate.
    if (/^(?:channel divinity: )?(?:control undead|abjure foes|divine sense)$/i.test(rule.name)) {
        result.pool="Channel Divinity";result.activation=/divine sense/i.test(rule.name)?"bonusAction":"action";
    }
    return result;
}
function wb20UnarmedRuleProducesStrike(rule) {
    const text=wb20RuleText(rule.text);
    if(!/unarmed strikes?/i.test(text))return false;
    return /your unarmed strikes? (?:deal|deals)\s+\d*d\d+/i.test(text) ||
        /(?:Dexterity|Dex\.?)(?: modifier)?\s+(?:instead of|in place of)\s+(?:your )?(?:Strength|Str\.?)/i.test(text) ||
        /roll\s+\d*d\d+\s+(?:in place of|instead of).*?(?:normal damage|Unarmed Strike)/i.test(text) ||
        /you can deal\s+(?:\d*d\d+|[a-z]+ damage equal to).*?(?:instead of|in place of).*?(?:strike|damage)/i.test(text);
}
function wb20RuleIsUnarmed(args, name = args?.name || "") {
    if (!args || args["attack-source"] === "spell") return false;
    // A weapon representation of wearable fist gauntlets: read the item itself,
    // not its display name. Ordinary swords/warhammers mentioning unarmed in
    // unrelated text do not qualify.
    if (args["attack-source"] === "item") return /while wearing these gauntlets/i.test(args.description || "") &&
        /your unarmed strikes deal (?:an )?extra/i.test(args.description || "") && /\b(?:fists|gauntlets)\b/i.test(args.description || "");
    const clean=wb20RuleText(name).toLowerCase().replace(/\s*\((?:strength|dexterity)\)$/,"");
    return wb20CurrentFeatureRules().some(rule=>{
        const text=wb20RuleText(rule.text);
        const names=[rule.name,...(rule.actions || []).map(name=>name.replace(/:\s*\d*\s*(?:bonus action|action|reaction|special)\s*$/i,'').trim())];
        return wb20UnarmedRuleProducesStrike(rule) &&
            names.some(n=>wb20RuleText(n).toLowerCase()===clean);
    });
}
function wb20RuleDrainingSource() { return wb20CurrentFeatureRules().find(rule=>wb20RuleOperators(rule).drain)?.name || null; }
function wb20RuleResourceAlias(pool,name,owner=character) {
    return wb20CurrentFeatureRules(owner).some(rule=>{
        if(wb20ResourceId(rule.name)!==wb20ResourceId(pool.name))return false;
        const declaration=rule.text.match(/\byou have\s+(\d+)\s+([a-z][a-z ]*?points?)\s+per\s+(?:long|short) rest/i);
        return declaration && Number(declaration[1]) === pool.max && wb20ResourceId(declaration[2]) === wb20ResourceId(name);
    });
}

function wb20RuleActivations() {
    if(wb20RuleRenderState?.owner===character && wb20RuleRenderState.activations)return wb20RuleRenderState.activations;
    const activations=wb20CurrentFeatureRules().map(rule=>({...rule,operator:wb20RuleOperators(rule)})).filter(rule=>{
        const o=rule.operator;return o.wards?.length || o.pack || o.stabilize || o.pool || o.clericControl;
    });
    if(wb20RuleRenderState?.owner===character)wb20RuleRenderState.activations=activations;
    return activations;
}
// List visibility only: automatic consumers continue reading the owned rules.
// Do not turn a passive rule into a stand-alone activation button.
function wb20RuleIsPassiveAction(name) {
    const clean=wb20RuleText(name);
    if (/^(?:Cleave|Graze|Nick|Push|Sap|Slow|Topple|Vex)\s*\([^)]*\)$/i.test(clean)) return true;
    if (/^Weapon Mastery$/i.test(clean)) return true;
    if (/^Divine Strike$/i.test(clean) && typeof wb20HasModernDivineStrike === 'function' && wb20HasModernDivineStrike()) return true;
    if (/^(?:Channel Divinity:\s*)?Sear Undead$/i.test(clean) &&
        wb20CurrentFeatureRules().some(rule => /^Sear Undead$/i.test(rule.name))) return true;
    const rule=wb20RuleFind(name);
    return !!rule && !rule.operator.activation && !!(rule.operator.wards?.length || rule.operator.pack || rule.operator.reroll || rule.operator.stabilize);
}
function wb20RuleFind(name) {
    const id=wb20ResourceId(String(name || '').replace(/\s*\((?:special|\d*\s*(?:bonus action|action|reaction))\)\s*$/i,''));
    return wb20RuleActivations().find(rule=>{
        const actual=wb20ResourceId(rule.name);
        return actual === id || id === "channel divinity "+actual ||
            (rule.operator.stabilize && id.startsWith(actual+' ') && id.endsWith(wb20ResourceId(rule.operator.stabilize.pool)));
    });
}
function wb20RuleCanActivate(name) { return character.getSetting('waybeyond20-feature-controls',true)!==false && !!wb20RuleFind(name); }
function wb20RuleCurrent(owner, turn) { return owner === character && turn === wayBeyond20AttackActivationTurnKey(); }
function wb20RuleEscape(value) { return wb20FeatureEscape(value); }

// Display aliases only. Keep original names for native activation, resources,
// saved visibility and rules lookup; unrelated feature prefixes stay distinct.
function wb20FeatureRowIdentity(name) {
    return wb20RuleText(name).replace(/^Channel Divinity:\s*/i,'').toLowerCase();
}

// A parent feature can describe several choices. Read the selected named
// clause first, so an unrelated option's range/duration is never borrowed.
function wb20FeaturePresentation(name,description,metadata={}) {
    const full=wb20RuleText(description),base=wb20RuleText(name).split(':').pop().trim();
    const escaped=base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const heading=escaped && new RegExp('(?:^|[.!?]\\s+)'+escaped+'[.:]\\s+','i').exec(full);
    const text=heading?full.slice(heading.index+heading[0].length):full;
    const distances=Array.from(text.matchAll(/\bwithin\s+(\d+)\s*(?:feet|ft\.?)(?=\s|[,.;:]|$)/gi));
    const ranges=[...new Set(distances.map(m=>m[1]))];
    const inferredRange=ranges.length===1?ranges[0]+' ft.':/\b(?:touch (?:a|one|the|another) (?:willing )?creature|creature you touch)\b/i.test(text)?'Touch':null;
    const range=metadata.range || inferredRange || metadata.fallbackRange || null;
    const save=text.match(/\bDC\s+(\d+)\s+(Wis(?:dom)?|Dex(?:terity)?|Con(?:stitution)?|Str(?:ength)?|Cha(?:risma)?|Int(?:elligence)?)\.?\s*(?:saving throw|save)/i);
    const saveLabel=metadata.save || (save?save[2].slice(0,3).toUpperCase()+' '+save[1]:null);
    const summary=wb20FeatureReminder(base,text,{range,save:saveLabel});
    const qualified=wb20RuleText(name).match(/^([^:]+):\s*(.+)$/);
    const family=qualified && (metadata.family || (/^Channel Divinity$/i.test(qualified[1]) ? qualified[1] : null));
    const label=metadata.label || (family ? qualified[2] : name);
    const category=metadata.category || family || '';
    const pool=metadata.pool;
    let balance='';
    if (Number.isInteger(pool?.remaining) && pool.remaining>=0) {
        balance=pool.kind==='numeric'
            ? `${pool.remaining} ${pool.remaining===1?'point':'points'} left`
            : Number.isInteger(pool.max) ? `${pool.remaining}/${pool.max} uses left` : `${pool.remaining} ${pool.remaining===1?'use':'uses'} left`;
    } else if (metadata.balanceOnly) balance='Pool balance unavailable';
    const notes=[balance,metadata.notePrefix,metadata.balanceOnly?'':summary].filter(Boolean).join(' · ') || metadata.fallbackNote || 'View rules';
    return {text,label,category,range,save:saveLabel,summary,notes};
}

// Only a declared option may inherit a feature's category. A colon alone is
// not a relationship and must not rename or merge unrelated custom actions.
function wb20DeclaredActionFamily(name) {
    const qualified=wb20RuleText(name).match(/^([^:]+):\s*(.+)$/);
    if (!qualified) return null;
    const id=wb20ResourceId(name), parent=wb20ResourceId(qualified[1]);
    const rule=wb20CurrentFeatureRules().find(rule=>wb20ResourceId(rule.name)===parent &&
        (rule.actions || []).some(action=>wb20ResourceId(wb20RuleText(action).replace(/:\s*(?:\d+\s+)?(?:magic action|bonus action|action|reaction|special|free)\s*$/i,''))===id));
    return rule?.name || null;
}

// Notes always opens read-only details, never the left icon's activation.
function wb20SetActionNote(cell,text,open,title='Open full details') {
    let button=cell.querySelector(':scope > .wb20-action-note');
    if(!button){button=document.createElement('button');button.type='button';button.className='wb20-action-note';cell.replaceChildren(button);
        button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(button.isConnected)Promise.resolve(button._wb20Open?.()).catch(console.warn);});}
    if(button.textContent!==text)button.textContent=text;
    if(button.title!==text)button.title=text;
    if(button.getAttribute('aria-label')!==title)button.setAttribute('aria-label',title);
    button._wb20Open=open;
}

function wb20OpenFeatureDetails(name,text) {
    const info=wb20FeaturePresentation(name,text);
    return wb20FeatureForm(name,(info.range?`<p><strong>Range:</strong> ${wb20RuleEscape(info.range)}</p>`:'')+`<p>${wb20RuleEscape(text || 'Full rules are not available from the current sheet.')}</p>`,'Done','Close');
}

function wb20FeaturePanePresentation(paneClass) {
    if(!['b20-action-pane','b20-class-feature-pane','b20-feat-pane','b20-racial-trait-pane','ct-racial-trait-pane'].includes(paneClass))return;
    const pane=document.querySelector('.'+paneClass);if(!pane)return;
    const name=pane.querySelector('.ct-sidebar__heading')?.textContent.trim();if(!name)return;
    const description=pane.querySelector('.ct-action-detail__description,.ddbc-action-detail__description,[class*="styles_description"]')?.textContent;
    const attackPane=Array.from(pane.querySelectorAll('.ct-property-list__property-label,.ddbc-property-list__property-label,[class*="InfoItem_label"],[class*="styles_label"]')).some(label=>/^(?:To Hit|Damage|Attack Type):?$/i.test(label.textContent.trim()));
    const info=wb20FeaturePresentation(name,description),enabled=character.getSetting('waybeyond20-feature-controls',true)!==false && !attackPane;
    for(const value of pane.querySelectorAll('[data-wb20-original-range]')){
        const derived=value.getAttribute('data-wb20-derived-range');
        if(enabled && info.range===derived && value.textContent===derived && value.getAttribute('data-wb20-range-owner')===name)continue;
        if(value.textContent===derived)value.textContent=value.getAttribute('data-wb20-original-range');
        for(const key of ['data-wb20-original-range','data-wb20-derived-range','data-wb20-range-owner'])value.removeAttribute(key);
    }
    if(!enabled || !info.range)return;
    for(const property of pane.querySelectorAll('[role="list"] > div')){
        const label=property.querySelector('.ct-property-list__property-label,.ddbc-property-list__property-label,[class*="InfoItem_label"],[class*="styles_label"]');
        const value=property.querySelector('.ct-property-list__property-content,.ddbc-property-list__property-content,[class*="InfoItem_value"],[class*="styles_value"]');
        if(!value || !/^Range(?:\/Area)?:?$/i.test(label?.textContent.trim() || ''))continue;
        // Keep explicit native numbers/Touch/Self. Repair only its placeholder.
        if(!/^[-–—\s]+(?:ft\.?\s*)?(?:Reach)?$/i.test(value.textContent.trim()))continue;
        if(!value.hasAttribute('data-wb20-original-range'))value.setAttribute('data-wb20-original-range',value.textContent);
        value.setAttribute('data-wb20-derived-range',info.range);value.setAttribute('data-wb20-range-owner',name);value.textContent=info.range;
    }
}

// Presentation only. Extract a short reminder from the current native wording;
// this does not grant an action, modifier, target or resource entitlement.
function wb20FeatureReminder(name,description,columns=null) {
    const text=wb20RuleText(description),o=wb20RuleOperators({name,text}),parts=[];
    const within=text.match(/within\s+(\d+)\s*(?:ft\.?|feet)\b/i),duration=text.match(/(?:for (?:the next )?|for\s+)(\d+)\s*(min(?:ute)?s?\.?|hours?|hrs?\.?)/i);
    const range=within?within[1]+' ft.':null,time=duration?duration[1]+' '+(/^min/i.test(duration[2])?'min':'hr'):null;
    const push=text.match(/push (?:the creature|a creature|creature|it|the target|target) up to\s+(\d+)\s*ft/i);
    if(push && /if you hit/i.test(text))return `On hit: push up to ${push[1]} ft.${/large or smaller/i.test(text)?' · Large or smaller':''}`;
    if(/disadvantage on its next attack roll/i.test(text))return 'On hit: next attack has Disadvantage · before your next turn';
    if(o.reroll && o.stabilize)return `${o.reroll.amount} point: reroll d20 ≤${o.reroll.threshold} (keep new), or remain at ${o.stabilize.hp} HP`;
    if(o.wards?.length)return 'Automatic saves vs magical '+o.wards.join(', ');
    if(o.pack)return 'Advantage if an ally was next to the target at your turn’s start';
    if(/provokes an opportunity attack/i.test(text) && /cast (?:a |the )?spell/i.test(text) && /(?:one|1) action/i.test(text))return 'Opportunity trigger: cast a one-Action spell at that creature · 1 Reaction';
    const noteRange=columns?.range===range?null:range;
    if(/know the location of any (?:of those types|celestials, fiends, and undead)/i.test(text))return ['Detect Celestials, Fiends and Undead',noteRange,time].filter(Boolean).join(' · ');
    if(/frightened/i.test(text) && /saving throw|\bsave\b/i.test(text)){
        const targets=text.match(/(?:target )?up to\s+(\d+)\s+creatures/i),save=text.match(/DC\s+(\d+)\s+(Wis\.?|Wisdom|Dex\.?|Dexterity|Con\.?|Constitution|Str\.?|Strength|Cha\.?|Charisma|Int\.?|Intelligence)\s*(?:saving throw|save)/i);
        if(targets)parts.push((columns?'Up to ':'')+targets[1]+' creatures');if(noteRange)parts.push(noteRange);if(save && columns?.save!==save[2].slice(0,3).toUpperCase()+' '+save[1])parts.push(save[2].replace(/\.$/,'')+' '+save[1]);parts.push('Frightened'+(time?' '+time:''));if(/until (?:it|they) takes? damage/i.test(text))parts.push('ends on damage');return parts.join(' · ');
    }
    const purify=text.match(/expend\s+(\d+)\s+HP.*?remove the Poisoned condition/i);if(purify)return columns?`${purify[1]} pool points · remove Poisoned`:`Spend ${purify[1]} pool points: remove Poisoned`;
    const healing=text.match(/restore a total of\s+(\d+)\s+HP/i);if(healing && /pool of healing/i.test(text))return `${healing[1]} HP healing pool · refills on Long Rest`;
    if(/touch a creature/i.test(text) && /restore a number of HP/i.test(text) && /pool/i.test(text))return columns?'Pool points spent = HP restored':'Touch: spend healing-pool points to restore that much HP';
    if(columns && /obey(?:s)? your (?:verbal )?commands/i.test(text)){
        const target=text.match(/(?:target|choose) (one|a|an) (undead(?: creature)?|creature)/i);
        return [target?'1 '+target[2].replace(/ creature$/i,''):null,'Obeys commands'+(time?' '+time:''),/until you use (?:this|the).*?(?:again|another)/i.test(text)?'ends on reuse':null].filter(Boolean).join(' · ');
    }
    if(/channel energy directly/i.test(text) && /channel divinity/i.test(text))return 'Shared uses · Long Rest refill; Short Rest regains 1 use';
    const melee=text.match(/\+(\d+)\s+bonus to melee attack damage rolls/i);if(melee)return [range?`Allies within ${range}`:'Allies',`+${melee[1]} melee damage`,/conscious/i.test(text)?'while conscious':null].filter(Boolean).join(' · ');
    let sentence=text.split(/(?<=[.!?])\s+/)[0] || '';
    if(columns){
        sentence=sentence.replace(/^As (?:an? )?(?:Magic action|Bonus Action|Reaction|action),?\s*/i,'').replace(/^you can\s+/i,'');
        // Remove only a targeting-range phrase already shown in RANGE. Effect
        // distances (push/move/etc.) and unknown ranges must remain intact.
        if(columns.range && range===columns.range)sentence=sentence.replace(/\s+within\s+\d+\s*(?:feet|ft\.?)(?:\s+of (?:you|yourself))?/i,'');
        sentence=sentence.replace(/[.!]$/,'').replace(/^./,s=>s.toUpperCase());
    }
    return sentence.length<=95?sentence:sentence.slice(0,92).replace(/\s+\S*$/,'')+'…';
}

async function wb20ActivateRule(name) {
    const rule=wb20RuleFind(name);if (!rule || wb20RuleBusy) return false;
    const owner=character,turn=wayBeyond20AttackActivationTurnKey(),o=rule.operator,esc=wb20RuleEscape;
    wb20RuleBusy=true;
    try {
        if (o.clericControl) return wb20ActivateClericControl(rule);
        if (o.wards?.length) {
            const form=await wb20FeatureForm(rule.name,`<p>${esc(rule.text)}</p><label>Condition <select name="condition">${o.wards.map(c=>`<option>${esc(c)}</option>`).join("")}</select></label><p>Applies to a magical effect causing this condition. It does not prevent falling unconscious from 0 HP.</p><label><input type="checkbox" name="magical"> This is a magical effect, not unconsciousness from 0 HP</label>`,"Record automatic success");
            if (!form || !form.find('[name="magical"]').prop('checked') || !wb20RuleCurrent(owner,turn)) return false;
            return sendRollWithCharacter('trait',0,{name:rule.name,description:`Automatic saving throw success against the magical ${form.find('[name="condition"]').val()} effect. ${rule.text}`});
        }
        if (o.pack) {
            const form=await wb20FeatureForm(rule.name,`<p>${esc(rule.text)}</p><label>Eligible target(s) <input name="targets" maxlength="300" placeholder="Names, separated by commas"></label><p>Record only creatures that had an ally next to them at the start of your turn. No current-position guess is made.</p>`,"Record for this turn");
            if (!form || !wb20RuleCurrent(owner,turn)) return false;
            const targets=String(form.find('[name="targets"]').val()||'').split(',').map(wb20RuleText).filter(Boolean);
            if (!targets.length) return false;
            const result=await sendRollWithCharacter('trait',0,{name:rule.name,description:`Eligible this turn: ${targets.join(', ')}. ${rule.text}`});
            if (result === true && wb20RuleCurrent(owner,turn)) await new Promise(resolve=>owner.mergeCharacterSettings({'waybeyond20-rule-pack':{turn,source:rule.name,targets}},resolve));
            return result;
        }
        if (o.stabilize) {
            const hp=wayBeyond20CurrentHitPoints();
            if (hp.current !== 0) {await wb20FeatureForm(rule.name,`<p>${esc(rule.text)}</p><p>Reroll is offered after an eligible d20 result, before that result is delivered. Stabilize becomes available here when you are at 0 HP and were not killed outright.</p>`,"Done");return false;}
            const form=await wb20FeatureForm(rule.name,`<p>Spend ${o.stabilize.amount} ${esc(o.stabilize.pool)} to drop to ${o.stabilize.hp} HP instead.</p><label><input type="checkbox" name="eligible"> Reduced to 0 HP and not killed outright</label>`,"Use Stabilize");
            if (!form || !form.find('[name="eligible"]').prop('checked') || !wb20RuleCurrent(owner,turn) || wayBeyond20CurrentHitPoints().current !== 0) return false;
            const args={name:rule.name+': Stabilize',description:rule.text,'waybeyond20-resource-costs':[{name:o.stabilize.pool,amount:o.stabilize.amount}]};
            const result=await sendRollWithCharacter('trait',0,args);
            if (result === true && wb20RuleCurrent(owner,turn) && wayBeyond20CurrentHitPoints().current === 0) {
                const applied=await wayBeyond20ApplyHealingToSelf(o.stabilize.hp,{source:rule.name,notify:false});
                if (!applied.applied) alertify.warning('Stabilize was used. Set HP to 1 manually; do not repeat the feature to retry the HP update.');
            }
            return result;
        }
        if (o.pool) {
            const form=await wb20FeatureForm(rule.name,`<p>${esc(rule.text)}</p><p>Uses one ${esc(o.pool)} and one ${o.activation === 'bonusAction'?'Bonus Action':'Action'}.</p><label>Target(s), if applicable <input name="targets" maxlength="300"></label><p>Resolve the target's saving throw and eligibility at the table. An unavailable VTT does not prevent use.</p>`,"Use feature");
            if (!form || !wb20RuleCurrent(owner,turn)) return false;
            const args={name:rule.name,description:rule.text+'\nTargets: '+String(form.find('[name="targets"]').val()||'resolve at table'),'waybeyond20-resource-costs':[{name:o.pool,amount:1}]};
            wayBeyond20AttachTurnResource(args,o.activation,{name:rule.name,rollType:'trait'});
            const result=await sendRollWithCharacter('trait',0,args);
            if (result === true && wb20RuleCurrent(owner,turn)) {
                const duration=wayBeyond20ParseTalentDuration('',rule.text);
                if (duration.value) wayBeyond20TrackSelfFeatureEffect(rule.name,`${duration.value} ${duration.unit}`, [{name:'Targets',value:String(form.find('[name="targets"]').val()||'resolve at table')}],['feature']);
            }
            return result;
        }
        return false;
    } finally {wb20RuleBusy=false;}
}

async function wb20RulePrepareAttack(args) {
    if (!args?.rollAttack || args['waybeyond20-followup-phase'] || args['waybeyond20-rule-pack-checked']) return true;
    args['waybeyond20-rule-pack-checked']=true;
    const owner=character,turn=wayBeyond20AttackActivationTurnKey(),rule=wb20CurrentFeatureRules().find(r=>wb20RuleOperators(r).pack);
    if (!rule) return true;
    const state=wayBeyond20GetTurnTrackerState();
    const target=[...(state.knownTargets || []),...(state.extraTargets || [])].find(t=>(t.tokenId || t.key) === state.selectedTargetKey);
    const name=target?.name || state.targetRecords?.[state.selectedTargetKey]?.name || '';
    const recorded=owner.getSetting('waybeyond20-rule-pack',null);
    const eligible=recorded?.turn === turn && name && recorded.targets?.some(n=>wb20RuleText(n).toLowerCase() === wb20RuleText(name).toLowerCase());
    let applies=eligible;
    if (!eligible) {
        // No board history is evidence of this start-of-turn requirement. The
        // player can confirm it even with no VTT or selected target.
        const form=await wb20FeatureForm(rule.name,`<p>${wb20RuleEscape(rule.text)}</p><label><input type="checkbox" name="eligible"> This attack's target had an ally next to it at the start of my turn</label>`,"Continue attack");
        if (!form || !wb20RuleCurrent(owner,turn)) return false;
        applies=!!form.find('[name="eligible"]').prop('checked');
    }
    if (applies) {
        // Combine after the normal global/hotkey/query modifiers have resolved.
        // The existing combiner handles cancellation and Super modes.
        if (args['waybeyond20-explicit-attack-mode'] === undefined) args['waybeyond20-rule-advantage']=true;
        addEffect(args,rule.name);
    }
    return true;
}
function wb20RuleApplyResolvedAdvantage(request) {
    if (!request['waybeyond20-rule-advantage']) return;
    delete request['waybeyond20-rule-advantage'];adjustRollAndKeyModifiersWithAdvantage(request);
}

async function wb20RuleRerollD20(rolls,request,roller) {
    if (!request || wb20RuleRerolledRequests.has(request) || request['waybeyond20-portent-value'] !== undefined ||
        !['attack','spell-attack','skill','ability','saving-throw','death-save','initiative'].includes(request.type)) return;
    const owner=typeof character !== 'undefined' ? character : null, actor=request.character;
    // This feature pays from its owner's pool, never a nearby companion's.
    // Wild Shape is the same owner in another form; a summoned creature isn't.
    const ownerId=actor?.type === 'Character' ? actor.id :
        actor?.type === 'Creature' && actor.creatureType === 'Wild Shape' ? actor['feature-owner-id'] : null;
    if (!owner || ownerId === null || ownerId === undefined || String(ownerId) !== String(owner._id)) return;
    const turn=wayBeyond20AttackActivationTurnKey();
    const rule=wb20CurrentFeatureRules().find(r=>wb20RuleOperators(r).reroll);if (!rule) return;
    const cost=wb20RuleOperators(rule).reroll;
    const advantage = request.advantage === RollType.ADVANTAGE || request.advantage === RollType.SUPER_ADVANTAGE;
    const choices=[];
    for (const roll of rolls) {
        if (["damage","critical-damage"].includes(roll._roll_type) || roll.isDiscarded?.()) continue;
        for (const die of roll.dice || []) if (die.faces === 20) for (const result of die.rolls || []) {
            if (result.discarded) continue;
            if (result.roll <= cost.threshold) choices.push({roll,die,result});
            else if (advantage) return;
        }
    }
    if (!choices.length) return;
    let pool=wb20Resource(cost.pool,owner);
    if (!pool || pool.remaining === null) await wb20VisitResourceSheets(async()=>{const found=wb20Resource(cost.pool,owner);if(found && found.remaining!==null)pool=found;},owner);
    if (!wb20RuleCurrent(owner,turn)) return;
    if (!pool || pool.remaining === null || pool.remaining < cost.amount) return;
    const form=await wb20FeatureForm(rule.name,`<p>Spend ${cost.amount} ${wb20RuleEscape(cost.pool)} to reroll one d20 showing ${cost.threshold} or lower. The new result must be kept, even if lower. Other dice and modifiers are unchanged.</p><select name="die">${choices.map((c,i)=>`<option value="${i}">d20: ${c.result.roll} (total ${c.roll.total})</option>`).join('')}</select>`,"Spend and reroll","Keep Roll");
    if (!form || !wb20RuleCurrent(owner,turn)) return;
    const choice=choices[Number(form.find('[name="die"]').val())];if (!choice) return;
    const fresh=wb20Resource(cost.pool,owner);if (!fresh || fresh.remaining < cost.amount) return;
    const replacement=roller.roll('1d20');await replacement.roll();
    if (!wb20RuleCurrent(owner,turn)) return;
    // Already inside the shared dispatch transaction: do not acquire its lock
    // again. Expected-value native spending protects another-tab changes.
    if (!await wb20SetResource(fresh.name,fresh.remaining-cost.amount,{owner,expected:fresh.remaining,reason:rule.name+' reroll'})) {
        alertify.warning('The reroll resource could not be updated. The original roll is retained; check Correction.');return;
    }
    choice.result.discarded=true;
    choice.die.rolls.push({roll:replacement.total});choice.die.calculateTotal();choice.roll.calculateTotal();
    wb20RuleRerolledRequests.add(request);addEffect(request,rule.name+' reroll');
}

function wb20RuleRows(root, existing = []) {
    const entries=[],wanted=new Set(),seen=new Set(existing.map(entry=>wb20FeatureRowIdentity(entry.name)));
    if (character.getSetting('waybeyond20-feature-controls',true)===false) {root.querySelectorAll(':scope > .wb20-rule-row').forEach(n=>n.remove());return entries;}
    for (const rule of wb20RuleActivations()) {
        if (wb20RuleIsPassiveAction(rule.name)) continue;
        const identity=wb20FeatureRowIdentity(rule.name);
        if (seen.has(identity) || existing.some(entry=>wb20RuleFind(entry.name)?.name === rule.name)) continue;
        seen.add(identity);
        wanted.add(rule.name);
        let row=Array.from(root.querySelectorAll(':scope > .wb20-rule-row')).find(n=>n._wb20RuleName === rule.name);
        if (!row) {
            row=document.createElement('div');row.className='ddbc-combat-attack wb20-feature-option wb20-rule-row';row._wb20RuleName=rule.name;
            row.innerHTML='<button type="button" class="wb20-feature-option-icon"><svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 2 18 10 10 18 2 10Z"/></svg></button><div class="ddbc-combat-attack__name"><span class="wb20-rule-label"></span><div class="wb20-talent-category"></div></div><div class="ddbc-combat-attack__range"></div><div class="ddbc-combat-attack__action"></div><div class="ddbc-combat-attack__damage"></div><div class="ddbc-combat-attack__notes"></div>';
            row.querySelector('button').addEventListener('click',()=>{if(row._wb20RuleOwner === character) wb20ActivateRule(row._wb20RuleName).catch(console.warn);});root.append(row);
        }
        row._wb20RuleOwner=character;
        const pool=rule.operator.pool ? wb20Resource(rule.operator.pool) : rule.operator.stabilize ? wb20Resource(rule.operator.stabilize.pool) : null;
        const info=wb20FeaturePresentation(rule.name,rule.text,{family:wb20DeclaredActionFamily(rule.name),category:rule.operator.pool,pool});
        const subtitle=row.querySelector('.wb20-talent-category');const category=info.category || 'Feature';if(subtitle.textContent!==category)subtitle.textContent=category;
        const values={name:info.label,range:info.range || '--',action:info.save || '--',damage:'--'};
        for(const [field,value] of Object.entries(values)){const el=row.querySelector(field==='name'?'.wb20-rule-label':'.ddbc-combat-attack__'+field);if(el.textContent!==value)el.textContent=value;}
        wb20SetActionNote(row.querySelector('.ddbc-combat-attack__notes'),info.notes,()=>{if(row._wb20RuleOwner===character)return wb20OpenFeatureDetails(rule.name,rule.text);},'Read '+rule.name+': full details');
        const button=row.querySelector('button');if(button.title!==rule.text){button.title=rule.text;button.setAttribute('aria-label','Use '+rule.name);}
        const cost=rule.operator.activation || 'special';entries.push({row,name:rule.name,cost,group:cost==='special'?'action':cost});
    }
    for(const row of root.querySelectorAll(':scope > .wb20-rule-row'))if(!wanted.has(row._wb20RuleName))row.remove();
    return entries;
}

// The owner replaced the Feature rules button with pet toggles on Actions.
function wb20RuleToolbar(toolbar) {
    toolbar.querySelector('.wb20-rule-library')?.remove();
}
