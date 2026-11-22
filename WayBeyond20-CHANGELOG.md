# LightCore Bridge 1.73.116

Browser build **2.20.248**. Familiar picker, saved profiles and companion cards. Independently reviewed; representative casting, cancellation, saved-profile and touch-delivery checks passed on a disposable character.

Familiar touch-delivery identity is preserved through both character attack workflows, so the confirmation and familiar Reaction cost also apply to copied spell requests.

Settings search is restored when a saved familiar library is present. Uncertain familiar payment, benefits or delivery show Proceed/Cancel advisories. Reusing an existing familiar name with a different form asks before updating the saved profile.

Find Familiar now opens a form picker using DDB's creature catalog and stat blocks, including eligible CR0 Beasts and explicit additional forms in owned descriptions. Source versions remain distinct. A named summon saves a reusable profile; an unnamed summon stays generic and does not add a saved entry. Clearing the optional name keeps that remembered field blank. Appearance is cosmetic and leaves the selected form's mechanics intact. Saved definitions are separate from the single active familiar, and can be imported without summoning or spending resources.

Each completed cast rolls fresh base HP, with a minimum base of1 before the Familiar Friend bonus. Twice the caster's character level is captured at casting; reopening the card neither rerolls nor heals it. Cards retain ability scores, saves, skills, movement, senses, traits and actions from the selected stat block. The familiar's own Initiative, Action and Reaction are separate from the caster's resources. Dismiss/return and shared senses use caster resources; touch delivery consumes the familiar's Reaction only when its cast completes. Actions-menu links reopen those controls.

Familiar Friend's free Use entry pays its native use once without a slot or Material component. Slot-funded casts pay one slot; rituals pay neither. Cancel/display/failure do not create a companion or spend a cast. Helpful Friend can be armed for the next proficient skill check, confirms the familiar is within range, and pays its native counter only on an accepted roll. Existing Advantage does not spend it. Initiative, raw ability checks, saves, tools and attacks are excluded.

The remembered name and saved-profile library are browser-wide preferences; the active familiar belongs to its character. They are not a new account-sync service. DDB must provide a readable catalog/stat block. This does not automate board movement, line of sight, carried objects or DM rulings. Saved custom forms are identified separately from ordinary spell eligibility. Unrecognized extra familiar-feature effects remain reference text, not a claim of universal feat automation.

Reload the same extension installation and refresh D&D Beyond after updating. Do not also mark a slot by hand after a LightCore slot-funded cast. Pact Magic and free spells labelled Cast instead of Use retain their previously documented limits. Experimental central session-sync is not included.

---

# LightCore Bridge 1.73.113

Browser build **2.20.245**. This update makes the Initiative box include missing Jack of All Trades half proficiency while retaining the final protection against adding proficiency twice.

## Downloads

- [Chrome extension ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.113/LightCore-Bridge-chrome-v1_73_113.zip).
- [Corresponding source ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.113/LightCore-Bridge-source-v1_73_113.zip).

## Initiative display

With Jack of All Trades enabled, a native Dexterity-only Initiative modifier of +3 and proficiency bonus +2 now display +4. The native number is preserved separately for the existing final roll check, so showing the correction does not add it again. Existing proficiency and independent bonuses are preserved. Unknown component totals retain the native value unless the existing roll-time confirmation establishes that proficiency is missing; no confirmation appears just from rendering the sheet.

The display responds to character-setting changes, refreshed native values and desktop/tablet/mobile layouts. Turning the setting off restores the native display. The setting text describes its behavior directly. Other ability-check, skill and saving-throw calculations are unchanged.

## Validation

24 new display cases, all 42 existing JOAT cases, the existing Initiative browser suite and full automated suite pass. The new display test fails on 112 for the reported +3/+4 mismatch. Mira independently reran these targeted cases and confirmed the red result on 112. Both browser builds and all 84 compiled JavaScript syntax checks pass. No live roll or character value was changed for this repair.

## Update

Update the same unpacked extension folder, reload LightCore Bridge on chrome://extensions, then refresh D&D Beyond. Keep the same path and extension installation to retain settings. The Dropbox Dev folder is updated separately after public-package verification; an open page continues using its loaded version until refreshed.

The spell-slot accounting from108 remains: every LightCore spell roll button, including spell-list and Actions-tab attack dice, pays once after a successful slot-funded cast. Do not also mark the slot by hand. Free spells labelled Cast rather than Use and Pact Magic remain unverified. Familiar automation and experimental central session-sync work are not included in this display repair.

---

# LightCore Bridge 1.73.112

Browser build **2.20.244**. This release adds the requested Jack of All Trades handling to Initiative, with a final check that prevents adding proficiency twice. It builds on stable1.73.108;111 was an unpublished candidate.

## Download

- [Chrome extension ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.112/LightCore-Bridge-chrome-v1_73_112.zip) — install this package.
- [Corresponding source ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.112/LightCore-Bridge-source-v1_73_112.zip).

## Initiative-only final check

- When the character owns Jack of All Trades and its LightCore setting is enabled, Initiative receives half the proficiency bonus, rounded down, when that bonus is absent. For example, Dexterity+3 and proficiency+2 produce Initiative+4 when the native modifier is only Dexterity.
- The check runs after Initiative, advantage and tiebreaker preparation, immediately before sending the roll. Existing request or native proficiency is preserved. Repeated or concurrent checks of the same request reuse the first result, so the bonus and its label are not added twice.
- Independent bonuses are kept. If an unlabelled total has unclear components, LightCore asks whether proficiency is already included and defaults to keeping the current number. The answer is remembered for that character and unchanged calculation while the page remains open. Cancel or a changed character, native value, request or turn sends no roll.
- Initiative names, privacy and the optional tiebreaker are retained. A canceled final check does not consume the unlocked Initiative-advantage setting.
- This is the Initiative proficiency check in the existing **Bard: Jack of All Trades** setting, which defaults to enabled. Other ability-check, skill and saving-throw handling is unchanged.

## Verification and limits

All42 focused cases and the existing Initiative browser suite pass, including native clicks, rounding, existing half/full proficiency, earlier request additions, independent bonuses, repeated/concurrent checks, cancellation, stale state and tiebreakers. The full automated suite,31 spell-slot cases, healing/native Smite checks, Chrome/Firefox builds and84 compiled JavaScript syntax checks pass. Independent offline review reran the42 cases, Initiative suite and31 slot cases. These checks use disposable fixtures; no new installed gameplay acceptance is claimed.

Numeric totals cannot reveal every bonus component. Localization or changed native proficiency labels may require confirmation. Spell-slot limits retained from108: free native spells labelled Cast rather than Use and Pact Magic pool selection are unverified on real sheets. Central Discord authentication and automatic shared-state sync remain separate development and are not included.

## Spell-slot reminder

Every LightCore spell roll button, including spell-list to-hit dice and Actions-tab spell attack dice, shares the108 slot accounting. **Do not also mark the slot pip by hand.** Successful slot-funded casts spend once at the selected level; canceled/failed dispatches and separate damage rolls do not acquire another charge.

## Update in place

Finish pending rolls and update between games. Extract the Chrome ZIP and use the inner **WayBeyond20** folder containing manifest.json. Back up the folder Chrome currently loads, replace its contents in place, wait for copying/Dropbox sync, reload LightCore Bridge on chrome://extensions, then refresh character/VTT tabs. Keep the same loaded path and extension installation to retain settings. This is a manual unpacked update, not a Chrome Web Store automatic update.

---

# LightCore Bridge 1.73.108

Browser build **2.20.240**. This release fixes spell-slot payment for LightCore-initiated casts, including Chromatic Orb, building on stable 1.73.106.

## Download

- [Chrome extension ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.108/LightCore-Bridge-chrome-v1_73_108.zip) — install this package.
- [Corresponding source ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.108/LightCore-Bridge-source-v1_73_108.zip).

## Spell-slot repair

- A slot-funded spell cast through LightCore now spends one slot at the selected casting level after successful dispatch. Upcasting uses the selected level, not the spell's base level.
- This applies to LightCore spell buttons, including spell-list to-hit dice and Actions-tab spell attack dice. **Do not also mark the slot pip by hand.** If you already marked it manually, check the counter to avoid recording the same cast twice.
- Canceling the damage-type chooser or failing dispatch spends no slot. Once the cast is sent, a missed attack still costs its slot. Separate damage rolls and repeated damage-continuation callbacks do not charge again.
- Native Cast/Use buttons keep their existing accounting. Rituals, cantrips, previews, free Use controls and slot-free Divine Intervention do not acquire a slot charge.
- If the native slot update cannot be verified, LightCore asks you to reconcile the counter without recasting. It does not spend a neighboring level to hide a failure.

## Verification and limits

The regression reproduces the missing charge on 106 and passes 31 isolated casting cases on 108. The full automated suite, nine targeted browser suites, Chrome/Firefox builds and 84 compiled JavaScript syntax checks pass. Independent offline review also reran the 31 cases and confirmed the expected failure on 106. These checks use disposable fixtures; no new installed gameplay acceptance is claimed. The direct fixture drives the pane icon; the additional button paths share the repaired execute/rollSpell boundary and were inspected, not individually driven.

Two native-sheet cases remain unverified: a free feat/species spell labeled **Cast** rather than **Use**, and Pact Magic slot-pool selection. Check those counters when using those cases. Broader baseline limitations remain documented in README.txt. Central Discord player authentication and automatic shared-state sync remain separate development and are not included.

## Update in place

Finish pending rolls and update between games. Extract the Chrome ZIP and use the inner **WayBeyond20** folder containing manifest.json. Back up the folder Chrome currently loads, replace its contents in place, wait for copying/Dropbox sync, reload LightCore Bridge on chrome://extensions, then refresh character/VTT tabs. Keep the same loaded path and extension installation to retain settings. This is a manual unpacked update, not a Chrome Web Store automatic update.

---

# LightCore Bridge 1.73.106

Browser build **2.20.238**. This stable release brings together the repairs developed since 1.73.72. Existing saved settings and compatibility identifiers are retained.

## Download

- [Chrome extension ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.106/LightCore-Bridge-chrome-v1_73_106.zip) — install this package.
- [Corresponding source ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.106/LightCore-Bridge-source-v1_73_106.zip) — source, tests, build inputs and optional TaleSpire companion.

## Attacks, damage and the Game Log

- Attack shortcuts stay attached to the original weapon row during native icon redraws. An expired handoff reports that no roll was sent.
- The manual **Roll Damages** control remains available while damage is pending, including when ordinary local result cards are hidden. Miss or Skip removes the pending continuation. A failed resource-history save warns rather than leaving the completed hit waiting forever.
- A completed managed attack has a local damage total and its component breakdown. Critical weapon and rider dice contribute to the combined total, including a flat-damage Unarmed Strike with a critical dice rider. Versatile alternatives and conditional damage remain separate.
- With Digital Dice and Game Log enabled, correlated rolls retain the ability name and attack modifier. Managed damage is grouped as a named total with typed component and critical breakdowns. Attack-only criticals and standalone healing/save casts no longer wait for an unrelated damage group.
- Shared Unarmed Strike normalization reads owned feature descriptions and current native dice. It preserves native Dexterity bonuses and does not rewrite an extra-damage feature as an Unarmed Strike.
- Protected rerolls offer **Spend and reroll** or **Keep Roll**. An Advantage/Super Advantage result with an eligible kept natural d20 above 9 skips the Protected prompt.

## Healing, resources and controls

- Healing-only casts produce their result even when automatic attack damage is off. Native slot and activation handling remain in the normal cast workflow.
- Owned Life Domain descriptions support Disciple of Life, Blessed Healer and Supreme Healing. Blessed Healer asks before applying the caster's benefit; a failed native HP update gives the amount for manual reconciliation. Preserve Life and similar pools still require target allocation at the table.
- Lay On Hands uses the shared healing action path and shows the remaining native pool. Cleric healing/Channel Divinity actions and owned on-hit riders retain their distinct costs and timing.
- Initiative rolls are named, the tracker shows the character's initiative, and Correction can set, clear or adjust it. New combat identity and manual New Turn clear stale external-turn state. Manual combat can offer the next turn once action, bonus action and attack pools are spent.
- Dialog themes, value-cell hover behavior, dropdown borders, the settings flyout and portable preference import/export have been refined. Portable preferences exclude destination credentials and private integration secrets.

