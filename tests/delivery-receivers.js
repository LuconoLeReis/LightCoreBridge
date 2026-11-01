// Compose real content consumers and posting functions with fake VTT APIs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
function fn(name,text){const start=text.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));assert.ok(start>=0,name);const end=text.indexOf('\n}',start);return text.slice(start,end+2);}

const tick=()=>new Promise(r=>setImmediate(r));
const request=()=>({action:'rendered-roll',request:{type:'attack'},title:'Fixed test',character:'Fixture',attributes:{},roll_info:[],attack_rolls:[],damage_rolls:[],total_damages:{},whisper:0});
(async()=>{
 const text=read('src/roll20/content-script.js');let clicked=0;
 const input={value:'unfinished message'},speaker={value:'prior',children:[{text:'Player'}]};
 const chat={querySelector:sel=>sel==='textarea'?input:{click:()=>clicked++}};
 const c=vm.createContext({console,Promise,settings:{},document:{getElementById:id=>id==='textchat-input'?chat:speaker},
  $:()=>({val:()=> '0'}),createTable:()=> 'fixed result',wayBeyond20SendResolvedDamageToDDB(){},displayExtraInfo:()=>'',WhisperType:{HIDE_NAMES:3}});
 for(const name of ['postChatMessage','handleRoll','handleRenderedRoll','handleMessage'])vm.runInContext(fn(name,text),c);
 let response;assert.equal(c.handleMessage(request(),{},r=>response=r),true);await tick();
 assert.equal(response.delivered,true);assert.equal(clicked,1);assert.equal(input.value,'unfinished message');assert.equal(speaker.value,'prior');
 const msg=request();msg.request={type:'chat-message',character:{type:'Character',name:'Fixture',settings:{}},message:'Fixed message'};
 c.handleMessage(msg,{},r=>response=r);await tick();assert.equal(response.delivered,true);assert.equal(clicked,2);
 c.document.getElementById=()=>null;response=null;c.handleMessage(request(),{},r=>response=r);await tick();
 assert.equal(response.delivered,false);assert.equal(clicked,2,'missing Roll20 chat never reports a successful send');

 const content=read('src/fvtt/content-script.js'),page=read('src/fvtt/page-script.js');
 const bus=new Map(),pending=[];let created=0;
 const add=(name,cb)=>{const entry=[name,cb];if(!bus.has(name))bus.set(name,new Set());bus.get(name).add(cb);return entry;};
 const send=(name,args)=>{for(const cb of bus.get(name)||[])cb(...args);};
 const ctx=vm.createContext({console,Promise,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,
  document:{removeEventListener:(name,cb)=>bus.get(name)?.delete(cb)},addCustomEventListener:add,sendCustomEvent:send,
  fvttContentAvailable:()=>true,settings:{},Hooks:{call:()=>true,once(){}},fvtt_isNewer:()=>true,fvttVersion:'14',
  CONST:{CHAT_MESSAGE_STYLES:{OOC:1}},game:{user:{id:'player'}},
  ChatMessage:{create:()=>{created++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}},
  wayBeyond20FvttMessageOptions:()=>({}),wayBeyond20FvttResolvedDamage(){}});
 const classStart=page.indexOf('class FVTTDisplayer {'),classEnd=page.indexOf('\nclass ',classStart+1);
 // Limit class capture at the following top-level declaration.
 const rest=page.slice(classStart+1);const boundary=rest.search(/^(?:class |function |const |let |var )/m);
 vm.runInContext(page.slice(classStart,classStart+1+boundary)+'\nthis.Displayer=FVTTDisplayer;',ctx);
 const displayer=new ctx.Displayer();displayer._getSpeakerByName=()=>({});displayer._whisperToRollMode=()=> 'publicroll';
 ctx.roll_renderer={_displayer:displayer};
 vm.runInContext(fn('handleRenderedRoll',page),ctx);vm.runInContext(fn('handleMessage',content),ctx);
 add('RenderedRoll',r=>Promise.resolve(ctx.handleRenderedRoll(r)).catch(()=>send('DeliveryResult',[{id:r.wb20DeliveryId,delivered:false}])));
 response=null;ctx.handleMessage(request(),{},r=>response=r);await tick();
 assert.equal(created,1);assert.equal(response,null,'content receipt waits for ChatMessage creation');
 pending.shift().resolve({id:'chat-1'});await tick();assert.equal(response.delivered,true);
 assert.equal(bus.get('DeliveryResult').size,0,'receipt listener removed after completion');
 response=null;ctx.handleMessage(request(),{},r=>response=r);await tick();pending.shift().reject(Error('permission denied'));await tick();
 assert.equal(response.delivered,false);assert.equal(bus.get('DeliveryResult').size,0);
 // No running page bridge (including a join screen) cannot hide the DDB fallback.
 bus.get('RenderedRoll').clear();response=null;ctx.handleMessage(request(),{},r=>response=r);
 await new Promise(r=>setTimeout(r,1550));assert.equal(response.delivered,false);assert.equal(bus.get('DeliveryResult').size,0);
 console.log('PASS real Roll20 chat submission and Foundry content/page ChatMessage acknowledgment, rejection, missing bridge and listener cleanup. Mock VTT APIs only.');
})().catch(e=>{console.error(e);process.exitCode=1;});

