// Disposable Chromium fixtures only. No user Chrome profile, downloads or settings.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=path.join(root,'website');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const [width,javascript] of [[1440,true],[390,true],[390,false]]){
   const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:javascript});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.copiedAddress=value;}}}));
   await page.route('https://api.github.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({tag_name:'v1.73.125',draft:false,prerelease:false,assets:[{name:'LightCore-Bridge.zip'}]})}));
   await page.route('https://guide.test/**',route=>{
    const rel=new URL(route.request().url()).pathname.slice(1)||'index.html',file=path.join(site,rel);
    return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:rel.endsWith('.html')?'text/html; charset=utf-8':rel.endsWith('.js')?'application/javascript':rel.endsWith('.css')?'text/css':'image/png'}):route.fulfill({status:404,body:''});
   });
   await page.goto('https://guide.test/');
   for(const name of ['First-time install','Update LightCore'])assert.equal(await page.getByRole('heading',{name,exact:true}).isVisible(),true);
   assert.equal(await page.locator('.download').count(),3);
   for(const link of await page.locator('.download').all())assert.equal(await link.getAttribute('href'),'https://github.com/LuconoLeReis/LightCoreBridge/releases/latest/download/LightCore-Bridge.zip');
   const bounds=await page.evaluate(()=>{
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,bottom:r.bottom};};
    return {overflow:document.documentElement.scrollWidth>innerWidth,install:rect('first-install'),update:rect('update'),chooser:document.querySelector('.choose').getBoundingClientRect().top,images:Array.from(document.images).every(i=>i.complete&&i.naturalWidth)};
   });
   assert.equal(bounds.overflow,false);assert.equal(bounds.images,true);assert.ok(bounds.chooser<900);
   if(width>740){assert.equal(bounds.install.y,bounds.update.y);assert.ok(bounds.update.x>bounds.install.x);}
   else assert.ok(bounds.update.y>=bounds.install.bottom);
   assert.match(await page.locator('#update').innerText(),/same folder Chrome already loads/);
   assert.match(await page.locator('#update').innerText(),/Do not remove the extension/);
   assert.match(await page.locator('#update').innerText(),/WayBeyond20/);
   if(javascript){
    await page.waitForFunction(()=>document.getElementById('release-version').textContent==='Version 1.73.125');
    await page.locator('.copy-address').first().click();
    assert.equal(await page.evaluate(()=>window.copiedAddress),'chrome://extensions');
    assert.match(await page.locator('#copy-status').innerText(),/copied/);
   }
   await page.getByRole('link',{name:'Update an existing install',exact:true}).press('Enter');
   assert.equal(new URL(page.url()).hash,'#update');
   assert.deepEqual(errors,[]);
   console.log('PASS landing page width='+width+' JS='+javascript+': visible install/update, stable downloads, layout, links, copy and legacy-folder guidance.');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
