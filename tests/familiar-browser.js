const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(file,name){const s=read(file),a=s.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(a>=0,name);const b=s.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return s.slice(a,b<0?undefined:a+1+b);}
function catalog(forms,next=''){return forms.map(([id,name,type='Beast',cr='0'])=>`<div class="info" data-type="monsters"><div class="monster-name"><span class="name"><a href="/monsters/${id}-${name.toLowerCase()}">${name}</a></span><span class="source">Monster Manual</span></div><div class="monster-challenge">${cr}</div><div class="monster-type"><span class="type">${type}</span></div></div>`).join('')+(next?`<div class="b-pagination"><a href="${next}">Next</a></div>`:'');}
const creature=name=>`<div class="mon-stat-block-2024"><div class="mon-stat-block-2024__name-link">${name}</div><div class="mon-stat-block-2024__meta">Tiny Beast, Unaligned</div>
<div class="mon-stat-block-2024__attribute"><span class="mon-stat-block-2024__attribute-label">AC</span><span class="mon-stat-block-2024__attribute-data-value">11</span><span class="mon-stat-block-2024__attribute-label">Initiative</span><span class="mon-stat-block-2024__attribute-data-value">+1 (11)</span></div>
<div class="mon-stat-block-2024__attribute"><span class="mon-stat-block-2024__attribute-label">HP</span><span class="mon-stat-block-2024__attribute-data-value">1</span><span class="mon-stat-block-2024__attribute-data-extra">(1d4 − 1)</span></div>
<div class="mon-stat-block-2024__attribute"><span class="mon-stat-block-2024__attribute-label">Speed</span><span class="mon-stat-block-2024__attribute-data-value">5 ft., Fly 60 ft.</span></div>
<table><tbody>${[['STR',3,-4],['DEX',13,1],['CON',8,-1],['INT',2,-4],['WIS',12,1],['CHA',7,-2]].map(([a,s,m])=>`<tr><th>${a}</th><td>${s}</td><td>${m>=0?'+':''}${m}</td><td>${m>=0?'+':''}${m}</td></tr>`).join('')}</tbody></table>
${[['Skills','Perception +5, Stealth +5'],['Senses','Darkvision 120 ft.; Passive Perception 15'],['CR','0 (XP 10)']].map(([k,v])=>`<div class="mon-stat-block-2024__tidbit"><span class="mon-stat-block-2024__tidbit-label">${k}</span><span class="mon-stat-block-2024__tidbit-data">${v}</span></div>`).join('')}
<div class="mon-stat-block-2024__description-block"><div class="mon-stat-block-2024__description-block-heading">Traits</div><div class="mon-stat-block-2024__description-block-content"><p><strong>Flyby.</strong> Flying away avoids opportunity attacks.</p></div></div>
<div class="mon-stat-block-2024__description-block"><div class="mon-stat-block-2024__description-block-heading">Actions</div><div class="mon-stat-block-2024__description-block-content"><p><strong>Talons.</strong> Melee Attack Roll: +3, reach 5 ft. Hit: 1 Slashing damage.</p></div></div></div>`;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.setDefaultTimeout(5000);page.on('pageerror',e=>{errors.push(String(e));console.error('PAGE:',e.message);});
await page.setContent('<main class="ct-character-sheet ct-character-sheet--dark-mode"><section class="ct-saving-throws-box" style="background:#252525;color:#eee;border:1px solid #555">Native surface</section><div id="actions"></div></main>');
await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
await page.addScriptTag({path:path.join(root,'libs/alertify.min.js')});
for(const file of ['libs/css/alertify.css','libs/css/alertify-themes/default.css','libs/css/alertify-themes/beyond20.css','src/extension/beyond20.css'])await page.addStyleTag({path:path.join(root,file)});
await page.addScriptTag({content:`var key_modifiers={},settings={},stored={},globals={},rules=[{name:'Familiar Friend (Charisma)',text:'You always have the Find Familiar spell prepared. Cast it without a spell slot or Material components. Your familiar’s HP max and current HP are increased by 8. When you make an ability check using a skill in which you have proficiency while your familiar is within 5 ft. of you, you gain Advantage on the check.'}],hpRolls=0,serial=0;
var owner={_id:'test',_level:4,getSetting:(k,d)=>stored[k]??d,getGlobalSetting:(k,d)=>globals[k]??d,getDict:()=>({name:'Bard'}),setGlobalSettings:s=>{globals=s;},mergeCharacterSettings:async(p,cb)=>{Object.assign(stored,p);cb?.(stored);}};var character=owner;
function wb20RuleText(s){return String(s||'').replace(/\\s+/g,' ').trim();}function wb20CurrentFeatureRules(){return rules;}function uuidv4(){return 'cast-'+(++serial);}
function wayBeyond20CommitAfterDispatch(args,cb){(args.commits ||= []).push(cb);}async function mergeSettings(p,cb){Object.assign(globals,p);cb?.(globals);}
function wayBeyond20ScheduleActiveEffectBadgeRefresh(){}function wayBeyond20GetTurnTrackerState(){return {turnNumber:1};}
async function wb20ResourceLocked(f){return f();}function wayBeyond20RollAlreadyHasAdvantage(){return false;}
var WhisperType={YES:1},dndbeyondDiceRoller={setSettings:()=>{},_prompter:{prompt:(...args)=>wayBeyond20Prompt(...args)},_roller:{roll:formula=>({formula,total:0}),resolveRolls:async()=>{hpRolls++;}}};function updateRollTypeButtonClasses(){}
var spell='You gain the service of a familiar. Choose another Beast that has a Challenge Rating of 0. It has its form’s statistics, though it is a Celestial, Fey, or Fiend (your choice) instead of a Beast. While your familiar is within 100 feet of you, you can communicate with it telepathically. As a Bonus Action, you can see through the familiar. For a spell with a range of touch it takes a Reaction to deliver. A familiar can’t attack. As a Magic action, you can temporarily dismiss it. It can reappear in an unoccupied space within 30 feet. One Familiar Only.';
function wb20SetActionRange(el,value){el.textContent=value;}function wb20SetActionNote(el,value,callback){el.textContent=value;el.onclick=callback;}
`});
for(const [file,name] of [['src/common/utils.js','initializeAlertify'],['src/common/utils.js','wayBeyond20Prompt'],['src/dndbeyond/content-scripts/portent.js','wayBeyond20ApplySheetTheme'],['src/dndbeyond/content-scripts/resources.js','wb20ThemeResourcePrompt'],['src/dndbeyond/content-scripts/feature-activations.js','wb20FeatureEscape'],['src/dndbeyond/content-scripts/feature-activations.js','wb20FeatureForm']])await page.addScriptTag({content:fn(file,name)});
await page.addScriptTag({content:read('src/dndbeyond/base/base.js').split('/**')[0]});
await page.addScriptTag({content:read('src/dndbeyond/base/monster.js')});
for(const file of ['familiars.js','familiar-forms.js','familiar-profiles.js','familiar-card.js'])await page.addScriptTag({content:read('src/dndbeyond/content-scripts/'+file)});
await page.evaluate(()=>{initializeAlertify();alertify.defaults.transition='none';});
const next='/monsters?filter-cr-min=1&filter-cr-max=1&filter-type=2&page=2';
await page.evaluate(({first,second,owl,hawk})=>{window.fetch=async url=>({ok:true,url,text:async()=>url.includes('/monsters/')?(url.includes('-hawk')?hawk:owl):url.includes('page=2')?second:first});},
 {first:catalog([[1,'Hawk'],[2,'Owl'],[4,'Wrong','Dragon','1']],next),second:catalog([[3,'Rat']]),owl:creature('Owl'),hawk:creature('Hawk')});
