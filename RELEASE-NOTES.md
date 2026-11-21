# LightCore Bridge 1.73.112 candidate

Browser build **2.20.244**. Owner-directed Initiative-only final proficiency guard. No other ability-check, skill or saving-throw behavior changes. Not published or staged.111 was not published.

The proficiency check runs at the end of Initiative preparation, immediately before dispatch. Existing native proficiency and an already-applied request effect are preserved. A request-local guard prevents repeated or concurrent processing from applying Jack of All Trades more than once. Independent bonuses and the Initiative tiebreaker are retained.42 focused cases pass, including repeated/concurrent finalization, existing half/full proficiency, an earlier unlabelled addition, stale native/request provenance, and cancellation without consuming Initiative advantage. Unknown components use the existing conservative confirmation path.

---

# LightCore Bridge 1.73.111

Browser build **2.20.243**. This release adds the requested Jack of All Trades handling to Initiative, building on stable1.73.108.

## Download

- [Chrome extension ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.111/LightCore-Bridge-chrome-v1_73_111.zip) — install this package.
- [Corresponding source ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.111/LightCore-Bridge-source-v1_73_111.zip).

## Initiative and Jack of All Trades

- When the character owns Jack of All Trades and its LightCore setting is enabled, Initiative receives half the proficiency bonus, rounded down, when that bonus is not already included. For example, Dexterity+3 and proficiency+2 produce Initiative+4 when the native modifier is only Dexterity.
- This is the requested2014-style Initiative treatment. It is included in the existing **Bard: Jack of All Trades** setting, which defaults to enabled; it is not presented as a2024 erratum.
- Native half/full proficiency and expertise markers are preserved. Other unlabelled bonuses can make the components unclear: LightCore asks whether proficiency is already included, defaulting to keep the native number. The answer is remembered for the same character and calculation while the sheet remains open. Cancel sends no roll.
- Advantage, Initiative naming, Game Log audience and the optional tiebreaker are retained. The result identifies Jack of All Trades when the bonus is applied. The native sheet number and other ability-check, skill and saving-throw paths are unchanged.

## Verification and limits

The regression reproduces+3 instead of+4 on108. All25 isolated Jack-of-All-Trades cases and the existing Initiative browser suite pass, including native clicks, rounding, proficiency preservation, ambiguous bonuses, cancel/stale/concurrent requests and tiebreakers. The31-case spell-slot suite, healing/native Smite checks, full automated suite, Chrome/Firefox builds and84 compiled JavaScript syntax checks pass. Independent offline review reran the25 cases, Initiative suite and31 slot cases. These checks use disposable fixtures; no new installed gameplay acceptance is claimed.

Numeric totals alone cannot reveal every bonus component. Localization or changed native proficiency labels may require the confirmation path. The111 change does not expand automatic skill/ability classification. The existing spell-slot limitations remain: free native spells labelled Cast rather than Use and Pact Magic pool selection are not verified on real sheets. Central Discord authentication and automatic shared-state sync remain separate development and are not included.

## Spell-slot reminder

Every LightCore spell roll button, including spell-list to-hit dice and Actions-tab spell attack dice, shares the108 slot accounting. **Do not also mark the slot pip by hand.** Successful slot-funded casts spend once at the selected level; canceled/failed dispatches and separate damage rolls do not acquire another charge.

## Update in place

Finish pending rolls and update between games. Extract the Chrome ZIP and use the inner **WayBeyond20** folder containing manifest.json. Back up the folder Chrome currently loads, replace its contents in place, wait for copying/Dropbox sync, reload LightCore Bridge on chrome://extensions, then refresh character/VTT tabs. Keep the same loaded path and extension installation to retain settings. This is a manual unpacked update, not a Chrome Web Store automatic update.
