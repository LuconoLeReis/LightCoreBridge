const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT||path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(name,s){const a=s.search(new RegExp(`^function ${name}\\(`,'m'));assert.ok(a>=0,name);const b=s.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return s.slice(a,b<0?undefined:a+1+b);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<style>body{background:#eee;color:#111}</style><section class="ct-saving-throws-box" style="color:#111;background:#fff;border:1px solid #91671d"><div class="ddbc-box-background"><svg viewBox="0 0 281 200"><rect width="281" height="200" fill="#fff"/><path d="M0 0H281V4H0Z" fill="#91671d"/></svg></div></section><button id="combat">Combat control</button>');
 await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
 await page.addScriptTag({content:fn('wayBeyond20ApplySheetTheme',read('src/dndbeyond/content-scripts/portent.js'))});
 if(process.env.WB20_NATIVE_FRAME)await page.locator('.ddbc-box-background').evaluate((e,svg)=>e.innerHTML=svg,fs.readFileSync(process.env.WB20_NATIVE_FRAME,'utf8'));
 await page.addStyleTag({content:'.ct-saving-throws-box{width:281px;height:200px;position:relative}.ddbc-box-background{position:absolute;inset:0}.ddbc-box-background svg{width:100%;height:100%}'});
 const nativeBefore=await page.locator('.ct-saving-throws-box').evaluate(e=>e.outerHTML);
 await page.evaluate(()=>{window.clicks=0;document.querySelector('#combat').onclick=()=>clicks++;window.dndbeyondDiceRoller={_settings:{'local-roll-display-duration':'0'}};window.chrome={runtime:{getURL:p=>p}};window.DigitalDiceManager={clearResults(){}};});
 await page.addScriptTag({content:read('src/dndbeyond/base/dice.js').split('class DNDBRoller {')[0]+'\nwindow.displayer=new DNDBDisplayer();'});
 await page.evaluate(()=>{window.show=()=>{const r=displayer.postHTML({},'Animal Handling (+3)','<div class="beyond20-message"><span class="beyond20-roll-total">7</span></div>','Hero',0,false,'',{},'',[],[],[],{},false,{automatic:true});r.show();};show();});
 const host=page.locator('#wb20-local-rolls');
 const geometry=await host.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:r.x+r.width/2,y:r.y+r.height/2,frame:s.borderImageSource,bg:s.backgroundImage,z:Number(s.zIndex)};});
 assert.ok(Math.abs(geometry.x-500)<1&&Math.abs(geometry.y-400)<1,'centered instead of covering bottom Combat: '+JSON.stringify(geometry));
 assert.match(geometry.frame,/data:image\/svg\+xml/);assert.equal(geometry.bg,'none');assert.ok(geometry.z<1981,'native/Alertify dialogs layer above the result');
 assert.equal(await page.locator('.wb20-local-roll-card.waybeyond20-sheet-frame').count(),0,'no nested decorative frame');
 assert.equal(await page.locator('.wb20-local-roll-card[open]').count(),1);assert.equal(await page.locator('.beyond20-roll-total').isVisible(),true);
 await page.evaluate(()=>show());
 assert.equal(await page.locator('.wb20-local-roll-card:not([hidden])').count(),1,'only the current result is visible, no collapsed history stack');
 await page.locator('#wb20-local-rolls > summary').click();
 assert.equal(await page.locator('.beyond20-roll-total:visible').count(),1,'header click cannot close the result into an empty tab');
 await page.evaluate(()=>document.querySelector('.wb20-local-roll-records').lastElementChild.remove());
 await page.getByRole('button',{name:'Combat control'}).click();assert.equal(await page.evaluate(()=>clicks),1,'outside click still reaches Combat');assert.equal(await host.isVisible(),false);
 await page.evaluate(()=>show());await page.getByRole('button',{name:'Dismiss local rolls'}).click();assert.equal(await host.isVisible(),false);
 await page.evaluate(()=>show());await page.keyboard.press('Escape');assert.equal(await host.isVisible(),false);
 await page.mouse.move(0,0);await page.evaluate(()=>{dndbeyondDiceRoller._settings['local-roll-display-duration']='0.08';show();});
 await host.waitFor({state:'hidden',timeout:1200});assert.equal(await page.locator('.wb20-local-roll-card').count(),4,'fading dismisses presentation, not saved results');
 await page.evaluate(()=>{show();document.getElementById('wb20-local-rolls').dispatchEvent(new PointerEvent('pointerenter'));});
 await page.waitForTimeout(300);assert.equal(await host.isVisible(),true,'hover pauses fade');
 await page.evaluate(()=>document.getElementById('wb20-local-rolls').dispatchEvent(new PointerEvent('pointerleave')));await host.waitFor({state:'hidden',timeout:1200});
 // A fresh result replaces the old timer; it cannot disappear on an older deadline.
 await page.evaluate(()=>{dndbeyondDiceRoller._settings['local-roll-display-duration']='0.15';show();});await page.waitForTimeout(100);
 await page.evaluate(()=>show());await page.waitForTimeout(100);assert.equal(await host.isVisible(),true);await host.waitFor({state:'hidden',timeout:1200});
 for(const dark of [false,true]){
  await page.evaluate(dark=>{const native=document.querySelector('.ct-saving-throws-box');native.style.color=dark?'#eee':'#111';native.querySelector('path[fill],rect[fill]').setAttribute('fill',dark?'#10161a':'#fff');dndbeyondDiceRoller._settings['local-roll-display-duration']='0';document.getElementById('wb20-local-rolls').remove();show();},dark);
  assert.equal(await host.evaluate(e=>getComputedStyle(e).color),dark?'rgb(238, 238, 238)':'rgb(17, 17, 17)');
  if(process.env.WB20_PRESENTATION_EVIDENCE)await page.screenshot({path:path.join(process.env.WB20_PRESENTATION_EVIDENCE,dark?'local-centered-dark.png':'local-centered-light.png')});
 }
 await page.setViewportSize({width:390,height:640});
 const small=await host.boundingBox();assert.ok(small.x>=0&&small.y>=0&&small.x+small.width<=390,'mobile result stays within viewport');
 // Only user-triggered fixture theme edits above may alter native markup.
 assert.ok(nativeBefore.includes('viewBox="0 0 281 200"'));assert.equal(await page.locator('.ct-saving-throws-box svg').getAttribute('viewBox'),'0 0 281 200');
 assert.deepEqual(errors,[]);console.log('PASS centered, themed single-frame local results; close/outside/Escape; nonblocking Combat; fade/pause/new-result timers; retained results; mobile bounds.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