let cases=0;
assert.deepEqual(await page.evaluate(async()=> (await wb20FamiliarBaseCatalog()).map(f=>f.name).sort()),['Hawk','Owl','Rat']);cases++;
const start=()=>page.evaluate(()=>{window.args={};window.preparing=wb20PrepareFamiliarCast(args,{name:'Find Familiar',description:spell});});
const scope='.alertify:not(.ajs-hidden)';
const ready=()=>page.waitForFunction(()=>!document.querySelector('.alertify:not(.ajs-hidden)')?.classList.contains('ajs-in')); 
await start();await page.locator('[name="familiar-form"]').selectOption({label:'Owl: Monster Manual'});
await page.locator('[name="familiar-name"]').fill('Sparrow');await page.locator('[name="familiar-appearance"]').fill('songbird');
await ready();await page.locator(scope+' .ajs-ok').click();assert.equal(await page.evaluate(()=>preparing),true);cases++;
await page.evaluate(async()=>{wb20FamiliarCapturePrivacy(args,{whisper:1});await Promise.all([args.commits[0](),args.commits[0]()]);});
assert.deepEqual(await page.evaluate(()=>{const c=wb20Companions()[0];return [c.name,c.base.name,c.appearance,c.hp,c.maxHP,c.creatureType,hpRolls];}),['Sparrow','Owl','songbird',9,9,'Celestial',1]);cases++;
await page.locator('[name="companion-control"]').waitFor();
assert.match(await page.locator(scope+' .ajs-content').innerText(),/Flyby/);assert.match(await page.locator(scope+' .ajs-content').innerText(),/cannot attack/);cases+=2;
assert.equal(await page.evaluate(()=>wb20FamiliarRows(document.querySelector('#actions')).length),5);cases++;
assert.equal(await page.locator('.wb20-familiar-row').count(),5);await page.evaluate(()=>wb20FamiliarRows(document.querySelector('#actions')));assert.equal(await page.locator('.wb20-familiar-row').count(),5);cases++;
// Actual producer: only a present familiar with HP above 0 is tagged as an Actions pet.
assert.deepEqual(await page.evaluate(()=>{const rows=document.querySelector('#actions'),original=character.getSetting(WB20_COMPANIONS_KEY,[]);
    const tags=change=>{character.mergeCharacterSettings({[WB20_COMPANIONS_KEY]:original.map(c=>c.kind==='familiar'?{...c,...change}:c)});
        return [...new Set(wb20FamiliarRows(rows).map(r=>r.pet?r.pet.name:'none'))];};
    const out={present:tags({}),gone:tags({status:'gone'}),pocket:tags({status:'pocket'}),hp0:tags({hp:0})};
    character.mergeCharacterSettings({[WB20_COMPANIONS_KEY]:original});wb20FamiliarRows(rows);return out;}),
    {present:['Sparrow'],gone:['none'],pocket:['none'],hp0:['none']});cases++;
