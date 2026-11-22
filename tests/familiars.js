const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),'src/dndbeyond/content-scripts/familiars.js'),'utf8');
let checks=0;const check=(label,run)=>{run();checks++;console.log('  PASS '+label);};
(async()=>{
 const c=vm.createContext({console,Map,WeakMap,WeakSet,Set,Object,Array,Number,String,Promise});
 vm.runInContext(`
 var stored={},globals={},nextRoll=0,rolls=0,queries=[],accepted=true,warnings=[],savedNames=[],lastRequest=null,revision=0,turn=1;
 var rules=[{name:'Familiar Friend (Charisma)',text:'You always have the Find Familiar spell prepared. You can cast it without a spell slot or Material components. Your familiar’s HP max and current HP are increased by 8. When you make an ability check using a skill in which you have proficiency while your familiar is within 5 ft. of you, you gain Advantage on the check.'}];
 var owner={_id:'owner',_level:4,getSetting:(k,d)=>stored[k]??d,getGlobalSetting:(k,d)=>globals[k]??d,getDict:()=>({name:'Bard'}),setGlobalSettings:s=>{globals=s;},mergeCharacterSettings:async(p,cb)=>{Object.assign(stored,p);cb?.(stored);}};
 var character=owner,settings={},WhisperType={YES:1},select={base:{name:'Owl',hp:1,formula:'1d4-1'},type:'Fey',familiarName:'Sparrow',appearance:'songbird'};
 function wb20RuleText(s){return String(s||'').replace(/\\s+/g,' ').trim();}function wb20CurrentFeatureRules(){return rules;}
 function uuidv4(){return 'revision-'+(++revision);}function wayBeyond20CommitAfterDispatch(args,cb){(args.commits ||= []).push(cb);}
 function wayBeyond20GetTurnTrackerState(){return {combatStartedAt:1,localTurnNumber:turn};}function wayBeyond20ScheduleActiveEffectBadgeRefresh(){}
 async function mergeSettings(p,cb){Object.assign(globals,p);savedNames.push(globals['waybeyond20-familiar-name']);cb?.(globals);}
 async function wb20PickFamiliarForm(){return select;}async function wb20ResourceLocked(f){return f();}
 function wayBeyond20RollAlreadyHasAdvantage(a){return !!a.advantage;}
 var alertify={warning:t=>warnings.push(t),success:()=>{}};
 var dndbeyondDiceRoller={queryGeneric:async()=>queries.shift(),_roller:{roll:f=>({formula:f,total:nextRoll}),resolveRolls:async(n,r,req)=>{rolls++;lastRequest=req;}}};
 var spell='You gain the service of a familiar. While your familiar is within 100 feet of you, you can communicate with it telepathically. As a Bonus Action, you can see through the familiar. A spell with a range of touch requires its Reaction to deliver. A familiar can’t attack. As a Magic action, you can temporarily dismiss it. It can reappear in an unoccupied space within 30 feet. One Familiar Only.';
 `,c);
 vm.runInContext(source,c);
 check('owned live profile supplies cast bonus and Helpful range',()=>assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify({bonus:wb20FamiliarFriend().bonus,distance:wb20FamiliarFriend().distance})',c)),{bonus:8,distance:5}));
 for(const [base,hp] of [[0,9],[1,9],[2,10],[3,11]])check('minimum base 1, rolled base '+base+' gives '+hp,()=>assert.equal(vm.runInContext(`wb20FamiliarHitPoints({hp:1,formula:'1d4-1'},8,${base}).hp`,c),hp));
 for(const total of [0,1,2,3]) {
  await vm.runInContext(`(async()=>{nextRoll=${total};var args={};await wb20PrepareFamiliarCast(args,{name:'Find Familiar',description:spell});wb20FamiliarCapturePrivacy(args,{whisper:1});var before=rolls;await Promise.all([args.commits[0](),args.commits[0]()]);if(rolls!==before+1)throw Error('HP rerolled');})()`,c);
  check('accepted cast resolves HP once at base '+total,()=>assert.equal(vm.runInContext('wb20Companions()[0].hp',c),Math.max(1,total)+8));
 }
 check('one familiar record, custom name and separate appearance',()=>assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(wb20Companions().map(c=>[c.name,c.base.name,c.appearance]))',c)),[['Sparrow','Owl','songbird']]));
 check('HP roll retains resolved private audience',()=>assert.equal(vm.runInContext('lastRequest.whisper',c),1));
 await vm.runInContext(`(async()=>{var args={};await wb20PrepareFamiliarCast(args,{name:'Find Familiar',description:spell});owner._level=5;await args.commits[0]();})()`,c);
 check('level at cast is frozen while completion waits',()=>assert.equal(vm.runInContext('wb20Companions()[0].bonus',c),8));
 await vm.runInContext(`(async()=>{nextRoll=2;select={...select,familiarName:''};var args={};await wb20PrepareFamiliarCast(args,{name:'Find Familiar',description:spell});await args.commits[0]();})()`,c);
 check('next cast uses new character level',()=>assert.equal(vm.runInContext('wb20Companions()[0].hp',c),12));
 check('blank name clears global field and uses form on card',()=>assert.deepEqual(JSON.parse(vm.runInContext(`JSON.stringify([globals['waybeyond20-familiar-name'],wb20Companions()[0].familiarName,wb20Companions()[0].name])`,c)),['','','Owl']));
 await vm.runInContext(`(async()=>{var before=rolls,args={};select=null;await wb20PrepareFamiliarCast(args,{name:'Find Familiar',description:spell});if(args.commits || before!==rolls)throw Error('Cancel spent');})()`,c);checks++;
 await vm.runInContext(`(async()=>{var args={};await wb20PrepareFamiliarCast(args,{name:'Find Familiar',description:spell,display:true});if(args.commits)throw Error('Preview cast');})()`,c);checks++;
 check('opening the roster never rerolls or heals',()=>{const before=vm.runInContext('[rolls,wb20Companions()[0].hp].join() ',c);vm.runInContext('wb20Companions();wb20Companions()',c);assert.equal(vm.runInContext('[rolls,wb20Companions()[0].hp].join()',c),before);});
 await vm.runInContext(`(async()=>{queries=['arm','use'];await wb20ArmHelpfulFriend();var args={name:'Stealth'};wb20HelpfulSkills.add(args);await wb20WithHelpfulFriend('skill',args,async()=>{if(!args['waybeyond20-rule-advantage'] || args['waybeyond20-resource-costs'][0].amount!==1)throw Error('Missing Helpful benefit');return true;});if(wb20ArmedHelpful.has(owner))throw Error('Still armed');if(args['waybeyond20-rule-advantage'])throw Error('Internal flag leaked');})()`,c);checks++;
 await vm.runInContext(`(async()=>{queries=['arm'];await wb20ArmHelpfulFriend();for(var type of ['initiative','ability','saving-throw','attack']){var args={};await wb20WithHelpfulFriend(type,args,async()=>{if(args['waybeyond20-resource-costs'])throw Error('Ineligible spend');return true;});}if(!wb20ArmedHelpful.has(owner))throw Error('Ineligible consumed arm');})()`,c);checks+=4;
 await vm.runInContext(`(async()=>{var args={advantage:true};wb20HelpfulSkills.add(args);await wb20WithHelpfulFriend('skill',args,async()=>true);if(!wb20ArmedHelpful.has(owner))throw Error('Already-advantage spend');})()`,c);checks++;
 await vm.runInContext(`(async()=>{queries=['use'];var args={};wb20HelpfulSkills.add(args);await wb20WithHelpfulFriend('skill',args,async()=>false);if(!wb20ArmedHelpful.has(owner))throw Error('Rejected send spent');})()`,c);checks++;
 await vm.runInContext(`(async()=>{var f=wb20Companions()[0];f.senses={turn:JSON.stringify([1,turn])};stored['waybeyond20-companions']=[f];turn++;if(wb20Companions()[0].senses)throw Error('Senses did not expire');})()`,c);checks++;
 await vm.runInContext(`(async()=>{select={base:{name:'Owl',hp:1,formula:'1d4-1'},type:'Fey',familiarName:'Named',appearance:''};var args={},before=rolls;await wb20PrepareFamiliarCast(args,{name:'Find Familiar',description:spell});character={...owner,_id:'other'};await args.commits[0]();character=owner;if(rolls!==before)throw Error('Stale owner HP roll');})()`,c);checks++;
 check('native Helpful label includes Special without losing its handler',()=>assert.ok(vm.runInContext("wb20FamiliarActionMetadata('Familiar Friend: Helpful Friend (Special)')",c)));
 await vm.runInContext(`(async()=>{var f=wb20Companions()[0];f={...f,status:'present',reaction:1};stored['waybeyond20-companions']=[f];wb20FamiliarDelivery.set(owner,{revision:f.revision,busy:false});var args={range:'Touch'};await wb20PrepareFamiliarCast(args,{name:'Cure Wounds',description:'Restores hit points.'});queries=['deliver'];await wb20WithFamiliarDelivery('spell-attack',args,async()=>false);if(wb20Companions()[0].reaction!==1)throw Error('Rejected delivery charged');})()`,c);checks++;
 await vm.runInContext(`(async()=>{var args={range:'Touch'};await wb20PrepareFamiliarCast(args,{name:'Cure Wounds',description:'Restores hit points.'});queries=['deliver'];await wb20WithFamiliarDelivery('spell-attack',args,async()=>{if(args['waybeyond20-turn-resource'])throw Error('Caster reaction charged');return true;});if(wb20Companions()[0].reaction!==0)throw Error('Delivery not charged');if(wb20FamiliarDelivery.has(owner))throw Error('Delivery still armed');})()`,c);checks++;
 await vm.runInContext(`(async()=>{var f=wb20Companions()[0];wb20FamiliarDelivery.set(owner,{revision:f.revision,busy:false});var args={range:'Touch'};await wb20PrepareFamiliarCast(args,{name:'Cure Wounds',description:'Restore HP.'});var sent=0;await wb20WithFamiliarDelivery('spell-attack',args,async()=>{sent++;return true;});if(sent)throw Error('Second reaction delivered');})()`,c);checks++;
 console.log('PASS familiars: '+checks+' checks; cast HP, minimum, names, ownership, privacy, Helpful eligibility and familiar Reaction.');
})().catch(e=>{console.error(e);process.exitCode=1;});
