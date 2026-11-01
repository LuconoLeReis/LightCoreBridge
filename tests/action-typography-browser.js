const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..'),s=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
const a=s.indexOf('function wb20SetActionRange('),b=s.indexOf('// Bill\'s visual preference only.',a);
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();
 for(const dark of [false,true]){
  await page.setContent(`<style>body{color:${dark?'#a0aab1':'#75838b'}}.native .ddbc-combat-attack__label{font:14px 'Arial';color:${dark?'#fff':'#111'}}.native .ddbc-combat-attack__range{font:700 14px Arial;color:${dark?'#fff':'#111'}}.native .ddbc-combat-attack__action{font:700 16px Arial}.native .ddbc-combat-attack__damage{font:13px Arial;color:${dark?'#fff':'#111'}}.native .ddbc-combat-attack__meta-item{font:10px Arial}.native .ddbc-combat-attack__notes{font:10px Arial}.native .ddbc-combat-attack__tohit{font-size:16px}</style>
  <section class="ct-actions-list" data-wb20-list-view="compact"><div class="native ddbc-combat-attack" data-wb20-list-layout="row"><span class="ddbc-combat-attack__label">Sword</span><span class="ddbc-combat-attack__meta-item">Melee Attack</span><div class="ddbc-combat-attack__range">5 ft.</div><div class="ddbc-combat-attack__action"><div class="ddbc-combat-attack__tohit"><button><span>+7</span></button></div></div><div class="ddbc-combat-attack__damage"><span class="ddbc-damage__value">1d8</span></div><div class="ddbc-combat-attack__notes">V/S</div></div>
  <div class="wb20-quick-row ddbc-combat-attack" data-wb20-list-layout="row"><span class="wb20-feature-option-name">Cantrip: Attack</span><span class="wb20-talent-category">Starry Wisp</span><div class="ddbc-combat-attack__range">60 ft.</div><div class="ddbc-combat-attack__action"><button>+7</button></div><div class="ddbc-combat-attack__damage">1d8</div><div class="ddbc-combat-attack__notes">1 Action</div></div></section>`);
  await page.evaluate(()=>{const extra=document.querySelector('.wb20-quick-row').cloneNode(true);extra.classList.replace('wb20-quick-row','wb20-opportunity-attack');document.querySelector('.ct-actions-list').append(extra);});
  await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});await page.addScriptTag({content:s.slice(a,b)});
  const result=await page.evaluate(async()=>{
   const root=document.querySelector('.ct-actions-list');wayBeyond20MatchActionTypography(root);let mutations=0;
   const watcher=new MutationObserver(r=>mutations+=r.length);watcher.observe(root,{subtree:true,attributes:true,childList:true});
   for(let i=0;i<5;i++)wayBeyond20MatchActionTypography(root);await new Promise(r=>setTimeout(r,25));watcher.disconnect();
   const font=sel=>{const s=getComputedStyle(document.querySelector(sel));return{size:s.fontSize,family:s.fontFamily,color:s.color};};
   return{nativeName:font('.native .ddbc-combat-attack__label'),addedName:font('.wb20-feature-option-name'),hit:font('.native .ddbc-combat-attack__tohit button span'),damage:font('.native .ddbc-damage__value'),addedHit:font('.wb20-quick-row .ddbc-combat-attack__action button'),addedDamage:font('.wb20-quick-row .ddbc-combat-attack__damage'),opportunityRange:font('.wb20-opportunity-attack .ddbc-combat-attack__range'),nativeRange:font('.native .ddbc-combat-attack__range'),mutations};
  });
  assert.deepEqual(result.addedName,result.nativeName,'added names use native theme font and ink');
  assert.equal(result.hit.size,result.damage.size,'native Hit/DC uses damage font size');assert.equal(result.addedHit.size,result.damage.size);assert.equal(result.addedDamage.size,result.damage.size);
  assert.deepEqual(result.opportunityRange,result.nativeRange,'reaction rows use the same native range typography');
  assert.equal(result.mutations,0,'unchanged typography refresh is inert, no observer feedback');
 }
 console.log('PASS native and WB20 action-column typography in light/Underdark, Hit/DC matches damage text size, and repeated refresh produces zero mutations.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