if(process.env.WB20_PRESENTATION_EVIDENCE)await page.screenshot({path:path.join(process.env.WB20_PRESENTATION_EVIDENCE,'familiar-card-dark.png')});
await ready();await page.locator(scope+' .ajs-cancel').click();await start();
assert.equal(await page.locator('[name="familiar-name"]').inputValue(),'Sparrow');cases++;
await page.locator('[name="familiar-form"]').selectOption({label:'Hawk: Monster Manual'});await page.locator('[name="familiar-name"]').fill('');await ready();await page.locator(scope+' .ajs-ok').click();assert.equal(await page.evaluate(()=>preparing),true);
await page.evaluate(()=>args.commits[0]());await page.locator('[name="companion-control"]').waitFor();
assert.deepEqual(await page.evaluate(()=>[globals['waybeyond20-familiar-name'],wb20Companions().length,wb20Companions()[0].name,hpRolls]),['',1,'Hawk',2]);cases++;
assert.deepEqual(await page.evaluate(()=>wb20FamiliarProfiles().map(p=>p.name)),['Sparrow']);cases++;
await ready();await page.locator(scope+' .ajs-cancel').click();await start();await page.locator('[name="saved-familiar"]').selectOption('0');assert.equal(await page.locator('[name="familiar-name"]').inputValue(),'Sparrow');cases++;await page.locator('[name="familiar-name"]').fill('discard me');await ready();await page.locator(scope+' .ajs-cancel').click();assert.equal(await page.evaluate(()=>preparing),false);
assert.deepEqual(await page.evaluate(()=>[hpRolls,globals['waybeyond20-familiar-name']]),[2,'']);cases++;
await page.evaluate(()=>{window.profileQuestions=[];dndbeyondDiceRoller.queryGeneric=async(title,message)=>{profileQuestions.push(message);return 'cancel';};});
await start();await page.locator('[name="familiar-form"]').selectOption({label:'Hawk: Monster Manual'});await page.locator('[name="familiar-name"]').fill('Sparrow');await ready();await page.locator(scope+' .ajs-ok').click();assert.equal(await page.evaluate(()=>preparing),false);
assert.deepEqual(await page.evaluate(()=>[profileQuestions.length,wb20FamiliarProfiles()[0].formName,hpRolls]),[1,'Owl',2]);cases++;
await start();await page.evaluate(()=>rules.push({name:'New feature',text:'Changed while choosing.'}));await ready();await page.locator(scope+' .ajs-ok').click();assert.equal(await page.evaluate(()=>preparing),false);cases++;
assert.deepEqual(await page.locator('.wb20-familiar-card th,.wb20-familiar-card td').evaluateAll(els=>Array.from(new Set(els.map(el=>getComputedStyle(el).color)))),[],'closed dialogs do not leak a card into the page');
assert.deepEqual(errors,[]);console.log('PASS familiar browser: '+cases+' cases; real picker/dialog, live-shaped catalog/stat block, name memory, cards, action links, cancel and stale features.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
