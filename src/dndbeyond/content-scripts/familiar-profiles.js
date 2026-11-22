const WB20_FAMILIAR_PROFILES='waybeyond20-familiar-profiles';
const wb20FamiliarPickerPlans=new Map();
function wb20SavedFamiliarBase(raw,url,name,source) {
    if(!raw || !Array.isArray(raw.abilities) || raw.abilities.length!==6 || !Number.isFinite(Number(raw.ac)) || !Number.isFinite(Number(raw.hp)) ||
        !/^\d*d\d+(?:[+-]\d+)?$/.test(String(raw.formula || '')))return null;
    const abilities=raw.abilities.map(a=>Array.isArray(a)?a.slice(0,4).map(v=>v==null?null:String(v).slice(0,20)):[]);
    if(new Set(abilities.map(a=>a[0])).size!==6 || abilities.some(a=>!['STR','DEX','CON','INT','WIS','CHA'].includes(a[0]) || !a.slice(1,3).every(v=>Number.isFinite(Number(v)))))return null;
    const entries=value=>Array.isArray(value)?value.slice(0,50).filter(v=>v && typeof v.name==='string' && typeof v.text==='string').map(v=>({name:v.name.slice(0,150),text:v.text.slice(0,10000),section:String(v.section || '').slice(0,30),attack:!!v.attack})):[];
    return {name,url,source,hp:Number(raw.hp),ac:Number(raw.ac),formula:raw.formula,abilities,
        initiative:Number.isFinite(Number(raw.initiative))?Number(raw.initiative):Number(abilities.find(a=>a[0]==='DEX')[2]),
        speed:String(raw.speed || '').slice(0,200),skills:String(raw.skills || '').slice(0,1000),senses:String(raw.senses || '').slice(0,1000),languages:String(raw.languages || '').slice(0,1000),
        meta:String(raw.meta || '').slice(0,200),cr:String(raw.cr || '').slice(0,20),traits:entries(raw.traits),actions:entries(raw.actions),
        attributes:Object.fromEntries(Object.entries(raw.attributes || {}).slice(0,30).filter(([k,v])=>typeof v==='string' && !['__proto__','constructor','prototype'].includes(k)).map(([k,v])=>[k.slice(0,100),v.slice(0,2000)]))};
}
function wb20ValidFamiliarProfile(raw) {
    if(!raw || typeof raw!=='object' || Array.isArray(raw))return null;
    const name=typeof raw.name==='string'?raw.name.trim():'';
    const formName=typeof raw.formName==='string'?raw.formName.trim():'';
    if(!name || name.length>100 || !formName || formName.length>100)return null;
    let url;try {url=wb20FamiliarURL(raw.url).href;}catch(_){return null;}
    if(!/^\/monsters\/\d+-[^/]+$/.test(new URL(url).pathname))return null;
    return {name,formName,url,source:String(raw.source || '').slice(0,200),appearance:String(raw.appearance || '').slice(0,200),
        creatureType:String(raw.creatureType || '').slice(0,30),eligibilityOverride:raw.eligibilityOverride===true,
        sourceNote:String(raw.sourceNote || '').slice(0,500),base:wb20SavedFamiliarBase(raw.base,url,formName,String(raw.source || '').slice(0,200))};
}
function wb20FamiliarProfiles(owner=character) {
    const data=owner.getGlobalSetting(WB20_FAMILIAR_PROFILES,[]);
    return Array.isArray(data)?data.slice(0,100).map(wb20ValidFamiliarProfile).filter(Boolean):[];
}
async function wb20SaveFamiliarProfiles(profiles,owner=character,lastName=undefined) {
    const incoming=profiles.map(wb20ValidFamiliarProfile).filter(Boolean);if(incoming.length!==profiles.length)return false;
    const save=async()=>{
        let latest=owner._global_settings || settings;
        if(typeof getStoredSettings==='function')latest=await new Promise(resolve=>getStoredSettings(resolve));
        const combined=new Map((Array.isArray(latest[WB20_FAMILIAR_PROFILES])?latest[WB20_FAMILIAR_PROFILES]:[]).map(wb20ValidFamiliarProfile).filter(Boolean).map(p=>[p.name.toLowerCase(),p]));
        for(const profile of incoming)combined.set(profile.name.toLowerCase(),profile);
        if(combined.size>100){alertify.warning('The saved familiar list is limited to 100 names.');return false;}
        const patch={[WB20_FAMILIAR_PROFILES]:Array.from(combined.values())};
        if(lastName!==undefined)patch['waybeyond20-familiar-name']=lastName;
        let saved=false;
        await mergeSettings(patch,value=>{
            saved=true;settings=value;
            if(owner===character)owner.setGlobalSettings(value);
            if(typeof chrome!=='undefined' && chrome.runtime?.sendMessage)try {chrome.runtime.sendMessage({action:'settings',type:'general',settings:value});}catch(_){}
        });
        if(!saved)alertify.warning('The familiar completed, but its saved profile could not be stored.');
        return saved;
    };
    return typeof navigator!=='undefined' && navigator.locks?navigator.locks.request('wb20-familiar-profiles',save):save();
}
function wb20WireFamiliarPicker(root) {
    const plan=wb20FamiliarPickerPlans.get(root.dataset.familiarPlan);if(!plan)return;
    const select=root.querySelector('[name="saved-familiar"]');if(!select)return;
    select.addEventListener('change',()=>{
        const profile=plan.profiles[Number(select.value)];if(!profile)return;
        const index=plan.forms.findIndex(form=>form.url===profile.url);
        if(index<0)return;
        root.querySelector('[name="familiar-form"]').value=String(index);
        root.querySelector('[name="familiar-name"]').value=profile.name;
        root.querySelector('[name="familiar-appearance"]').value=profile.appearance;
        const type=root.querySelector('[name="familiar-type"]');
        if(Array.from(type.options).some(o=>o.value===profile.creatureType))type.value=profile.creatureType;
    });
}
async function wb20ManageSavedFamiliars() {
    const owner=character,profiles=wb20FamiliarProfiles(owner),e=wb20FeatureEscape;
    const form=await wb20FeatureForm('Saved familiars',
        '<p>Named summons are saved here. Only one familiar is active at a time. HP is rolled again when you summon one.</p>'+ 
        (profiles.length?'<label>View a saved familiar<select name="profile-view"><option value="">Choose a familiar</option>'+profiles.map((p,i)=>'<option value="'+i+'">'+e(p.name)+' — '+e(p.formName)+'</option>').join('')+'</select></label>':'<p>No named familiars have been saved.</p>')+
        '<label>Import saved familiars (optional)<input type="file" name="profile-import" accept="application/json,.json"></label>','View or import','Close');
    if(!form || owner!==character)return false;
    const file=form.find('[name="profile-import"]')[0]?.files?.[0];
    if(file) {
        if(file.size>200000){alertify.warning('That familiar file is too large.');return false;}
        let data;try {data=JSON.parse(await file.text());}catch(_){alertify.warning('That file could not be read as a familiar list.');return false;}
        if(!Array.isArray(data) || data.length>100 || !data.every(wb20ValidFamiliarProfile)){alertify.warning('That familiar list has an invalid name or creature reference. Nothing was imported.');return false;}
        if(await wb20SaveFamiliarProfiles(data,owner)){alertify.success('Saved familiars imported. No familiar was summoned and no resources were spent.');return true;}
        return false;
    }
    const raw=form.find('[name="profile-view"]').val();if(raw==='' || raw===undefined)return false;
    const profile=profiles[Number(raw)];if(!profile)return false;
    const bonus=wb20FamiliarFriend(owner)?.bonus || 0;
    if(!profile.base){alertify.warning('This saved form’s card will be built from DDB when it is summoned.');return false;}
    return wb20FeatureForm('Saved familiar — '+profile.name,wb20FamiliarCardHTML({name:profile.name,appearance:profile.appearance,
        creatureType:profile.creatureType,base:profile.base,bonus,castLevel:Number(owner._level),status:'saved — not summoned',savedPreview:true,sourceNote:profile.sourceNote,
        hp:null,maxHP:null,features:[]}), 'Close','Close');
}
