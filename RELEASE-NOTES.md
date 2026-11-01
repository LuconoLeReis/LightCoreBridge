# WayBeyond20 1.73.57

Published November 1, 2026. Browser build: **2.20.189**.

This release brings the reliability and display repairs made since 1.73.29 into one stable download. The existing five-column Actions list and shared attack/resource processing remain in place.

## Download and update

- [Chrome extension ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.57/WayBeyond20-chrome-v1_73_57.zip) — install this package.
- [Corresponding source ZIP](https://github.com/LuconoLeReis/WayBeyond20/releases/download/v1.73.57/WayBeyond20-source-v1_73_57.zip) — for source inspection, not installation.

To update without losing your settings:

1. Finish pending rolls and close your D&D Beyond and VTT tabs.
2. Back up your currently loaded WayBeyond20 folder.
3. Extract the Chrome ZIP. Copy the contents of its `WayBeyond20` folder into the **same folder Chrome already loads**. Do not remove and reinstall the extension to update it.
4. Open `chrome://extensions` and reload WayBeyond20.
5. Reopen your character sheets and VTTs. Confirm your saved destination and connection are still selected.

For a first installation, enable Developer mode on Chrome's Extensions page, choose **Load unpacked**, and select the extracted `WayBeyond20` folder containing `manifest.json`. GitHub's automatic Source code archives are not installable Chrome packages. Keep only one Beyond20/WayBeyond20 copy enabled for the same sheets.

## Rolls and VTT delivery

- **Automatic** looks for available VTT destinations and sends the same completed result to them. A confirmed delivery suppresses the extra WB20 local result; unavailable, failed or unconfirmed delivery uses local fallback, subject to your existing display/privacy settings.
- Optional VTT discovery and delivery do not hold up normal roll/action completion. A missing target list or VTT connection must not prevent an underlying attack or spell roll.
- Delivery retries do not reroll the dice or spend the action's resources again. Explicit destination and private-audience choices remain in effect.
- Worker startup waits for saved destination settings before forwarding. The wait is bounded, so an unavailable settings callback cannot leave requests queued indefinitely or replay them later.
- Foundry discovery checks current live tabs and their permitted origins instead of relying only on a sleeping worker's old tab cache.
- The native spell shortcut handoff recognizes the spell pane's own casting controls rather than waiting for weapon-only fields.

Digital dice, Game Log and local-result suppression retain their separate settings. **A missing local card alone is not proof of VTT delivery.**

## Actions list

- Keep the established **Name, Range, Hit/DC, Damage and Notes** columns.
- Range numbers are bold, with a space before smaller units and a smaller Reach/Touch label where applicable.
- Hit/DC text matches the damage value's size. Added clickable values use native-style borders and known native damage-type icons. They forward to the row's existing activation; they do not introduce another attack or damage executor.
- Identical equipped weapon copies appear once. Copies with different statistics or properties stay separate. This changes the display, not your inventory or equipment.
- Spell Notes no longer repeat Action, Bonus Action or Reaction costs already indicated by the left border. Hover/accessibility information retains the cost. Useful components and duration details remain.
- A costly material component can be indicated when the source supplies it. A per-cast label appears only when consumption is confirmed; a reusable priced component is not described as consumed.
- Added entries use the selected sheet's text colors in light and Underdark modes. Native D&D Beyond frames remain intact.

## Local results, settings and recovery

- Local results appear in a centered, nonmodal, sheet-themed panel and fade after **five seconds** by default.
- **Duration of Local Rolls display**, under **Display and privacy**, offers 3, 5, 10, 15 or 30 seconds, or **Until dismissed**. Hover or keyboard focus pauses the fade. Close, Escape or an outside click dismisses the panel without undoing a roll or resource use.
- WB20 Settings opens in a normal browser tab, with search, grouped sections and **Send rolls to** near the top.
- **Use Beyond20 mode** remains in Settings and the extension menu. The permanent page button has been removed so it cannot cover Combat or local results. Switching modes reloads supported pages and retains saved connections, dice and character resources.
- The TaleSpire connection field shows the saved link at a readable width. The installed Symbiote connection is reused across boards; you do not need a separate saved URL for each board. Keep the Symbiote open on the board you are using.
- Compact header icons use the sheet's text color, with corrected spacing and builder-icon centering. The blue dot beside Game Log is D&D Beyond's new-message indicator.

## Other reliability repairs included

- Shared character-sheet links load the appropriate sheet code; builders and unrelated pages are excluded from that recovery/startup scope.
- Filtered or incomplete Features views retain rules for features the character still owns instead of silently replacing them with a partial snapshot. Confirmed ownership removal can still prune a saved rule.
- The action-list collector preserves rows belonging to other feature modules, fixing a reproduced delete/rebuild observer loop.
- Sheet refreshes combine mutation bursts and yield to browser input. Repeated rule reads share a snapshot for the current render. These repairs address reproduced refresh problems; they do not establish the cause of every loading report.
- The Defenses/Buffs panel accommodates its expanded content and restores its native frame behavior when cleanup runs.

## What was verified

- Full automated suite, focused browser regressions, Chrome and Firefox builds, 82 compiled JavaScript syntax checks, and 40 executable manifest references passed. Recovery/fallback checks also ran with a real extension in a disposable browser profile.
- Independent review covered the final display changes and the carried worker/delivery behavior.
- Bill confirmed that fresh Calan and Rhonen sheets opened and displayed correctly after loading 1.73.57.
- Bounded live tests on a separate test character covered Actions-tab idle behavior, skill rolls, weapon attacks, Hit confirmation, damage, Smite and Elemental Strike prompts. Exactly one first-level spell slot was spent and then restored to its recorded baseline.
- With the test-board Symbiote connected, a skill roll received one authenticated receipt. An attack and its damage received exactly two authenticated receipts, one per packet, with no duplicate or additional slot spending. These are Symbiote acknowledgments after its API calls; native TaleSpire chat was not separately verified by screenshot.

Automated fixtures, independent review and live checks are distinct forms of evidence. Full live Forge coverage, every class/rules combination, and new 1.73.57 Calan/Rhonen attack tests are not claimed.

## Known limitations

- **Intermittent X/Stop-loading behavior remains under investigation.** Reopen affected sheets after an extension update rather than continuing with old injected scripts. A fresh successful load is a workaround, not proof of the complete cause.
- A `talespire://` handoff caused an automation navigation/screenshot timeout while the tested page remained complete and responsive. That observation does not establish the cause of the loading indicator.
- If D&D Beyond's digital-dice audience control is unavailable, several warnings may describe one fallback event while the action continues using the fallback dice engine. This is separate from a missing TaleSpire mini or target list.
- **Hide roll results on D&D Beyond when using Digital Dice** can suppress a local card even when VTT delivery is unavailable. Check this setting if you want the local fallback card visible.
- Old companions and late acknowledgments may leave an extra local fallback copy. Use the matching companion/helper versions for confirmed-delivery behavior.
- The combat tracker is advisory. AC estimates depend on confirmed hit/miss observations; damage history does not synchronize native enemy HP. Direct distances do not account for movement paths, cover or opportunity-attack adjudication. Native TaleSpire mini HP is not synchronized.
- English rule text, native D&D Beyond markup, VTT permissions and companion availability remain external dependencies. This release is not a claim that all game rules or remote effects are automated.

## Verified release files

| File | Bytes | SHA256 |
| --- | ---: | --- |
| Chrome ZIP | 2,435,298 | `98648e824c83a2b5af5d769511700a2d678b9ea2111c18f46f55d42c29f879e5` |
| Source ZIP | 1,859,932 | `8a5764e50d4ef691b8200f9eeaa864fcd2e1585ceada319ca333e1b5087228ab` |

Release tag: `v1.73.57`. Release commit: `a8dcc596f85a0b39f279047d1938defcc8f8d1ed`.
These notes were expanded after publication. The published ZIPs, release tag, executable code, saved settings and version numbers have not changed.
