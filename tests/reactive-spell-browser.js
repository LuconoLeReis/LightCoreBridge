const {chromium}=require(process.env.WB20_PLAYWRIGHT || 'playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.setContent('<button id="actions">Actions</button><button id="spells">Spells</button>'+[['Action cantrip','1A'],['Action utility spell','1 action'],['Reaction spell','1R'],['Bonus spell','1BA'],['Long spell','10 minutes'],['Unknown time','']].map(([name,time])=>`<div class="ct-spells-spell"><span class="label">${name}</span><div class="ct-spells-spell__activation">${time}</div><div class="ct-spells-spell__action"><button>Cast</button></div></div>`).join(''));
 await page.evaluate(()=>{
  window.character={};window.restore=0;window.prompts=[];window.warnings=[];window.wayBeyond20AttackActivationTurnKey=()=>1;
  window.wayBeyond20ActiveCharacterSheetTab=()=>document.querySelector('#actions');window.wayBeyond20CharacterSheetTab=()=>document.querySelector('#spells');window.wayBeyond20AttackContextCurrent=()=>true;
  window.wayBeyond20NativeSpellIdentity=row=>({name:row.querySelector('.label').textContent,source:'Native source',label:row.querySelector('.label')});window.wayBeyond20RestoreCharacterSheetTab=()=>restore++;
  window.wayBeyond20EscapeFollowupText=s=>String(s);window.alertify={warning:s=>warnings.push(s)};window.dndbeyondDiceRoller={_prompter:{prompt:async(title,html)=>{prompts.push({title,html});return null;}}};
 });
 await page.addScriptTag({path:path.join(root,'src/dndbeyond/content-scripts/opportunity-attacks.js')});
 await page.evaluate(async()=>{window.ctx={activation:{owner:character,turnKey:1},spellRule:{text:'Cast a one-action spell at only the provoking creature using a Reaction.'}};await wayBeyond20ChooseReactiveSpell(ctx);});
 const html=await page.evaluate(()=>prompts[0].html);assert.match(html,/Action cantrip/);assert.match(html,/Action utility spell/,'not limited to damage or cantrips');assert.doesNotMatch(html,/Reaction spell|Bonus spell|Long spell/);assert.match(html,/Unknown time.*Casting time unverified/);assert.equal(await page.evaluate(()=>restore),1,'Cancel restores the previous tab');
 await page.evaluate(async()=>{ctx.kind='reactive-spell';window.rejected=await wayBeyond20ConfirmReactiveSpell(ctx,{'Casting Time':'1 reaction'},'Invalid','');});assert.equal(await page.evaluate(()=>rejected),false);assert.equal(await page.evaluate(()=>warnings.length),1,'final native-pane timing check is retained');
 console.log('PASS Reactive Spell chooser includes normal one-Action cantrips and other spells, excludes known reaction/bonus/long casting, marks unknown timing, restores on Cancel and retains final guard. No cast/resource change.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
