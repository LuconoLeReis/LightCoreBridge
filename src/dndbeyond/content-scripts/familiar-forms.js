// Read the eligible catalog and chosen stat block from DDB. Never ship a form list.
let wb20FamiliarCatalog = null;
function wb20FamiliarURL(value, base = 'https://www.dndbeyond.com') {
    const url = new URL(value,base);
    if (url.protocol !== 'https:' || url.username || url.password || !['www.dndbeyond.com','dndbeyond.com'].includes(url.hostname) || !/^\/monsters(?:\/|$)/.test(url.pathname)) throw Error('Invalid DDB creature URL');
    return url;
}
async function wb20FamiliarDocument(url) {
    const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),10000);
    try {
        const response = await fetch(wb20FamiliarURL(url).href,{credentials:'include',signal:controller.signal});
        if (!response.ok) throw Error('Creature source unavailable');
        wb20FamiliarURL(response.url || url);
        const html = await response.text();
        if (html.length > 5000000) throw Error('Creature source too large');
        return new DOMParser().parseFromString(html,'text/html');
    } finally { clearTimeout(timer); }
}
function wb20FamiliarCatalogEntries(doc,url) {
    return Array.from(doc.querySelectorAll('.info[data-type="monsters"]')).flatMap(row=>{
        const link=row.querySelector('.monster-name .name a[href]');
        if (!link) return [];
        let href;try {href=wb20FamiliarURL(link.getAttribute('href'),url).href;} catch (_) {return [];}
        return [{name:wb20RuleText(link.textContent),url:href,
            cr:wb20RuleText(row.querySelector('.monster-challenge')?.textContent),
            type:wb20RuleText(row.querySelector('.monster-type .type')?.textContent),
            source:wb20RuleText(row.querySelector('.monster-name .source')?.textContent),legacy:link.hasAttribute('aria-describedby') && link.getAttribute('aria-describedby').includes('legacy')}];
    });
}
async function wb20FamiliarBaseCatalog() {
    if (wb20FamiliarCatalog) return wb20FamiliarCatalog;
    wb20FamiliarCatalog = (async()=>{
        const first=new URL('https://www.dndbeyond.com/monsters');
        first.searchParams.append('filter-type','0');first.searchParams.append('filter-type','2');
        first.searchParams.set('filter-cr-min','1');first.searchParams.set('filter-cr-max','1');
        const queue=[first.href],visited=new Set(),forms=new Map();
        while(queue.length) {
            if(visited.size>=20)throw Error('Creature catalog pagination changed');
            const url=queue.shift();if(visited.has(url))continue;visited.add(url);
            const doc=await wb20FamiliarDocument(url);
            const entries=wb20FamiliarCatalogEntries(doc,url);
            if(!entries.length)throw Error('Creature catalog could not be read');
            for(const entry of entries)if(entry.cr==='0' && /^Beast$/i.test(entry.type))forms.set(entry.url,entry);
            for(const a of doc.querySelectorAll('.b-pagination a[href]')) {
                let next;try {next=wb20FamiliarURL(a.getAttribute('href'),url);}catch(_){continue;}
                if(next.pathname==='/monsters' && next.searchParams.get('filter-cr-min')==='1' && next.searchParams.get('filter-cr-max')==='1' && next.searchParams.getAll('filter-type').includes('2') && !visited.has(next.href) && !queue.includes(next.href))queue.push(next.href);
            }
        }
        if(!forms.size)throw Error('No familiar forms could be read');
        return Array.from(forms.values());
    })();
    try {return await wb20FamiliarCatalog;} catch(error){wb20FamiliarCatalog=null;throw error;}
}
function wb20FamiliarFeatureForms(owner) {
    const names=new Set();
    for(const rule of wb20CurrentFeatureRules(owner)) {
        const text=wb20RuleText(rule.text);
        if(!/Find Familiar/i.test(text))continue;
        const list=text.match(/when you cast (?:the )?Find Familiar spell.{0,180}?choose.{0,100}?following forms?\s*:\s*([^.;]+)/i)?.[1];
        if(list)for(const name of list.split(/,|\bor\b|\band\b/i).map(wb20RuleText))if(name && name.length<100)names.add(name);
    }
    return Array.from(names);
}
async function wb20FamiliarForms(owner,description) {
    const rules=wb20RuleText(description);
    if(!/another Beast.{0,100}Challenge Rating of 0/i.test(rules))throw Error('The spell’s form limits could not be read');
    const forms=await wb20FamiliarBaseCatalog(),all=new Map(forms.map(f=>[f.url,f]));
    for(const name of wb20FamiliarFeatureForms(owner)) {
        const url=new URL('https://www.dndbeyond.com/monsters');url.searchParams.set('filter-search',name);
        const doc=await wb20FamiliarDocument(url.href);
        for(const form of wb20FamiliarCatalogEntries(doc,url.href))if(form.name.toLowerCase()===name.toLowerCase())all.set(form.url,{...form,featureGranted:true});
    }
    return Array.from(all.values()).sort((a,b)=>a.name.localeCompare(b.name) || Number(a.legacy)-Number(b.legacy) || a.source.localeCompare(b.source));
}
function wb20FamiliarStatBlock(doc,form) {
    const block=doc.querySelector('.mon-stat-block-2024,.mon-stat-block');if(!block)return null;
    const text=el=>wb20RuleText(el?.textContent).replace(/[−–]/g,'-');
    const actualName=text(block.querySelector('[class$="__name-link"],[class$="__name"]'));
    if(actualName.toLowerCase()!==form.name.toLowerCase())return null;
    const attributes={};
    for(const group of block.querySelectorAll('.mon-stat-block-2024__attribute,.mon-stat-block__attribute,.mon-stat-block-2024__tidbit,.mon-stat-block__tidbit')) {
        const labels=Array.from(group.querySelectorAll('[class$="__attribute-label"],[class$="__tidbit-label"]'));
        const values=Array.from(group.querySelectorAll('[class$="__attribute-data-value"],[class$="__tidbit-data"]'));
        labels.forEach((label,i)=>{attributes[text(label)]=text(values[i]);});
    }
    const hpGroup=Array.from(block.querySelectorAll('.mon-stat-block-2024__attribute,.mon-stat-block__attribute'))
        .find(group=>/^(HP|Hit Points)$/i.test(text(group.querySelector('[class$="__attribute-label"]'))));
    const hpLine=text(hpGroup),formula=hpLine.match(/\((\d*d\d+(?:\s*[+-]\s*\d+)?)\)/i)?.[1]?.replace(/\s+/g,'');
    const hp=Number(String(attributes.HP || attributes['Hit Points'] || '').match(/^\d+/)?.[0]);
    const ac=Number(String(attributes.AC || attributes['Armor Class'] || '').match(/^\d+/)?.[0]);
    const abilities=[];
    for(const row of block.querySelectorAll('tbody tr')) {
        const cells=Array.from(row.querySelectorAll('th,td')).map(text);
        if(/^(STR|DEX|CON|INT|WIS|CHA)$/.test(cells[0]) && cells.length>=3)abilities.push(cells.slice(0,4));
    }
    // Legacy horizontal score cards still expose all six ability headings.
    if(!abilities.length)for(const abbr of ['str','dex','con','int','wis','cha']) {
        const ability=block.querySelector('.ability-block__stat--'+abbr);
        const score=Number(text(ability?.querySelector('.ability-block__score')));
        if(ability && Number.isFinite(score))abilities.push([abbr.toUpperCase(),String(score),text(ability.querySelector('.ability-block__modifier')).replace(/[()]/g,''),null]);
    }
    const meta=text(block.querySelector('[class$="__meta"]'));
    const cr=String(attributes.CR || attributes.Challenge || '').match(/^(\d+(?:\/\d+)?)/)?.[1];
    if(!formula || !Number.isFinite(hp) || hp<1 || !Number.isFinite(ac) || ac<1 || abilities.length!==6 || !cr ||
        !form.featureGranted && !form.eligibilityOverride && (cr!=='0' || !/\bBeast\b/i.test(meta)))return null;
    const traits=[],actions=[];
    for(const group of block.querySelectorAll('[class$="__description-block"]')) {
        const section=text(group.querySelector('[class$="__description-block-heading"]')) || 'Traits';
        const content=group.querySelector('[class$="__description-block-content"]');
        for(const p of content?.querySelectorAll(':scope > p') || []) {
            const name=text(p.querySelector('strong')).replace(/\.$/,'');if(!name)continue;
            const entry={name,section,text:text(p),attack:/\b(?:Melee|Ranged)(?: Weapon| Spell)? Attack(?: Roll)?:/i.test(text(p))};
            (section==='Traits'?traits:actions).push(entry);
        }
    }
    return {name:form.name,url:form.url,source:form.source,hp,formula,ac,abilities,meta,cr,
        initiative:Number(String(attributes.Initiative || abilities.find(a=>a[0]==='DEX')?.[2]).match(/[+-]?\d+/)?.[0]),
        speed:attributes.Speed || '',skills:attributes.Skills || '',senses:attributes.Senses || '',languages:attributes.Languages || '',
        attributes,traits,actions};
}
async function wb20PickFamiliarForm(owner,description) {
    const currentSignature=()=>JSON.stringify([owner._level,wb20CurrentFeatureRules(owner).map(r=>[r.name,r.text])]);
    const signature=currentSignature();
    let forms;
    try {forms=await wb20FamiliarForms(owner,description);} catch(error) {
        alertify.warning('Find Familiar: the available DDB forms could not be loaded. No cast or use was spent.');return null;
    }
    if(character!==owner)return null;
    const profiles=typeof wb20FamiliarProfiles==='function'?wb20FamiliarProfiles(owner):[];
    for(const profile of profiles)if(profile.eligibilityOverride && !forms.some(f=>f.url===profile.url))
        forms.push({name:profile.formName,url:profile.url,source:profile.source,sourceNote:profile.sourceNote,eligibilityOverride:true});
    const text=wb20RuleText(description),types=(text.match(/it is a (.+?) \(your choice\) instead of a Beast/i)?.[1] || '').split(/,|\bor\b/i).map(wb20RuleText).filter(Boolean);
    if(!types.length){alertify.warning('Find Familiar: its creature type choices could not be read. No cast was sent.');return null;}
    const escape=wb20FeatureEscape,previous=wb20Companions(owner)[0];
    const remembered=String(owner.getGlobalSetting('waybeyond20-familiar-name','') || '').slice(0,100);
    const token=uuidv4();if(typeof wb20FamiliarPickerPlans!=='undefined')wb20FamiliarPickerPlans.set(token,{forms,profiles});
    let form;try {form=await wb20FeatureForm('Find Familiar: choose a form',
        '<section data-familiar-plan="'+token+'"><p>HP is rolled for this cast, with a minimum base of 1 before your familiar bonuses. Naming a summon saves it; a blank name leaves it generic.</p>'+ 
        (profiles.length?'<label>Saved familiar<select name="saved-familiar"><option value="">New or generic familiar</option>'+profiles.map((p,i)=>'<option value="'+i+'"'+(!forms.some(f=>f.url===p.url)?' disabled':'')+'>'+escape(p.name)+': '+escape(p.formName)+'</option>').join('')+'</select></label>':'')+
        '<label>Form<select name="familiar-form">'+
        forms.map((f,i)=>`<option value="${i}"${f.url===previous?.base?.url?' selected':''}>${escape(f.name)}: ${escape(f.source)}${f.legacy?' (Legacy)':''}${f.eligibilityOverride?' (saved custom form)':''}</option>`).join('')+
        '</select></label><label>Creature type<select name="familiar-type">'+types.map(t=>`<option>${escape(t)}</option>`).join('')+'</select></label>'+ 
        '<label>Familiar Name (optional)<input name="familiar-name" type="text" maxlength="100" value="'+escape(remembered)+'" placeholder="Use the creature’s name"></label>'+ 
        '<label>Appearance (optional; stats stay those of the chosen form)<input name="familiar-appearance" type="text" maxlength="200" value="'+escape(previous?.appearance || '')+'"></label></section>','Cast');
    } finally {if(typeof wb20FamiliarPickerPlans!=='undefined')wb20FamiliarPickerPlans.delete(token);}
    if(!form || character!==owner || signature!==currentSignature())return null;
    const selected=forms[Number(form.find('[name="familiar-form"]').val())],type=form.find('[name="familiar-type"]').val();
    if(!selected || !types.includes(type))return null;
    let base;try {base=wb20FamiliarStatBlock(await wb20FamiliarDocument(selected.url),selected);}catch(_){base=null;}
    if(!base || character!==owner || signature!==currentSignature()){alertify.warning('That familiar’s DDB stat block or current feature eligibility could not be verified. No cast or use was spent.');return null;}
    let familiarName=String(form.find('[name="familiar-name"]').val() || '').trim().slice(0,100);
    while(familiarName && profiles.some(p=>p.name.toLowerCase()===familiarName.toLowerCase() && p.url!==selected.url)) {
        const choice=await dndbeyondDiceRoller.queryGeneric('Update saved familiar?',
            familiarName+' is saved with a different form. Update that profile to '+selected.name+', save this summon under another name, or cancel the cast.',
            {update:'Update '+familiarName+' to '+selected.name,rename:'Save under another name',cancel:'Cancel'},
            'waybeyond20-familiar-profile-change',['update','rename','cancel'],'cancel');
        if(owner!==character || signature!==currentSignature() || !choice || choice==='cancel')return null;
        if(choice==='update')break;
        if(choice!=='rename')return null;
        const renamed=await wb20FeatureForm('Name this familiar',
            '<label>Familiar Name (optional)<input name="new-familiar-name" maxlength="100" placeholder="Leave blank for a generic summon"></label>','Continue');
        if(!renamed || owner!==character || signature!==currentSignature())return null;
        familiarName=String(renamed.find('[name="new-familiar-name"]').val() || '').trim().slice(0,100);
    }
    return {base,type,familiarName,sourceNote:selected.sourceNote || '',eligibilityOverride:!!selected.eligibilityOverride,
        appearance:String(form.find('[name="familiar-appearance"]').val() || '').trim().slice(0,200)};
}
