const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = process.env.WB20_SOURCE_ROOT || path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('src/dndbeyond/content-scripts/character.js');
function fn(name) {
    const a = source.search(new RegExp('^(?:async )?function '+name+'\\(', 'm'));
    assert.ok(a >= 0, name);
    const n = source.slice(a+1).search(/^(?:(?:async )?function |const |let |var |class )/m);
    return source.slice(a, n < 0 ? undefined : a+1+n);
}
// Rule shapes rather than a class-level eligibility table. The real retained,
// owned feature reader is used below, including feature acquisition/removal.
const rule = {name: 'Blessed Healer', text: 'Your healing spells on others also heal you. Immediately after you cast a spell with a spell slot that restores Hit Points to one or more creatures other than yourself, you regain Hit Points equal to 2 plus the spell slot\'s level.'};
function setup(options = {}) {
    const log = [], saved = [rule];
    const owner = {_id: 'healer', _class_features: ['Blessed Healer'], _feats: [], _racial_traits: [],
        hasClassFeature: name => owner._class_features.includes(name),
        getSetting: (key, fallback) => key === 'waybeyond20-feature-rules' ? saved : fallback};
    const c = vm.createContext({console, character: owner,
        wayBeyond20FindHitPointsAdjuster: () => ({}),
        wb20ResourceId: v => String(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
        sendRollWithCharacter: async (type, fallback, args) => {
            log.push(['cast', type]); options.duringCast?.(c); return options.result ?? true;
        },
        dndbeyondDiceRoller: {queryGeneric: async (...args) => {
            log.push(['prompt', ...args]); options.duringPrompt?.(c); return options.choice === undefined ? 'other' : options.choice;
        }},
        wayBeyond20ApplyHealingToSelf: async (amount, details) => {
            log.push(['heal', amount, details]); if (options.throwHp) throw Error('control gone');
            return options.hpResult || {applied: true, before: 10, after: Math.min(30, 10+amount)};
        },
        alertify: {success: text => log.push(['success', text]), warning: text => log.push(['warning', text])}});
    vm.runInContext(read('src/dndbeyond/content-scripts/feature-rules.js'), c);
    vm.runInContext(fn('wayBeyond20SpellCastLevel'), c);
    vm.runInContext(read('src/dndbeyond/content-scripts/healing-cast.js'), c);
    const context = {level: '1st Level Evocation', castas: '', ritualMode: 'normal'};
    const args = {name: 'Healing spell', range: '60 ft.', damages: ['2d4+4'], 'damage-types': ['Healing'], description: 'A creature regains Hit Points.'};
    return {c, owner, saved, log, context, args, run: () => c.wb20SendHealingSpellCast('spell-attack', '', args, context)};
}
(async () => {
    let count = 0;
    async function test(name, work) {await work(); count++; console.log('  PASS '+name);}
    await test('slot1 heals3 only after the completed cast; no second dispatch', async () => {
        const s = setup(); assert.equal(await s.run(), true);
        assert.deepEqual(s.log.map(x=>x[0]), ['cast','prompt','heal','success']);
        assert.equal(s.log[2][1], 3);
        assert.deepEqual(s.args.damages, ['2d4+4']);
        assert.equal(s.log[1][3].skip, 'No / already applied / skip');
        assert.ok(!JSON.stringify(s.args).includes('owner'));
    });
    await test('upcast5 heals7 once, not per healed creature or healing row', async () => {
        const s=setup();s.context.castas='5th Level';s.args['damage-types'].push('Healing');s.args.damages.push('2d4+4');
        await s.run();assert.equal(s.log.filter(x=>x[0]==='heal').length,1);assert.equal(s.log.find(x=>x[0]==='heal')[1],7);
    });
    await test('actual compact Features snippet triggers Blessed Healer at the cast slot level', async () => {
        const s=setup();s.context.castas='3rd Level';
        s.saved[0]={...rule,text:'Immediately after you cast a spell with a spell slot that restores HP to one or more creatures other than yourself, you regain 2 + the spell slot’s level HP.'};
        await s.run();assert.equal(s.log.find(x=>x[0]==='heal')?.[1],5);
        assert.ok(!s.log.some(x=>x[0]==='warning'));
    });
    await test('inline numeric spans need not insert spaces around regain2+...levelHP',async()=>{
        const s=setup();s.saved[0]={...rule,text:"Immediately after you cast a spell with a spell slot that restores HP to one or more creatures other than yourself, you regain2+the spell slot’s levelHP."};
        await s.run();assert.equal(s.log.find(x=>x[0]==='heal')?.[1],3);
    });
    for (const result of [false, null]) await test('failed/canceled dispatch '+result+' never offers or heals', async()=> {
        const s=setup({result}); // null needs an explicit dispatcher below.
        if (result===null)s.c.sendRollWithCharacter=async()=>null;
        assert.equal(await s.run(),result);assert.ok(!s.log.some(x=>['heal','prompt'].includes(x[0])));
    });
    for (const choice of ['skip', null]) await test('skip/dismiss retains successful cast and does not heal '+choice, async()=> {
        const s=setup({choice});assert.equal(await s.run(),true);assert.ok(!s.log.some(x=>x[0]==='heal'));
    });
    for (const [name, change] of [
        ['cantrip',s=>{s.context.level='Cantrip';}], ['ritual',s=>{s.context.ritualMode='ritual';}],
        ['display',s=>{s.context.forceDisplay=true;}],['damage only',s=>{s.context.forceDamagesOnly=true;}],
        ['followup',s=>{s.args['waybeyond20-followup-phase']='damage';}],
        ['temporary HP only',s=>{s.args['damage-types']=['Temp HP'];s.args.description='Gain 5 Temporary Hit Points.';}],
        ['no feature',s=>{s.owner._class_features=[];}],
        ['self only',s=>{s.args.range='Self';s.args.description='You regain Hit Points.';}]
    ]) await test(name+' does not trigger',async()=>{const s=setup();change(s);await s.run();assert.ok(!s.log.some(x=>x[0]==='prompt'||x[0]==='heal'));});
    await test('no Cleric class/level gate; actual feature text supplies formula',async()=>{
        const s=setup();s.saved[0]={...rule,text:rule.text.replace('equal to 2 plus','equal to 3 plus')};await s.run();assert.equal(s.log.find(x=>x[0]==='heal')[1],4);
    });
    await test('self emanation that heals others is not rejected as self-only',async()=>{
        const s=setup();s.args.range='Self (30-foot Emanation)';s.args.description='Creatures within range regain Hit Points.';await s.run();assert.ok(s.log.some(x=>x[0]==='heal'));
    });
    await test('description-only healing spell uses the same completion hook',async()=>{
        const s=setup();s.args.damages=[];s.args['damage-types']=[];s.args.description='The creature regains 10 Hit Points.';await s.run();assert.ok(s.log.some(x=>x[0]==='heal'));
    });
    await test('missing live rule warns; does not guess formula or silently claim support',async()=>{
        const s=setup();s.saved.length=0;await s.run();assert.ok(s.log.some(x=>x[0]==='warning'));assert.ok(!s.log.some(x=>x[0]==='heal'));
    });
    await test('same cast plan claimed once across repeated and concurrent completion',async()=>{
        const s=setup(),plan=s.c.wb20HealingCastPlan(s.owner,s.args,s.context);
        await Promise.all([s.c.wb20CompleteHealingCast(plan),s.c.wb20CompleteHealingCast(plan)]);await s.c.wb20CompleteHealingCast(plan);
        assert.equal(s.log.filter(x=>x[0]==='heal').length,1);
    });
    for (const stage of ['duringCast','duringPrompt']) await test('owner change '+stage+' never heals replacement actor',async()=>{
        const s=setup({[stage]:c=>{c.character={_id:'other'};}});assert.equal(await s.run(),true);assert.ok(!s.log.some(x=>x[0]==='heal'));
    });
    await test('HP control missing gives exact manual amount without another cast',async()=>{
        const s=setup({hpResult:{applied:false}});assert.equal(await s.run(),true);assert.match(s.log.find(x=>x[0]==='warning')[1],/3 HP.*manually/);
    });
    await test('HP failure cannot turn a completed spell into a failed cast',async()=>{
        const s=setup({throwHp:true});assert.equal(await s.run(),true);assert.match(s.log.find(x=>x[0]==='warning')[1],/already completed/);
    });
    await test('feature discovery failure never blocks the spell itself',async()=>{
        const s=setup();s.c.wb20CurrentFeatureRules=()=>{throw Error('Features unmounted');};
        assert.equal(await s.run(),true);assert.equal(s.log[0][0],'cast');assert.ok(s.log.some(x=>x[0]==='warning'));
    });
    assert.equal((fn('rollSpell').match(/wb20SendHealingSpellCast\(/g)||[]).length,2,'both normal spell output paths wired');
    console.log(`LightCore healing-cast checks passed: ${count}.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
