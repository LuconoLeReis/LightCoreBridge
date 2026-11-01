WAYBEYOND20 1.73.57
Browser build identity: 2.20.189

Modified from Beyond20: https://github.com/kakaroto/Beyond20/
Project: https://github.com/LuconoLeReis/WayBeyond20

INSTALL IN CHROME
1. Download the separately named Chrome ZIP from the release Assets.
2. Extract it. Open chrome://extensions and enable Developer mode.
3. Choose Load unpacked and select the extracted WayBeyond20 folder containing
   manifest.json. Do not select the ZIP or its parent folder.
4. Keep only one Beyond20/WayBeyond20 copy enabled for these sheets.

UPDATE WITHOUT LOSING SETTINGS
1. Back up your existing loaded WayBeyond20 directory.
2. Finish pending rolls, then close D&D Beyond and VTT test tabs.
3. Replace the contents of the SAME loaded directory with the new WayBeyond20
   folder contents. Do not Remove/reinstall the extension as an update.
4. Reload the existing extension on chrome://extensions, then reopen your sheets
   and VTTs. Existing pages retain old scripts until refreshed or reopened.
5. Confirm your saved destination and connection are still selected.

Published November 1, 2026. Full current release notes:
https://github.com/LuconoLeReis/WayBeyond20/releases/tag/v1.73.57

WHAT CHANGED
- Automatic sends completed results to available VTTs. If delivery cannot be
  confirmed, the completed result appears locally instead of aborting the roll.
  Digital dice and Game Log choices retain their own display settings.
- Local results use a centered nonmodal panel, with a five-second default fade.
  Set Duration of Local Rolls display under Display and privacy. Hover/focus
  pauses fading; Close, Escape or an outside click dismisses. Recovery remains
  in Settings and the extension menu; no permanent page button covers controls.
- Added action rows retain Name, Range, Hit/DC, Damage and Notes columns. Range
  numbers/units/Reach/Touch follow native styling; Hit/DC uses damage text size.
  Added roll values have borders and known damage icons. They use the same
  existing row activation; damage values are not a separate damage-only executor.
- Identical equipped weapon copies appear once. Different stats or properties
  remain separate. Native inventory, weapon ownership and controls are retained.
- Spell Notes omit redundant action-cost text. The left icon border and hover
  help carry the cost. Notes retain useful native details and can indicate a
  costly component; /cast appears only when the native text confirms consumption.
- Settings open in a normal browser tab. Campaign controls and ordinary WB20
  dialogs follow the selected sheet theme. Native DDB frames remain intact.

COMBAT AND RESOURCE LIMITS
The tracker is advisory. Missing VTT/target information does not prevent the
underlying roll. Overrides remain explicit. A completed action spends once;
retrying delivery must not repeat the roll or spend. If a native counter write
fails, reconcile it using Correction rather than repeating the action.
Attacks shows queued attacks / attacks granted by a standard Attack action.
It does not count unactivated extra Actions. New Turn does not advance a VTT's
native turn order. End Combat does not end the VTT's native battle.
AC is an estimate from confirmed hit/miss observations, not a native enemy stat.
Damage history is not automatic enemy-HP synchronization. Distances are direct
measurements, not movement-path cost, cover or opportunity-attack adjudication.

KNOWN LIMITS AND TROUBLESHOOTING
- Intermittent loading after extension updates remains under investigation.
  Close/reopen affected sheet tabs after updating; do not keep stale injected
  pages running. A fresh successful load does not establish the complete cause.
- If WB20 interferes, use Use Beyond20 mode from Settings or the extension menu.
  Saved connections, dice and character resources are retained. Supported pages
  reload to remove WB20's injected engine; restore WB20 from the same menu.
- Roll20, TaleSpire and Foundry use different companion/permission mechanisms.
  A successful tab match alone is not proof that a result was displayed.
  An old companion or late acknowledgment may produce an extra local fallback.
- TaleSpire's saved Symbiote link identifies the installed Symbiote connection;
  it is not a separate link for every board. The optional local return helper
  supplies board/mini/target data. Native mini HP is not synchronized.
- If native digital-dice audience controls are unavailable, several warnings may
  describe one fallback event while the action continues. The existing Hide roll
  results on D&D Beyond when using Digital Dice setting can suppress a local card
  independently of delivery. A missing local card alone is not delivery proof.
- Full live Forge acceptance and every class/rules combination are not claimed.
  English rule text and DDB markup remain external dependencies.

VALIDATION
Full automated and focused browser/recovery checks, Chrome/Firefox builds and
independent review passed. Bill accepted fresh Calan/Rhonen load/display. Bounded
live test-character checks covered attacks, damage, one slot spend/restoration
and authenticated TaleSpire receipts (not native-chat screenshots). These are
not full live Forge or every-class acceptance.

LICENSE AND SOURCE
LICENSE and LICENSE.MIT accompany this modified distribution; preserve both.
The corresponding source and version history are provided with release v1.73.57:
https://github.com/LuconoLeReis/WayBeyond20/releases/tag/v1.73.57
GitHub's automatic Source code ZIP is not the installable Chrome package.
