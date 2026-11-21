const {chromium} = require(process.env.WB20_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.WB20_SOURCE_ROOT || path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const characterSource = read('src/dndbeyond/content-scripts/character.js');

function functionSource(name) {
    const start = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(characterSource)?.index;
    assert.ok(start !== undefined, name);
    return characterSource.slice(start, characterSource.indexOf('\n}', start) + 2);
}

async function checkInitiativeClick(browser) {
    const page = await browser.newPage();
    try {
        await page.setContent(`
            <section class="ct-combat__summary-group--initiative"><div class="styles_value__a">
                <button class="integrated-dice__container"><span class="styles_numberDisplay__a">+4</span></button>
            </div></section>
            <div class="ct-combat-mobile__extras">
                <section class="styles_boxMobile__a"><span>Speed</span><button class="integrated-dice__container">30</button></section>
                <section class="styles_boxMobile__b"><span>Initiative</span><button class="integrated-dice__container"><span class="ddbc-signed-number">−1</span></button></section>
            </div>`);
        await page.addScriptTag({path: path.join(root, 'libs/jquery-3.4.1.min.js')});
        await page.addScriptTag({path: path.join(root, 'src/common/roll_renderer.js')});
        await page.addScriptTag({content: `
            const rolls=[], starts=[], warnings=[];
            ${read('src/common/settings.js').split('class CriticalRules')[0]}
            const character={getGlobalSetting:()=>false,hasClassFeature:()=>false};
            const alertify={warning:message=>warnings.push(message)};
            let nativeClicks=0, ddbRollHijackInstalled=false, ddbHijackPointerHandled=false, cancelNext=false, turn=null;
            const roller=new Beyond20RollRenderer({resolveRolls:async()=>{}});
            roller.getToHit=()=>({rolls:[7,19.18].map(total=>({total,discarded:false,
                setDiscarded(value){this.discarded=value;},isDiscarded(){return this.discarded;}}))});
            roller.postDescription=()=>{};
            function wayBeyond20CaptureResolvedRoll(request, rolls){request.capture?.(request,rolls);}
            document.querySelector('.styles_value__a').addEventListener('click',()=>nativeClicks++);
            function resetHijackQuickRollState(){}
            function wayBeyond20AttackActivationTurnKey(){return turn;}
            function wayBeyond20StartCombat(source,reset,total){starts.push({source,total});}
            async function sendRollWithCharacter(type,formula,data){
                rolls.push({type,formula,data:{name:data.name,initiative:data.initiative}});
                if (cancelNext) return false;
                await roller.rollInitiative({initiative:data.initiative,advantage:RollType.ADVANTAGE,capture:data['waybeyond20-capture-result']});
                return true;
            }
            function handleCombatAttackIntegratedDie(){return false;}
            function handleSpellIntegratedDie(){return false;}
            function handleAbilityIntegratedDie(){return false;}
            function handleSavingThrowIntegratedDie(){return false;}
            function handleSkillIntegratedDie(){return false;}
            ${['wb20InitiativeRow','wayBeyond20ReadInitiativeModifier','wayBeyond20InitiativeJoatModifier','wayBeyond20FinalizeInitiativeProficiency','rollInitiative','wayBeyond20FormatSignedNumber','handleInitiativeIntegratedDie','canHandleDDBRollTarget',
                'wayBeyond20DDBRollInputAvailable','swallowRollEvent','installDDBRollHijack']
                .filter(name=>characterSource.includes('function '+name+'(')).map(functionSource).join('\n')}
            installDDBRollHijack();
        `});
        await page.locator('.ct-combat__summary-group--initiative button').click();
        assert.deepEqual(await page.evaluate(()=>({rolls:[...rolls],starts:[...starts],nativeClicks})), {
            rolls:[{type:'initiative',formula:'1d20+4',data:{name:'Initiative',initiative:'+4'}}],
            starts:[{source:'D&D Beyond Initiative',total:19.18}],nativeClicks:0
        });
        await page.locator('.styles_boxMobile__a button').click();
        await page.locator('.styles_boxMobile__b button').press('Enter');
        assert.deepEqual(await page.evaluate(()=>rolls.map(roll=>[roll.type,roll.formula])), [['initiative','1d20+4'],['initiative','1d20-1']]);
        await page.evaluate(()=>{cancelNext=true;});
        await page.locator('.ct-combat__summary-group--initiative button').click();
        assert.equal(await page.evaluate(()=>starts.length),2,'a canceled roll preserves the current encounter and score');
        assert.deepEqual(await page.evaluate(()=>warnings), []);
    } finally {
        await page.close();
    }
}

async function checkGameLog(browser) {
    const page = await browser.newPage();
    try {
        await page.setContent('<button data-testid="diceRollButton">Roll</button>');
        for (const file of ['libs/jquery-3.4.1.min.js','src/common/utils.js','src/common/constants.js','src/common/dice.js',
            'src/dndbeyond/base/message-broker.js','src/dndbeyond/page-scripts/message-broker.js','src/dndbeyond/base/digital-dice-new.js'])
            await page.addScriptTag({path:path.join(root,file)});
        const dice = read('src/dndbeyond/base/dice.js').split('class DNDBPrompter')[0];
        const whisperType = read('src/common/settings.js').split('class RollType')[0];
        await page.addScriptTag({content: whisperType + dice + `
            const records=[], users=[];
            const dndbeyondDiceRoller={_settings:{'roll-to-game-log':true,'use-digital-dice':true}};
            const native={
                gameId:'campaign', userId:'player',
                subscribe(callback){users.push(callback);},
                dispatch(event){records.push(structuredClone(event));users.forEach(fn=>fn(event));}
            };
            // Simulate a late-mounted native broker, which was missing at script startup.
            window[Symbol.for('@dndbeyond/message-broker-lib')]=native;
            const manager=DigitalDiceManager;
            manager.isEnabled=()=>true;
            manager._ensureRollerOpenWithRetry=async()=>true;
            manager._resetDiceWithRetry=async()=>{};
            manager._wait=async()=>{};
            manager.rollDice=async count=>count;
            let audienceAvailable=true, sequence=0, withholdNativeResult=false, nativeFace=15;
            manager._selectRollTargetWithRetry=async()=>audienceAvailable;
            function nativeMessage(eventType, rollId, value, scope='gameId'){
                const data={rollId,action:'Custom Roll',rolls:[{diceNotation:{set:[{
                    count:1,dieType:'d20',dice:value ? [{dieType:'d20',dieValue:value}] : []
                }]},rollType:'roll'}]};
                return {id:eventType+'-'+rollId,eventType,dateTime:String(Date.now()),data,messageScope:scope};
            }
            document.querySelector('button').addEventListener('click',()=>{
                const id='native-'+ ++sequence;
                native.dispatch(nativeMessage('dice/roll/pending',id,null,'userId'));
                if (!withholdNativeResult) native.dispatch(nativeMessage('dice/roll/fulfilled',id,nativeFace,'userId'));
            });
            async function initiative(){
                const roll=new DNDBRoll('1d20+4.18');
                roll.setRollType('initiative');
                await new DNDBRoller().resolveRolls('Initiative (+4.18)',[roll],{type:'initiative',whisper:WhisperType.YES});
                return roll.total;
            }
        `});
        await page.evaluate(async()=>{
            // An audience failure must leave no pending entry or published roll.
            audienceAvailable=false;
            await initiative();
            audienceAvailable=true;
            window.rollResult=initiative();
        });
        await page.waitForFunction(()=>records.some(event=>event.eventType==='dice/roll/pending' && event.data.action==='Initiative'),{},{timeout:2000});
        assert.equal(await page.evaluate(()=>rollResult),19.18);
        const result = await page.evaluate(()=>records.filter(event=>event.eventType==='dice/roll/fulfilled'));
        assert.equal(result.length,1);
        assert.equal(result[0].data.action,'Initiative');
        assert.equal(result[0].data.rolls[0].rollType,'check');
        assert.equal(result[0].data.rolls[0].result.total,19.18);
        assert.equal(result[0].messageScope,'userId');

        await page.evaluate(async()=>{
            const roll=new DNDBRoll('1d20+3');
            roll.setRollType('skill-check');
            await new DNDBRoller().resolveRolls('Perception (+3)',[roll],{type:'skill'});
        });
        const other = await page.evaluate(()=>records.at(-1));
        assert.equal(other.data.action,'Perception (+3)');
        assert.equal(other.data.rolls[0].result.total,18);
        assert.equal(await page.evaluate(()=>records.find(event=>event.data.rollId==='native-2' && event.eventType==='dice/roll/pending').data.action),'Perception (+3)');
        await page.evaluate(async()=>{
            const roll=new DNDBRoll('1d20+8');
            roll.setRollType('to-hit');
            await new DNDBRoller().resolveRolls('Everflame',[roll],{name:'Everflame',type:'attack',rollAttack:true});
        });
        const hit = await page.evaluate(()=>records.filter(event=>event.data.rollId==='native-3'));
        assert.deepEqual(hit.map(event=>[event.data.action,event.data.rolls[0].rollType]),[['Everflame','to hit'],['Everflame','to hit']]);
        assert.equal(hit[1].data.rolls[0].result.total,23);
        await page.evaluate(()=>{
            sendCustomEvent('MBPendingRoll',[{name:'Control Undead',gameLog:{id:'late-feature'},rolls:[{type:'saving-throw'}]}]);
            native.dispatch(nativeMessage('dice/roll/pending','late-feature-native'));
            native.dispatch(nativeMessage('dice/roll/fulfilled','late-feature-native',9));
        });
        await page.waitForFunction(()=>records.some(event=>event.data.rollId==='late-feature-native' && event.eventType==='dice/roll/fulfilled'));
        const late = await page.evaluate(()=>records.at(-1));
        assert.equal(late.data.action,'Control Undead','even the native fallback keeps the known action name');
        assert.equal(late.data.rolls[0].rollType,'save');
        await page.evaluate(()=>native.dispatch(nativeMessage('dice/roll/fulfilled','manual',8)));
        assert.equal(await page.evaluate(()=>records.at(-1).data.action),'Custom Roll');
        await page.evaluate(()=>{
            // A completed roll with an unrelated ID must not consume the in-flight initiative.
            sendCustomEvent('MBPendingRoll',[{name:'Initiative',gameLog:{id:'waiting',initiative:true}}]);
            native.dispatch(nativeMessage('dice/roll/pending','waiting-native'));
            sendCustomEvent('MBFulfilledRoll',[{name:'Unrelated',rolls:[],request:{type:'custom'}}]);
            sendCustomEvent('MBCancelCorrelatedRoll',['waiting']);
            native.dispatch(nativeMessage('dice/roll/fulfilled','waiting-native',6));
        });
        assert.equal(await page.evaluate(()=>records.at(-1).data.action),'Custom Roll','cancellation clears only its own entry');
        const damage = await page.evaluate(async()=>{
            const request={type:'attack',rollDamage:true,rollAttack:false,whisper:WhisperType.YES,
                'waybeyond20-local-result-group':'real-roller-group'};
            const roll=new DNDBRoll('1d20+3');
            roll.setRollType('damage');
            const before=records.filter(r=>r.eventType==='dice/roll/fulfilled').length;
            await new DNDBRoller().resolveRolls('Sword',[roll],request);
            const whilePending=records.filter(r=>r.eventType==='dice/roll/fulfilled').length;
            sendCustomEvent('MBAttackDamageSummary',[{group:'real-roller-group',whisper:WhisperType.YES,
                action:'Sword',results:[{roll:roll.toJSON()}]}]);
            const completed=records.filter(r=>r.eventType==='dice/roll/fulfilled');
            return {before,whilePending,after:completed.length,entry:completed.at(-1)};
        });
        assert.equal(damage.whilePending,damage.before,'the real digital roller correlates damage to the summary');
        assert.equal(damage.after,damage.before+1);
        assert.equal(damage.entry.data.action,'Sword');
        assert.equal(damage.entry.data.rolls[0].result.total,18);
        const criticalAttack = await page.evaluate(async()=>{
            nativeFace=20;
            const roll=new DNDBRoll('1d20+5');
            roll.setRollType('to-hit');
            const before=records.filter(entry=>entry.eventType==='dice/roll/fulfilled').length;
            await new DNDBRoller().resolveRolls('Natural attack',[roll],{
                type:'attack',rollAttack:true,rollDamage:false,whisper:WhisperType.YES,
                'waybeyond20-await-hit':true,'waybeyond20-followup-phase':'base',
                'critical-damages':['1d6'],'critical-damage-types':['Slashing']
            });
            const after=records.filter(entry=>entry.eventType==='dice/roll/fulfilled');
            return {before,count:after.length,entry:after.at(-1),total:roll.total};
        });
        assert.equal(criticalAttack.total,25);
        assert.equal(criticalAttack.count,criticalAttack.before+1,
            'a critical attack-only result publishes immediately, before the player confirms Hit or Miss');
        assert.equal(criticalAttack.entry.data.action,'Natural attack');
        assert.equal(criticalAttack.entry.data.rolls[0].result.total,25,
            'the native Game Log retains the +5 modifier instead of later falling back to the raw d20');
        assert.equal(criticalAttack.entry.data.rolls[0].diceNotation.constant,5);
        assert.equal(criticalAttack.entry.messageScope,'userId');
        // The real secondary adapter must not turn a standalone cast into an
        // attack-damage group: there is no hit summary to release that group.
        await page.addScriptTag({content:`
            var wayBeyond20AttackFollowupQueue=Promise.resolve();
            var character={_id:'fixture-owner',getGlobalSetting:(key,fallback)=>fallback};
            function wayBeyond20GetTurnTrackerState(){return {};}
            function wayBeyond20AttackActivationTurnKey(){return null;}
            function wayBeyond20HasActiveCombatState(){return false;}
            function wayBeyond20NeedsAttackFollowup(){return false;}
            function wayBeyond20NormalizeAttackSemantics(){}
            function wayBeyond20ApplyDrainingAttackIntent(){}
            function wayBeyond20MayHaveSmiteAfterHit(){return false;}
            async function wayBeyond20DispatchRollWithCharacter(type,fallback,args){
                var roll=new DNDBRoll(args.damages[0]);roll.setRollType('damage');
                await new DNDBRoller().resolveRolls(args.name,[roll],{...args,type,whisper:WhisperType.YES});
                return true;
            }
            ${read('src/dndbeyond/base/attack-workflow.js')}
            ${read('src/dndbeyond/content-scripts/attack-workflow-character.js')}
        `});
        for (const [name,type] of [['Healing spell','Healing'],['Save-only damage spell','Fire']]) {
            const standalone = await page.evaluate(async({name,type})=>{
                nativeFace=15;
                const before=records.filter(entry=>entry.eventType==='dice/roll/fulfilled').length;
                const operation=wb20CreateCharacterAttackWorkflow('spell-attack','1d20+5',{
                    name,rollAttack:false,rollDamage:true,damages:['1d20+5'],'damage-types':[type]
                },'standalone-cast-fixture');
                const accepted=await operation.run();
                const after=records.filter(entry=>entry.eventType==='dice/roll/fulfilled');
                return {before,count:after.length,accepted,entry:after.at(-1)};
            },{name,type});
            assert.equal(standalone.accepted,true);
            assert.equal(standalone.count,standalone.before+1,
                `${name} must publish immediately without an attack summary or 90-second timeout`);
            assert.equal(standalone.entry.data.action,name);
            assert.equal(standalone.entry.data.rolls[0].result.total,20);
            assert.equal(standalone.entry.messageScope,'userId');
        }
    } finally {
        await page.close();
    }
}

(async () => {
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        if (!process.env.WB20_INITIATIVE_GAME_LOG_ONLY) await checkInitiativeClick(browser);
        await checkGameLog(browser);
        console.log('PASS sheet Initiative click and keyboard, typed Game Log result, exact modifier and audience, failure recovery and ordinary Custom Roll isolation.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode=1; });
