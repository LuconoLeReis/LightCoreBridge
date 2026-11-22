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
