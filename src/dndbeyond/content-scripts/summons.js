// Summoned actors are separate from the open character. Interpret the live
// stat block, retain the casting level, and reuse Monster's roll builder and
// the shared stat-block attack workflow. No caster riders or resource intents.
const wb20SummonPending = new Set();
function wb20SummonText(value) {
    return String(value || '').replace(/[\u2018\u2019]/g,"'").replace(/\u2212/g,'-').replace(/\s+/g,' ').trim();
}
function wb20SummonTemplate(block, sourceText='') {
    if (!block) return null;
    const name=wb20SummonText(block.querySelector('h4,h3')?.textContent);
    const paragraphs=Array.from(block.querySelectorAll(':scope > p'));
    const text=paragraphs.map(p=>wb20SummonText(p.textContent));
    const acLine=text.find(t=>/^AC\s/i.test(t)) || '';
    const hpLine=text.find(t=>/^HP\s/i.test(t)) || '';
    const ac=acLine.match(/^AC\s+(\d+)\s*\+\s*(?:(\d+) per spell level|the spell's level)/i);
    const hp=hpLine.match(/^HP\s+(\d+)\s*\+\s*(\d+) per spell level/i);
    const meta=text[0]?.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan) (.+), (.+)$/i);
    if (!name || !ac || !meta) return null;
    let types=meta[2].replace(/\s*\(Your Choice\)$/i,'').replace(/\bor\b/gi,',').split(',').map(wb20SummonText).filter(Boolean);
    const hpByType={}, above=hpLine.match(/\+\s*(\d+) for each spell level above (\d+)/i);
    if(!hp && above) {
        for(const m of hpLine.matchAll(/(\d+) \(([^)]+?) only\)/gi))
            for(const type of m[2].split(/,|\band\b|\bor\b/i).map(wb20SummonText).filter(Boolean)) hpByType[type]=+m[1]-Number(above[1])*Number(above[2]);
        types=Object.keys(hpByType);
    }
    // Unsupported formula shapes fall back to the normal spell, never guessed stats.
    if(!hp && (!above || !types.length))return null;
    const actions=[],traits=[]; let section='';
    for(const p of paragraphs) {
        const line=wb20SummonText(p.textContent);
        if(['Traits','Actions','Bonus Actions','Reactions'].includes(line)){section=line;continue;}
        if(!['Traits','Actions','Bonus Actions','Reactions'].includes(section))continue;
        const heading=wb20SummonText(p.querySelector('strong')?.textContent).replace(/\.$/,'');
        if(!heading)continue;
        const only=heading.match(/\(([^;]+?) Only[;)]/i)?.[1] || '';
        const entry={name:heading.replace(/\s*\(.*$/,''),section,only,
            recharge:/Recharges after a Long Rest/i.test(heading)?'long':'',
            text:line.slice(heading.length).replace(/^\.\s*/, '')};
        (section==='Traits'?traits:actions).push(entry);
    }
    const speed=text.find(t=>/^Speed /i.test(t)) || '';
    const abilities=Array.from(block.querySelectorAll('tbody tr')).map(tr=>
        Array.from(tr.querySelectorAll('th,td')).slice(0,3).map(td=>wb20SummonText(td.textContent)));
    if(!types.length || !actions.length || abilities.length!==6)return null;
    return {name,types,size:meta[1],alignment:meta[3],ac:[+ac[1],Number(ac[2] || 1)],
        hp:hp?[+hp[1],+hp[2]]:[0,Number(above[1])],hpByType,minLevel:above?Number(above[2]):1,
        walk:Number(speed.match(/^Speed (\d+)/i)?.[1]) || 0,
        fly:Number(speed.match(/Fly (\d+)/i)?.[1]) || 0,
        flyLevel:Number(speed.match(/requires level (\d+)\+/i)?.[1]) || null,
        flyType:speed.match(/Fly.*[;(]\s*(\w+) only/i)?.[1] || '',hover:/hover/i.test(speed),
        attacksDivisor:/number of attacks equal to half this spell's level \(round(?:ed)? down\)/i.test(text.join(' '))?2:0,
        hitDie:text.join(' ').match(/Hit Dice \[(d\d+)s\]/i)?.[1] || '',abilities,actions,traits,description:wb20SummonText(block.textContent),sourceText:wb20SummonText(sourceText)};
}
function wb20SummonCastingSources(owner) {
    return Object.keys(owner._spell_attacks || {}).filter(key=>Number.isFinite(parseInt(owner._spell_attacks[key])) &&
        Number.isFinite(parseInt(owner._spell_saves?.[key]))).map(key=>({key,
        attack:parseInt(owner._spell_attacks[key]),dc:parseInt(owner._spell_saves[key])}));
}
function wb20SummonStats(summon,owner) {
    const current=wb20SummonCastingSources(owner).find(source=>source.key===summon.casting?.key) || summon.casting || {};
    const level=summon.level,t=summon.template;
    return {ac:t.ac[0]+t.ac[1]*level,hp:(t.hpByType?.[summon.type] ?? t.hp[0])+t.hp[1]*level,
        speed:t.walk+' ft.'+(t.fly && ((t.flyLevel && level>=t.flyLevel) || (t.flyType && t.flyType===summon.type))?', Fly '+t.fly+' ft.'+(t.hover?' (hover)':''):''),
        attack:current.attack,dc:current.dc};
}
function wb20SummonActionText(action,summon,owner) {
    const stats=wb20SummonStats(summon,owner),level=summon.level;
    let text=action.text.replace(/(\d+d\d+)\s*\+\s*(\d+)\s*\+\s*the spell's level/gi,(_,dice,bonus)=>dice+' + '+(Number(bonus)+level)).replace(/Bonus equals your spell attack modifier/gi,
        (stats.attack>=0?'+':'')+stats.attack).replace(/DC equals your spell save DC/gi,'DC '+stats.dc);
    text=text.replace(/(\d+d\d+) plus the spell's level of (.+?) damage/gi,(_,dice,choices)=>{
        const alternatives=Array.from(choices.matchAll(/(\w+)\s*\((\w+)\)/g));
        const type=alternatives.length?alternatives.find(m=>m[2].toLowerCase()===summon.type.toLowerCase())?.[1]:choices;
        return type?`${dice} + ${level} ${type} damage`:_;
    });
    text=text.replace(/regains a number of Hit Points equal to (\d+d\d+) plus the spell's level/gi,
        (_,dice)=>'regains '+dice+' + '+level+' hit points');
    return text.replace(/\bHit Points\b/g,'hit points');
}
function wb20SummonActions(summon) {
    return summon.template.actions.filter(action=>!/^Multiattack$/i.test(action.name) && (!action.only || action.only.toLowerCase()===summon.type.toLowerCase()));
}
function wb20SummonEffects(owner=character) {
    return (owner?.getSetting('waybeyond20-active-effects',[]) || []).filter(e=>e?.summon?.template && String(e.characterId)===String(owner._id) &&
        Number.isInteger(e.summon.level) && e.summon.level>=1 && e.summon.level<=9 &&
        e.summon.template.types.includes(e.summon.type));
}
function wb20SummonSourceCurrent(owner,pane,existing=false) {
    if(character!==owner || !pane)return false;
    const current=document.querySelector('.ct-spell-pane');
    if(pane.isConnected)return current===pane;
    // DDB normally dismisses its sidebar when our separate tracking dialog is
    // confirmed. Manual tracking uses the captured definition, not a native
    // cast/use button, so that dismissal does not invalidate it. A replacement
    // pane or a changed owner still cancels; real casts keep the strict guard.
    return existing && current===null;
}
async function wb20PrepareSummonEffect(owner,{spellName,source,level,castAt,description,concentration=false,duration='',properties=null,existing=false}={}) {
    const block=document.querySelector('.ct-spell-pane .ct-spell-detail__description .stat-block');
    const pane=block?.closest('.ct-spell-pane');
    const template=wb20SummonTemplate(block,description);
    if(!template && typeof wb20PrepareAnimatedEffect==='function')return wb20PrepareAnimatedEffect(owner,{spellName,source,level,castAt,description,existing});
    if (!template) return undefined;
    const castLevel=wayBeyond20ParseEffectLevel(level,castAt);
    const sources=wb20SummonCastingSources(owner);
    if (!Number.isInteger(castLevel) || castLevel<(template.minLevel || 1) || castLevel>9 || !sources.length) {
        // The spell still works when its template/source cannot be resolved.
        alertify.warning('Summon controls could not read the casting level or spellcasting source. The spell can still complete.');
        return undefined;
    }
    const escape=wb20FeatureEscape;
    const previous=wb20SummonEffects(owner).find(e=>e.summon.spellName===spellName);
    const form=await wb20FeatureForm('Summon '+template.name,
        `<p>Spell level ${castLevel}. This creature uses its own actions.</p><label>Creature type<select name="summon-type">`+
        template.types.map(type=>`<option${type===previous?.summon.type?' selected':''}>${escape(type)}</option>`).join('')+
        '</select></label><label>Spellcasting source<select name="summon-source">'+
        sources.map(s=>`<option value="${escape(s.key)}">${escape(s.key)} (+${s.attack}, DC ${s.dc})</option>`).join('')+
        '</select></label>','Continue');
    if (!form || !wb20SummonSourceCurrent(owner,pane,existing) || (pane.isConnected && document.querySelector('.ct-spell-pane .ct-spell-detail__description .stat-block')!==block)) return null;
    const type=form.find('[name="summon-type"]').val();
    const casting=sources.find(s=>s.key===form.find('[name="summon-source"]').val());
    if (!template.types.includes(type) || !casting) return null;
    const effect=wayBeyond20BuildSpellEffect(owner,spellName,source,level,castAt,concentration,duration || 'Until the summon ends',properties);
    effect.name=template.name+' ('+type+')'; effect.flags=['magical','spell-effect','buff','summon'];
    effect.data=[]; effect.updateMode=concentration?'special':'manual'; effect.ticksLeft='';
    if(concentration)effect.flags.push('concentration');
    effect.summon={template,type,level:castLevel,casting,spellName,source,used:{},
        trackingExisting:existing,vanishesAtZero:/disappears.*?0 Hit Points/i.test(wb20SummonText(description)),mount:/\bsteed\b/i.test(description),replacePrevious:/already have.*(?:steed|creature).*replaced|replaces? (?:the|your|an) (?:existing|previous) /i.test(wb20SummonText(description))};
    if(existing && previous){effect.id=previous.id;effect.startedAt=previous.startedAt;effect.summon.used={...previous.summon.used};if(previous.summon.currentHP!==undefined)effect.summon.currentHP=Math.min(previous.summon.currentHP,wb20SummonStats(effect.summon,owner).hp);}
    return effect;
}
async function wb20CommitSummonEffect(owner,effect,{resourceLockHeld=false}={}){
    if(character!==owner || String(effect.characterId)!==String(owner._id))return false;
    if(effect.animation)return wb20CommitAnimatedEffect(owner,effect,{resourceLockHeld});
    const commit=async()=>{
        if(character!==owner)return false;
        const previous=wb20SummonEffects(owner).find(e=>e.id===effect.id);
        if(effect.summon.trackingExisting && previous)effect.summon.used={...previous.summon.used};
        const patch={};
        if(effect.summon.trackingExisting && previous)patch['waybeyond20-active-effects']=owner.getSetting('waybeyond20-active-effects',[]).filter(e=>e.id!==effect.id);
        wayBeyond20AddSpellEffectToSettings(owner,patch,effect);
        await new Promise(resolve=>owner.mergeCharacterSettings(patch,resolve));
        if(character===owner){wayBeyond20SendEffectsUpdate(owner,patch['waybeyond20-active-effects'],wayBeyond20GetConcentrationEffect());wb20RefreshSummonControls();}
        return true;
    };
    // Character after-dispatch commits already run within the shared resource
    // transaction. Manual tracking acquires that same lock here instead.
    return resourceLockHeld ? commit() : wb20ResourceLocked(commit,owner);
}
function wb20RefreshSummonControls(){
    if(typeof wayBeyond20RefreshCombinedActions==='function')wayBeyond20RefreshCombinedActions();
    wayBeyond20ScheduleActiveEffectBadgeRefresh();
}
function wb20SummonActor(effect,owner,row) {
    const summon=effect.summon,stats=wb20SummonStats(summon,owner);
    let actor=row?._wb20SummonActor;
    if (!actor || actor._parent_character!==owner || actor._id!=='summon:'+owner._id+':'+effect.id) {
        actor=new Monster('Creature',null,settings,{character:owner,creatureType:'Summoned'});
        if(row)row._wb20SummonActor=actor;
    }
    actor._global_settings=settings;
    actor._id='summon:'+owner._id+':'+effect.id; actor._name=effect.name;
    actor._ac=stats.ac;actor._hp=summon.currentHP ?? stats.hp;actor._max_hp=stats.hp;actor._hp_formula=summon.template.hpFormula || (summon.template.hitDie?summon.level+summon.template.hitDie:'');
    actor._speed=stats.speed;actor._abilities=summon.template.abilities.map(([abbr,score,mod])=>[abbr,abbr,score,mod]);
    actor._actions=wb20SummonActions(summon).map(a=>a.name);actor._stat_block=row?$(row):$();
    return actor;
}
async function wb20RunSummonAction(owner,effectId,actionName,row) {
    const key=owner._id+':'+effectId;
    if (wb20SummonPending.has(key)) return false;
    wb20SummonPending.add(key);
    try {
        const run=async()=>{
            const current=()=>character===owner && (!row || row.isConnected) && wb20SummonEffects(owner).find(e=>e.id===effectId);
            const effect=current(); if(!effect)return false;
            if(effect.summon.control && !(effect.summon.control.hoursLeft>0)){alertify.warning('This creature is not under your control. Renew before expiry, or resolve lost control with the DM.');return false;}
            if(effect.summon.currentHP===0){alertify.warning('This creature has 0 HP. Resolve its state before attacking.');return false;}
            const action=wb20SummonActions(effect.summon).find(a=>a.name===actionName);if(!action)return false;
            if(action.recharge && effect.summon.used?.[action.name] && !await wayBeyond20ConfirmChoice(action.name,
                'This summon has already used this ability since its last Long Rest. Use it anyway?','Use anyway','Cancel'))return false;
            if(!current())return false;
            const actor=wb20SummonActor(effect,owner,row),text=wb20SummonActionText(action,effect.summon,owner);
            const args=actor.buildAttackRoll(action.name,text);
            let accepted;
            if(args){
                // No player action, smite, mastery, bonus-damage or slot intents.
                // Save abilities announce the target's save; they don't roll it for them.
                if (!args['to-hit']) args.rollDamage=true;
                accepted=await wb20SendStatBlockAttack(actor,'1d20'+(args['to-hit'] || ''),args,'summoned-creature',()=>!!current());
            } else accepted=await sendRoll(actor,'trait',0,{name:action.name,description:text},()=>!!current());
            if(accepted===true && action.recharge && current()){
                const effects=owner.getSetting('waybeyond20-active-effects',[]).map(e=>e.id!==effectId?e:
                    {...e,summon:{...e.summon,used:{...e.summon.used,[action.name]:true}}});
                await new Promise(resolve=>owner.mergeCharacterSettings({'waybeyond20-active-effects':effects},resolve));
                if(character===owner)wb20RefreshSummonControls();
            }
            return accepted===true;
        };
        // Use the same per-character lock as Correction/rest; don't overwrite
        // another tab's newer summon or spend a daily ability twice.
        return await wb20ResourceLocked(run,owner);
    } finally {wb20SummonPending.delete(key);}
}
async function wb20SummonsRest(owner,rest) {
    if(rest!=='long' || !wb20SummonEffects(owner).some(e=>Object.keys(e.summon.used || {}).length))return;
    const owned=new Set(wb20SummonEffects(owner).map(e=>e.id));
    const effects=owner.getSetting('waybeyond20-active-effects',[]).map(e=>!owned.has(e.id) || String(e.characterId)!==String(owner._id)?e:{...e,summon:{...e.summon,used:{}}});
    await new Promise(resolve=>owner.mergeCharacterSettings({'waybeyond20-active-effects':effects},resolve));
    if(character===owner)wb20RefreshSummonControls();
}
function wb20SummonRows(root) {
    const owner=character,retained=new Set(),entries=[];
    for(const effect of wb20SummonEffects(owner))for(const action of wb20SummonActions(effect.summon)){
        const key='summon:'+effect.id+':'+action.name;
        let row=Array.from(root.querySelectorAll(':scope > .wb20-summon-row')).find(r=>r._wb20Key===key);
        if(!row){
            row=document.createElement('div');row.className='ddbc-combat-attack wb20-feature-option wb20-summon-row';row._wb20Key=key;
            row.innerHTML='<button type="button" class="wb20-feature-option-icon">◆</button><div class="ddbc-combat-attack__name"><button type="button" class="wb20-feature-option-name"></button><div class="wb20-talent-category"></div></div><div class="ddbc-combat-attack__range"></div><div class="ddbc-combat-attack__action"></div><div class="ddbc-combat-attack__damage"></div><div class="ddbc-combat-attack__notes"></div>';
            row.querySelector('.wb20-feature-option-icon').addEventListener('click',event=>{
                event.preventDefault();event.stopPropagation();
                if(row._wb20Owner===character)wb20RunSummonAction(row._wb20Owner,row._wb20EffectId,row._wb20Action,row)
                    .catch(error=>{console.warn('LightCore: summon action failed',error);alertify.warning('The summon action did not finish. Check its result before retrying.');});
            });
            row.querySelector('.wb20-feature-option-name').addEventListener('click',event=>{
                event.preventDefault();event.stopPropagation();if(row._wb20Owner!==character)return;
                const active=wb20SummonEffects().find(e=>e.id===row._wb20EffectId);
                if(active)wb20ManageSummon(active.id);
            });
            root.append(row);
        }
        row._wb20Owner=owner;row._wb20EffectId=effect.id;row._wb20Action=action.name;
        const text=wb20SummonActionText(action,effect.summon,owner),actor=wb20SummonActor(effect,owner,row);
        const roll=actor.buildAttackRoll(action.name,text);
        const set=(selector,value)=>{const cell=row.querySelector(selector),el=cell.querySelector('.wb20-action-value > :first-child') || cell;if(el.textContent!==value)el.textContent=value;};
        set('.wb20-feature-option-name',action.name);
        set('.wb20-talent-category',effect.name+' · '+(action.section==='Bonus Actions'?'Creature Bonus Action':'Creature Action'));
        wb20SetActionRange(row.querySelector('.ddbc-combat-attack__range'),roll?.reach || roll?.range?.replace(/^(\d+)\/(\d+)\s*ft\.?$/i,'$1 ft. ($2)') ||
            (text.match(/within (\d+) feet/i)?.[1] ? text.match(/within (\d+) feet/i)[1]+' ft.' : '—'));
        set('.ddbc-combat-attack__action',roll?.['to-hit'] || (roll?.['save-dc']?roll['save-ability'].slice(0,3).toUpperCase()+' '+roll['save-dc']:'—'));
        const damage=roll?.damages?.[0] || '—';set('.ddbc-combat-attack__damage',damage);
        row._wb20Definition={damageType:roll?.['damage-types']?.[0] || ''};
        const used=effect.summon.used?.[action.name];
        const stats=wb20SummonStats(effect.summon,owner);
        const hpNote='HP '+(effect.summon.currentHP ?? stats.hp)+'/'+stats.hp;
        const attacks=effect.summon.template.attacksDivisor?Math.floor(effect.summon.level/effect.summon.template.attacksDivisor):0;
        const note=effect.summon.control?hpNote+' · Control '+effect.summon.control.hoursLeft+'h':attacks?hpNote+' · '+attacks+' attack'+(attacks===1?'':'s')+'/Action':
            (action.recharge?(used?'Used · ':'1/1 Long Rest · '):'')+'Level '+effect.summon.level+' · AC '+stats.ac+' · '+hpNote;
        wb20SetActionNote(row.querySelector('.ddbc-combat-attack__notes'),note,()=>wb20ManageSummon(effect.id),'Summon details');
        const icon=row.querySelector('.wb20-feature-option-icon'),label='Use '+action.name+' — '+effect.name;
        const disabled=effect.summon.currentHP===0 || !!(effect.summon.control && !(effect.summon.control.hoursLeft>0));
        if(icon.disabled!==disabled)icon.disabled=disabled;
        if(icon.getAttribute('aria-label')!==label)icon.setAttribute('aria-label',label);
        retained.add(row);entries.push({row,name:action.name,key,cost:'special',group:action.section==='Bonus Actions'?'bonusAction':'action',defaultVisible:true});
    }
    for(const row of root.querySelectorAll(':scope > .wb20-summon-row'))if(!retained.has(row))row.remove();
    const command=wb20AnimationCommandEntry(root,owner);if(command)entries.push(command);
    return entries;
}
async function wb20ManageSummon(id) {
    const owner=character,effect=wb20SummonEffects(owner).find(e=>e.id===id);if(!effect)return;
    const stats=wb20SummonStats(effect.summon,owner),escape=wb20FeatureEscape;
    const form=await wb20FeatureForm(effect.name,`<p>Level ${effect.summon.level} · AC ${stats.ac} · HP ${stats.hp} · Speed ${escape(stats.speed)}</p>`+
        '<p>These rolls use the creature’s own actions. Each attack click rolls one attack.</p>'+
        (effect.summon.mount?'<p>A controlled mount has only Dash, Disengage and Dodge action options while ridden.</p>':'')+
        (effect.summon.template.attacksDivisor?'<p>Multiattack: '+Math.floor(effect.summon.level/effect.summon.template.attacksDivisor)+' attacks per creature Action.</p>':'')+
        '<label>Name<input name="creature-name" maxlength="80" value="'+escape(effect.name)+'"></label>'+
        '<label>Current HP<input type="number" name="creature-hp" min="0" max="'+stats.hp+'" value="'+(effect.summon.currentHP ?? stats.hp)+'"></label>'+
        (effect.summon.control?'<label>Control hours left (game time)<input type="number" name="control-hours" min="0" max="24" step="0.1" value="'+effect.summon.control.hoursLeft+'"></label><p>Advance this as game time passes. At 0, control is lost; recasting before expiry can renew it. This is not a real-time computer countdown.</p>':'')+
        (effect.summon.template.traits || []).filter(a=>!a.only || a.only===effect.summon.type).map(a=>'<p><strong>'+escape(a.name)+'</strong> '+escape(wb20SummonActionText(a,effect.summon,owner))+'</p>').join('')+
        (effect.summon.control?'<p>'+escape(effect.summon.control.description)+'</p><p>Current order: '+escape(effect.summon.control.order || 'None; Dodge and avoid harm')+'</p>':'')+
        wb20SummonActions(effect.summon).map(a=>'<p><strong>'+escape(a.name)+'</strong> '+escape(wb20SummonActionText(a,effect.summon,owner))+'</p>'+
            (a.recharge?`<label><input type="checkbox" name="restore-use" value="${escape(a.name)}"> Restore this ability’s use</label>`:'')).join('')+
        '<label><input type="checkbox" name="end-summon"> End tracking this summon</label>','Save');
    if(!form || character!==owner)return;
    await wb20ResourceLocked(async()=>{
        if(character!==owner)return;
        const effects=owner.getSetting('waybeyond20-active-effects',[]).flatMap(e=>{
            if(e.id!==id)return [e];if(form.find('[name="end-summon"]').prop('checked'))return [];
            const used={...e.summon.used};form.find('[name="restore-use"]:checked').each((_,input)=>delete used[input.value]);
            const hp=Number(form.find('[name="creature-hp"]').val()),hours=Number(form.find('[name="control-hours"]').val());
            if(hp===0 && e.summon.vanishesAtZero)return [];
            return [{...e,name:String(form.find('[name="creature-name"]').val() || e.name).trim().slice(0,80),summon:{...e.summon,used,
                currentHP:Number.isFinite(hp)?Math.min(stats.hp,Math.max(0,hp)):e.summon.currentHP,
                ...(e.summon.control?{control:{...e.summon.control,hoursLeft:Number.isFinite(hours)?Math.min(24,Math.max(0,hours)):e.summon.control.hoursLeft}}:{})}}];});
        const patch={'waybeyond20-active-effects':effects};
        if(!effects.some(e=>e.id===id) && owner.getSetting('waybeyond20-concentration',null)?.id===id)patch['waybeyond20-concentration']=null;
        await new Promise(resolve=>owner.mergeCharacterSettings(patch,resolve));
        if(character===owner){wayBeyond20SendEffectsUpdate(owner,effects,wayBeyond20GetConcentrationEffect());wb20RefreshSummonControls();}
    },owner);
}
function wb20SummonExistingControl() {
    const pane=document.querySelector('.ct-spell-pane'),block=pane?.querySelector('.ct-spell-detail__description .stat-block');
    wb20CaptureCreatureTemplate();
    const desc=pane?.querySelector('.ct-spell-detail__description');
    if(!pane || pane.querySelector('.wb20-track-summon') || (!wb20SummonTemplate(block,desc?.textContent) && !wb20AnimationRules(desc?.textContent)))return;
    const owner=character,button=document.createElement('button');button.type='button';
    button.className='ct-theme-button wb20-track-summon';button.textContent='Track an existing summon';
    button.title='Add its Actions controls without casting or spending a spell slot';
    button.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();if(character!==owner || !button.isConnected || button.disabled)return;
        button.disabled=true;
        try{
            const properties=propertyListToDict($('.ct-spell-pane .ct-spell-detail [role=list] > div'));
            const effect=await wb20PrepareSummonEffect(owner,{spellName:document.querySelector('.ct-sidebar__heading .ddbc-spell-name,.ct-sidebar__heading .ct-spell-name,.ct-sidebar__heading span[class*="styles_spellName"]')?.textContent.trim() || 'Summon',
                source:document.querySelector('.ct-sidebar__header-parent')?.textContent || '',
                level:pane.querySelector('.ct-spell-detail__level-school-item')?.textContent,
                castAt:pane.querySelector('.ct-spell-caster__casting-level-current')?.textContent,
                description:pane.querySelector('.ct-spell-detail__description')?.textContent,concentration:/Concentration/i.test(properties.Duration || ''),duration:properties.Duration || '',properties,existing:true});
            if(effect && character===owner){
                await wb20CommitSummonEffect(owner,effect);
            }
        }finally{if(button.isConnected)button.disabled=false;}
    });
    (block || desc).before(button);
}

