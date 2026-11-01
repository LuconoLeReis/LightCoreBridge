// Item property activations are producers of the common attack/resource flow.
// Interpret the currently open native item; never edit its name or equipment.
const wb20ItemRuleSaves = new WeakMap();
let wb20ItemRuleBusy = false;

function wb20ReadItemRule(pane = document.querySelector('.b20-item-pane')) {
    if (!pane) return null;
    const title=pane.querySelector('.ct-sidebar__heading [class*="styles_itemName"]') || pane.querySelector('.ct-sidebar__heading');
    const name=wb20RuleText(title?.textContent).replace(/\*$/,'').trim();
    const text=wb20RuleText(pane.querySelector('.ct-item-detail__description')?.textContent);
    if (!name || !text) return null;
    const equipped=Array.from(pane.querySelectorAll('button')).some(b=>/^unequip$/i.test(b.textContent.trim()));
    return {name,text,equipped};
}
function wb20ParseItemProperties(item) {
    const text=item.text,properties=[];
    const flame=text.match(/your Unarmed Strikes deal (?:an )?extra (\d+d\d+)\s+(\w+) damage on a hit/i);
    if (flame && /while wearing these gauntlets/i.test(text) && /bonus action/i.test(text))
        properties.push({kind:'flames',name:'Flames',dice:flame[1],type:flame[2],cost:'bonusAction'});
    const bash=text.match(/([^.]+)\. When you take the Attack action, you can make one of the attack rolls using the Shield.*?deals (\w+) damage equal to (\d+d\d+) plus your Strength modifier/i);
    if (bash) properties.push({kind:'bash',name:bash[1].trim(),dice:bash[3],type:bash[2],cost:'action'});
    const salvo=text.match(/([^.]+)\. As a Magic action,.*?(\d+)-foot Cone.*?DC (\d+) (\w+) saving throw.*?taking (\d+d\d+) (\w+) damage.*?half as much.*?next dawn/i);
    if (salvo) properties.push({kind:'save',name:salvo[1].trim(),range:salvo[2]+'-foot Cone',dc:salvo[3],save:salvo[4],dice:salvo[5],type:salvo[6],cost:'action',charge:true});
    return properties;
}
function wb20RememberItemRule(item, owner=character) {
    const saved=owner.getSetting('waybeyond20-rule-items',[]),items=Array.isArray(saved)?saved:[];
    const key=wb20ResourceId(item.name),next=items.filter(r=>wb20ResourceId(r.name)!==key).concat(item).slice(-40);
    const signature=JSON.stringify(next);
    if (JSON.stringify(items) === signature || wb20ItemRuleSaves.get(owner) === signature) return;
    wb20ItemRuleSaves.set(owner,signature);
    owner.mergeCharacterSettings({'waybeyond20-rule-items':next},()=>{if(wb20ItemRuleSaves.get(owner)===signature)wb20ItemRuleSaves.delete(owner);});
}
function wb20ItemFlames(item, owner=character) {
    return (owner.getSetting('waybeyond20-rule-flames',{}) || {})[wb20ResourceId(item.name)];
}
function wb20ItemAttackOptions(item,owner=character) {
    return (owner.getSetting('waybeyond20-unarmed-equipment',{}) || {})[wb20ResourceId(item.name)] || {};
}
function wb20ItemWeaponBonus() {
    for(const rule of wb20CurrentFeatureRules()) {
        const match=rule.text.match(/while holding a melee weapon in one hand and no other weapons, you gain a \+(\d+) bonus to damage rolls with that weapon/i);
        if(match)return{name:rule.name,amount:Number(match[1])};
    }
    return null;
}
function wb20ItemMasteries() {
    return [...new Set(wb20CurrentFeatureRules().flatMap(rule=>(rule.actions || []).map(s=>s.match(/^([a-z]+)\s*\([^)]*\):\s*\d*\s*action/i)?.[1]).filter(Boolean)))];
}
function wb20NaturalUnarmedDamage(args) {
    if(args['attack-source']==='item' || !wayBeyond20RollIsUnarmedStrike(args,args.name))return;
    const natural=wb20CurrentFeatureRules().map(wb20RuleOperators).find(o=>o.unarmedDie);
    const formula=String(args.damages?.[0] || '');
    if(!natural || !/^\d+(?:\s*[+\-]\s*\d+)*$/.test(formula))return;
    // DDB's ordinary Unarmed row starts with base 1 damage and already includes
    // native flat bonuses. Replace that base only; leave every modifier intact.
    const total=(formula.match(/[+\-]?\s*\d+/g) || []).reduce((sum,n)=>sum+Number(n.replace(/\s/g,'')),0);
    args.damages[0]=natural.unarmedDie+(total-1>=0?'+':'')+(total-1);
    const type=args['damage-types']?.[0] || 'Bludgeoning';
    const crit=typeof damagesToCrits==='function'?damagesToCrits(character,[natural.unarmedDie])[0]:natural.unarmedDie;
    args['critical-damages']=[...(args['critical-damages'] || []),crit];args['critical-damage-types']=[...(args['critical-damage-types'] || []),type];
}
async function wb20SetItemFlames(item, active, owner=character) {
    await new Promise(resolve=>owner.mergeCharacterSettings({'waybeyond20-rule-flames':{...(owner.getSetting('waybeyond20-rule-flames',{}) || {}),[wb20ResourceId(item.name)]:active}},resolve));
    const name=item.name+' — Flames';
    const effects=wayBeyond20GetTrackedSpellEffects().filter(e=>e.name === name);
    if (!active) effects.forEach(e=>wayBeyond20RemoveTrackedEffect(wayBeyond20EffectKey(e)));
    else if (!effects.length) wayBeyond20TrackSelfFeatureEffect(name,'Until extinguished or removed',[{name:'Light',value:'Bright 40 ft.; Dim +40 ft.'}],['feature']);
}
function wb20ItemMeleeBonus() {
    if (wayBeyond20SelfHasCondition('Unconscious')) return 0;
    return wb20CurrentFeatureRules().reduce((bonus,rule)=>{
        const match=rule.text.match(/you and your allies.*?\+(\d+)\s+bonus to melee attack damage rolls/i);
        return match ? Math.max(bonus,Number(match[1])) : bonus;
    },0);
}
async function wb20PrepareItemRules(args) {
    if (!args || args['waybeyond20-item-rules-prepared'] || args['waybeyond20-followup-phase'] || !(args.rollAttack || args.rollDamage)) return true;
    args['waybeyond20-item-rules-prepared']=true;
    const owner=character,turn=wayBeyond20AttackActivationTurnKey();
    wb20NaturalUnarmedDamage(args);
    const ownItem=args['attack-source'] === 'item' ? {name:wb20RuleText(args.name).replace(/\*$/,''),text:wb20RuleText(args.description),equipped:true} : null;
    const items=owner.getSetting('waybeyond20-rule-items',[]) || [];
    const item=ownItem && wb20ParseItemProperties(ownItem).some(p=>p.kind==='flames') ? ownItem :
        Array.isArray(items) ? items.find(i=>i.equipped && wb20ParseItemProperties(i).some(p=>p.kind==='flames')) : null;
    if (!item || !wayBeyond20RollIsUnarmedStrike(args,args.name)) return true;
    const options=wb20ItemAttackOptions(item,owner),bonus=wb20ItemWeaponBonus();
    if(options.mastery && wb20ItemMasteries().includes(options.mastery)) {
        args.mastery=options.mastery;
        if(options.mastery==='Push')addEffect(args,'Push on hit: up to 10 ft. straight away; Large or smaller (resolve at table)');
    }
    if(options.mastery==='none')delete args.mastery;
    if(options.weaponBonus && bonus && args['attack-source']!=='item' && args.damages?.length) {
        args.damages[0]+='+'+bonus.amount;addEffect(args,bonus.name+' (gauntlets)');
    }
    const flame=wb20ParseItemProperties(item).find(p=>p.kind==='flames');
    let active=wb20ItemFlames(item);
    if (active === undefined) {
        const form=await wb20FeatureForm(item.name+' — Flames',`<p>Are your fists already ablaze? This records their current state; it does not activate the gauntlets or spend a Bonus Action.</p><label><input type="checkbox" name="active"> Flames are already active</label>`,"Continue attack");
        if (!form || !wb20RuleCurrent(owner,turn)) return false;
        active=!!form.find('[name="active"]').prop('checked');await wb20SetItemFlames(item,active,owner);
    }
    // Replace only this item's conditional line. Native base damage already
    // includes DDB's modifiers (including aura/dueling); never add those again.
    for(let i=(args['damage-types'] || []).length-1;i>=0;i--) {
        if (/while your fists are ablaze/i.test(args['damage-types'][i])) {
            args.damages.splice(i,1);args['damage-types'].splice(i,1);
        }
    }
    for(let i=(args['critical-damage-types'] || []).length-1;i>=0;i--) {
        if (/while your fists are ablaze/i.test(args['critical-damage-types'][i])) {args['critical-damages'].splice(i,1);args['critical-damage-types'].splice(i,1);}
    }
    const present=(args['damage-types'] || []).some((type,i)=>String(type).toLowerCase()===flame.type.toLowerCase() && args.damages[i]===flame.dice);
    if (active && !present) {
        args.damages=[...(args.damages || []),flame.dice];args['damage-types']=[...(args['damage-types'] || []),flame.type];
        const critical=typeof damagesToCrits === 'function'?damagesToCrits(owner,[flame.dice])[0]:flame.dice;
        args['critical-damages']=[...(args['critical-damages'] || []),critical];args['critical-damage-types']=[...(args['critical-damage-types'] || []),flame.type];
    }
    return wb20RuleCurrent(owner,turn);
}
async function wb20ActivateItemProperty(item, property) {
    if (wb20ItemRuleBusy || !item.equipped) return false;
    const owner=character,turn=wayBeyond20AttackActivationTurnKey(),name=item.name+' — '+property.name;
    wb20ItemRuleBusy=true;
    try {
        const current=wb20ReadItemRule();
        if (!current || current.name!==item.name || !current.equipped || current.text!==item.text) return false;
        if(property.kind==='flames') {
            const active=wb20ItemFlames(item)===true;
            if(!await wb20FeatureForm(name,`<p>${active?'Extinguish':'Ignite'} the gauntlets using one Bonus Action?</p><p>${wb20RuleEscape(item.text)}</p>`,'Use Bonus Action') || !wb20RuleCurrent(owner,turn))return false;
            const args={name,description:item.text};wayBeyond20AttachTurnResource(args,'bonusAction',{name,rollType:'trait'});
            const sent=await sendRollWithCharacter('trait',0,args);
            if(sent===true && wb20RuleCurrent(owner,turn))await wb20SetItemFlames(item,!active,owner);
            return sent;
        }
        if(!await wb20FeatureForm(name,`<p>${wb20RuleEscape(item.text)}</p><p>${property.kind==='bash'?'Uses one attack from the Attack action. It is a shield attack, not an Unarmed Strike.':'Uses one Magic action and the item charge; resolve each creature’s save, half damage on success. Recharges at dawn, not by a WB20 long-rest reset.'}</p>`,'Use property') || !wb20RuleCurrent(owner,turn))return false;
        const str=Number(owner.getAbility('STR')?.mod)||0,pb=Number(owner._proficiency)||0;
        const damages=[property.dice+(property.kind==='bash'?`+${str+wb20ItemMeleeBonus()}`:'')],types=[property.type],changes={},effects=[];
        const props=property.kind==='bash'?{'Attack Type':'Melee',Reach:'5 ft.','Damage Type':property.type}:{};
        let hit=property.kind==='bash'?String(str+pb):undefined;
        if(property.kind==='bash') {
            hit=handleSpecialGeneralAttacks(damages,types,props,changes,{to_hit:hit,item_name:name,effects});
            hit=handleSpecialMeleeAttacks(damages,types,props,changes,{to_hit:hit,effects});
        }
        const args=await buildAttackRoll(owner,'item',name,item.text,props,damages,types,hit,0,false,false,{weapon_damage_length:1},changes);
        if(!args || !wb20RuleCurrent(owner,turn))return false;
        effects.forEach(e=>addEffect(args,e));
        args['waybeyond20-item-rules-prepared']=true;
        if(property.kind==='bash') {
            wayBeyond20AttachAttackActionResource(args,props,null,'action',{name,rollType:'attack'});
            wayBeyond20QueueAttackFollowup(args,true);
        } else {
            args.rollAttack=false;args.rollDamage=true;args['save-dc']=property.dc;args['save-ability']=property.save;args.range=property.range;
            wayBeyond20AttachTurnResource(args,'action',{name,rollType:'attack',actionType:'Magic'});
            args['waybeyond20-resource-costs']=[{name:item.name,amount:1}];
        }
        return sendRollWithCharacter('attack',damages[0],args);
    } finally {wb20ItemRuleBusy=false;}
}
function wb20InjectItemRuleControls() {
    const pane=document.querySelector('.b20-item-pane'),item=pane && wb20ReadItemRule(pane);
    if(!item)return;
    if(character.getSetting('waybeyond20-feature-controls',true)===false){pane.querySelector('.wb20-item-property-controls')?.remove();return;}
    const properties=wb20ParseItemProperties(item);
    if(!properties.length){pane.querySelector('.wb20-item-property-controls')?.remove();return;}
    wb20RememberItemRule(item);
    let root=pane.querySelector('.wb20-item-property-controls');
    if(!item.equipped){root?.remove();if(wb20ItemFlames(item)===true)wb20SetItemFlames(item,false).catch(console.warn);return;}
    if(!root){root=document.createElement('div');root.className='wb20-item-property-controls';pane.append(root);}
    if(root._wb20ItemName!==item.name){root.replaceChildren();root._wb20ItemName=item.name;}
    if(properties.some(p=>p.kind==='flames')) {
        let options=root.querySelector('.wb20-unarmed-equipment-options');
        if(!options){
            options=document.createElement('div');options.className='wb20-unarmed-equipment-options';
            options.innerHTML='<label>Unarmed Strike mastery <select aria-label="Gauntlet Unarmed Strike mastery"><option value="">Native rules</option><option value="none">None</option></select></label><label><input type="checkbox" aria-label="Apply weapon damage bonus to gauntlet Unarmed Strikes"> <span></span></label>';
            const save=()=>{
                if(options._wb20Owner!==character || !options.isConnected)return;
                const previous=character.getSetting('waybeyond20-unarmed-equipment',{}) || {};
                character.mergeCharacterSettings({'waybeyond20-unarmed-equipment':{...previous,[wb20ResourceId(options._wb20Item.name)]:{mastery:options.querySelector('select').value,weaponBonus:options.querySelector('input').checked}}},()=>wayBeyond20RefreshCombinedActions());
            };
            options.querySelector('select').addEventListener('change',save);options.querySelector('input').addEventListener('change',save);root.append(options);
        }
        options._wb20Owner=character;options._wb20Item=item;
        const selected=wb20ItemAttackOptions(item),select=options.querySelector('select'),masteries=wb20ItemMasteries();
        for(const mastery of masteries)if(!Array.from(select.options).some(o=>o.value===mastery)){const option=document.createElement('option');option.value=mastery;option.textContent=mastery;select.append(option);}
        if(select.value!==(selected.mastery || ''))select.value=selected.mastery || '';
        if(options.querySelector('input').checked!==!!selected.weaponBonus)options.querySelector('input').checked=!!selected.weaponBonus;
        const bonus=wb20ItemWeaponBonus(),label=options.querySelector('span'),text=bonus?`${bonus.name} also applies (homebrew)`:'Weapon damage bonus (no eligible feature found)';
        if(label.textContent!==text)label.textContent=text;
        options.querySelector('input').disabled=!bonus;
    }
    for(const property of properties) {
        let button=Array.from(root.querySelectorAll('button')).find(b=>b.dataset.wb20Property===property.kind);
        if(!button){button=document.createElement('button');button.type='button';button.dataset.wb20Property=property.kind;button.addEventListener('click',()=>{if(button._wb20Owner===character)wb20ActivateItemProperty(button._wb20Item,button._wb20Property).catch(console.warn);});root.append(button);}
        button._wb20Owner=character;button._wb20Item=item;button._wb20Property=property;
        const text=property.kind==='flames'?(wb20ItemFlames(item)?'Extinguish flames':'Ignite flames'):property.name;
        if(button.textContent!==text)button.textContent=text;
        const title=`${property.kind==='flames'?'Bonus Action':property.kind==='bash'?'Attack action attack':'Magic action · 1 charge'}: ${property.name}`;
        if(button.title!==title)button.title=title;
    }
}
