function wb20FamiliarActor(companion,owner=character) {
    const base=companion.base,actor=new Monster('Creature',null,settings,{character:owner,creatureType:'Familiar'});
    actor._id='familiar:'+owner._id;actor._name=companion.name;actor._ac=base.ac;
    actor._hp=companion.hp;actor._max_hp=companion.maxHP;actor._hp_formula=companion.formula;
    actor._avatar=base.avatar || '';actor._speed=base.speed;actor._url=base.url;
    const names={STR:'Strength',DEX:'Dexterity',CON:'Constitution',INT:'Intelligence',WIS:'Wisdom',CHA:'Charisma'};
    actor._abilities=base.abilities.map(([abbr,score,mod])=>[names[abbr],abbr,score,mod]);
    actor._saves=Object.fromEntries(base.abilities.map(([abbr,,mod,save])=>[abbr,save ?? mod]));
    actor._skills=Object.fromEntries(Array.from(String(base.skills || '').matchAll(/([A-Za-z][A-Za-z ]*?)\s*([+-]\d+)/g)).map(m=>[m[1].trim(),m[2]]));
    return actor;
}
async function wb20FamiliarRoll(kind, name, {resource=null}={}) {
    const owner=character,initial=wb20Companions(owner)[0];
    if(!initial?.base || initial.status!=='present' || !(initial.hp>0)){alertify.warning('The familiar is not present with HP. Check Companions.');return false;}
    return wb20ResourceLocked(async()=>{
        const current=()=>owner===character && wb20Companions(owner)[0]?.revision===initial.revision;
        if(!current())return false;
        if(resource && !(initial[resource]>0) && !await wayBeyond20ConfirmChoice(initial.name,
            'This familiar has already used its '+resource+' this turn. Use it anyway?','Same turn override','Cancel'))return false;
        if(!current())return false;
        const actor=wb20FamiliarActor(initial,owner);let args,type=kind,total=null;
        if(kind==='initiative')args={name:initial.name+' Initiative',initiative:(initial.base.initiative>=0?'+':'')+initial.base.initiative};
        else if(kind==='skill') {
            const ability=skillToAbility(name),score=actor._abilities.find(a=>a[1]===ability);
            const modifier=actor._skills[name] ?? score?.[3];if(modifier===undefined)return false;
            args={name,skill:name,modifier,ability,proficiency:actor._skills[name]===undefined?0:'Proficient'};
        } else if(kind==='ability' || kind==='saving-throw') {
            const ability=actor._abilities.find(a=>a[1]===name);if(!ability)return false;
            const modifier=kind==='ability'?ability[3]:actor._saves[name];
            args={name:ability[0]+(kind==='saving-throw'?' Save':' Check'),ability:name,modifier,proficiency:0};
        } else if(kind==='trait') {
            const text=WB20_COMBAT_ACTIONS[name];if(!text)return false;
            args={name:initial.name+': '+name,description:text+'\nThis uses the familiar’s own '+(resource || 'action')+'; not the caster’s.'};
        } else return false;
        args['waybeyond20-capture-result']=(request,rolls)=>{const kept=rolls.find(r=>!r.isDiscarded?.());if(kept)total=Number(kept.total);};
        const accepted=await sendRoll(actor,type,kind==='trait'?0:'1d20'+String(args.initiative || args.modifier || ''),args,current);
        if(accepted===true && current() && (resource || kind==='initiative' && Number.isFinite(total))) {
            await wb20SaveFamiliar(owner,{...initial,...(resource?{[resource]:Math.max(0,Number(initial[resource])-1)}:{}),
                ...(kind==='initiative' && Number.isFinite(total)?{initiative:total}:{}),revision:uuidv4()});
        }
        return accepted===true;
    },owner);
}
function wb20FamiliarCardHTML(c) {
    const e=wb20FeatureEscape,b=c.base;
    if(!b)return '<p>Choose a form when you cast Find Familiar.</p>';
    const list=(heading,values)=>values?.length?'<h4>'+heading+'</h4>'+values.map(v=>'<p><strong>'+e(v.name)+'</strong> '+e(v.text.replace(v.name,'').replace(/^\.\s*/,''))+(v.attack && c.rules?.cannotAttack?' <em>Not available: this familiar cannot attack.</em>':'')+'</p>').join(''):'';
    return '<div class="wb20-familiar-card"><p><strong>'+e(c.name)+'</strong> · '+e(b.name)+' · '+e(c.creatureType || '')+(c.appearance?' · Appearance: '+e(c.appearance):'')+'</p>'+ 
        '<p>'+(c.savedPreview?'HP rolls when summoned':'HP '+e(c.hp ?? '?')+'/'+e(c.maxHP ?? '?'))+' · Base '+e(b.formula)+' (minimum 1) + '+e(c.bonus)+' · '+(c.savedPreview?'Current caster level ':'Caster level at cast ')+e(c.castLevel)+'</p>'+ 
        '<p>AC '+e(b.ac)+' · Speed '+e(b.speed)+' · Initiative '+e(c.initiative ?? 'not rolled')+' · '+e(c.status)+'</p>'+ 
        '<p>Familiar turn '+e(c.turn || 1)+' · Action '+e(c.action ?? 1)+' · Bonus Action '+e(c.bonusAction ?? 1)+' · Reaction '+e(c.reaction ?? 1)+'</p>'+ 
        '<table><tbody>'+b.abilities.map(([abbr,score,mod,save])=>'<tr><th>'+e(abbr)+'</th><td>'+e(score)+'</td><td>Check '+e(mod)+'</td><td>Save '+e(save ?? mod)+'</td></tr>').join('')+'</tbody></table>'+ 
        '<p>Skills: '+e(b.skills || '—')+'<br>Senses: '+e(b.senses || '—')+'<br>Languages: '+e(b.languages || '—')+'</p>'+ 
        '<dl>'+Object.entries(b.attributes || {}).filter(([key])=>!['AC','Armor Class','HP','Hit Points','Initiative','Speed','Skills','Senses','Languages'].includes(key)).map(([key,value])=>'<dt>'+e(key)+'</dt><dd>'+e(value)+'</dd>').join('')+'</dl>'+ 
        list('Traits',b.traits)+list('Actions and other abilities',b.actions)+
        (c.features?.length?'<details><summary>Your familiar features</summary>'+c.features.map(f=>'<p><strong>'+e(f.name)+'</strong> '+e(f.text)+'</p>').join('')+'</details>':'')+
        (c.sourceNote?'<p>'+e(c.sourceNote)+'</p>':'')+'<details><summary>Find Familiar rules</summary><p>'+e(c.rules?.text || '')+'</p></details></div>';
}
async function wb20FamiliarCard() {
    const owner=character,c=wb20Companions(owner)[0];
    if(!c)return wb20ManageSavedFamiliars();
    const options={close:'Close',profiles:'Saved familiar profiles',manage:'Manage HP, Initiative and familiar turn',initiative:'Roll familiar Initiative',actions:'Familiar actions',
        ...(c.status==='present' && c.rules?.senses?{senses:'Share senses — caster Bonus Action'}:{}),
        ...(c.status==='present' && c.rules?.dismiss?{dismiss:'Dismiss to pocket — caster Magic action'}:{}),
        ...(c.status==='pocket' && c.rules?.returnRange?{return:'Return from pocket — caster Magic action'}:{}),
        ...(c.status==='present' && c.rules?.delivery?{delivery:'Deliver next touch spell — familiar Reaction'}:{}),
        ...(wb20FamiliarFriend(owner)?.distance?{helpful:'Helpful Friend — next proficient skill check'}:{})};
    const actor=c.base?wb20FamiliarActor(c,owner):null;
    for(const skill of Object.keys(actor?._skills || {}))options['skill:'+skill]='Roll '+skill+' — familiar';
    for(const [abbr] of c.base?.abilities || []) {options['ability:'+abbr]='Roll '+abbr+' check — familiar';options['saving-throw:'+abbr]='Roll '+abbr+' save — familiar';}
    const e=wb20FeatureEscape;
    const form=await wb20FeatureForm('Companion — '+c.name,wb20FamiliarCardHTML(c)+'<label>Control<select name="companion-control">'+
        Object.entries(options).map(([key,value])=>'<option value="'+e(key)+'">'+e(value)+'</option>').join('')+'</select></label>','Use selected control','Close');
    if(!form || owner!==character || wb20Companions(owner)[0]?.revision!==c.revision)return false;
    const choice=form.find('[name="companion-control"]').val();if(!Object.hasOwn(options,choice) || choice==='close')return false;
    if(choice==='profiles')return wb20ManageSavedFamiliars();
    if(choice==='manage')return wb20ManageFamiliar();
    if(choice==='actions')return wb20FamiliarActionMenu();
    if(choice==='initiative')return wb20FamiliarRoll('initiative','Initiative');
    if(choice.includes(':')){const [kind,...parts]=choice.split(':');return wb20FamiliarRoll(kind,parts.join(':'));}
    return wb20ManageFamiliar(choice);
}
async function wb20FamiliarActionMenu() {
    const owner=character,c=wb20Companions(owner)[0];if(!c?.base)return false;
    const options=Object.fromEntries(Object.keys(WB20_COMBAT_ACTIONS).filter(name=>name!=='Attack' && name!=='Magic').map(name=>[name,name+' — familiar Action']));
    options.cancel='Cancel';
    const choice=await dndbeyondDiceRoller.queryGeneric(c.name+' — familiar actions','Uses the familiar’s own turn and Action, not your Action.',options,
        'waybeyond20-familiar-actions',Object.keys(options),'cancel');
    if(owner!==character || !Object.hasOwn(options,choice) || choice==='cancel')return false;
    if(choice==='Hide')return wb20FamiliarRoll('skill','Stealth',{resource:'action'});
    if(choice==='Search')return wb20FamiliarRoll('skill','Perception',{resource:'action'});
    return wb20FamiliarRoll('trait',choice,{resource:'action'});
}
function wb20FamiliarRows(root) {
    const owner=character,c=wb20Companions(owner)[0],kept=new Set(),rows=[];
    const definitions=c?[{key:'card',name:c.name+' — Companion',group:'other',run:()=>wb20FamiliarCard(),cost:'Card'},
        {key:'actions',name:c.name+' — Familiar actions',group:'action',run:()=>wb20FamiliarActionMenu(),cost:'Familiar Action'},
        ...(c.rules?.senses?[{key:'senses',name:c.name+' — Share senses',group:'bonusAction',run:()=>wb20ManageFamiliar('senses'),cost:'Your Bonus Action'}]:[]),
        ...(c.status==='pocket'?[{key:'return',name:c.name+' — Return',group:'action',run:()=>wb20ManageFamiliar('return'),cost:'Your Magic action'}]:
            c.rules?.dismiss?[{key:'dismiss',name:c.name+' — Dismiss',group:'action',run:()=>wb20ManageFamiliar('dismiss'),cost:'Your Magic action'}]:[]),
        ...(c.rules?.delivery?[{key:'delivery',name:c.name+' — Deliver touch spell',group:'reaction',run:()=>wb20ManageFamiliar('delivery'),cost:'Familiar Reaction'}]:[])]:
        [{key:'card',name:'Companions — saved familiars',group:'other',run:()=>wb20ManageSavedFamiliars(),cost:'Cards'}];
    for(const d of definitions) {
        let row=Array.from(root.querySelectorAll(':scope > .wb20-familiar-row')).find(el=>el._wb20Key===d.key);
        if(!row) {
            row=document.createElement('div');row.className='ddbc-combat-attack wb20-feature-option wb20-familiar-row';row._wb20Key=d.key;
            row.innerHTML='<button type="button" class="wb20-feature-option-icon">◆</button><div class="ddbc-combat-attack__name"><button type="button" class="wb20-feature-option-name"></button><div class="wb20-talent-category"></div></div><div class="ddbc-combat-attack__range"></div><div class="ddbc-combat-attack__action"></div><div class="ddbc-combat-attack__damage"></div><div class="ddbc-combat-attack__notes"></div>';
            for(const button of row.querySelectorAll('button'))button.onclick=event=>{event.preventDefault();event.stopPropagation();if(row._wb20Owner===character)row._wb20Run().catch(console.warn);};
            root.append(row);
        }
        row._wb20Owner=owner;row._wb20Run=d.run;
        const set=(selector,value)=>{const cell=row.querySelector(selector),el=cell.querySelector('.wb20-action-value > :first-child') || cell;if(el.textContent!==value)el.textContent=value;};
        set('.wb20-feature-option-name',d.name);set('.wb20-talent-category',d.cost);
        wb20SetActionRange(row.querySelector('.ddbc-combat-attack__range'),'—');
        set('.ddbc-combat-attack__action','—');set('.ddbc-combat-attack__damage','—');
        wb20SetActionNote(row.querySelector('.ddbc-combat-attack__notes'),c?'HP '+(c.hp ?? '?')+'/'+(c.maxHP ?? '?')+' · '+c.status:'Choose a saved familiar',()=>wb20FamiliarCard(),'Companion card');
        kept.add(row);rows.push({row,name:d.name,key:'familiar:'+d.key,cost:'special',group:d.group,defaultVisible:true});
    }
    for(const row of root.querySelectorAll(':scope > .wb20-familiar-row'))if(!kept.has(row))row.remove();
    return rows;
}