// Creature definitions are a per-character cache of native Extras views, not a
// shipped monster database. Read once per DOM block and preserve its source.
const wb20CreatureSnapshots=new WeakMap();
function wb20CreatureTemplate(block) {
    if(!block)return null;
    const name=wb20SummonText(block.querySelector(':scope > h1')?.textContent);
    const attributes=Object.fromEntries(Array.from(block.querySelectorAll(':scope > div')).map(el=>
        [wb20SummonText(el.querySelector(':scope > h2')?.textContent),wb20SummonText(el.querySelector(':scope > p')?.textContent)]));
    const ac=Number(attributes.AC),hp=Number(attributes.HP?.match(/^\d+/)?.[0]);
    const meta=wb20SummonText(block.querySelector(':scope > p')?.textContent);
    const abilities=Array.from(block.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.querySelectorAll('th,td')).slice(0,3).map(el=>wb20SummonText(el.textContent)));
    const actions=[],traits=[];
    for(const section of block.querySelectorAll(':scope > div')) {
        let label='';
        for(const child of section.children) {
            if(child.tagName==='H2'){label=wb20SummonText(child.textContent);continue;}
            if(!['Traits','Actions','Bonus Actions','Reactions'].includes(label))continue;
            for(const p of child.querySelectorAll('p')) {
                const heading=wb20SummonText(p.querySelector('strong')?.textContent).replace(/\.$/,'');
                if(heading)(label==='Traits'?traits:actions).push({name:heading,section:label,text:wb20SummonText(p.textContent).slice(heading.length).replace(/^\.\s*/,''),only:'',recharge:''});
            }
        }
    }
    if(!name || !Number.isFinite(ac) || ac<1 || !hp || abilities.length!==6 || !actions.length)return null;
    return {name,types:[name],size:meta.split(' ')[0],alignment:meta.split(', ').slice(1).join(', '),ac:[ac,0],hp:[hp,0],
        hpFormula:attributes.HP?.match(/\(([^)]+)\)/)?.[1] || '',walk:Number(attributes.Speed?.match(/^\d+/)?.[0]) || 0,
        abilities,actions,traits,description:wb20SummonText(block.textContent),sourceUrl:location.href};
}
function wb20CaptureCreatureTemplate() {
    const owner=character,block=document.querySelector('section[class*="styles_creatureBlock"]');
    if(!owner || !block || wb20CreatureSnapshots.get(block)===owner)return;
    const template=wb20CreatureTemplate(block);if(!template)return;
    wb20CreatureSnapshots.set(block,owner);
    wb20ResourceLocked(async()=>{
        if(character!==owner || !block.isConnected){wb20CreatureSnapshots.delete(block);return;}
        const saved=owner.getSetting('waybeyond20-creature-templates',{});
        if(JSON.stringify(saved[template.name])===JSON.stringify(template))return;
        await new Promise(resolve=>owner.mergeCharacterSettings({'waybeyond20-creature-templates':{...saved,[template.name]:template}},resolve));
    },owner).catch(error=>{wb20CreatureSnapshots.delete(block);console.debug('LightCore: creature definition was not cached',error);});
}
function wb20RuleNumber(value) {
    const names=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
    return /^\d+$/.test(value)?Number(value):names.indexOf(String(value).toLowerCase());
}
function wb20AnimationRules(description) {
    const text=wb20SummonText(description);
    const bones=text.match(/a (\w+) if you chose bones/i),corpse=text.match(/a (\w+) if you chose a corpse/i);
    const hours=text.match(/under your control for (\d+) hours/i),renew=text.match(/reasserts your control over up to (\w+) creatures/i);
    const extra=text.match(/(?:animate or reassert control over) (\w+) additional.*?spell slot level above (\d+)/i);
    if(!bones || !corpse || !hours || !renew || !extra)return null;
    const count=wb20RuleNumber(renew[1]),increment=wb20RuleNumber(extra[1]);
    if(count<1 || increment<0)return null;
    return {types:[bones[1],corpse[1]],hours:Number(hours[1]),renew:count,increment,minLevel:Number(extra[2]),description:text};
}
async function wb20PrepareAnimatedEffect(owner,{spellName,source,level,castAt,description,existing=false}) {
    const rules=wb20AnimationRules(description);if(!rules)return undefined;
    const castLevel=wayBeyond20ParseEffectLevel(level,castAt);
    if(!Number.isInteger(castLevel) || castLevel<rules.minLevel || castLevel>9)return undefined;
    const maxCreate=1+rules.increment*(castLevel-rules.minLevel),maxRenew=rules.renew+rules.increment*(castLevel-rules.minLevel);
    const definitions=owner.getSetting('waybeyond20-creature-templates',{}),escape=wb20FeatureEscape;
    const previous=wb20SummonEffects(owner).filter(e=>e.summon.control && e.summon.spellName===spellName && e.summon.control.hoursLeft>0);
    const pane=document.querySelector('.ct-spell-pane');
    const form=await wb20FeatureForm(spellName,
        `<p>Level ${castLevel}: create up to ${maxCreate}, or renew up to ${maxRenew}. Different corpses or piles of bones are required. Control lasts ${rules.hours} hours of game time.</p>`+
        '<label>Use<select name="animation-mode"><option value="create">Create creatures</option><option value="renew">Renew existing control</option><option value="untracked">Continue without tracking</option></select></label>'+
        rules.types.map((type,i)=>`<label>${escape(type)} count<input type="number" name="animation-count-${i}" min="0" max="${maxCreate}" value="${i===0?1:0}"></label>`+
            (!definitions[type]?`<p>To load ${escape(type)} rolls, open its reference in Extras once, then return here. You can still cast without tracking.</p>`:'')).join('')+
        '<p>For renewal, select creatures whose current control has not expired:</p>'+
        previous.map(e=>`<label><input type="checkbox" name="animation-renew" value="${escape(e.id)}"> ${escape(e.name)} · ${e.summon.control.hoursLeft}h left</label>`).join(''),existing?'Track':'Continue');
    if(!form || !wb20SummonSourceCurrent(owner,pane,existing))return null;
    const mode=form.find('[name="animation-mode"]').val();if(mode==='untracked')return undefined;
    const ids=form.find('[name="animation-renew"]:checked').toArray().map(el=>el.value);
    const counts=rules.types.map((_,i)=>Number(form.find('[name="animation-count-'+i+'"]').val()));
    if(mode==='renew' && (!ids.length || ids.length>maxRenew || ids.some(id=>!previous.some(e=>e.id===id)))) {
        alertify.warning('Select between 1 and '+maxRenew+' controlled creatures. Nothing was spent.');return null;
    }
    if(mode==='create' && (counts.some(n=>!Number.isInteger(n) || n<0) || counts.reduce((a,b)=>a+b,0)<1 || counts.reduce((a,b)=>a+b,0)>maxCreate ||
        counts.some((n,i)=>n && !definitions[rules.types[i]]))) {
        alertify.warning('Choose up to '+maxCreate+' creatures with loaded Extras definitions, or continue without tracking. Nothing was spent.');return null;
    }
    const effect=wayBeyond20BuildSpellEffect(owner,spellName,source,level,castAt,false,'Control '+rules.hours+' hours (game time)',null);
    effect.animation={mode,ids,counts,rules,definitions,level:castLevel,spellName,source,existing};
    return effect;
}
async function wb20CommitAnimatedEffect(owner,plan,{resourceLockHeld=false}={}) {
    const commit=async()=>{
        if(character!==owner || String(plan.characterId)!==String(owner._id))return false;
        const a=plan.animation,patch={},all=owner.getSetting('waybeyond20-active-effects',[]);
        if(a.mode==='renew') {
            const valid=new Set(wb20SummonEffects(owner).filter(e=>a.ids.includes(e.id) && e.summon.spellName===a.spellName && e.summon.control?.hoursLeft>0).map(e=>e.id));
            if(valid.size!==a.ids.length){alertify.warning('Control changed before tracking could be saved. Resolve this casting in the companion details; do not cast again.');return false;}
            patch['waybeyond20-active-effects']=all.map(e=>!valid.has(e.id)?e:{...e,summon:{...e.summon,control:{...e.summon.control,hoursLeft:a.rules.hours}}});
        } else {
            const usedNames=new Set(all.map(e=>e.name));
            for(let i=0;i<a.rules.types.length;i++)for(let n=0;n<a.counts[i];n++) {
                const type=a.rules.types[i],template=a.definitions[type],effect={...plan};delete effect.animation;
                effect.id=wayBeyond20GenerateEffectId();let number=1;while(usedNames.has(type+' '+number))number++;
                effect.name=type+' '+number;usedNames.add(effect.name);effect.data=[];effect.flags=['magical','spell-effect','buff','summon'];effect.updateMode='manual';effect.ticksLeft='';
                effect.summon={template,type,level:a.level,spellName:a.spellName,source:a.source,used:{},currentHP:template.hp[0],
                    control:{hoursLeft:a.rules.hours,description:a.rules.description}};
                wayBeyond20AddSpellEffectToSettings(owner,patch,effect);
            }
        }
        await new Promise(resolve=>owner.mergeCharacterSettings(patch,resolve));
        if(character===owner){wayBeyond20SendEffectsUpdate(owner,patch['waybeyond20-active-effects'],wayBeyond20GetConcentrationEffect());wb20RefreshSummonControls();}
        return true;
    };
    return resourceLockHeld?commit():wb20ResourceLocked(commit,owner);
}

