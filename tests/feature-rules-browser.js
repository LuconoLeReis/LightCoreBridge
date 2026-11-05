const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const characterSource=read('src/dndbeyond/content-scripts/character.js');
function fn(name){const m=new RegExp(`^(?:async )?function ${name}\\(`,'m').exec(characterSource);assert.ok(m,name);const rest=characterSource.slice(m.index+m[0].length),end=/^(?:async )?function |^(?:const|let|class) /m.exec(rest);return characterSource.slice(m.index,end?m.index+m[0].length+end.index:undefined);}
const card=(name,text,actions='',type='racial-trait')=>`<div class="styles_snippet__fixture ct-feature-snippet--${type}"><div class="styles_heading__fixture">${name}<span><p>Source reference</p></span></div><div class="styles_content__fixture"><div class="ddbc-snippet__content"><p>${text}</p></div>${actions}</div></div>`;
const pip='<div role="checkbox" aria-label="use" aria-checked="false" class="ct-slot-manager__slot" tabindex="0"></div>';
const modern=card('Natural Attack','Your Unarmed Strikes deal 1d6 + your Strength or Dexterity modifier Bludgeoning damage.','<div class="ct-feature-snippet__action"><div class="ct-feature-snippet__action-summary">Siphoning Strike: 1 Action</div></div>')+
card('Draining Attack','When you hit with an Unarmed Strike, you gain Temporary Hit Points equal to the damage dealt.')+
card('Protected','Luck Points. You have 4 Luck Points per Long Rest. Whenever you make a d20 Test and roll 9 or lower on the d20, you can spend 1 Luck Point to reroll, and must accept the second result. When you are reduced to 0 HP and not killed outright, you can spend 1 Luck Point to drop to 1 HP instead.',`<div class="ct-feature-snippet__action"><div class="ct-feature-snippet__action-summary">Protected: Luck Points: Special</div>${pip.repeat(4)}</div>`,'feat')+
card('Control Undead','As an action, choose one Undead within 30 feet to make a Wisdom saving throw or obey commands for 24 hours.','','class')+
card('Channel Divinity','You have 2 uses per Long Rest.','<div class="ct-feature-snippet__action"><div class="ct-feature-snippet__action-summary">Channel Divinity: 1 Action</div>'+pip.repeat(2)+'</div>','class');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent(`<html><body style="background:#242424;color:#eeeeee"><div class="ct-features">${modern}</div><div class="ct-actions"><div id="rows"></div><div class="wb20-action-list-controls"></div></div>
  <div class="ct-inventory-item"><span class="styles_name__fixture">Spiked Shield</span><div class="ct-item-slot-manager"><div role="checkbox" aria-label="use" aria-checked="true"></div></div></div>
  <div class="ct-attunement__item"><span class="styles_name__fixture">Spiked Shield</span><div class="ct-attunement__item-action"><div class="ct-item-slot-manager"><div role="checkbox" aria-label="use" aria-checked="true"></div></div></div></div>
  <div class="b20-item-pane"><h1 class="ct-sidebar__heading styles_heading__fixture"><div><span class="styles_itemName__fixture">Spiked Shield</span><button>Edit name</button></div></h1><div class="ct-item-detail__description">Shield Bash. When you take the Attack action, you can make one of the attack rolls using the Shield against a target within 5 feet of yourself. Apply your Proficiency Bonus and Strength modifier to the attack roll. On a hit, the Shield deals Piercing damage equal to 2d6 plus your Strength modifier. Spike Salvo. As a Magic action, you can cause spikes to erupt from the Shield in a 30-foot Cone. Each creature in the Cone makes a DC 13 Dexterity saving throw, taking 3d6 Piercing damage on a failed save or half as much damage on a successful one. Once this property is used, it can’t be used again until the next dawn.</div><div class="ct-item-detail-abilities__limited-uses">Charges<div class="ct-slot-manager">${pip}</div></div><button>Unequip</button></div></body></html>`);
  await page.addStyleTag({path:path.join(root,'src/extension/beyond20.css')});
  const jq=fs.readdirSync(path.join(root,'libs')).find(n=>/^jquery.*\.js$/.test(n));assert.ok(jq);await page.addScriptTag({path:path.join(root,'libs',jq)});
  await page.evaluate(()=>{
   window.saved={},window.writes=0;window.character={_id:'fixture',_class_features:['Control Undead','Channel Divinity'],_racial_traits:['Natural Attack','Draining Attack'],_feats:['Protected'],getSetting:(k,d)=>saved[k]??d,mergeCharacterSettings:(data,done)=>{writes++;Object.assign(saved,data);done?.();}};
   window.wayBeyond20GetTurnTrackerState=()=>({inCombat:false});window.wb20FeatureEscape=v=>String(v);window.wb20FeatureForm=async()=>null;
  });
  await page.addScriptTag({content:['wayBeyond20NormalizeFeatureLabel','wayBeyond20ElementOwnText','wayBeyond20LimitedUseSelectors','wayBeyond20LimitedUseInputForControl','wayBeyond20LimitedUseCanonicalControl','wayBeyond20LimitedUseControlIsUnused','wayBeyond20LimitedUseControlIsVisible','wayBeyond20LimitedUseLabelsWithin','wayBeyond20LimitedUseLabelText','wayBeyond20LimitedUseControlOwnerLabel','wayBeyond20LimitedUseControlMatchesFeature','wayBeyond20FindLimitedUseControls'].map(fn).join('\n')});
  if(process.env.WB20_RULE_READER_BEFORE){await page.addScriptTag({path:process.env.WB20_RULE_READER_BEFORE});assert.equal(await page.evaluate(()=>wayBeyond20LiveFeatureRules().length),5,'baseline reader must discover modern native cards');}
  await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/resources.js')});
  await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/feature-rules.js')});
  await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/item-rules.js')});
  const observed=await page.evaluate(()=>{
   const rules=wb20ReadNativeFeatureRules();return{rules,pools:Array.from(wb20NativeResources()).map(([id,p])=>({id,name:p.name,max:p.max,remaining:p.remaining})),alias:wb20Resource('Luck Points')?.name,item:wb20ReadItemRule()};
  });
  assert.equal(observed.rules.length,5,'modern cards without legacy base class are parsed');assert.equal(observed.rules[0].name,'Natural Attack','source reference is excluded from name');assert.deepEqual(observed.rules[0].actions,['Siphoning Strike: 1 Action']);
  assert.equal(observed.pools.find(p=>p.id==='channel divinity').max,2);assert.equal(observed.pools.find(p=>p.id==='protected').max,4);
  assert.equal(observed.pools.find(p=>p.id==='spiked shield').max,1,'equipment/attunement boxes cannot inflate item charges');assert.equal(observed.pools.find(p=>p.id==='spiked shield').remaining,1);assert.equal(observed.pools.find(p=>p.id==='spiked shield').name,'Spiked Shield');assert.equal(observed.alias,'Protected');
  assert.equal(observed.item.name,'Spiked Shield');assert.equal(observed.item.equipped,true);
  await page.evaluate(()=>{saved['waybeyond20-feature-rules']=wb20ReadNativeFeatureRules();document.querySelector('.ct-features').remove();});
  assert.equal(await page.evaluate(()=>wb20CurrentFeatureRules().length),5,'rules remain available on Actions from character-owned evidence');
  await page.evaluate(()=>{
   wb20RuleRows(document.querySelector('#rows'));wb20RuleToolbar(document.querySelector('.ct-actions'));wb20InjectItemRuleControls();
   window.domCallbacks=0;window.fixtureObserver=new MutationObserver(()=>{domCallbacks++;wb20RuleRows(document.querySelector('#rows'));wb20RuleToolbar(document.querySelector('.ct-actions'));wb20InjectItemRuleControls();});fixtureObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
   for(let i=0;i<20;i++){wb20RuleRows(document.querySelector('#rows'));wb20RuleToolbar(document.querySelector('.ct-actions'));wb20InjectItemRuleControls();}
  });
  assert.equal(await page.getByRole('button',{name:'Use Control Undead',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Use Protected',exact:true}).count(),0,'triggered Luck has no stand-alone activation row');assert.equal(await page.evaluate(()=>wb20CurrentFeatureRules().some(r=>r.name==='Protected')),true,'the owned Luck rule remains available to its normal triggers');
  assert.equal(await page.getByRole('button',{name:'Shield Bash',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Spike Salvo',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Feature rules',exact:true}).count(),1,'non-Monk character has a rules reference');
  await page.waitForTimeout(120);
  assert.ok(await page.evaluate(()=>domCallbacks)<=3,'stable refreshes do not cause an observer loop');assert.equal(await page.evaluate(()=>writes),1,'unchanged item observation is saved once');
  const ink=await page.getByRole('button',{name:'Shield Bash',exact:true}).evaluate(n=>getComputedStyle(n).color);assert.equal(ink,'rgb(238, 238, 238)');
  await page.evaluate(()=>{document.body.style.color='rgb(20,30,40)';document.body.style.background='rgb(245,240,230)';});
  assert.equal(await page.getByRole('button',{name:'Shield Bash',exact:true}).evaluate(n=>getComputedStyle(n).color),'rgb(20, 30, 40)','item controls follow live theme inheritance');
  await page.evaluate(()=>fixtureObserver.disconnect());
  await page.evaluate(markup=>{
   document.body.insertAdjacentHTML('beforeend','<div class="ct-features">'+markup+'</div>');character._feats.push('Weapon Mastery','Dueling');
   saved['waybeyond20-feature-rules']=[...saved['waybeyond20-feature-rules'],...wb20ReadNativeFeatureRules()];document.querySelector('.ct-features').remove();
   document.querySelector('.b20-item-pane').innerHTML='<h1 class="ct-sidebar__heading"><span class="styles_itemName__fixture">Training gauntlets</span></h1><div class="ct-item-detail__description">While wearing these gauntlets, you can take a Bonus Action to ignite your fists. Your Unarmed Strikes deal an extra 2d6 Fire damage on a hit.</div><button>Unequip</button>';
   window.refreshes=0;window.wayBeyond20RefreshCombinedActions=()=>{refreshes++;};wb20InjectItemRuleControls();
  },card('Weapon Mastery','', '<div class="ct-feature-snippet__action-summary">Push (Warhammer): 1 Action</div><div class="ct-feature-snippet__action-summary">Sap (Longsword): 1 Action</div>','feat')+card('Dueling','While holding a Melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.','','feat'));
  assert.equal(await page.evaluate(()=>wb20ItemMasteries().join(',')),'Push,Sap','action-only mastery card survives the modern reader and owned cache');
  const mastery=page.getByRole('combobox',{name:'Gauntlet Unarmed Strike mastery'}),bonus=page.getByRole('checkbox',{name:'Apply weapon damage bonus to gauntlet Unarmed Strikes'});
  assert.equal(await bonus.isChecked(),false,'homebrew bonus requires opt-in');await mastery.selectOption('Push');await bonus.check();
  assert.deepEqual(await page.evaluate(()=>saved['waybeyond20-unarmed-equipment']['training gauntlets']),{mastery:'Push',weaponBonus:true});
  const writesBefore=await page.evaluate(()=>writes);await page.evaluate(()=>{for(let i=0;i<20;i++)wb20InjectItemRuleControls();});assert.equal(await page.evaluate(()=>writes),writesBefore);
  assert.equal(await mastery.count(),1);assert.equal(await bonus.count(),1);assert.equal(await page.evaluate(()=>refreshes),2,'one refresh per explicit option change');
  assert.equal(await mastery.evaluate(n=>getComputedStyle(n).color),'rgb(20, 30, 40)');assert.deepEqual(errors,[]);
  console.log('PASS modern feature DOM, cached ownership, native pool/charge isolation, generic feature/item controls, idempotent DOM/write behavior, theme inheritance. Synthetic fixture only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