## TaleSpire

Paused TaleSpire turn following no longer closes a manually opened Combat Window. Position and target observations can continue while following is paused; those observations alone do not adopt the native turn order or replenish resources.

For native turns, enable **Follow this board's turn order** in the optional TaleSpire companion. Mini linking is explicit. The companion and local return helper are separate from the Chrome ZIP; installation instructions are in [the corresponding source](https://github.com/LuconoLeReis/WayBeyond20/tree/v1.73.106/companions/talespire). Companion 1.1.2 updates visible branding to LightCore Bridge while retaining compatible folder names, receiver identity and pairing. It does not write native initiative or HP.

## Verification and limits

The final candidate passed the 60-process automated matrix, Chrome/Firefox builds and 84 compiled JavaScript syntax checks. Independent offline delta reviews cover the changes through 1.73.106. Installed checks verified named attack and critical totals with their breakdown, immediate healing with one slot spent, ordinary local turn controls, Roll20 delivery, and the repaired TaleSpire manual-window persistence. Publication preparation rebuilds the committed source and compares every packaged executable with that accepted candidate.

This is bounded acceptance, not a claim that every feature, character, destination or cross-computer scenario was tested live. Broader two-client TaleSpire turn/position acceptance and exhaustive Foundry checks remain separate. A sufficiently late native digital-dice result can still be ambiguous after a timeout; missing controls fall back locally. An incomplete or audience-mismatched Game Log group can degrade to separate safe component entries. Unresolved homebrew descriptions and target/condition adjudication can require manual handling.

The new central Discord session service, player sign-in and automatic shared-state synchronization are **not included**. Existing optional Discord roll output remains available. The experimental private mastery branch is also excluded. Summoned-creature control hours remain manually advanced game time; automatic companion HP/condition application is not promised.

## Install or update

For a new installation, extract the Chrome ZIP, open chrome://extensions, enable Developer mode, choose **Load unpacked**, and select the inner **WayBeyond20** folder containing manifest.json. Do not load the source archive as the extension or run another Beyond20 copy alongside it.

For an update, finish pending rolls, back up the folder Chrome currently loads, and replace its contents with the new WayBeyond20 folder contents. Keep the same loaded path and installation to preserve settings. After the copy (or Dropbox sync) completes, reload LightCore Bridge on chrome://extensions and refresh character/VTT tabs. Updating files alone does not replace scripts already injected into an open tab. If you already loaded 1.73.106 / 2.20.238, the published executable code is identical and no gameplay change is required.

Required Beyond20 attribution and GPL/MIT licenses remain included. Corresponding source is the exact v1.73.106 tag. This is a manual unpacked release, not a Chrome Web Store automatic update.


---

## Previously published history

# LightCore Bridge 1.73.72

First LightCore Bridge release. Browser build **2.20.204**.

LightCore Bridge is the new name for WayBeyond20. It connects a D&D Beyond character to local tabletop play, Roll20, Foundry VTT, TaleSpire and optional Discord output. A VTT is not required. The name, approved artwork and compact LightCore control are updated; existing saved character data, connections and compatibility identifiers are retained.

## Included since WayBeyond20 1.73.57

- Updated Actions presentation: consistent main names/subtitles, spell level choices, range/value cells, damage-type indicators and concise contextual Notes.
- Remembered Opportunity Attack/War Caster choices and clearer feature/resource controls, with native rules/eligibility reminders retained.
- Portent used-state correction, compact item-buff display and header alignment improvements.
- Active Find Steed and Summon Undead controls using cast-level/type-specific stats and separate creature actors on the existing attack pathway. Companion rolls do not borrow the caster's personal reroll resources or attack riders.
- Animate Dead tracking for creation and renewal, separate creature identities/HP/control hours, and one Bonus Action group command.
- Manual companion tracking accepts normal native-sidebar dismissal while rejecting another character or replacement spell pane. This repairs the renewal defect found in pre-release live testing.

## Using companions

For Animate Dead, open the desired Skeleton and Zombie reference entries in DDB Extras once to load their native definitions. Normal casting can register the selected creatures; Track an existing summon adds controls for a creature already present without casting or spending another slot. When a definition is unavailable, Continue without tracking keeps the ordinary spell available.

Click the creature's action icon to roll. Click its name or Notes for details, HP/control corrections or End tracking. Renewal retains the same creature and HP. Existing orders continue until completed; individual creature attacks do not cost another caster Bonus Action.

Control hours are manually advanced game time. Multiattack shows the attack count; each click rolls one attack. Initiative/positions, aura eligibility, automatic target conditions and native companion-HP synchronization are not automated. Details preserve the rules for table adjudication. No claim that every homebrew feature is automated.

## Installation and compatibility

The Chrome archive uses the existing WayBeyond20 folder wrapper for compatibility, while the extension displays LightCore Bridge. Retain the existing extension/settings when updating. Native DDB and optional destination companions remain separate applications; this release does not provision a Discord server or redeploy a remote VTT module. Existing third-party licenses and Beyond20 attribution remain included.

## Verified scope and remaining limits

Independent offline review approved the mainline changes from 1.73.57 through 1.73.72. Automated regression suites, companion composition tests, syntax checks and Chrome/Firefox builds passed. Live checks verified manual renewal preserves HP and identity, and native Animate Dead and Summon Undead casts each commit their companion effect and spend exactly one slot. Test resources were restored. Earlier bounded steed checks verified creature rolls without spending the caster's personal Luck Points.

This is not a claim that every homebrew feature or destination was live-tested. The separate experimental mastery/rider branch is not included. Existing digital-dice privacy settings can suppress a local card; old destination companions or late acknowledgments may produce an extra local copy. Intermittent loading indicators remain under investigation; reopening a sheet after an extension update avoids stale scripts.

## Download and update

- [Chrome extension ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.72/LightCore-Bridge-chrome-v1_73_72.zip) — install this package.
- [Corresponding source ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.72/LightCore-Bridge-source-v1_73_72.zip) — source and build inputs.

Finish pending rolls and close character/VTT tabs. Back up the folder Chrome currently loads. Extract the Chrome ZIP, then copy the contents of its WayBeyond20 folder into that same loaded folder. Reload LightCore Bridge on chrome://extensions and reopen the sheets. Keep the loaded path and existing extension installation to preserve settings. Do not enable another Beyond20/WayBeyond20 copy alongside it.


---

## Previously published history

## 1.73.57 — Published November 1, 2026

