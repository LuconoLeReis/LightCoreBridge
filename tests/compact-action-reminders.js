const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/dndbeyond/content-scripts/feature-rules.js'),'utf8'),context);
const cases=[
 ['Push (Warhammer)','Push. If you hit a creature with Warhammer, you can push the creature up to 10 ft. straight away from you if it is Large or smaller.',/On hit: push up to 10 ft.*Large or smaller/],
 ['Sap (Mace)','If you hit a creature with a Mace, that creature has Disadvantage on its next attack roll before the start of your next turn.',/On hit: next attack.*Disadvantage.*before your next turn/],
 ['Channel Divinity','You can channel energy directly from the Outer Planes. You have uses of Channel Divinity.',/Shared uses.*Short Rest regains 1/],
 ['Abjure Foes','As a Magic action, you can target up to 5 creatures within 60 ft. Each makes a DC 17 Wis. saving throw or has the Frightened condition for 1 minute, or until it takes damage.',/5 creatures.*60 ft.*Wis 17.*Frightened 1 min.*ends on damage/],
 ['Divine Sense','For the next 10 min. you know the location of any Celestials, Fiends, and Undead within 60 ft.',/Detect Celestials, Fiends and Undead.*60 ft.*10 min/],
 ['Healing Pool','You have a pool of healing power. You can restore a total of 45 HP. It refills after a Long Rest.',/45 HP healing pool.*Long Rest/],
 ['Heal','As a Bonus Action, touch a creature and restore a number of HP up to the remaining pool.',/Touch.*pool.*restore/],
 ['Purify Poison','You can expend 5 HP from the pool of healing to remove the Poisoned condition.',/5 pool points: remove Poisoned/],
 ['Reactive Spell','When a creature provokes an Opportunity Attack, you can cast a spell rather than attack. The spell must have a casting time of one action and target only that creature.',/one-Action spell.*1 Reaction/],
 ['Protected','Whenever you make a d20 Test and roll 9 or lower on the d20, spend 1 Luck Point to reroll, and must accept the second result. When reduced to 0 HP and not killed outright, spend 1 Luck Point to drop to 1 HP instead.',/1 point: reroll d20 ≤9 \(keep new\), or remain at 1 HP/],
 ['Guardian Wards','You automatically succeed on saves against magical effects that would make you Incapacitated, Stunned, or Unconscious.',/Automatic saves vs magical.*Stunned/],
 ['Pack Instinct','When an ally is next to a creature at the start of your turn, you have Advantage on attacks against it.',/Advantage.*ally.*turn/]
];
for(const [name,text,expected] of cases){const result=context.wb20FeatureReminder(name,text);assert.match(result,expected,name);assert.ok(result.length<=110,name+' reminder must stay short');assert.notEqual(result,text,name+' must not copy a full description');}
console.log('PASS contextual compact reminders for masteries, shared pool, target/save power, detection, healing, cleansing, Reactive Spell, Luck, wards and Pack; presentation only.');

const compact=context.wb20FeaturePresentation('Abjure Foes',cases[3][1]);
assert.equal(compact.range,'60 ft.');assert.equal(compact.save,'WIS 17');assert.equal(compact.summary,'Up to 5 creatures · Frightened 1 min · ends on damage');
assert.equal(context.wb20FeaturePresentation('Lay On Hands: Heal',cases[6][1]).summary,'Pool points spent = HP restored');
assert.equal(context.wb20FeaturePresentation('Lay On Hands: Purify Poison',cases[7][1]).summary,'5 pool points · remove Poisoned');
assert.match(context.wb20FeaturePresentation('Control Undead','As an action, you can target one undead within 30 feet. On a failed save, it obeys your commands for 24 hours, or until you use this option again.').summary,/1 undead.*Obeys commands 24 hr.*ends on reuse/);
assert.equal(context.wb20FeaturePresentation('Push (Warhammer)',cases[0][1]).summary,context.wb20FeatureReminder(...cases[0].slice(0,2)),'effect distance is not stripped as targeting range');
assert.match(context.wb20FeaturePresentation('Unknown','As an action, you can target one creature within 30 feet.').summary,/Target one creature/);
assert.doesNotMatch(context.wb20FeaturePresentation('Unknown','As an action, you can target one creature within 30 feet.').summary,/As an action|within 30/);
assert.match(context.wb20FeatureReminder('Abjure Foes',cases[3][1],{range:null,save:null}),/60 ft.*Wis 17/,'do not remove facts absent from other columns');
console.log('PASS column-aware Notes: no repeated range/DC/action, retains targets, duration, ending condition, pool cost and effect distance.');
