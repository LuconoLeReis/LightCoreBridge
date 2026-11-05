// Real backup/import handlers and branded settings in a disposable synthetic page.
const {chromium}=require(process.env.WB20_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<html><body><main></main></body></html>');
  await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
  await page.evaluate(()=>{
   const E={};for(const tag of ['li','label','h4','p','div','button','input'])E[tag]=(attrs,...children)=>{
    const node=document.createElement(tag);for(const [key,value]of Object.entries(attrs||{}))node.setAttribute(key,value);
    node.append(...children);return node;};window.E=E;
   window.notices=[];window.alertify={success:m=>notices.push(m),error:m=>notices.push(m)};
   window.settings={settings:{'migrated-sync-settings':true,'vtt-tab':null,'talespire-url':'existing-link'},
    'character-123':{'waybeyond20-portent':{dice:[{value:17,used:true}]},focus:2},'wb20-beyond20-mode':false};
   window.messages=[];
   window.chrome={runtime:{sendMessage:m=>messages.push(m)},storage:{local:{
    get:(query,cb)=>cb(structuredClone(settings)),set:(data,cb)=>{Object.assign(settings,structuredClone(data));cb?.();}}}};
   window.saveAs=(blob,name)=>{window.backupBlob=blob;window.backupName=name;};
  });
  await page.addScriptTag({path:path.join(root,'src/common/constants.js')});
  await page.addScriptTag({path:path.join(root,'src/common/settings.js')});
  await page.evaluate(()=>document.querySelector('main').append(createBackupRestoreSetting('backup-settings',false),createBackupRestoreSetting('restore-settings',false)));
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const exported=await page.evaluate(async()=>({name:backupName,data:JSON.parse(await backupBlob.text())}));
  assert.equal(exported.name,'LightCore-Bridge-settings.json');
  assert.deepEqual(exported.data.beyond20,{format:1});
  assert.equal(exported.data['character-123'].focus,2);
  // An old-named backup and a newly named backup both traverse the actual import path.
  for(const name of ['WayBeyond20.json','LightCore-Bridge-settings.json']){
   await page.locator('input[type=file]').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported.data))});
   await page.waitForFunction(()=>notices.includes('LightCore Bridge settings loaded successfully'));
   assert.equal(await page.evaluate(()=>settings['character-123']['waybeyond20-portent'].dice[0].value),17);
   assert.equal(await page.evaluate(()=>settings.settings['talespire-url']),'existing-link');
   await page.evaluate(()=>notices.length=0);
  }
  const chromeManifest=JSON.parse(fs.readFileSync(path.join(root,'build/chrome/manifest.json')));
  assert.equal(chromeManifest.name,'LightCore Bridge');
  const html=fs.readFileSync(path.join(root,'build/chrome/popup.html'),'utf8');
  await page.setContent(html.replace(/<script[\s\S]*?<\/script>/g,''));
  assert.equal(await page.title(),'Quick settings | LightCore Bridge');
  assert.equal(await page.locator('.wb20-settings-brand').textContent(),'LightCore Bridge');
  assert.deepEqual(errors,[]);
  console.log('PASS branded settings and actual export/import of both legacy/new filenames retain values, keys and schema. Disposable browser only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
