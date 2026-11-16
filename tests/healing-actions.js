const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.WB20_SOURCE_ROOT || path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(file,name){const s=read(file),a=s.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(a>=0,name);const b=s.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);return s.slice(a,b<0?undefined:a+1+b);}
const ch='src/dndbeyond/content-scripts/character.js',u='src/dndbeyond/base/utils.js';
const spark='As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at it. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points to the creature equal to that total or force the creature to make a Constitution saving throw. On a failed save, the creature takes Necrotic or Radiant damage (your choice) equal to that total. On a successful save, the creature takes half as much damage (round down).';
const turn='As a Magic action, you present your Holy Symbol. Each Undead of your choice within 30 feet must make a Wisdom saving throw.';
const preserve='As a Magic Action, you can expend a use of your Channel Divinity to restore 30 HP to Bloodied creatures within 30 ft. of yourself (which can include you), and divide the HP among them. This feature can only restore a creature up to half its maximum HP.';
function setup(choice='healing'){
 const rules=[{name:'Channel Divinity',text:'Three uses.',actions:['Channel Divinity: Divine Spark: 1 Action','Channel Divinity: Turn Undead: 1 Action']},
 {name:'Preserve Life',text:preserve,actions:['Channel Divinity: Preserve Life: 1 Action']},
 {name:'Sear Undead',text:'Whenever you use Turn Undead, any Undead that fails its saving throw takes 5d8 Radiant damage. This damage doesn’t end the turn effect.'},
 {name:'Healing Hands',text:'Touch a creature to restore Hit Points.',actions:['Healing Hands: 1 Action']}];
 const packets=[],events=[],settings={};let pools={'Channel Divinity':3,'Healing Hands':1},state={inCombat:true,action:1,bonusAction:1,reaction:1};
 const owner={_id:'test',_proficiency:3,_class_features:rules.map(r=>r.name),_racial_traits:['Healing Hands'],_feats:['Triage Expert'],_spell_saves:{Cleric:16},
 getSetting:(k,d)=>settings[k]??d,getGlobalSetting:(k,d)=>d,getAbility:()=>({mod:5}),hasFeat:n=>n==='Triage Expert',hasClass:()=>false,hasClassFeature:()=>false,hasRacialTrait:()=>false};
 const c=vm.createContext({console,character:owner,wb20RuleText:s=>String(s||'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim(),
 wb20CurrentFeatureRules:()=>rules,dndbeyondDiceRoller:{queryGeneric:async()=>{events.push('choice');return choice;}},
 alertify:{warning:s=>events.push(['warning',s])},addEffect:(a,e)=>{(a.effects ||= []).push(e);},
 wayBeyond20AttackActivationTurnKey:()=> 'fight:1',wayBeyond20GetTurnTrackerState:()=>state,
 wayBeyond20PreflightTurnResource:async()=>true,wayBeyond20SpendTurnResource:r=>{state[r]--;events.push(['spend-turn',r]);},
 wayBeyond20SetTurnTrackerState:s=>{state=s;},wayBeyond20ScheduleActiveEffectBadgeRefresh:()=>{},
 wayBeyond20ConfirmChoice:async()=>true,wb20ResourceId:s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),
 wb20ResourceLocked:async work=>work(),wb20HasFeature:()=>false,
 wb20Resource:n=>({name:n,remaining:pools[n],max:3}),wb20SetResource:async(n,v)=>{pools[n]=v;events.push(['charge',n,v]);return true;},
 wb20ResourceStore:()=>({history:[],turns:{}}),wb20ResourceSave:async()=>{},wb20ReadActionGrant:()=>null,
 wb20PrepareCombatRequest:()=>false,wb20CommitCombatRequest:()=>false,
 wayBeyond20AttachLimitedUse:(args,feature)=>{args['waybeyond20-limited-use']={feature};},
 wayBeyond20FindLimitedUseControls:n=>({controls:n==='Healing Hands'?[{}]:[]}),
 key_modifiers:{},propertyListToDict:()=>({...c.native}),$:selector=>({text:()=>selector==='.ct-sidebar__heading'?c.action:selector==='.ct-sidebar__header-parent'?'Channel Divinity':''}),
 wayBeyond20ActionDescription:()=>c.desc,wayBeyond20RollPaladinSpecialAction:async()=>({handled:false}),
 addCustomDamages:()=>{},capitalize:s=>s[0]?.toUpperCase()+s.slice(1),applyGWFIfRequired:(n,p,s)=>s,includesNormalized:()=>false,
 handleSpecialGeneralAttacks:(d,t,p,s,o)=>o.to_hit,handleSpecialWeaponAttacks:(d,t,p,s,o)=>o.to_hit,
 wayBeyond20CommitAfterDispatch:()=>{},wayBeyond20AttachAttackActionResource:a=>{a['waybeyond20-turn-resource']={resource:'action'};},
 wayBeyond20AttachActivationResource:a=>{a['waybeyond20-turn-resource']={resource:'action'};},
 wayBeyond20MaybeAddSmite:async()=>{},wayBeyond20IsSmiteEligibleAttack:()=>false,wayBeyond20ActivationResource:()=> 'action',
 applyRogueSneakAttack:async()=>{},damagesToCrits:()=>[],abbreviationToAbility:s=>({CON:'Constitution',WIS:'Wisdom'}[s]||s),
 WAYBEYOND20_ACTION_TYPE_ATTACK:'Attack',CriticalRules:{PHB:0},RollType:{OVERRIDE_ADVANTAGE:3}});
 if(fs.existsSync(path.join(root,'src/dndbeyond/content-scripts/healing-actions.js')))vm.runInContext(read('src/dndbeyond/content-scripts/healing-actions.js'),c);
 if(fs.existsSync(path.join(root,'src/dndbeyond/content-scripts/cleric-features.js')))vm.runInContext(read('src/dndbeyond/content-scripts/cleric-features.js'),c);
 for(const n of ['wayBeyond20LimitedUseFeatureForAction','wayBeyond20AttachNativeActionUse','wayBeyond20BedsideFormulaForDDB','wayBeyond20ApplyBedsideMannerIntent','wayBeyond20ActivationResource','wayBeyond20ActionTypeFromText','wayBeyond20AttachTurnResource','wayBeyond20AttachActivationResource','wayBeyond20AttachAttackActionResource','rollAction'])vm.runInContext(fn(ch,n),c);
 vm.runInContext(fn(u,'buildAttackRoll'),c);
 vm.runInContext(fn('src/dndbeyond/content-scripts/resources.js','wb20DispatchResources'),c);
 c.sendRollWithCharacter=async(type,fallback,args)=>{
  const limitedUseRequest=args['waybeyond20-limited-use'];delete args['waybeyond20-limited-use'];
  return c.wb20DispatchResources(args,{rollType:type,limitedUseRequest},async()=>{if(c.failed)return false;packets.push(JSON.parse(JSON.stringify(args)));return true;});
 };
 async function run(name,desc,native,damageOnly=false){c.action=name;c.desc=desc;c.native=native;return c.rollAction('test-pane',false,damageOnly);}
 return {c,owner,rules,packets,events,pools,state,run};
}
(async()=>{let count=0;async function test(n,f){await f();count++;console.log('  PASS '+n);}
 for(const choice of ['healing','radiant','necrotic'])await test('real rollAction -> real builder -> shared accounting: Divine Spark '+choice,async()=>{
  const s=setup(choice);assert.equal(await s.run('Channel Divinity: Divine Spark',spark,{Damage:'1d8','Attack/Save':'CON 16','Range/Area':'-- ft. Reach'}),true);
  const a=s.packets[0];assert.deepEqual(a.damages,[choice==='healing'?'2d8kh1+5':'1d8+5']);
  assert.equal(a['damage-types'][0],choice[0].toUpperCase()+choice.slice(1));assert.equal(a.range,'30 ft.');assert.equal(a.rollAttack,false);
  assert.equal(a['save-dc'],choice==='healing'?undefined:'16');assert.equal(s.pools['Channel Divinity'],2);assert.equal(s.state.action,0);
  assert.equal(s.events.filter(e=>e[0]==='charge').length,1);assert.ok(!a['waybeyond20-blessed-healer']);
 });
 await test('cancel Spark before dispatch spends nothing',async()=>{const s=setup(null);assert.equal(await s.run('Channel Divinity: Divine Spark',spark,{Damage:'1d8','Attack/Save':'CON 16'}),false);assert.equal(s.packets.length,0);assert.equal(s.pools['Channel Divinity'],3);assert.equal(s.state.action,1);});
 await test('failed dispatch spends neither Action nor Channel Divinity',async()=>{const s=setup();s.c.failed=true;assert.equal(await s.run('Channel Divinity: Divine Spark',spark,{Damage:'1d8','Attack/Save':'CON 16'}),false);assert.equal(s.pools['Channel Divinity'],3);assert.equal(s.state.action,1);});
 await test('Turn Undead includes failed-save-only Sear with exactly one shared spend',async()=>{const s=setup();await s.run('Channel Divinity: Turn Undead',turn,{'Attack/Save':'WIS 16','Range/Area':'-- ft. Reach'});const a=s.packets[0];assert.deepEqual(a.damages,['5d8']);assert.deepEqual(a['damage-types'],['Radiant']);assert.match(a.effects.join(' '),/none on success/);assert.match(a.effects.join(' '),/does not end/);assert.equal(s.pools['Channel Divinity'],2);assert.equal(s.state.action,0);});
 await test('direct Sear follow-up rolls damage without paying for Turn Undead again',async()=>{const s=setup('yes');await s.run('Channel Divinity: Sear Undead',s.rules[2].text,{Damage:'5d8','Damage Type':'Radiant'});assert.equal(s.packets.length,1);assert.equal(s.pools['Channel Divinity'],3);assert.equal(s.state.action,1);});
 await test('no Sear ownership leaves Turn Undead without a damage roll',async()=>{const s=setup();s.rules.splice(2,1);await s.run('Channel Divinity: Turn Undead',turn,{'Attack/Save':'WIS 16'});assert.equal(s.packets[0].damages,undefined);assert.equal(s.pools['Channel Divinity'],2);});
 await test('Preserve Life is one fixed pool, not spell healing/dice/per-recipient charges',async()=>{const s=setup();await s.run('Channel Divinity: Preserve Life',preserve,{'Range/Area':'-- ft. Reach'});const a=s.packets[0];assert.equal(a.damages,undefined);assert.equal(a.range,'30 ft.');assert.match(a.effects.join(' '),/30 HP.*Bloodied.*half/);assert.equal(s.pools['Channel Divinity'],2);assert.equal(s.state.action,0);});
 await test('Healing Hands uses native PB dice + Bedside only, and its own use',async()=>{const s=setup();await s.run('Healing Hands','As a Magic action, touch a creature to restore Hit Points.',{Damage:'3d4','Damage Type':'','Range/Area':'-- ft. Reach'});const a=s.packets[0];assert.deepEqual(a.damages,['4d4kh3']);assert.deepEqual(a['damage-types'],['Healing']);assert.equal(a.range,'Touch');assert.equal(s.pools['Healing Hands'],0);assert.equal(s.pools['Channel Divinity'],3);});
 await test('native Spark modifier is not added twice',async()=>{const s=setup('radiant');await s.run('Channel Divinity: Divine Spark',spark,{Damage:'1d8+5','Attack/Save':'CON 16'});assert.equal(s.packets[0].damages[0],'1d8+5');});
 await test('Healing Hands can derive current PB dice when native Damage property is absent',async()=>{const s=setup();await s.run('Healing Hands','Touch a creature and roll a number of d4s equal to your Proficiency Bonus. The creature regains Hit Points equal to the total.',{});assert.equal(s.packets[0].damages[0],'4d4kh3');});
 await test('all native feature entry names retain the same single CD pool',async()=>{const s=setup();await s.run('Preserve Life',preserve,{});assert.equal(s.pools['Channel Divinity'],2);assert.equal(s.events.filter(e=>e[0]==='charge').length,1);});
 await test('Sear damage-only continuation also never charges a second action or use',async()=>{const s=setup('yes');await s.run('Channel Divinity: Sear Undead',s.rules[2].text,{Damage:'5d8','Damage Type':'Radiant'},true);assert.equal(s.pools['Channel Divinity'],3);assert.equal(s.state.action,1);});
 await test('inline numeric markup without adjacent spaces retains Sear and Preserve values',async()=>{const s=setup();s.rules[2].text='Any Undead that fails its saving throw takes5d8Radiantdamage.';await s.run('Turn Undead',turn,{'Attack/Save':'WIS 16'});assert.equal(s.packets[0].damages[0],'5d8');const t=setup();await t.run('Preserve Life',preserve.replace('restore 30 HP','restore30HP').replace('within 30 ft.','within30ft.'),{});assert.match(t.packets[0].effects.join(' '),/30 HP/);assert.equal(t.packets[0].range,'30 ft.');});
 await test('owner change during choice cancels without spend',async()=>{const s=setup();s.c.dndbeyondDiceRoller.queryGeneric=async()=>{s.c.character={_id:'other'};return 'healing';};assert.equal(await s.run('Channel Divinity: Divine Spark',spark,{Damage:'1d8'}),false);assert.equal(s.packets.length,0);});
 await test('a name match without owned feature does not acquire the feature',async()=>{const s=setup();s.rules.length=0;assert.equal(await s.c.wb20PrepareHealingAction(s.owner,'Divine Spark',spark,{Damage:'1d8'}),null);});
 await test('Disciple native slot-scaled bonuses survive modifier and Bedside composition',async()=>{const s=setup();vm.runInContext(fn(u,'ensureModifier'),s.c);for(const [formula,expected] of [['2d8+8','3d8kh2+8'],['4d8+9','5d8kh4+9'],['6d8+10','7d8kh6+10'],['2d4+10','3d4kh2+10']]){const a={damages:[s.c.ensureModifier(formula,5)],'damage-types':['Healing']};s.c.wayBeyond20ApplyBedsideMannerIntent(a);assert.equal(a.damages[0],expected);}});
 await test('level18 Spark maximizes four native dice, keeps Wisdom and charges once',async()=>{const s=setup();s.rules.push({name:'Supreme Healing',text:'When you restore HP with a spell or Channel Divinity, use the highest number possible for each die.'});await s.run('Channel Divinity: Divine Spark',spark,{Damage:'4d8','Attack/Save':'CON 19'});assert.equal(s.packets[0].damages[0],'32+5');assert.equal(s.pools['Channel Divinity'],2);assert.equal(s.state.action,0);});
 await test('actual Cleric spell save DC21 supersedes unmodified native CON19',async()=>{const s=setup('radiant');s.owner._spell_saves.Cleric=21;await s.run('Channel Divinity: Divine Spark',spark,{Damage:'4d8','Attack/Save':'CON 19'});assert.equal(s.packets[0]['save-dc'],'21');assert.equal(s.packets[0].damages[0],'4d8+5');});
 await test('Supreme Healing never maximizes Divine Spark damage or Healing Hands',async()=>{for(const kind of ['damage','hands']){const s=setup('radiant');s.rules.push({name:'Supreme Healing',text:'With a spell or Channel Divinity, use the highest number possible for each die.'});await s.run(kind==='damage'?'Channel Divinity: Divine Spark':'Healing Hands',kind==='damage'?spark:'Touch to heal.',{Damage:kind==='damage'?'4d8':'6d4'});assert.equal(s.packets[0].damages[0],kind==='damage'?'4d8+5':'7d4kh6');}});
 await test('Preserve Life reads current90 HP, not the level6 snapshot30',async()=>{const s=setup();await s.run('Channel Divinity: Preserve Life',preserve.replace('30 HP','90 HP'),{});assert.match(s.packets[0].effects.join(' '),/90 HP/);assert.equal(s.pools['Channel Divinity'],2);});
 console.log('LightCore native healing-action checks passed: '+count+'.');
})().catch(e=>{console.error(e);process.exitCode=1;});