function wb20AnimationCommandEntry(root,owner) {
    const creatures=wb20SummonEffects(owner).filter(e=>e.summon.control?.hoursLeft>0 && e.summon.currentHP!==0);
    let row=root.querySelector(':scope > .wb20-companion-command');
    if(!creatures.length){row?.remove();return null;}
    if(!row){
        row=document.createElement('div');row.className='ddbc-combat-attack wb20-feature-option wb20-companion-command';
        row.innerHTML='<button type="button" class="wb20-feature-option-icon" aria-label="Command animated creatures">◆</button><div class="ddbc-combat-attack__name"><button type="button" class="wb20-feature-option-name">Command undead</button><div class="wb20-talent-category">Animate Dead</div></div><div class="ddbc-combat-attack__range"></div><div class="ddbc-combat-attack__action">—</div><div class="ddbc-combat-attack__damage">—</div><div class="ddbc-combat-attack__notes"></div>';
        for(const button of row.querySelectorAll('button'))button.addEventListener('click',event=>{
            event.preventDefault();event.stopPropagation();if(row._wb20Owner===character)wb20CommandAnimated(row._wb20Owner).catch(error=>{console.warn('LightCore: command did not complete',error);alertify.warning('The command did not finish. Check the result before retrying.');});
        });root.append(row);
    }
    row._wb20Owner=owner;wb20SetActionRange(row.querySelector('.ddbc-combat-attack__range'),'60 ft.');
    const notes=row.querySelector('.ddbc-combat-attack__notes');if(notes.textContent!=='Same order to selected creatures')notes.textContent='Same order to selected creatures';
    return {row,name:'Command undead',key:'animated-command',cost:'bonusAction',group:'bonusAction',defaultVisible:true};
}
async function wb20CommandAnimated(owner) {
    const key=owner._id+':command';if(wb20SummonPending.has(key))return false;wb20SummonPending.add(key);
    try{
        const available=wb20SummonEffects(owner).filter(e=>e.summon.control?.hoursLeft>0 && e.summon.currentHP!==0),escape=wb20FeatureEscape;
        const form=await wb20FeatureForm('Command animated creatures','<p>One Bonus Action gives the same order to your selected creatures within 60 feet. An existing order continues until its task is complete.</p>'+
            available.map(e=>`<label><input type="checkbox" name="command-creature" value="${escape(e.id)}"> ${escape(e.name)}</label>`).join('')+
            '<label>Order<input name="creature-order" maxlength="300"></label><label><input type="checkbox" name="command-range"> The selected creatures are within 60 feet</label>','Issue command');
        if(!form || character!==owner)return false;
        const ids=form.find('[name="command-creature"]:checked').toArray().map(el=>el.value),order=String(form.find('[name="creature-order"]').val() || '').trim().slice(0,300);
        const current=()=>character===owner && ids.every(id=>wb20SummonEffects(owner).some(e=>e.id===id && e.summon.control?.hoursLeft>0 && e.summon.currentHP!==0));
        if(!ids.length || !order || !form.find('[name="command-range"]').prop('checked') || !current()){alertify.warning('Select controlled creatures in range and enter an order. Nothing was spent.');return false;}
        const args={name:'Command undead',description:available.filter(e=>ids.includes(e.id)).map(e=>e.name).join(', ')+': '+order};
        wayBeyond20AttachTurnResource(args,'bonusAction',{name:'Command undead',rollType:'trait'});
        wayBeyond20CommitAfterDispatch(args,()=>{
            if(!current())return;
            const effects=owner.getSetting('waybeyond20-active-effects',[]).map(e=>!ids.includes(e.id)?e:{...e,summon:{...e.summon,control:{...e.summon.control,order}}});
            owner.mergeCharacterSettings({'waybeyond20-active-effects':effects},()=>{if(character===owner)wb20RefreshSummonControls();});
        });
        return await sendRollWithCharacter('trait',0,args);
    }finally{wb20SummonPending.delete(key);}
}
