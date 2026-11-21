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