Browser build 2.20.189. Stable release collecting the reliability and presentation work since 1.73.29; the intervening development numbers were not separate public releases. [Full release notes](https://github.com/LuconoLeReis/WayBeyond20/releases/tag/v1.73.57).

- Automatic forwards completed results to available VTTs. Confirmed delivery suppresses the extra WB20 local result; otherwise the same completed result falls back locally, subject to existing display/privacy choices. Optional delivery never gates action completion or repeats resource spending.
- Bound worker settings readiness and retain saved destinations across worker restarts. Discover current permitted Foundry tabs rather than relying only on an in-memory cache. Spell shortcuts recognize native spell casting controls.
- Preserve shared-sheet loading and still-owned feature rules during filtered/incomplete renders. Fix the reproduced action-list delete/rebuild loop and reduce repeated rule reads within each render. The intermittent loading root cause remains open.
- Preserve Name, Range, Hit/DC, Damage and Notes columns. Match range hierarchy, Hit/DC size, native-style value borders, known damage icons and light/Underdark ink. Value controls use the existing row activator. Collapse only identical equipped-weapon displays; keep inventory and distinct variants.
- Omit redundant spell action-cost labels from Notes. Keep useful source details and indicate source-confirmed material prices; label per-cast consumption only when confirmed.
- Restore centered temporary local results with configurable duration, hover/focus pause and dismissal. Keep recovery in Settings/the extension menu rather than a permanent page button. Settings opens in a normal tab; the saved TaleSpire link is readable and reused across boards. Correct header icon ink/spacing and Defenses frame containment.
- Full automated suite, focused browser/recovery checks, both builds, syntax/manifest checks and independent review passed. The owner accepted fresh load/display on two real character sheets. Bounded live tests covered skill/attack/damage prompts, exactly one spell-slot spend/restoration and authenticated TaleSpire receipts. Receipt evidence is not a screenshot of native TaleSpire chat; no full live Forge/all-class claim.
- Known limits: intermittent X/Stop loading (fresh-tab update workaround); native digital-dice audience fallback warnings; the existing digital-dice hide setting can suppress local fallback independently of delivery; late/old companions can leave an extra local copy. Native enemy HP, terrain/path adjudication and all remote effects are not automated.

The notes were reconciled after publication; no code, version, tag or downloadable asset was replaced. Development entries below retain their historical observations and pending status; this published summary controls the shipped release's disposition. Later display/delivery behavior supersedes earlier development experiments.

## 1.73.56 (development only)

- Correct native campaign margin inside WB20 compact layout; verify equal icon-center spacing with the real margin in the fixture.
- Carries the55 presentation repairs. Intermittent loading remains unresolved.

## 1.73.55 (development only)

- Restore centered, temporary local results with configurable duration and dismissal.
- Retain confirmed-delivery suppression and normal local completion semantics.
- Keep recovery in menus; remove the permanent page button and its theme observers.
- Use one proportion-preserving native frame for ordinary WB20 result/resource panels.
- Match action-row typography in light/Underdark; normalize Hit/DC to damage text size.
- Restore header icon ink and builder-cell centering; refresh added row ink on theme changes.
- Intermittent loading investigation remains open. Not publication/live acceptance.

## 1.73.54 development - bounded settings readiness

A missing worker settings callback now returns a quiet local-fallback reply after 2.5 seconds, releases retained messages, and cannot send them later. At most64 messages wait. No guessed VTT destination, saved-setting change, or loading-fix claim. Publication remains blocked.

## 1.73.54 / 2.20.186 - native-only startup control, November 1, 2026

52 caught Facebook-targeted child-frame loads at291s and Pinterest/Facebook loads at289s in the passive tab. This is measured late-frame behavior, not proof of its relationship to Chrome status or WB20. Add an explicit private test-tab wb20-native-startup=1 control before recovery boot: no character engine/UI/VTT startup or settings read/write; only the same finite read-only diagnostics. Probe helpers accept an optional log callback, preserving default callers, and late frame replies now log fresh sender-only Chrome status. Real MV3 test proves absence of engine/roller/recovery UI with retained diagnostics and unchanged saved mode, followed by normal startup and recovery checks. These diagnostic flags must be reviewed/removed before publication; no loading fix or release claim.

## 1.73.52 / 2.20.184 - post-load frame evidence, November 1, 2026

Live51 completion traces prove that the native top-level load finishes within2.5-3.6s while Chrome still reports loading at30s, including the passive-startup tab. Continue the passive frame-load listener after that first event, with no polling/long-task observer, at most8 reports for frames finishing10s after native load, and30-minute/pagehide cleanup. Report only origin/form-target origin and timing, never paths, queries or contents. Browser regression covers the cap, late events, privacy, completion/expiry, teardown and already-complete startup. This is evidence collection, NOT a proven cause or loading repair.

## 1.73.51 / 2.20.183 - load completion evidence, November 1, 2026

Add one read-only completion record after the native load event, separately from the existing three startup samples. Capture only slow resource origins, initiator types and timings (last250 resource entries, largest8); never URL paths/queries or data. Idempotent startup; pagehide, completion and a30-minute deadline remove timers/listeners. No polling, network requests, permissions or gameplay changes. Actual delayed-iframe browser regression covers successful and late completion, expiry, already-complete startup, privacy and cleanup. This is diagnostic, not a loading fix.

## 1.73.50 / 2.20.182 - passive startup isolation, November 1, 2026

Add one explicit per-tab diagnostic URL flag to suppress automatic spell discovery and remembered-description native visits. Default behavior, manual visits and casting are unchanged. A composed browser test verifies no automatic timer/visit under the flag, manual visits still work, and the normal URL retains existing behavior. Loading cause remains unproven. Development only.

## 1.73.49 / 2.20.181 - native spell attack handoff, November 1, 2026

Installed48 exposed a real Starry Wisp shortcut defect: its native spell pane has casting metadata in the property list and damage/attack controls in the caster section. The shared handoff incorrectly waited for weapon-only properties and expired. Use the native spell inputs consumed by rollSpell to establish readiness, retaining exact heading/source ownership, cancellation, expiry and the single existing execute boundary. No duplicate attack executor or named-spell exception.

The browser regression models the captured native layout, including a delayed caster section. It fails against48 and passes against49. Full node and focused input/cancellation suites are recorded separately from installed acceptance. Intermittent Chrome loading remains open. Development only; not published.

## 1.73.41 / 2.20.173 - feature snapshot guard, October 31, 2026

Unknown filter state defaults to merge. Even a positively identified All view cannot discard a cached rule still confirmed by the owner feature list merely because its description is missing. Empty snapshots retain the existing nonempty persistence guard. No arbitrary size threshold: any missing still-owned rule is preserved; confirmed ownership removal still prunes stale rules. Added composed tests for absent active CSS marker, no filter bar, incomplete All, empty All and confirmed removal. Candidate pending independent review and live acceptance; no publication.

## 1.73.40 / 2.20.172 - session reliability, October 31, 2026

Restore shared character-sheet links while excluding builders and unrelated pages. Every completed roll remains accessible under collapsed Local rolls, including a destination success without render proof. No automatic result popup or reroll. Filtered Features views retain other owned categories; complete All snapshots remain authoritative. The native Defenses SVG now follows its expanded content and restores its original aspect when buffs end.

No mastery/wondrous conversion, Aura transport or new gameplay feature. Local candidate; independent re-review and live TaleSpire acceptance pending. Real-MV3 browser test environment availability is recorded separately from passing fixture tests.

## 1.73.39 / 2.20.171 â€” requested column-layout rollback, October 29, 2026

the owner explicitly rejected full-width/spanning feature summaries. Restore feature entries to the established NAME, RANGE, HIT/DC, DAMAGE and NOTES columns. Remove added inline descriptions/reminders and the summary-specific grid/hidden-column CSS; return the previous placeholders, Details and existing use counts to their cells. No new information or redesigned display lines in this candidate.

Retain38's yielded refreshes, bounded diagnostics, synchronous rule snapshot and validated-label cache, inner Defenses containment, native spell artwork, duplicate alias correction, functional controls and rule-correct Reactive Spell. Local development rollback only. Installed acceptance and independent review remain pending; not published.

## 1.73.38 / 2.20.170 â€” local diagnostic repair, October 29, 2026

Yield and coalesce document mutation refreshes instead of running the whole sheet pipeline inside every mutation microtask. Keep one pending task, retain the newest native state, adapt delay to measured scan duration, and leave the observer active. Add per-stage time/write counters and bounded mutation-target summaries; pressure reports go to the existing local debug log, at most six per page with ten seconds between reports. No polling timer, new overlay or gameplay change.

Find matching label text before forcing visibility/layout reads; reuse only connected, visible, identity-matched labels and invalidate replaced nodes. Remove the observed native inner Defenses57px height clamp as well as the outer frame limit, allowing the full text and buff names to fit. Synthetic full-pipeline stress and native-structure layout tests are distinct from installed acceptance. The exact source of the owner's live high CPU is still unconfirmed until the diagnostic build is loaded. Not published.

Share one current rule/activation snapshot within each synchronous action-list render, discarding it in finally. The captured native markup replay reduced969 native rule reads across three unchanged renders to3, with no cache across native updates or feature use. The prior build fails the new single-read regression; removed/changed rules are reread next render.

## 1.73.37 / 2.20.169 â€” local development repair, October 29, 2026

Replace36's full inline feature descriptions with short, contextual reminders. Masteries show trigger/effect/expiry or size; shared pools show recovery; activated powers show useful targets/range/save/duration; healing and Luck show their relevant point use. Full native rules remain on name click. No compulsory Range/DC template or mechanical change. Retain the quiet automatic-result display, school artwork, alias deduplication, no-scroll forwarding and observer ownership repair.

Reactive Spell follows War Caster's current rule: use a Reaction to cast an eligible normally one-Action spell at only the provoking creature. Include cantrips and leveled/non-damaging spells; exclude known bonus-action, reaction and longer casting times from the initial chooser. Mark unknown timing and retain strict final native-pane validation, single-target confirmation, native slot cost and shared Reaction accounting. No live cast or publication.

## 1.73.36 / 2.20.168 â€” local development repair, October 28, 2026

Ordinary rolls retain a completed local record without opening an information modal. Confirmed optional VTT delivery keeps that record hidden; local-only/failed delivery exposes one collapsed Local rolls control, with at most 20 retained records. Explicit detail requests still open themed dialogs. Attack outcome prompts and shared resource/Draining flow are unchanged. Existing Roll20 chat independently contained the owner-reported Everflame attack23 / damage17+6, so that report was duplicate local presentation, not a proven routing failure.

Feature shortcuts show their current rules inline instead of empty table cells; detail buttons no longer scroll the native source into view. Protected parent/child aliases share one shortcut. A vector feature symbol replaces squeezed Use text. Spell shortcuts reuse identity-matched native spell-school artwork when available; cache lookup is bounded, failed images fall back once and never block casting. Defenses/Buffs frames can grow, with narrow columns stacking rather than clipping. Full installed acceptance and independent review remain pending. No publication.

## 1.73.35 / 2.20.167 â€” local development repair, October 28, 2026

Stop the composed action-list refresh loop: the native-feature collector now removes only shortcuts it owns. Previously it deleted rows produced by the rule module, which recreated them and triggered another document observer callback indefinitely. A bounded browser regression reproduces the defect on 34 (24 callbacks / 576 mutations at the cutoff) and settles with zero callbacks/mutations after the repair while retaining row identity. Feature opt-out still removes its own rows. No gameplay/resource or routing changes. Installed-sheet confirmation remains pending.

## 1.73.34 / 2.20.166 â€” local development candidate, October 28, 2026

Read current owned feature descriptions across modern DDB markup and retain them per character. Route natural/gauntlet Unarmed Strikes through the existing attack, resource and Draining Attack follow-up flow. Explicit per-item options apply a trained mastery and the approved weapon-damage-bonus exception to gauntlet Unarmed Strikes without adding native weapon bonuses twice. Track ignition/extinguishing with one Bonus Action and include conditional Fire only while active. Shield Bash replaces one Attack-action attack; Spike Salvo uses one Magic action and one native item charge, recharging at dawn.

Control Undead, Abjure Foes and Divine Sense share Channel Divinity. Protected uses native Luck Points for eligible kept-result rerolls or dropping to 1 HP; Guardian Wards and Pack Instinct require explicit eligibility confirmation. Recognize current War Caster Reactive Spell wording and damage-reduction utility spells. Native passives remain authoritative; remote saves, targets, conditions, pushes and summons are resolved by the table. Automated coverage is separate from installed-sheet acceptance and independent review. Development only; not published.

## 1.73.33 / 2.20.165 â€” local development candidate, October 28, 2026

The compact desktop header no longer requires DDB to provide a Share button. Manage, WB20, Rest and Correction continue independently; when Share is absent the two available rows close the themed panel at the existing height. Native campaign and no-campaign (Find a group / Game Log) controls retain their ownership and links. No campaign, party or character ID controls activation. Header browser regressions cover both Share states, both campaign states, light/dark themes and late Share changes. The new regression fails against 32 for the observed missing-Share condition. Local candidate only; installed-browser acceptance and independent review remain pending.

## 1.73.32 / 2.20.164 â€” local development candidate, October 28, 2026

Limit floating recovery UI to character sheets and Roll20 games, share URL scope between loader/worker/toolbar, cap sheet-theme discovery and remove persistent page-wide recovery monitoring. Reorganize existing settings into searchable sections with Send rolls to always visible, preserving stored keys and data. Scope the Foundry bundle, reuse healthy bridges and disconnect stale title callbacks before missing-storage access. Independent review and installed-browser acceptance remain pending; this entry is not publication.

## 1.73.31 / 2.20.163 â€” local development candidate, October 27, 2026

Wait for saved worker settings before forwarding requests; prevent a delayed startup snapshot from replacing a newer settings broadcast. Use portless host permission patterns in worker and toolbar recovery. Automated regression results are distinct from independent review and installed-browser acceptance. One-time Foundry activation remains a documented recovery limitation.

## 1.73.27 / 2.20.159 â€” Portent and theme repair, October 25, 2026

Explicit Portent reroll with confirmation/cancel, independent completed-rest refresh, expired-context guards, themed header silhouette/hover and prompt readability, encoding-safe settings gear. Unit/browser tests and owner-reported Portent functionality are distinct from complete remote-player acceptance. Dice-tray and Musician party-management work excluded.

## 1.73.25 / 2.20.157 â€” October 25, 2026

Owner-authorized release of queued attacks and the themed Action menu. Explicit Attack sends one source-aware card; automatic weapon purchases add no duplicate card. Attack outcome uses direct Hit/Miss/Skip-Cancel controls; one total is plain text and critical damage remains driven by the selected roll. Automated verification and live menu/display inspection are distinct from complete live acceptance. No battlefield, movement-path or tactical-advice feature is included.

## 1.73.24 / 2.20.156 â€” local development candidate, 2026-10-25

- Combat Attacks displays actual queued attacks / standard attacks per Attack action. Explicit Attack and automatic weapon purchase share resource preflight/commit. Additional Actions are converted only when spent; Haste queues one, separately from standard and feature-bound attacks.
- Action hover/click/focus menu offers the eleven requested 2024 choices; Haste menu offers its five permitted choices. Attack queues without rolling; Dash adds current Speed; Dodge/Disengage/Help show local turn effects and deliver descriptive cards through the existing route. Dexterity saves benefit from valid Dodge.
- Skill actions reuse the real skill pane/roll preparation with a one-shot resource intent. Magic opens Spells without spending; native activation pays once. Utilize records a described nonmagical interaction; tracked items must use their own sheet activation. Cancellation, delivery failure and stale turns do not commit.
- Correction accepts additive standard queues above the per-Action denominator and exposes queued Haste separately. Existing attack workflows and feature-specific grant restrictions retained.
- Automated fixtures are not live DDB/VTT acceptance. Help recipients and incoming enemy attacks use the announced rules; no automatic remote token effects are claimed.

# WayBeyond20 Changelog

## v1.73.23 stable release on 2026-10-25

Project-owner-authorized publication of the verified coding candidate. Numeric
version remains 2.20.155. Executable/runtime bytes are unchanged from the live
tested development build; release documentation was promoted and rebuilt.
Live Roll20 verification covered two real character capability sets, attack/hit/
AC/Draining, immediate and deferred damage, repeat protection, turn reset,
Flurry/native Focus/Hand of Harm and restoration. All 33 verification commands
passed, including the standard suite, eight supplemental commands, all 22
isolated browser files and both builds; 72 compiled JavaScript syntax checks
passed. Scope limits are stated in README and release notes. Earlier entries
below describe historical development candidates and their evidence at the time.


## v1.73.23 release preparation on 2026-10-25

Numeric identity remains 2.20.155; executable bytes are unchanged from the
tested development build. Public documentation was reconciled for preparation.
Standard npm tests, supplemental resource and turn checks, all 22 isolated
browser files, both builds and compiled syntax checks passed. Live Roll20
verification exercised a full character attack, confirmed outcome and AC,
managed damage/Draining, deferred damage/repeat protection and turn reset.
No new full live Foundry/Forge or TaleSpire acceptance is claimed. The optional
secondary lifecycle remains default off; full creature and anonymous native
dice convergence remains incomplete. Prepared, not published.


## v1.73.23 - Invalidated input-handler guard, 2026-10-24 (local coding candidate)

Numeric2.20.155; PATCH only, unpublished. Pointer/click/keyboard/context-menu
capture handlers now return before swallowing an event when their extension
context is invalidated. The common combat handler uses the same guard for old
hover/menu callbacks. This prevents an orphaned instance from intercepting input
intended for a newly loaded instance. Earlier versions' already-orphaned handlers
still require one sheet refresh; a new guard cannot patch their closed-over code.

Live1.73.22 acceptance: initial unrefreshed-context icon opened its pane without
preflight. Agent refreshed the sample character's sheet directly, then full icon, Advantage menu
and hit-only number each reached the correct off-turn preflight. All cancelled;
no roll, currency, HP, AC or target change. This establishes the .22 handoff on a
fresh sheet and supports stale context as a contributor; it does not retrospectively
prove .21 would have passed with a refresh or identify every earlier failure.

A two-instance browser regression invalidates the first registered context while
its listeners remain attached, then installs the active instance. Prior installer
swallows the active input (red); guarded installer routes full/numeric/keyboard/
context-menu input once to the active instance (green). Direct orphan hover/menu
entry is rejected before row handling. Existing handoff and icon suites retained.

## v1.73.22 - Owned attack-pane request, 2026-10-24 (local coding candidate)

Numeric2.20.154; PATCH only, unpublished. The1.73.21 icon repair did not pass its
live preflight check. Combat icons, numeric dice, hover shortcuts and menu/keyboard
activation now normalize their intent into one owned pane request. The normal
document observer resumes that request only when the existing native property
parser finds attack data. It then calls the existing execute/builders and shared
attack lifecycle. Combat no longer depends on shared quick-roll flags, a fixed
50ms continuation, or the missing ct-available-actions CSS class.

The request is claimed before execution, may rebind a uniquely equivalent React
row, and cancels on stale identity/route/path/turn/disconnection or unrelated user
input. New intent replaces an unperformed request; one bounded expiry prevents
later accidental activation. No polling, resource logic or second attack engine
was added. Non-combat legacy quick rolls retain their existing machinery.

The real parser/observer fixture fails against1.73.21 (executes before delayed
properties arrive) and passes the new request. Item/action/spell executor choice,
full/hit/damage/versatile flags, mutation churn, row replacement, stale/cancel,
supersession and expiry are covered. VM flag-normalization tests now mock the UI
handoff boundary explicitly; actual pane behavior is tested in the browser suite.
Disconnection also safely cancels a pending request when the observer argument is
absent. Live verification is deferred at the owner's instruction; no reload requested.

## v1.73.21 - Full-attack icon pane handoff, 2026-10-24 (local coding candidate)

Numeric2.20.153; PATCH only, unpublished. Full-attack icons now queue their
existing executor after the outer click completes. Previously pointer-down could
open a pane which native outside-click dismissal removed before its continuation.
The shared right-click menu and keyboard activation use the same guarded icon
handoff. Numeric dice retain their interception. Character/connected-row/name
guards remain, and no second attack/rule executor is added.

The browser regression composes a native listener registered before the extension,
synchronous delegated pane opening and the real observer/executor. Previous
installer fails; deferred entry passes normal click, explicit menu mode, keyboard,
single routing and changed-character/disconnected-caller cancellation. the sample character's
1.73.20 detail-pane chain and both legacy/modern Zombie shared-entry rolls passed
live; the1.73.20 icon remained inconsistent. This repair still requires live check.

## v1.73.20 - Secondary stat-block attack entry, 2026-10-24 (local coding candidate)

Numeric2.20.152; PATCH only, unpublished. The default-off secondary attack setting
now covers stat-block and Extras attack requests through the same lifecycle as
character attacks. Fresh stat-block parsing, form riders, custom dice, hotkeys,
critical arrays, actor identity and privacy still come from their existing modules.
Explicit local context retains destination-owned hit handling and no inferred
parent target/currency owner. Display-only trait cards do not start attacks.
Anonymous native dice remain unmigrated. This is an incremental entry migration,
not completed feature/resource/AC parity for creatures. Ancestors remain available.

Offline tests compose actual Monster/MonsterExtras producers, shared lifecycle and
real sendRoll. Seven actor/form configurations match ancestor outgoing requests;
repeated operation, stale actor/destination, privacy cancel and transport failure
checks prevent extra dispatch. Live character Fangs on1.73.19 passed attack14,
confirmed test Hit/AC<=14, damage5 and THP5 with both cards visible in Roll20;
THP0/AC??/currencies restored and refresh verified. Stat-block live acceptance
requires loading this candidate; automated comparisons do not establish it.

Shared sendRoll accepts an optional local ownership guard and checks it again
after privacy/advantage queries. Character dispatch and the stat-block adapter
both supply their current-context check. It is never serialized. A composed
regression using the previous transport sends after a destination change (red);
the repair prevents that send and the character's Action spend (green).

## v1.73.19 - Header Manage forwarding and control recovery, 2026-10-24 (local coding candidate)

Numeric2.20.151; PATCH only, unpublished. Manage previously clicked its hidden
native control synchronously, letting the outer proxy click dismiss the native
pane immediately. It now shares Rest's deferred, path/connection-guarded native
forwarding helper. Isolated outside-click regression fails before and passes
after. Live old-build Manage failed; Short Rest and Long Rest opened correctly
without confirming either. Copied injected Manage/Rest boxes are recognized by
nonserialized listener markers and rebuilt, including Correction. Native controls
stay in their original parents; selected sheet styles and layout remain unchanged.
Header tests cover theme, keyboard, fresh native controls, copied injected boxes,
repeated reconciliation, both rests, Correction and changed-character rejection.
Remaining live checks await Chrome releasing its extension-UI automation block.

## v1.73.18 - Shared damage award ownership, 2026-10-23 (local coding candidate)

Numeric2.20.150; PATCH only, unpublished. Roll20 and Foundry return handlers now
honor waybeyond20-await-hit, the same ownership flag honored by the shared
renderer. The sheet continuation owns the complete damage and rider total; its
rendered VTT card must not infer another Draining Attack award from effect text.
A composed regression runs the real classifier, workflow and both return handlers:
it produced two extra callbacks before correction and zero afterward. Unmanaged
destination-resolved requests still return damage. No change to feature eligibility,
roll destination, counters or hit decisions. Live acceptance awaits extension reload.

## v1.73.17 - Stop Combat observer loop and recover replaced target controls, 2026-10-23 (local coding candidate)

Numeric2.20.149; PATCH only, unpublished. Combat tooltip refresh previously called
jQuery.text on unchanged content, replacing its text node and waking the document
observer, which scheduled the next refresh. A real-browser observer test reproduced
12 bounded self-triggered refreshes before correction; it settles after comparing
the text before writing. TaleSpire distance text uses the same guard.
 The target panel now recognizes copied
markup whose render signature survived but whose handlers did not. It rebuilds
the controls and preserves attack/damage drafts, damage type and disclosure.
Same-signature clone regression fails before and passes after. Normal reconciliation,
rapid Undo, keyboard and theme checks remain covered. This fixes a demonstrated
lifecycle weakness; exact cause of the first live Undo failure is still unproven.
The full-row shortcut handoff failure remains open. No attack-route promotion.

## v1.73.16 - Settings button survives header replacement, 2026-10-23 (local coding candidate)

Numeric2.20.148; PATCH only, unpublished. Sheet Settings clicks use a namespaced
delegated document handler, scoped to desktop/tablet/mobile headers. Previously,
the handler lived on the original group while the injector skipped setup if an
icon remained; cloned/replaced header markup could retain the icon without the
handler. Regression reproduced red before and passes after. Repeated observer
updates do not duplicate opens; creature controls keep their own handler.
Ordinary Quick -> Full settings, Advanced, close/reopen and compact-header checks
pass in isolated browsers. This is a confirmed lifecycle defect, not proof of the
exact cause of every reported live failure. No settings/resource migration.

## v1.73.15 - Secondary character attack workflow, 2026-10-23 (local coding candidate)

Numeric2.20.147; PATCH only, unpublished. Advanced option "Test secondary character
attacks" defaults OFF. Existing character workflow stays available; creature
stat blocks and unclaimed native digital dice keep their current routes.

Opt-in workflow owns actor/caller/destination/target context, serialized hit
choices, immediate/deferred damage and once-only continuations. Shared damage,
Smite, Elemental and feature modules accept its dispatcher without re-entering
the old attack entry. Shared native resource/grant helpers remain authoritative.
Hit/Miss/Skip are distinct; the selected kept attack result controls criticals.
Definite non-natural-1/20 results update the captured target's AC history without
changing selection. Actor, combat/source and destination guards prevent delayed
work being applied to a newly selected character/board. Requests keep existing
privacy and destination protocols; diagnostic context is not serialized.

Automated and isolated-browser evidence is recorded separately. Live DDB/VTT
acceptance is still required before promoting a caller or removing old routes.

## v1.73.14 - Foundry registration trust stays on its origin, 2026-10-23 (coding update)

Numeric2.20.146; PATCH. Ian's review of 1.73.13: onTabsUpdated refreshed the cached tab
snapshot (title and URL), and the live query then compared the new URL with itself, so
a one-time-activated tab that moved to another Foundry origin and changed title kept
receiving rolls. Registrations now carry a fixed wb20TrustedOrigin separate from the
refreshable title/URL; a refresh that crosses origins drops the registration. Composed
onTabsUpdated -> query -> send test added; same-origin renames still route.

## v1.73.13 - Foundry destinations are live tabs only, 2026-10-23 (coding update)

Numeric2.20.145; PATCH. Ian's review of 1.73.12: the live-tab helper returned cached
registrations whose tab id still existed, so a tab that navigated away from Foundry could
still receive a roll (and report found). Destinations are now only freshly validated live
Foundry tabs, the cache is replaced with them, and a registration vouches only for the
origin it was made on. Tests cover empty cache, renamed world, same-id navigation, closed
tab, activation on its own vs a new origin, and Roll20 limits.

## v1.73.12 - Foundry routing survives the idle service worker, 2026-10-23 (coding update)

Numeric2.20.144; PATCH. The MV3 service worker sleeps after ~30 s idle and loses the
in-memory fvtt_tabs list; Foundry content scripts keep running but sendMessageToFVTT
found no tabs until a re-registration, so rolls returned "Virtual Table Top Not Found"
and native spell casts "could not complete". sendMessageToFVTT now queries live tabs
(registered tabs plus permitted Foundry-titled tabs, with a fresh permission read),
as sendMessageToRoll20 already did. Found live (Mira, the sample character, Foundry 14.369).
Regression in tests/fvtt-lifecycle.js.

## v1.73.11 - rolls reach the selected Foundry world, 2026-10-23 (coding update)

Numeric2.20.143; PATCH. background.js stored a Foundry tab snapshot at registration,
before WB20 appends the world name to its title, and never updated it; filterVTTTab
compares that title with the selected "This World", so every roll failed with "Virtual
Table Top Not Found" while a specific Foundry world was selected. addFVTTTab now replaces
the snapshot and onTabsUpdated refreshes it on title changes. Found live (Mira, the sample character,
the test world, Foundry 14.369). Regression in tests/fvtt-lifecycle.js.

## v1.73.10 - Correction attack pools and target selection, 2026-10-22 (coding update)

Numeric 2.20.142; PATCH only, unpublished. Correction names the standard pool
"# of Attacks (standard)" and shows its feature-derived maximum. Haste attack
actions and current feature grants remain separate pools with their own maxima.
A sheet target choice takes precedence over the existing TaleSpire pick event,
including after a stale settings snapshot; a new explicit board pick still works.
Focused automated/browser regressions cover these paths; live acceptance pending.

## v1.73.9 - VTT takes over after a sheet initiative roll, 2026-10-22 (coding update)

Numeric2.20.141; PATCH. 1.73.7 source guard ignored VTT turn reports whenever any
other combatSource was active, including WB20's local "D&D Beyond Initiative" combat
started by rolling initiative on the sheet, so Roll20/Foundry turns were ignored after
the usual initiative roll. Guard now blocks only another VTT (Roll20/Foundry/TaleSpire).
Found live on Foundry 14.369 (Mira). Regression in tests/fvtt-lifecycle.js.

## v1.73.8 - Foundry page script loads, 2026-10-22 (coding update)

Numeric2.20.140; PATCH. src/common/constants.js computed CHANGELOG_URL with
chrome.runtime.getURL at load; constants.js is in the Foundry page-world bundle, where
chrome.runtime is undefined, so fvtt_script threw before registering anything (present
since the v1.62 fork; Roll20 page bundle excludes constants.js). Guarded; background
behaviour unchanged. Regression in tests/fvtt-lifecycle.js (red on old code). Mira, found
live on Foundry 14.369 during integrated testing. No publication.

## v1.73.7 - Foundry return integration and quiet disconnection, 2026-10-21 (coding update)

Numeric2.20.139; PATCH only per the owner's release-only MAJOR/MINOR policy. WB20-0072 adapter
by Mira with shared receiver integration by Ian. Unshipped1.74.0 label corrected before Dev.
Foundry combat hooks (no polling) feed the existing waybeyond20-turn-update envelope tagged
source Foundry; token binding on initiative; Draining-style damage return; quiet effects-update
consumer; hook teardown on reinjection; relay allowlist. Hidden combatants never reach
players; hidden token positions never exported. Foundry 14: positions read from the saved
source (x/y lag until the move animation finishes in background tabs); roll privacy uses
core.messageMode (core.rollMode is null) and explicit public mode; self rolls whisper to
self. tests/fvtt-lifecycle.js. Live v14.369 checks in 12. No publication.
Shared receiver honors Foundry source, isolates Foundry bindings/turn state from Roll20,
preserves counters on destination switching and rejects nonselected source updates.
Offline TaleSpire status/controls stay quiet; unconfigured roll output falls back locally
without claiming VTT delivery. Tests cover offline poll/pick/link and board isolation.

## v1.73.6 - shared resources and Correction, 2026-10-21 (coding update)

Numeric2.20.138. WB20-0081: one resource interface for turn currency, feature
counters, numeric pools, slots, turn uses and granted attacks. Shared dispatch
checks costs, serializes activations and commits after performance; cancellation
and failure commit nothing. Native ownership stays exact. Correction edits only
changed amounts, verifies native saves, checks stale snapshots and keeps30local
history entries excluded from outgoing character settings. No remote upload.
Feature consumers moved from monk.js to feature-activations.js: no class-level
permission gates, separate Focus ledger or first-use setup. Formula inputs may
still reference the class level specified by a feature. Existing native pools
win; unknown counts are not guessed. Partial Flurry grants persist/resume only
within their original turn, with costs and Mercy replacements retained.
Native duplicate Unarmed Strike Action/Bonus rows resolved safely. Simple live
additional-Action wording grants separate currency retaining Magic exclusions;
uninterpreted restrictions are not converted to unrestricted Actions. Ordinary
Attack actions, Extra Attack, feature grants and one-attack Haste stay separate.
Default-on presentation switches do not disable shared processing. Correction
and feature prompts follow native themes. Campaign icons centered and native
white-path overrides corrected for light themes. Automated only until live gate.
Not a universal rule interpreter or implementation of all supplied subclasses.
No publication, public ZIP, tag or commit.

## v1.73.5 - native-themed, right-aligned header refinement, 2026-10-21 (coding update)

Numeric2.20.137; PATCH only. Shared sheet-theme sampling supplies surface,
foreground, accent and decorative frame, including attribute-only theme changes.
Campaign/name have tight dividers; bottom icons are Maps left, Game Log center,
builder right, without visible captions or moving native React controls.
Header controls right-align, retaining a bounded TaleSpire fallback column.
No rest completion, gameplay/resource change or publication.

## v1.73.4 - compact desktop character header, 2026-10-21 (coding update)

Numeric2.20.136; patch-only coding revision per the owner's version rule. One visual
Manage/WB20/Share panel; Rest menu forwards only to native Short/Long Rest pane
openers. Stacked campaign/Maps VTT/Game Log panel matches its height; dedicated
TaleSpire status column. Native React nodes stay in their parents; redraws
re-resolve current controls. Existing WB20 click/hover, rest confirmation and
small-screen native controls preserved. Keyboard/Escape/outside-click support.
No class, VTT, battle or resource behavior added; no publication.

## v1.73.3 - unpublished coding update; numbering correction, 2026-10-21

Numeric2.20.135. the owner clarified that MAJOR/MINOR change only for publication;
between releases all coding updates increment PATCH. Last published1.73.2;
premature unpublished1.74.x/1.75.x/1.76.x labels are superseded, not releases.
Their entries below describe historical work under the labels used at the
time. No published Git tag, asset, release or download is changed. Current work
includes TaleSpire and Monk/Mercy candidates with their documented live gates;
broader Monk/Fighter references are queued, not implemented. Feature work is
paused while correcting metadata. No new feature scope added by this correction.

## v1.76.1 - Disciplined Survivor death saves, 2026-10-21 (local candidate)

Numeric2.20.134. PATCH after1.76.0 local Dev sync: the existing manually built
death-save roll now includes revised Monk14+ proficiency once; remembered
failed-save rerolls retain death-save type. No native character/battle changes.

## v1.76.0 - 2024 Monk / Mercy controls, 2026-10-21 (local candidate)

Numeric2.20.133. MINOR; patch reset. Revised-Monk-only activation handlers,
native-pane Flurry/Bonus Unarmed Strike grants, Mercy healing replacements,
post-hit Harm/Stunning, Empowered Strikes, explicit WB20 Focus pool, once-per-
turn/rest use ledgers, confirmed-rest recovery and initiative recovery.
Deflection reduction/redirect calculator, Evasion calculator, failed-save
reroll and utility controls. Passive/character-building stats stay DDB-owned.
No duplicated proficiency/ASI/AC/speed bonuses. No automatic enemy saves,
other-creature HP/conditions, carried-mini movement or learned condition expiry.
WB20 Focus is separate from native DDB Focus. Live Monk acceptance pending.
Fighter/subclass references received; not implemented. TaleSpire checklist
interrupted by new class scope; native snapshot received but zero exposed minis,
so mini linking/initiative/distance remain unaccepted. Not published.

## v1.75.0 - TaleSpire board return feed, 2026-10-21 (local candidate)

Extension2.20.132 / companion1.1.0. MINOR, patch reset. WB20-owned authenticated
loopback helper, explicit mini-ID link scoped by campaign, native initiative
read feed, board target picker, 3D distance with sub-board checks. Separate
TaleSpire per-board counters/notes preserve Roll20 state. First observation,
duplicate, reconnect, pause and board switch do not reset spent counters.
Explicit turn-following toggle: saved queue is not assumed active combat.
No native HP/turn-order/movement/ownership writes. Helper currently requires
Node.js and runs locally only. Live acceptance and distribution packaging pending.

## v1.74.1 - TaleSpire dice detail display, 2026-10-21 (local candidate)

Extension version 2.20.131; companion 1.0.1. PATCH correction to the result
handoff: preserve actual supported die faces and modifiers in TaleSpire's
native result breakdown instead of sending only the final number. WB20 still
resolves all rules and dice once. No native physics reroll. Retain exact
total/formula fallback for unsupported roll structures; validate detailed
arithmetic against the resolved total before display. Live acceptance pending.

## v1.74.0 - TaleSpire result connection, 2026-10-21 (local candidate)

Extension version 2.20.130. MINOR for an optional new destination; patch resets.
Uses official Symbiote URL messages and native result display, without a local
server or DLL. WB20 resolves once, preserving its ordinary follow-ups and
resource path. Private rolls use GM-only chat; no public result API for whispers.
Separate companion installation, copied native connection prefix, bounded
validated payloads and replay suppression. No HP/initiative/target/3D dice sync.
Automated checks and live acceptance are recorded separately; not published.

## v1.73.2 - Proficiency and saving-throw sync, 2026-10-21 (local candidate)

Extension version 2.20.129. PATCH. Recognizes DDB's accessible proficiency
labels as well as tooltip wording; writes native 2014 skill proficiency and
expertise fields using the sheet's checkbox expressions. Copies displayed
saving-throw totals and proficiency into native and wb20_* macro attributes.
Unknown/missing data is not treated as zero. No combat or resource changes.
Regression tests pass; live macro retest pending extension reload. Not published.

## v1.73.1 - 2014 Roll20 sheet fields, 2026-10-20 (local candidate)

Extension version 2.20.128. PATCH. Writes the 2014 sheet's displayed ability
scores and modifiers, proficiency bonus, AC, speed, passive Perception, skill
bonuses, and vision attributes in addition to the `wb20_*` macro fields. A
2014 sheet may not run its sheet workers when attributes are created from the
VTT page, so base scores alone are insufficient. Live DDB-to-Roll20 delivery
worked after confirming and saving the opt-in switch; native 2014 fields await
the next extension reload and live acceptance. Not published.

## v1.73.0 - Optional DDB to Roll20 core-data sync, 2026-10-20 (local candidate)

Extension version 2.20.127. MINOR. Adds an opt-in Roll20-only transfer of DDB
ability scores, skill bonuses, passive scores, senses, proficiency bonus, AC
and speed. The values are exposed as `wb20_*` Roll20 attributes for macros.
Supported 2014 sheets also receive base ability scores; a loaded 2024 sheet
receives ability-score, AC and sense entries in its native store. Name matching
must be unique; uncertain senses are not cleared. No spells, inventory,
features, HP or combat state are imported by this new path. Automated checks
pass; live Roll20 2024 sheet and Wren-macro acceptance remain unverified. The
new setting is off by default. This candidate is not published.

## v1.72.4 - Preserve combat during Roll20 loading, 2026-10-20 (not published)

Extension version 2.20.126. PATCH. Live Roll20 refresh zeroed the WB20 turn
number and refilled a spent Reaction without changing initiative. The producer
now waits while the editor loading overlay/document is loading or campaign/page
data is unavailable. Unknown/malformed order data is not an ended battle. A
loaded empty order still ends combat. New real-producer/real-receiver regression
reproduced the premature end before the fix and passes afterward, covering
spent resources, own-turn resets, duplicates, refresh, target retention and
genuine end/restart. Live full rotation passed on 1.72.3; original order and
counters restored. Live acceptance of the loading correction awaits reload.

## v1.72.3 - Immediate target edit feedback, 2026-10-20 (not published)

Extension version 2.20.125. PATCH. Live 1.72.2 still missed the second Undo in
both orders. Target edits now reconcile from synchronous in-memory state before
the next gesture is aimed, rather than waiting for the storage callback. The
existing save queue and pressed-pointer guard remain unchanged. Expanded browser
regression covers delayed paint before pointerdown as well as during a press;
both orders, keyboard and cancellation pass. Live acceptance awaits reload.

## v1.72.2 - Rapid target Undo, 2026-10-20 (not published)

Extension version 2.20.124. PATCH. Defer target-panel DOM updates while a pointer
is pressed; release, cancellation or window blur resumes the existing refresh.
Prevents a shortened history/page from moving the second button between press
and release. No save-queue changes: real writer tests already preserve both
Undo orders with delayed storage and reversed broadcasts. Browser regression
reproduces the lost click before the fix and passes after, including keyboard,
cancelled gestures and unchanged economy. Live acceptance awaits reload.

## v1.72.1 - Attack handoff and target drafts, 2026-10-20 (not published)

Extension version 2.20.123. PATCH: do not debounce a pending roll indefinitely
under frequent DDB mutations; use canonical pane classes and bind ordinary
icon handoffs to the selected name/owner too. Keep target input nodes across
record, initiative and resource updates. Patch saved summaries/history in place;
retain focus, draft values, damage type and disclosure. Clear submitted fields
immediately, not during the later refresh. Different targets receive clean fields.
Both new regressions fail before and pass after. Live acceptance awaits reload.

## v1.72.0 - Manual Roll20 token linking, 2026-10-20 (not published)

Extension version 2.20.122. MINOR for the new compatible Link My Token menu
control, PATCH reset. Choose one existing turn-order token without rerolling
initiative. Replaces both stored binding fields, not combat state or any Roll20
data. Current ID or unique matching name is preselected but requires explicit
confirmation. Duplicate names display IDs; stale choices and character changes
are rejected, Cancel is inert. Rendered regression and existing distance/economy
checks pass. Live binding/distance acceptance awaits reload.

## v1.71.2 - Keep Combat below the sheet, 2026-10-20 (not published)

Extension version 2.20.121. PATCH: reconcile wrapper placement on the existing
debounced DDB update path, before the unchanged-state early return. Move the
existing tracker rather than recreating it, including when the preferred host
changes. Preserve focused controls and scroll position. Stable updates do not
reorder the wrapper. Regression recreates native content appended after Combat,
verifies unchanged state/input/compass identity, and checks observer settling.
Local verification is separate from live acceptance after extension reload.

## v1.71.1 - Compass text clearance and distance diagnostics, 2026-10-20 (not published)

Extension version 2.20.120. PATCH: lower/wider rim clears the side names without
changing header height or their tilt. Regression samples the rendered SVG curve
against the text bounds for Swarm of Quippers names. Missing distance now gives
the concrete input failure, including map scale, coordinates, layer or token
identity. This does not claim the live numeric distance failure is fixed.
Live 1.71.0 Select Target, Viewing/return and unchanged173.78px height passed.
the sample character and every enemy in this test initiative order were GM-layer tokens.
Approved temporary the sample character Tokens-layer self test still showed unavailable;
there is an additional unresolved cause. No numeric distance acceptance yet.

## v1.71.0 - Compass targeting and distance, 2026-10-20 (not published)

Extension version 2.20.119. Compatible new target preview/distance capability;
MINOR increment resets PATCH. Select Target chooses the centered token by ID.
Browsing heading is Viewing; a small return arrow restores the current turn.
Floating hover/focus/tap details show initiative, recorded AC, gross damage
and type subtotals, plus straight-line center-to-center map distance. No new
permanent row or height. No automatic collection of other players' damage.
Roll20 exports only token-layer position/map scale fields for turn-order
tokens. Position changes send an update without changing turnKey, resetting
economy or reopening manually ended combat. Ambiguous/missing own-token or
different-page positions show unavailable. Position-only updates preserve
preview, target selection and unfinished inputs. Refresh both tabs after reload.
Browser fixture and geometry/receiver tests pass. Live gate pending reload.

## v1.70.2 - Shared compass front curve, 2026-10-20 (not published)

Extension version 2.20.118. the owner's annotated visual replaces the individual
ovals with one wide front curve. Current name 18px, receding side names,
filled curved arrows. Removed center ellipse/ticks. No extra header height.
Responsive layout, browsing/reset and scroll-preservation fixture passed.

## v1.70.1 - Reverse compass tilt, 2026-10-20 (not published)

Extension version 2.20.117. Reversed side-name rotateY and rotateZ directions
at the owner's request. No center, layout-height, behavior or resource changes.
Live 1.70.0 shows correct neighbors and one-row toolbar; browsing verification
was interrupted by this visual correction. Do not claim live browse acceptance.

## v1.70.0 - Interactive turn compass, 2026-10-20 (not published)

Extension version 2.20.116. MINOR for the compatible turn-order browser; PATCH
reset. Centered compass shows previous/current/next by Roll20 token identity
and order, with perspective side names, curved arrows and sheet accent color.
Side buttons browse without changing any combat/target state; Back to current
returns to the active combatant. Real turn changes reset preview. Repeated
refreshes do not trigger continuous animation; reduced-motion disables reveal.
Source and turn number remain at far right. Responsive and functional fixture
checks pass; live compass acceptance awaits reload. Compact 1.69.2 verified live.
Target information is centered. Back to current replaces the small caption,
not a new row. Local long-page tests verify stable header height and scroll
position while browsing, returning, and receiving an active-token change.

## v1.69.2 - Compact Combat layout, 2026-10-20 (not published)

Extension version 2.20.115. Resources and My Target/New Turn/End Combat now
share one wrapping toolbar. Target information is a horizontal row underneath
inside the same themed frame, with on-demand Damage & history. Removed forced
240px height and side-by-side target panel. Target state is preserved across
Combat rerenders; theme-only refresh retains unfinished input. Local regression
checks desktop single-row controls, target placement, 320-1200px widths, Haste,
long target names, AC/damage persistence and End Combat cleanup. Live compact
layout awaits reload. Previous 1.69.1 native theme verified live on the sample character.

## v1.69.1 - My Target sheet theme, 2026-10-20 (not published)

Extension version 2.20.114. My Target reuses Combat's native sheet theme and
frame instead of following OS dark mode independently. Select-menu surfaces
match the sheet. Decorative edges have a safe inset; theme-only updates retain
focused inputs. Local light/dark theme and responsive layout regression passed.
Live theme acceptance awaits reload. Fresh battle names and initiatives passed
live on 1.69.0: Zombie 1 = 18, the sample character = 10.17. No counters or turns changed.

## v1.69.0 - Typed formula parts and My Target, 2026-10-20 (not published)

Extension version 2.20.113. MINOR for compatible new features, PATCH reset.
Custom typed brace groups preserve each type's complete formula and the global
fallback; shared renderer shows type subtotals and one total without rerolling.
My Target uses the existing Roll20 token list plus initiative, with persistent
per-target AC observations (attack total, Hit/Miss, Undo), and manual gross
damage entries by type. AC follows the owner's narrowing sequence without a qualifier.
No native HP writes or economy spending from target controls. Responsive panel.
All core/regression and representative browser-fixture tests pass; Chrome and
Firefox builds syntax checked. Live acceptance pending reload, not published.

## v1.68.0 - Automatic descriptions and advanced custom dice, 2026-10-20 (not published)

Extension version 2.20.112. MINOR for expanded compatible custom-roll features;
PATCH resets to zero. Missing descriptions for remembered visible selections
load in a bounded batch without casting. Native identity and interruption
guards remain; cached text is reused, failed attempts do not loop endlessly.
Manage's Automatic label is now Use detected category with the detected result.
Custom grammar adds kh/kl/dh/dl, once-only ro<=N rerolls, minN group totals,
decimal constants and standard damage-type labels. Limits: 100 base dice and
240 characters; no scripts, variables, exploding dice or general arithmetic.
Formula note uses the owner's final wording: Your dice formula will be shown with
the result. No special disclosure or forced public roll; privacy is unchanged.
Roll20 custom requests bypass prose substitution to preserve full notation.
Roll20 handles each reroll term; Foundry translates combined group minimums.
Deterministic local totals and transport translation tests pass, not live VTT
acceptance. Custom damage type is a result label, not automatic HP application.

## v1.67.4 - Empty native sidebar guard, 2026-10-20 (not published)

Extension version 2.20.111. Inspection of the sample character's closed sidebar showed a
full-width, zero-height portal retained in the DOM. jQuery :visible treats its
width as visible, so the broad portal guard blocked description loading.
Guard the visible native sidebar header instead. Native-shaped zero-height
portal regression failed before this fix and passes afterward. Existing
open-sidebar protection still passes. Includes all 1.67.3 presentation changes.

## v1.67.3 - Quiet spell defaults and clean selectors, 2026-10-20 (not published)

Extension version 2.20.110. PATCH for quick-list presentation and defaults.
Only Attack/Damage and Healing categories default visible; Manage explicitly
enables other groups while preserving hidden choices and character isolation.
Closed selectors display only the name. Expanded choices retain source/level
so multiclass and upcast variants remain distinguishable. Transparent idle
borders reveal on hover or keyboard focus without changing geometry.
Hover text uses cached, exact-identity native descriptions, not inferred text.
Selecting an uncached spell reads its native details without casting and returns
to Actions; existing sidebars/dialogs are not disturbed. Hover never navigates.
Missing descriptions are honestly labeled. Local tests are not live acceptance.
Live 1.67.2 Starry Wisp now produced attack 11 and radiant damage 1, then returned
to Actions. No VTT was connected, so delivery is not verified.

## v1.67.2 - Cantrip pane label ordering, 2026-10-20 (not published)

Extension version 2.20.109. PATCH: native cantrip pane identity checks all
level/school items for the exact Cantrip label, rather than assuming it is first.
Observed school-first markup failed a new regression before correction and
passes afterward; source and level mismatch cases still reject. No resource
or casting rules changed. Corrected cantrip activation awaits live reload.

## v1.67.1 - Wait for native spell-tab transition, 2026-10-20 (not published)

Extension version 2.20.108. PATCH for the asynchronous tab handoff correction.
Live discovery left the sheet on Spells. The shared visit helper checked active
tab state before React committed the switch, exited early, and skipped restoring
Actions. Wait for that transition within the existing bounded loop; still stop
when the user navigates elsewhere. Delayed-render regression failed before the
fix and passes afterward. Live casting and corrected restoration await reload.

## v1.67.0 - Universal spell quick list and Manage, 2026-10-20 (not published)

Extension version 2.20.107. MINOR for compatible new capabilities; PATCH resets.
Categories use live native timing/effect metadata, not class-specific spell lists.
Each category/timing group remembers its spell/source/casting-level selection.
Other is the classification fallback; Manage can correct categories. Longer
casting has explicit time and purple border, not the gray free-action meaning.
Initial discovery briefly visits Spells and restores Actions; native filters
limit discovery. Casting re-resolves the exact native entry and uses existing
spell execution/resource ownership, restoring the prior tab.
Manage hides/restores entries without editing native features or equipment.
Custom lines support validated simple dice plus optional A/BA/Reaction cost;
no arbitrary code, dynamic variables, slot/feature spending, riders or HP writes.
Identical native entries share visibility. Preferences are per character.

## v1.66.17 - Clearer Opportunity Attack dialog and legend help, 2026-10-20 (not published)

Extension version 2.20.106. Presentation only: stacked labeled attack, roll mode,
and turn fields; concise Reaction cost; longer rules behind a closed disclosure.
Color legend titles explain each cost, including gray's trigger/resource limits.
Keyboard focus and accessible descriptions added. No change to turn prompts,
eligibility, attack dispatch, or resource spending.

## v1.66.16 - Natural melee Properties guard, 2026-10-20 (not published)

Extension version 2.20.105. Live1.66.15 reached rollAction after the handoff
fix, then failed in applyGWFIfRequired on undefined Properties. Normalize that
optional field to empty text, never infer Versatile/Two-Handed. Browser fixture
now uses the real helper and an action pane without Properties; failed before
the guard, passes afterward. No live roll or resource spend occurred.

## v1.66.15 - Default Opportunity Attack and brighter green, 2026-10-20 (not published)

Extension version 2.20.104. Finish the prompt event before opening the native
attack pane, preventing a closing/outside click from dismissing it. Adds a
per-character default after a successful explicit melee choice. Row reads live
name/range/hit/damage; icon uses default, Choose different Attack reopens chooser.
Right-click uses the standard attack-mode menu. Unknown turn still prompts.
Missing/ambiguous matches fail back to choosing, not an arbitrary substitute.
Action borders and legend now use vivid #00a83b; Free/Special stays gray.

## v1.66.14 - Opportunity Attack native rerender handoff, 2026-10-20 (not published)

Extension version 2.20.103. A live chooser attempt stopped without rolling or
spending. Reproduced a silent cancellation when native detail opening replaces
the selected list row. After opening, validate the character/turn and matching
pane instead of requiring the original row to survive. Added a failing-then-
passing browser regression. Live acceptance must still be checked.

## v1.66.13 - Gray Free/Special borders, 2026-10-20 (not published)

Extension version 2.20.102. the owner requested gray instead of black to improve
distinction from green Actions. Shared Free/Special color is now #808080 for
icons, hover/focus treatments and legend. No gameplay changes.
Blood and Bone's chooser uses Target / Hit Die on two deliberate lines.
Notes die shortcuts use identical text-sized widths with four-pixel side
padding and no fixed minimum; retain wrapping and the phone HP Die label.
Live Opportunity Attack acceptance remains pending: browser control requires
an update to the ChatGPT Chrome extension. No character counters changed.

## v1.66.12 - Opportunity Attack and paid grants, 2026-10-20 (not published)

Extension version2.20.101. Add Reaction-row melee/Unarmed Strike chooser
with reach and roll mode, using native attack builders. Reaction buys one
attack, not an Action or Extra Attack. Bounded grants isolate character/turn,
guard duplicate dispatch, and pay only on success. Agile uses an already-paid
grant. Deferred off-turn hits cannot later offer Bonus Action Smite.
Live rule-granted reactive spell replacement checks casting time and retains
native spell-resource accounting, including non-damage/save spells. Player
confirms trigger/single target/slot timing; ambiguous rider rules require
review. General multi-attack producers and complete rules enforcement remain
open. Fangs/Claws reuses the native Unarmed Strike icon without replacing its
clickable wrapper. Offline checks pass; live acceptance follows reload.

## v1.66.11 - Consistent talent row presentation, 2026-10-20 (not published)

Extension version 2.20.100. Correct the missing separators and inconsistent
spacing on added talents. View beside Sort offers Standard (default, dotted
separators) or Compact (no lines, less spacing). Persist per character,
preserve columns/font/button sizes and gameplay, and restore native layout
when the combined list is disabled. Keyboard/outside-click dismissal and
stale-character guard included. Live acceptance follows reload.

## v1.66.10 - Blood and Bone columns, 2026-10-20 (not published)

Extension version 2.20.99. Restore Range 5 ft Touch, Hit/DC --; Damage has a
Target Hit Die button (HP Die on phone-width screens) opening the existing
Use chooser. Notes holds d4/d6/d8/d10/d12 shortcuts to existing controls.
Wrap buttons within Notes. Sort by actual range, not a Hit Die label.
Includes tested off-turn Attack-action pool and Bonus Action availability
corrections plus internal bounded attack-grant foundation. Opportunity
Attack UI, spell substitution and complete rider integration remain unfinished.
No new Opportunity Attack capability is claimed in this patch.

## v1.66.9 - Talent category subtitles, 2026-10-20 (not published)

Extension version 2.20.98. Help Ally for Bardic Inspiration, Heal Ally for
Blood and Bone; remove redundant cost subtitles from added rows. Native
attack descriptions remain untouched. Category typography copies native
attack meta-item styling (live sample: Roboto Condensed 10px/400, 10px line
height, normal capitalization). No new targeting or gameplay constraints.

## v1.66.8 - Blood and Bone shared-row choices, 2026-10-20 (not published)

Extension version 2.20.97. Replace the empty shared-row cells and generic
Use note with d6 / d8 / d10 / d12 buttons in Range / Hit-DC / Damage / Notes.
Forward to existing die controls; preserve the left Use chooser, native
details, disabled state and character ownership. No new rules/resource path.
Hit Die choices do not become sortable attack damage or numeric range.

## v1.66.7 - Native action-label typography, 2026-10-19 (not published)

Extension version2.20.96. the sample character's live computed styles confirm native labels
use Roboto Condensed14px/400 with14px line height; Blood and Bone inherited
Roboto13px/400 and added Inspiration usedRoboto13px/700. Match the native
label's computed family/size/weight/line-height/letter-spacing, without copying
spell-specific italics or changing handlers/resource accounting. Guard writes
so repeated mutation refreshes remain inert; fixture checks equality and churn.
More Options code is unchanged. Original transition passes the isolated fixture
and the owner confirms it loads in an unconnected duplicate tab. The blank connected
tab is not a demonstrated defect in that transition; speculative change removed.

## v1.66.6 - Classify before on-hit routing, 2026-10-19 (not published)

Extension version2.20.95. A regression reproduced late unarmed classification
skipping the hit-confirmed continuation when no other follow-up flag existed.
Normalize shared attack semantics before the continuation decision; enforce
Draining Attack's explicit Natural Attack prerequisite. No Agile-specific
trigger or attack-name condition added. Differently named unarmed attacks
award once after hit/damage, never on a miss. Existing VTT award suppression
remains. This defect is verified, but the player's earlier symptom is not
claimed fully explained or live-fixed. Includes1.66.5 shared-row merge.

## v1.66.5 - Merge Agile Strikes with its attack, 2026-10-19 (not published)

Extension version2.20.94. the owner confirmed Bardic Damage is the Agile Strikes
attack. When both native entries exist, link the original rules from that
attack's Notes and omit the empty feature shortcut. Preserve native label,
range, to-hit, damage, black border, handlers and sort values. Keep the feature
shortcut if its attack is absent. No changes to attack execution or accounting.
1.66.4 columns and compact Sort verified live on the sample character; this merge is a new
correction with separate reload acceptance.

## v1.66.4 - Shared feature rows and compact Sort, 2026-10-19 (not published)

Extension version 2.20.93. Completes the combined-list correction: Bardic
Inspiration uses native columns; die and uses belong in Notes. Adds shortcuts
for non-attack features rendered in the native action sections, deduplicated
against existing attack rows. Supported existing Use controls are reused;
otherwise shortcuts open native details, without invented execution/spending.
Compact Sort opens Action order, Name, Damage and Range. Sort choice persists
per character and is shown only in the open menu. Damage compares displayed
primary formula averages, Range normal range; missing values sort last.
No automatic spell-list import. Manage visibility/selected spells/custom
formula entries are recorded follow-up scope, not implemented in this build.
Automated acceptance precedes reload; live acceptance remains pending.

## v1.66.3 - Responsive Actions header, 2026-10-19 (not published)

Extension version2.20.92. Consolidates the native attacks-per-action count,
colored action-cost legend and right-aligned sort control into a wrapping
toolbar. Adapts to panel width, not screen size or manual spacer characters.
Native count updates are reflected; missing values are not invented.
No roll, resource or sort behavior changes. Live acceptance pending.

## v1.66.2 - Combined action rows, 2026-10-19 (not published)

Plain version label per the owner's naming clarification. Previously labeled
1.66.1-dev.4 locally; label/documentation-only change, no executable change.

Extension version 2.20.91. One visually combined list, default Action / Bonus
Action / Reaction order, with per-character alphabetical sorting. Native nodes
are not moved or duplicated. Border colors indicate cost separately from sort
affinity; Bardic Damage stays with Actions with a black free/special border.
Left-side Bardic Inspiration icon reuses the existing Inspire button, including
disabled state. Default-on per-character layout switch. Offline tests pass;
live acceptance pending. No resource/attack accounting changes in this layer.

## v1.66.1-dev.3 - Immediate full-attack menu, 2026-10-19 (not published)

Extension version 2.20.90. Corrects the dev.2 interaction requirement mismatch.
- The row icon and red attack button share an anchored Advantage / Flat (One Die) / Disadvantage menu. Only Roll Full Attack starts the existing attack sequence and preflight warnings.
- Opening, selecting, dismissing, or cancelling options spends nothing. Stale character/sidebar targets cannot roll. Explicit mode is request-local, including when a hotkey is held.
- Native numeric dice menus and saved recipient settings are unchanged. Dev.2's later Ask each time dialog was not equivalent to this behavior. New live acceptance remains required.

## v1.66.1-dev.2 - Attack icon and native pool confirmation, 2026-10-19 (not published)

Extension version 2.20.89. Compatible bug-fix candidate; live validation pending.
- Attack icon right-click or keyboard context menu opens the existing roll-mode chooser. Its request does not change saved roll preferences or affect the next ordinary click.
- Smite discovery no longer navigates before attack/hit resolution. After weapon damage, it returns to the original tab before showing choices. Native resource accounting may still briefly mount its controls.
- Lay on Hands commits the native pool's staged adjustment with its own Confirm control, verifies acknowledgement, and refuses to commit pre-existing manual edits.
- Free Smite replay repair from dev.1 passed one live DDB-only attack/damage/Smite/Efreeti sequence. Reporter-specific and live VTT confirmation remain open.

## v1.66.1-dev.1 - Smite resource replay, 2026-10-19 (not published)

Extension version 2.20.88. Compatible bug fix; patch candidate.
- Free Paladin's Smite accounting no longer re-enters the native Cast/Use listener as a second spell cast. The content fallback and cross-context direct-cast replay use the same button-scoped marker.
- A fresh player Cast/Use click is still handled normally. Replay markers are removed in finally, including when the native click throws.
- New offline Chromium integration reproduces the failure on prior source and passes on the fix. Live confirmation of the reported sequence is still required. Lay on Hands persistence remains unresolved; no pool ownership change.

## v1.66.0 - Portent Dice and sheet improvements, 2026-10-18

Extension version 2.20.87. Compatible new capability; minor-version increment.

- Character-local Portent pool, completed Long Rest replacement, selection, confirmation and reversible opt-out.
- Optional category thresholds use known modified totals; bonus dice are not predicted.
- Numeric d20 replacement preserves modifiers and natural critical behavior; cancelled/failed dispatch does not spend a die.
- Compact WB20 button, native-themed Portent/Combat panels and decorative-frame spacing.
- Persistent Musician reminder; shared-page guards prevent repeated rest handling and duplicate windows.
- 18 regression suites and two isolated Chromium fixtures pass. Live sheet/settings layout, rest refresh, tracker spacing and Musician dismissal pass. Live Portent VTT output and Foundry are not claimed.
- Known double-Smite report remains unresolved and deferred, not fixed. Other creatures' Portent rolls are table-managed; turn enforcement requires known tracker state. Divination Savant spell selection is not automated. Existing Lay on Hands persistence remains open.

## v1.65.16 â€” Prompt reliability and attack order, 2026-10-14

Extension version 2.20.82. Includes the internal-only 1.65.15 ordering repair.

- Overlapping questions share a queue, preserving each popup's title, form and answer.
- Confirmed attacks show weapon damage before optional Smite and Elemental Strike; deferred damage uses the same continuation.
- Existing cancellation, exactly-once resource use, Savage Attacker and Draining handling remain covered by regressions.
- All 17 automated suites pass. D&D Beyond-only Ask-each-time live testing covers full hit/weapon/Divine Smite/Efreeti sequence, four choices, separate elemental totals, resource changes and cancellation.
- The recorded late d8 corresponds to weapon damage, not a replacement Efreeti formula. Exact original overlap trigger remains unknown; the title/body defect is independently reproduced with the actual dialog library.
- Existing Lay on Hands pool persistence and saving-throw damage-only accounting limitations remain. Foundry and broad critical/Draining live coverage are not claimed.
- Public version classification and separate numeric build identity are now documented under Semantic Versioning and Chrome's manifest rules.

## v1.65.14 â€” Concentration and native spell casting, 2026-10-13

Extension version 2.20.80. Full release collecting internal builds 1.65.11â€“1.65.13; those were not separate public releases.

- Damage entered while concentrating opens the editable Concentration Check window, including temporary-HP damage. Unmodified is the default; selecting a damage type opts into known unconditional defenses. Add source combines damage components for one check, without deducting HP again.
- The actual Constitution save result maintains or ends the tracked concentration effect. Cancellation, missing results and failed execution preserve it.
- Native spell-list Cast/Use buttons enter the existing spell flow and mark the selected native slot or daily use once after casting. No class or named-spell gate was added.
- Utility spell cards no longer ask for advantage. Targeted buffs support Other creature, retaining caster concentration without granting the caster the other creature's bonus.
- DEFENSES and BUFFS share a compact header; buff names appear beneath, right-aligned in the native sheet font.
- All 17 automated suites passed. Live Chrome/D&D Beyond/Roll20 testing covered attack spells, save/damage spells, healing, utility, self/other buffs, daily Use versus slot Cast, cancellation, double clicks, HP/temp-HP concentration triggers and resolved save outcomes.
- Limitations remain: conditional defenses are manual; sidebar slot/item-charge controls are not covered by the spell-list bridge; upcast/ritual/temp-HP spell branches have automated but not equivalent live acceptance. Existing Lay on Hands pool persistence and saving-throw damage-only accounting limitations remain. Foundry testing was excluded.

## v1.65.10 â€” Attack follow-ups and one-click attacks, 2026-10-12

Extension version 2.20.76. Stable release collecting internal builds 1.65.6â€“1.65.9; those internal versions were not separate public releases.

- The red-bordered attack icon runs the existing full attack; clicking the name still opens its description. Keyboard activation and hover/focus styling are supported.
- Qualifying attacks show their result before Hit / Miss confirmation and optional Smite spending. Miss skips on-hit damage/resources without refunding the attack.
- Divine Smite completes before the four-choice Elemental Strike prompt. Its existing Channel Divinity cost is preserved without an additional Bonus Action.
- Savage Attacker offers a post-damage reroll of the weapon package only, once per tracked turn including after declining. Critical dice and versatile alternatives stay in their own weapon packages; Smite and other riders are not rerolled.
- Automatic damage no longer leaves a misleading Roll20 damage link. Genuine deferred links resume the original attack once through its character sheet.
- Draining Attack's managed path waits for confirmed hit and final primary-target damage, after a Savage Attacker decision; second-target damage is excluded.
- All 16 automated suites passed. Live Chrome/D&D Beyond/Roll20 checks covered one-click and keyboard attacks, Hit/Miss, both Smite fuels, Elemental Strike, automatic/deferred damage, and Savage Attacker reroll/decline/turn reset and two-handed damage. Critical/Draining combinations have automated coverage, not full live acceptance. Foundry connection testing was excluded.
- Remaining limitations: Lay on Hands pool persistence, concentration browser prompts, saving-throw damage-only resource accounting, and deferred links requiring the original sheet to remain open without refresh.

The historical sections below retain their original build-specific status; the summary above supersedes their pending statements for the tested paths.

## v1.65.9 â€” local test candidate, 2026-10-12

Extension version 2.20.75. Both Roll20 rendered-card formats now suppress the extra damage link when automatic follow-ups already manage damage. Deferred and ordinary attack-only links are preserved. Not published.

## v1.65.8 â€” local test candidate, 2026-10-12

Extension version 2.20.74. Corrects attack-icon button spacing: centered icon, square border, rounded corners and a clear gap before the name. Styling-only correction; attack behavior unchanged. Not published.

## v1.65.7 â€” local test candidate, 2026-10-12

Extension version 2.20.73. Not published.

- Click the red-outlined attack icon to start the same full attack as the sidebar WayBeyond20 button. Hover/focus highlights it; Enter/Space are supported. Names still open descriptions.
- Reuses existing attack, damage, hit-confirmation and optional follow-up handling; no second attack engine or changed eligibility rules.
- All 16 automated suites and both builds passed. Live Chrome/Roll20 checks passed for the shortcut, Hit/No Smite damage, keyboard activation and Miss without damage. Broader follow-up acceptance is not implied.

## v1.65.6 â€” local test candidate, 2026-10-11

Extension version: 2.20.72. Not published or live-accepted.

- Applicable attack helpers wait for the attack result and a Hit answer before offering Smite. Miss/Skip does not refund the attack or spend on-hit resources.
- Divine Smite performs before the existing Elemental Strike chooser. The selected rider uses one Channel Divinity, with no additional Bonus Action or spell slot.
- Optional post-damage Savage Attacker uses the existing eligible weapon rows, retains the higher weapon package, and suppresses repeated offers within a recognized turn. Smite/elemental damage is not rerolled.
- Deferred damage continues through the originating character sheet without repeating the attack or its costs. Keep that sheet open. A Savage Attacker replacement result replaces weapon damage rather than adding another damage instance.
- All 16 automated suites and both platform builds pass; Chrome/DDB/VTT live acceptance remains pending.

Documentation reconciled 2026-10-10. Latest published release: v1.65.5 / 2.20.71. Version sections describe their own releases, not current outstanding bugs. v1.65.4 was an internal build; its roll-mode fix shipped publicly in v1.65.5. Known current limitations: Lay on Hands pool persistence, concentration browser prompts, saving-throw damage-only resource accounting, and Draining Attack hit confirmation. Final v1.65.5 live acceptance remains unrecorded; automated/build/package checks passed on 2026-10-04.

## v1.65.5 â€” Lay on Hands allocation correction

Prepared: October 4, 2026

Extension version: 2.20.71

Based on: Beyond20 2.20.1

Published October 4, 2026. This stable patch corrects the Lay on Hands chooser introduced in v1.65.3; it is not the first shared release of that interface.

### Fixes

- **Lay on Hands starts unallocated.** Opening the window no longer silently selects Healing, preallocates the entire pool in the preview, or disables Purify Poison before the player has chosen an option.
- **Healing defaults to one point when appropriate.** A full-health target is not presented with an automatic full-pool allocation; the player explicitly chooses the amount and can adjust it with the controls.
- **The public package and documentation now agree on the stable patch version.** The Chrome extension is 1.65.5 / 2.20.71; 1.65.4 was an internal emergency build and is not a public release.

## v1.65.3 â€” Rules corrections and the Lay on Hands window

Prepared: October 4, 2026
Extension version: 2.20.69
Based on: Beyond20 2.20.1

Corrections drawn from the 2024 rules, each checked against the published text before it was coded.

### Fixed

- A Versatile weapon's one-handed damage die rolled the two-handed die. The die you click is now the die you roll.
- Breath Weapon offered a smite. Smites are cast after hitting with a melee weapon or an unarmed strike; a breath weapon is a saving throw with no attack roll.
- A weapon attack rolled from an item spent no Action. Making the attack is what costs the Attack action, wherever it was clicked.
- Elemental Strike's second creature had its damage folded into the main target's totals. It is reported on its own.
- Finishing a long rest left expired effects standing. Effects shorter than the rest end, concentration ends, and longer effects are kept. Arming the rest button no longer resets anything before confirmation.
- Declining a smite was offered as "Cancel", which read as calling off the attack. The buttons now read Add Smite and No Smite, and declining never affects the attack.

### Added

- Action types. One Action buys the whole Attack action, so Extra Attack no longer asks for a second Action, and features that replace one of your attacks draw from the same pool.
- A Lay on Hands window. One touch and one bonus action: choose Healing, Purify Poison, or both, watch the pool total update as you allocate it, and confirm on yourself or another creature. The 5 points spent on Purify Poison restore no hit points. Nothing is spent unless the roll is sent.
- A per-character switch for the Lay on Hands helper, default on.

### Known limitations

- D&D Beyond does not record changes to the Lay on Hands pool, so the number returns on reload. Other behavior has recorded tests, but this statement does not certify every current live path.

## v1.65.2 â€” Resource accuracy and dispatch safety

Prepared: September 15, 2026

Extension version: 2.20.68

Based on: Beyond20 2.20.1

This release is for group testing. It collects the v1.65 work and two rounds of corrections found in live play.

### Fixes

- **Named uses are spent on the right counter.** A feature's use is matched to its own row on the sheet. Earlier builds could mark a neighbouring counter instead, for example spending a Breath Weapon use for a Channel Divinity option, or a Bardic Inspiration use for an ordinary attack. An ordinary attack with no limited use of its own now changes nothing. A counter whose row title includes the ancestry, such as "Breath Weapon (Fire)", is matched correctly.
- **Paladin's Smite is marked used.** After a Divine Smite paid for with the free Paladin's Smite cast, D&D Beyond shows the row as used instead of leaving it available.
- **Spell-slot smites spend the chosen slot** even when the Elemental Strike follow-up changed sheet tabs first.
- **A roll that cannot be sent spends nothing.** If the extension was reloaded or updated while a D&D Beyond tab was open, a roll from that stale tab used to consume Channel Divinity, spell slots or uses without reaching the VTT. Such a roll now reports failure, spends nothing and asks you to reload the tab.
- **Simultaneous updates no longer overwrite each other.** An attack made while hidden now both clears the Hidden effect and spends the Action; a concentration spell cast in combat both spends the Action and keeps its Concentration tracking.
- **The Smite check returns you to your tab.** Looking for prepared smites briefly opens the Spells tab; you are now returned to the tab you started on, including when you have no smite, no fuel, or you cancel.
- **The Combat window no longer draws on the Character Builder.**

### Changes

- **Elemental Strike** (Oath of the Noble Genies) offers Dao's Crush, Djinni's Escape, Efreeti's Fury and Marid's Surge as four single-click buttons with the cost shown, and Cancel keeps the Smite without spending Channel Divinity. Each option can also be used on its own from the Actions list, and the native feature text on the sheet is left intact.
- **Draining Attack** qualifies on the native Unarmed Strike and on the Agile Strikes follow-up, not only on natural weapons, and raises Temporary HP only when the new total is higher.
- **Helper switches are per character.** Turning a helper off on one character leaves your other characters alone.

### Known limitations in that historical release

- **Lay on Hands does not respond.** Its healing-amount box uses a browser prompt that Chrome suppresses when the window is not in front, and the action then stops with no message. A replacement interface is being built.
- **The Concentration check helper** uses browser pop-ups and can fail the same way. It also runs only when you click the CONCENTRATION badge.
- **Smite is offered on Breath Weapon.** D&D Beyond reports Breath Weapon's range as "Reach", so the Smite prompt appears on a saving-throw action. Cancel it; a rules-accurate trigger is coming.
- **A weapon attack rolled from an item does not count the Action** in the Combat window. Attacks listed as actions do.
- **Rolling only a damage die** on a saving-throw action such as Breath Weapon does not spend its use or Action; use the action's own roll button.
- **Draining Attack cannot tell a hit from a miss** when damage is rolled automatically with the attack, so it awards Temporary HP either way. A confirm-the-hit flow is being built.

## v1.64.1 â€” Prepared smite discovery correction

Prepared: September 12, 2026

Extension version: 2.20.65

Based on: Beyond20 2.20.1

### Correction from v1.64

- Replaces the fixed Divine Smite/Thunderous Smite list with discovery of the character's currently prepared or Always Prepared D&D Beyond spell rows whose names contain **Smite**.
- Caches that small prepared-smite list and invalidates it when a spell is prepared or unprepared, when the character changes, or when relevant spell resources change.
- Builds spell-slot fuel choices from the character's currently available slots and keeps Paladin's Smite legal only for Divine Smite.
- Uses each discovered row's own damage, damage type, save, and description data where D&D Beyond exposes it.

This is a corrected prerelease for group testing in D&D Beyond and Roll20. The v1.64 two-spell implementation should not be used as the generalized behavior.

## v1.63 â€” First Shared Release

Prepared: September 11, 2026  
Extension version: 2.20.63  
Based on: Beyond20 2.20.1

This is the first WayBeyond20 release intended for the gaming group. Earlier version numbers were internal development and packaging checkpoints, not supported public releases.

### Upgrades from Beyond20

- WayBeyond20 identity, branding, private ZIP distribution, installation guide, and a WayBeyond20-owned packaged update page.
- Quiet passive character synchronization, safer roll interception, and protection against duplicate listeners, pollers, and self-triggering observer updates.
- Correct D&D Beyond Game Log labels, local and Digital Dice result handling, and combined critical-damage Game Log results.
- Live parsing of D&D Beyond feature and spell text for activation, duration, concentration, targeting, and effect information.
- Ordered weapon-damage packages and destination-specific dice-formula handling.
- Persistent character-side effects, concentration replacement, Buffs and Concentration displays, manual effect ending, AC adjustments, speed adjustments, Haste mechanics, and dispatch-safe Stealth Advantage.
- A local Combat Window with Movement, Action, Bonus Action, Reaction, Haste Action, New Turn, End Combat, automatic activation-cost spending, and resource warnings.
- Roll20 token binding, turn-order synchronization, target discovery, combat-resource resets, resolved-damage callbacks, and protection against spending another open character sheet's off-turn Action or Bonus Action.
- Persistent class-derived Hit Dice pools, manual controls, automatic spending, and Long Rest reset handling.
- Triage Expert: Bedside Manner and Blood and Bone support.
- Natural-weapon-only Draining Attack qualification and higher-only Temporary HP application.
- Bardic Inspiration native-use spending and a compact feature card.
- Dazzling Footwork Advantage handling and automatic Agile Strikes attack selection.
- Correct Roll20 Savage Attacker handling that compares two complete base weapon-damage formulas.
- Use Magic Device scroll spellcasting support.
- Complete settings display and an optional bounded diagnostic log with copy and clear controls.

### Paladin support completed for v1.63

- Native limited-use checks and post-dispatch spending, including shared Channel Divinity pools and Breath Weapon uses.
- Lay on Hands healing-amount selection and native healing-pool spending after dispatch; the five-point cleansing actions use the same pool.
- Oath of the Watchers: Watcher's Will sends only its own feature text, spends Action and Channel Divinity, and tracks one minute of Advantage on Intelligence, Wisdom, and Charisma saving throws.
- Oath of the Watchers: Abjure the Extraplanar sends only its own feature text with the live Wisdom save DC and spends Action and Channel Divinity.
- Oath of the Noble Genies: Dao's Crush, Djinni's Escape, Efreeti's Fury, and Marid's Surge use the shared Channel Divinity pool and preserve their distinct after-Smite effects.
- Oath of the Noble Genies: Elemental Rebuke adds the Charisma modifier to its 2d10 damage, supports Acid, Cold, Fire, Lightning, or Thunder, includes its Dexterity save, spends Reaction, and marks its native use.
- Oath of the Noble Genies: Noble Scion spends a Bonus Action, marks its native use, and tracks its ten-minute flight/Minor Wish reminder.
- Defensive and utility spells now provide **Cast on VTT** as well as **Display**, so effects such as Shield of Faith can enter the normal activation and effect-tracking flow.

### Complete dated feature register

`WayBeyond20-Feature-Register.md` is the readable, authoritative comparison with Beyond20. `WayBeyond20-Feature-Register.csv` is the internal operational register with DateStarted, DateCompleted, Status, source/build/Chrome/Roll20 verification fields, and notes. Historical dates that were not recorded are explicitly marked **Not recorded** rather than reconstructed by guesswork.

### Installation

Extract `WayBeyond20-chrome-v1_63.zip`, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted `WayBeyond20` folder containing `manifest.json`.

Disable the standard Beyond20 extension while using WayBeyond20 so the two extensions do not create duplicate controls or rolls. Complete instructions are included in `README.txt` inside the release folder.
