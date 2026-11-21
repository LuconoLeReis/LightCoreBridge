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
- This is the requested2014-style Initiative treatment in the existing **Bard: Jack of All Trades** setting, which defaults to enabled. Other ability-check, skill and saving-throw handling is unchanged.

## Verification and limits

All42 focused cases and the existing Initiative browser suite pass, including native clicks, rounding, existing half/full proficiency, earlier request additions, independent bonuses, repeated/concurrent checks, cancellation, stale state and tiebreakers. The full automated suite,31 spell-slot cases, healing/native Smite checks, Chrome/Firefox builds and84 compiled JavaScript syntax checks pass. Independent offline review reran the42 cases, Initiative suite and31 slot cases. These checks use disposable fixtures; no new installed gameplay acceptance is claimed.

Numeric totals cannot reveal every bonus component. Localization or changed native proficiency labels may require confirmation. Spell-slot limits retained from108: free native spells labelled Cast rather than Use and Pact Magic pool selection are unverified on real sheets. Central Discord authentication and automatic shared-state sync remain separate development and are not included.

## Spell-slot reminder

Every LightCore spell roll button, including spell-list to-hit dice and Actions-tab spell attack dice, shares the108 slot accounting. **Do not also mark the slot pip by hand.** Successful slot-funded casts spend once at the selected level; canceled/failed dispatches and separate damage rolls do not acquire another charge.

## Update in place

Finish pending rolls and update between games. Extract the Chrome ZIP and use the inner **WayBeyond20** folder containing manifest.json. Back up the folder Chrome currently loads, replace its contents in place, wait for copying/Dropbox sync, reload LightCore Bridge on chrome://extensions, then refresh character/VTT tabs. Keep the same loaded path and extension installation to retain settings. This is a manual unpacked update, not a Chrome Web Store automatic update.
