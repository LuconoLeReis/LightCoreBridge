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
