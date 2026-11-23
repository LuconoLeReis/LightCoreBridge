// Two real content-script controllers sharing one synthetic DOM. No installed
// extension, helper or game is contacted. Simulates extension reload orphaning.
const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..');
function block(source,name){const m=new RegExp('^function '+name+'\\(','m').exec(source);assert(m,name);const tail=source.slice(m.index+m[0].length),end=/^(?:async )?function |^(?:const|let|var|class) /m.exec(tail);return source.slice(m.index,end?m.index+m[0].length+end.index:undefined);}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();await page.setContent('<section class="waybeyond20-combat-section"></section><div class="ct-beyond20-roll"><button class="ct-beyond20-roll-button"><img class="ct-beyond20-icon" src="/keep.png"></button></div>');
  await page.addScriptTag({path:path.join(root,'libs/jquery-3.4.1.min.js')});
  await page.evaluate(source=>{
   window.makeController=env=>Function('env',`
    var settings={'vtt-tab':{vtt:'talespire'}},Date={now:()=>env.now};
    var values={},character={getSetting:(k,d)=>values[k]??d,mergeCharacterSettings:(n,cb)=>{Object.assign(values,n);cb?.();}};
    var setInterval=(fn,ms)=>{env.timerActive=true;env.intervalCount++;env.tick=fn;return env;};
    var clearInterval=id=>{if(id)id.timerActive=false;};
    function wayBeyond20ExtensionContextAvailable(){return env.live;}
    function wayBeyond20IsMainCharacterSheet(){return true;}
    function wayBeyond20ScheduleActiveEffectBadgeRefresh(){}
    function wayBeyond20NormalizeTurnTrackerState(s){return {...s};}
    function wayBeyond20GetTrackedSpellEffects(){return [];}
    function wayBeyond20TurnTrackerStateEquals(a,b){return JSON.stringify(a)===JSON.stringify(b);}
    async function wayBeyond20SendRuntimeMessage(){env.requests++;if(env.pending)return env.pending;return env.live?{ok:true,response:{connected:true,snapshot:env.snapshot}}:{ok:false};}
    var chrome={runtime:{lastError:null,sendMessage:(m,cb)=>{env.picks++;cb({ok:true});}}};
    async function wayBeyond20Prompt(){env.prompts++;return null;}
    ${source}
    return {refresh:wb20TSRefresh,render:wb20TSRenderStatus,link:wb20TSLinkMini};
   `)(env);
   window.makeEnv=()=>({live:true,now:10000,requests:0,picks:0,prompts:0,intervalCount:0,
    snapshot:{v:1,campaignId:'campaign',boardId:'board',tracking:true,activeIndex:0,
    order:[{id:'a',name:'Fixture actor'}],creatures:[{id:'a',name:'Fixture actor',boardId:'board',position:{x:0,y:0,z:0,locId:0}}],units:{name:'ft',numberPerTile:5}}});
   window.oldEnv=makeEnv();window.old=makeController(oldEnv);window.newEnv=makeEnv();window.current=makeController(newEnv);
  },fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/talespire.js'),'utf8'));
  await page.evaluate(async()=>{await old.refresh();await current.refresh();oldEnv.live=false;oldEnv.now+=1500;await old.refresh();oldEnv.now+=4000;await old.refresh();});
  assert.match(await page.locator('.wb20-ts-label').innerText(),/following turns$/,'orphan cannot paint offline over the current controller');
  assert.equal(await page.evaluate(()=>oldEnv.timerActive),false,'orphan retires its own existing timer');
  assert.equal(await page.evaluate(()=>newEnv.timerActive),true,'current controller keeps polling');
  const before=await page.locator('.wb20-ts-label').innerText();await page.evaluate(()=>{old.render();old.link();});
  assert.equal(await page.locator('.wb20-ts-label').innerText(),before,'direct stale callbacks leave shared DOM alone');
  await page.getByRole('button',{name:'Pick target in TaleSpire',exact:true}).click();
  assert.equal(await page.evaluate(()=>newEnv.picks),1,'replacement controller owns button callbacks');assert.equal(await page.evaluate(()=>oldEnv.picks),0);
  await page.getByRole('button',{name:'Link mini',exact:true}).click();assert.equal(await page.evaluate(()=>newEnv.prompts),1);assert.equal(await page.evaluate(()=>oldEnv.prompts),0);
  await page.evaluate(async()=>{
   window.lateEnv=makeEnv();window.late=makeController(lateEnv);window.resolveLate=null;
   lateEnv.pending=new Promise(r=>{resolveLate=r;});const pending=late.refresh();lateEnv.live=false;
   await current.refresh();resolveLate({ok:false});await pending;
  });
  assert.match(await page.locator('.wb20-ts-label').innerText(),/following turns$/,'invalidation while awaiting a reply cannot paint offline');
  assert.equal(await page.evaluate(()=>lateEnv.timerActive),false);
  // Actual badge functions: an invalidated runtime can still expose getURL,
  // but calling it throws. Keep the current controller's icons/classes intact.
  const utils=fs.readFileSync(path.join(root,'src/dndbeyond/base/utils.js'),'utf8');
  await page.addScriptTag({content:`var last_character_used=null;function getRollTypeButtonClass(){return 'beyond20-roll-type-advantage';}\n${block(utils,'getBadgeIconFromClass')}\n${block(utils,'updateRollTypeButtonClasses')}`});
  await page.evaluate(()=>{window.chrome={runtime:{getURL:()=>{throw Error('Extension context invalidated.');}}};updateRollTypeButtonClasses({});});
  assert.equal(await page.locator('.ct-beyond20-icon').getAttribute('src'),'/keep.png','invalidated badge lookup preserves image');
  assert.equal(await page.locator('.ct-beyond20-roll-button').getAttribute('class'),'ct-beyond20-roll-button','invalidated badge lookup does not rewrite classes');
  assert.equal(await page.evaluate(()=>getBadgeIconFromClass('beyond20-roll-type-advantage')),'');
  await page.evaluate(()=>{chrome={runtime:{getURL:p=>'chrome-extension://fixture/'+p}};updateRollTypeButtonClasses({});});
  assert.match(await page.locator('.ct-beyond20-icon').getAttribute('src'),/advantage20.png$/,'valid badge paths still work');
  await page.evaluate(()=>{Object.defineProperty(chrome,'runtime',{get:()=>{throw Error('Extension context invalidated.');}});updateRollTypeButtonClasses({});});
  console.log('PASS TaleSpire lifecycle: orphan timer retirement, shared DOM ownership, stale direct and delayed callbacks, current buttons, invalidated badge calls/getters and valid badge path. Synthetic extension contexts only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
