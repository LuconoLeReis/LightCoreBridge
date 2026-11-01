// Actual native fixed-viewBox frame composition; no live character or gameplay.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/character.js'),'utf8');
function fn(name){const start=source.search(new RegExp(`^function ${name}\\(`,'m'));assert.ok(start>=0,name);const end=source.slice(start+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return source.slice(start,end<0?undefined:start+1+end);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:900,height:500}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(`<body style="background:#171c20;color:#eee;font:14px Arial"><section id="panel" class="ct-combat__statuses"><div class="ddbc-box-background"><svg viewBox="0 0 408 95" class="ddbc-svg"><polygon fill="#10161a" stroke="#d34903" points="8 93 401 93 401 2 8 2 8 93" /></svg></div><div class="ct-combat__statuses-group"><div id="defenses" class="ct-combat__summary-label">DEFENSES</div><div class="ct-defenses-summary"><div>Resistances, Immunities, or Vulnerabilities</div></div></div><div class="conditions"><div id="conditions">CONDITIONS</div>Add Active Conditions</div></section></body>`);
 await page.addStyleTag({content:`#panel{position:relative;box-sizing:border-box;display:flex;width:408px;height:95px;padding:10px}.ddbc-box-background{position:absolute;inset:0;pointer-events:none}.ddbc-box-background svg{display:block;width:100%}.ct-combat__statuses-group,.conditions{position:relative;width:50%;box-sizing:border-box;padding:0 10px}.ct-defenses-summary{max-height:57px;overflow:hidden;line-height:18px}.waybeyond20-effect-header-split{display:flex;justify-content:space-between}`});
 await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
 await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.evaluate(()=>{
  window.wayBeyond20FindVisibleTextElement=label=>$(label==='DEFENSES'?'#defenses':'#conditions');
  window.wayBeyond20UpsertEffectBadge=anchor=>{anchor.addClass('waybeyond20-effect-header-split');if(!anchor.find('.waybeyond20-buffs-badge').length)anchor.append('<span class="waybeyond20-buffs-badge waybeyond20-effect-badge">BUFFS</span>');};
  window.wayBeyond20EffectKey=e=>e.id;window.wayBeyond20GetTrackedSpellEffects=()=>[];window.wayBeyond20OpenEffectsPopout=()=>{};
 });
 await page.addScriptTag({content:fn('wayBeyond20InjectBuffsBadge')});
 for(const width of [340,408,600]){
  await page.evaluate(width=>{document.querySelector('#panel').style.width=width+'px';wayBeyond20InjectBuffsBadge([{id:'fire',name:'Everflame — Flames'},{id:'ward',name:'A longer protective effect with a wrapping name'}]);},width);
  const bounds=await page.evaluate(()=>{
   const svg=document.querySelector('svg'),shape=svg.querySelector('polygon'),b=shape.getBBox(),matrix=shape.getScreenCTM();
   const a=new DOMPoint(b.x,b.y).matrixTransform(matrix),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(matrix);
   const texts=Array.from(document.querySelectorAll('.ct-defenses-summary,.waybeyond20-buff-name')).map(n=>{const r=document.createRange();r.selectNodeContents(n);const t=r.getBoundingClientRect();return{left:t.left,right:t.right,top:t.top,bottom:t.bottom};});
   return{frame:{left:a.x,right:z.x,top:a.y,bottom:z.y},texts,aspect:svg.getAttribute('preserveAspectRatio')};
  });
  for(const t of bounds.texts)assert.ok(t.left>=bounds.frame.left&&t.right<=bounds.frame.right&&t.top>=bounds.frame.top&&t.bottom<=bounds.frame.bottom,'visible painted frame must contain glyphs: '+JSON.stringify(bounds));
  assert.equal(bounds.aspect,'none');
 }
 const unchanged=await page.evaluate(async()=>{const changes=[];const observer=new MutationObserver(r=>changes.push(...r));observer.observe(document.querySelector('#panel'),{attributes:true,childList:true,subtree:true});wayBeyond20InjectBuffsBadge([{id:'fire',name:'Everflame — Flames'},{id:'ward',name:'A longer protective effect with a wrapping name'}]);await Promise.resolve();observer.disconnect();return changes.filter(r=>r.target.tagName==='svg'||r.type==='childList').length;});
 assert.equal(unchanged,0,'unchanged frame refresh must not write SVG or rebuild rows');
 await page.evaluate(()=>wayBeyond20InjectBuffsBadge([]));
 assert.equal(await page.locator('svg').getAttribute('preserveAspectRatio'),null,'native default restored when effects end');
 await page.evaluate(()=>{document.querySelector('svg').setAttribute('preserveAspectRatio','xMidYMin meet');wayBeyond20InjectBuffsBadge([{id:'fire',name:'Flames'}]);wayBeyond20InjectBuffsBadge([]);});
 assert.equal(await page.locator('svg').getAttribute('preserveAspectRatio'),'xMidYMin meet','explicit original setting restored too');
 assert.deepEqual(errors,[]);console.log('PASS real fixed-viewBox frame contains defense/buff glyphs at340/408/600px; stable repeated render; native aspect restored on removal.');
 if(process.env.WB20_PRESENTATION_EVIDENCE){await page.evaluate(()=>wayBeyond20InjectBuffsBadge([{id:'fire',name:'Everflame — Flames'}]));await page.screenshot({path:path.join(process.env.WB20_PRESENTATION_EVIDENCE,'defenses-frame.png')});}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
