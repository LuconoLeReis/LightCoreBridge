const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..');
const character=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
const quick=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/quick-list.js'),'utf8');
function fn(s,name){const start=s.search(new RegExp('^function '+name+'\\(','m'));assert.ok(start>=0,name);const next=s.slice(start+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return s.slice(start,next<0?undefined:start+1+next);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});
 await page.addScriptTag({content:['wb20SetActionRange','wb20DecorateActionValues','wb20MarkDuplicateWeapons','wayBeyond20MatchActionTypography'].map(n=>fn(character,n)).join('\n')+'\n'+fn(quick,'wb20QuickSpellNotes')});
 await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
 for(const dark of [false,true]){
  await page.evaluate(dark=>{
   document.body.dataset.theme=dark?'dark':'light';
   document.body.innerHTML=`<style>body{font:14px Arial;background:${dark?'#171f21':'#fff'};color:${dark?'#eee':'#111'}}#root{width:680px}.ddbc-combat-attack{padding:7px 0;align-items:center;gap:8px}.ddbc-combat-attack__label,.wb20-feature-option-name,.wb20-talent-category,.ddbc-combat-attack__meta-item{display:block}.ddbc-combat-attack svg{width:14px;height:14px}.native{color:${dark?'#eee':'#111'}}.native button:hover,.native button:focus-visible{border-color:${dark?'#b00000':'#bfccd6'};background-color:${dark?'rgba(160,0,0,.2)':'#ced9e0'}}#root{--theme-color:#a00000}.native button{border:1px solid ${dark?'#a00000':'#bfccd6'};border-radius:3px;background:transparent;padding:5px 7px;min-height:30px}.ddbc-combat-attack{display:flex}.ddbc-combat-attack>div{width:90px}.ddbc-combat-attack__name{width:150px!important}.native .ddbc-combat-attack__label{font:14px Arial;color:inherit}.native .ddbc-combat-attack__range-label{font:10px Arial;color:${dark?'#a0aab1':'#75838b'}}.native .ddbc-damage__value{font:13px Arial}</style><div id="root" data-wb20-list-view="compact"><div class="native ddbc-combat-attack" data-wb20-list-layout="row"><div class="ddbc-combat-attack__name"><span class="ddbc-combat-attack__label">Spark</span><span class="ddbc-combat-attack__meta-item">Cantrip</span></div><div class="ddbc-combat-attack__range">60 ft.<span class="ddbc-combat-attack__range-label">Range</span></div><div class="ddbc-combat-attack__action"><div class="ddbc-combat-attack__tohit"><button>+7</button></div></div><div class="ddbc-combat-attack__damage"><button><span class="ddbc-damage__value">1d8</span><span class="ddbc-damage-type-icon" aria-label="radiant damage"><svg viewBox="0 0 20 20"><path d="M2 2H18V18H2Z"/></svg></span></button></div><div class="ddbc-combat-attack__notes">V/S</div></div><div class="ddbc-combat-attack wb20-quick-row" data-wb20-list-layout="row"><button class="wb20-feature-option-icon" aria-label="Cast Spark">Cast</button><div class="ddbc-combat-attack__name"><span class="wb20-feature-option-name">Cantrip: Attack</span><span class="wb20-talent-category">Spark</span></div><div class="ddbc-combat-attack__range"></div><div class="ddbc-combat-attack__action">+7</div><div class="ddbc-combat-attack__damage">1d8</div><div class="ddbc-combat-attack__notes">V/S</div></div></div>`;
   const row=document.querySelector('.wb20-quick-row');row._wb20PresentationSpell={name:'Spark'};window.activationCount=0;
   row.querySelector('.wb20-feature-option-icon').addEventListener('click',()=>window.activationCount++);
   wb20SetActionRange(row.querySelector('.ddbc-combat-attack__range'),'60ft.');wayBeyond20MatchActionTypography(document.querySelector('#root'));
  },dark);
  const result=await page.evaluate(async()=>{
   const root=document.querySelector('#root'),row=root.querySelector('.wb20-quick-row'),native=root.querySelector('.native'),nativeBefore=native.innerHTML;
   let changes=0;const observer=new MutationObserver(r=>changes+=r.length);observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true});
   for(let i=0;i<12;i++){wb20SetActionRange(row.querySelector('.ddbc-combat-attack__range'),'60ft.');wayBeyond20MatchActionTypography(root);}
   await new Promise(r=>setTimeout(r,30));observer.disconnect();
   const range=row.querySelector('.ddbc-combat-attack__range');const control=row.querySelector('.wb20-action-value');
   return{changes,nativeUnchanged:nativeBefore===native.innerHTML,range:range.textContent,bold:getComputedStyle(range.querySelector('.wb20-range-number')).fontWeight,small:getComputedStyle(range.querySelector('.wb20-range-units')).fontSize,border:getComputedStyle(control).borderColor,nativeBorder:getComputedStyle(native.querySelector('button')).borderColor,icons:row.querySelectorAll('[data-wb20-value-icon]').length,iconType:row.querySelector('[data-wb20-value-icon]')?.getAttribute('aria-label'),nativeDiceClass:row.querySelectorAll('.integrated-dice__container').length};
  });
  assert.equal(result.changes,0,'repeat producer + presentation passes are mutation-inert');assert.equal(result.nativeUnchanged,true);assert.equal(result.range,'60 ft.');assert.equal(result.bold,'700');assert.equal(result.small,'10px');assert.equal(result.border,result.nativeBorder);assert.equal(result.icons,1);assert.equal(result.iconType,'radiant damage');assert.equal(result.nativeDiceClass,0);
  const feedback=locator=>locator.evaluate(el=>{
   const css=getComputedStyle(el),canvas=document.createElement('canvas'),ink=canvas.getContext('2d',{willReadFrequently:true});
   return [css.borderTopColor,css.backgroundColor].map(color=>{
    ink.clearRect(0,0,1,1);ink.fillStyle=color;ink.fillRect(0,0,1,1);return [...ink.getImageData(0,0,1,1).data];
   });
  });
  for(const field of ['action','damage']){
   const native=page.locator('.native .ddbc-combat-attack__'+field+' button');
   const added=page.locator('.wb20-quick-row .ddbc-combat-attack__'+field+' button');
   await page.mouse.move(990,690);const rest=await feedback(added);
   const valueInk=()=>added.evaluate(el=>getComputedStyle(el.firstElementChild).color);
   if(dark)assert.equal(await valueInk(),'rgb(255, 255, 255)','Underdark dice must remain legible even when the sampled native text is black');
   await native.hover();const highlighted=await feedback(native);
   await page.evaluate(()=>wayBeyond20MatchActionTypography(document.querySelector('#root')));
   assert.deepEqual(await feedback(added),rest,'native hover must not become the baseline for every added roll box');
   await added.hover();assert.deepEqual(await feedback(added),highlighted,'matches the D&D Beyond-derived light/dark colors');
   if(dark)assert.equal(await valueInk(),'rgb(255, 255, 255)','hover retains the high-contrast roll number');
   if(field==='damage'){
    const tip=await added.evaluate(el=>{const css=getComputedStyle(el,'::after');return {label:css.content,ink:css.color,surface:css.backgroundColor,bottom:parseFloat(css.bottom),height:el.clientHeight,title:el.title,iconTitle:el.querySelector('[data-wb20-value-icon]')?.title};});
    assert.equal(tip.label,'"Radiant"');assert.ok(tip.bottom>tip.height,'tooltip is above the border');assert.equal(tip.title,'');assert.equal(tip.iconTitle,'');
    assert.deepEqual([tip.ink,tip.surface],dark?['rgb(37, 40, 44)','rgb(236, 239, 241)']:['rgb(236, 239, 241)','rgb(37, 40, 44)'],'tooltip keeps contrasting colors');
   }
   assert.notDeepEqual(highlighted,rest,'hover is visible');
   await page.mouse.move(990,690);assert.deepEqual(await feedback(added),rest);
  }
  await page.locator('.wb20-quick-row .ddbc-combat-attack__action button').click();assert.equal(await page.evaluate(()=>activationCount),1);
  await page.locator('.wb20-quick-row .ddbc-combat-attack__damage button').click();assert.equal(await page.evaluate(()=>activationCount),2,'each value click forwards exactly once to the existing activator');
  await page.evaluate(()=>{const range=document.querySelector('.wb20-quick-row .ddbc-combat-attack__range');wb20SetActionRange(range,'5 ft Touch');});
  assert.equal(await page.locator('.wb20-range-label').last().textContent(),'Touch');
  await page.screenshot({path:path.join(root,'tests',dark?'action-cells-dark.png':'action-cells-light.png')});
 }
 const notes=await page.evaluate(()=>{
  const spell={key:'x',notes:'1 Bonus Action · D: 1m, V/S/M'};
  return [wb20QuickSpellNotes(spell,{components:{x:'V, S, M (a diamond worth at least 300 GP, which the spell consumes)'}}),wb20QuickSpellNotes(spell,{components:{x:'M (a diamond worth 50 GP, which is not consumed)'}}),wb20QuickSpellNotes(spell,{descriptions:{x:'The target consumes food and gains 50 GP.'}}),wb20QuickSpellNotes(spell,{components:{x:'M (costly material, which the spell consumes)'}})];
 });
 assert.equal(notes[0].text,'300 GP/cast · D: 1m, V/S/M');assert.equal(notes[1].text,'50 GP material · D: 1m, V/S/M');assert.equal(notes[2].text,'D: 1m, V/S/M');assert.equal(notes[3].text,'Costly material/cast · D: 1m, V/S/M');
 const copies=await page.evaluate(async()=>{
  const root=document.querySelector('#root');root.replaceChildren();
  const weapon=(hit,damage,notes='Light, Finesse, Nick')=>{const row=document.createElement('div');row.className='ddbc-combat-attack';row.innerHTML='<div class="ddbc-combat-attack__name"><span class="ddbc-combat-attack__label">Dagger</span><span class="ddbc-combat-attack__meta-item">Melee Weapon • Martial Arts</span></div><div class="ddbc-combat-attack__range">20 (60)</div><div class="ddbc-combat-attack__action">'+hit+'</div><div class="ddbc-combat-attack__damage">'+damage+'</div><div class="ddbc-combat-attack__notes">'+notes+'</div>';root.append(row);return{row,name:'Dagger',cost:'action'};};
  const rows=[weapon('+6','1d6+4'),weapon('+6','1d6+4'),weapon('+6','1d6+4'),weapon('+7','1d6+5'),weapon('+6','1d6+4','Poisoned')];
  wb20MarkDuplicateWeapons(rows);let changes=0;const observer=new MutationObserver(r=>changes+=r.length);observer.observe(root,{attributes:true,subtree:true});for(let i=0;i<12;i++)wb20MarkDuplicateWeapons(rows);await new Promise(r=>setTimeout(r,20));observer.disconnect();
  const hidden=rows.map(e=>e.row.hasAttribute('data-wb20-duplicate-weapon'));
  rows[0].row.remove();wb20MarkDuplicateWeapons(rows.slice(1));return{changes,hidden,count:root.children.length,promoted:!rows[1].row.hasAttribute('data-wb20-duplicate-weapon')};
 });
 assert.deepEqual(copies.hidden,[false,true,true,false,false]);assert.equal(copies.changes,0);assert.equal(copies.count,4);assert.equal(copies.promoted,true,'remaining native copy becomes representative when first removed');
 console.log('PASS native-shaped light/dark range hierarchy, value borders/icons, one original activation per click, stable repeated refresh, consumed-vs-reusable material notes, identical-weapon collapse and differing-stat preservation.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
