LIGHTCORE BRIDGE 1.73.112 CANDIDATE
Browser build: 2.20.244

Private112 candidate: Initiative-only final proficiency guard. Not published or staged. Every other Jack-of-All-Trades path is unchanged. See RELEASE-NOTES.md.

This release repairs slot-funded spell casts made with the LightCore roll icon, including Chromatic Orb. Successful dispatch spends one slot at the selected casting level. Cancel/failure does not spend. Native Cast/Use payment, free casts, rituals and separate damage rolls remain separate. Accounting failures warn without recasting. See RELEASE-NOTES.md for verification and known limits. This applies to LightCore spell buttons, including spell-list to-hit dice and Actions-tab spell attack dice; do not also mark the slot pip by hand. Free spells labeled Cast instead of Use and Pact Magic pool selection remain unverified on native sheets.

Connect your D&D Beyond character to local tabletop play, Roll20, Foundry VTT, TaleSpire or optional Discord roll output. A VTT is not required. Existing installation, storage and protocol names are retained for compatibility.

RELEASE NOTES AND DOWNLOADS
https://github.com/LuconoLeReis/WayBeyond20/releases/tag/v1.73.111
The corresponding source includes RELEASE-NOTES.md, tests and reproducible build inputs.

NEW CHROME INSTALLATION
1. Download LightCore-Bridge-chrome-v1_73_111.zip, not the source archive.
2. Extract it. Select the inner WayBeyond20 folder containing manifest.json; Windows Extract All can add another outer folder.
3. Open chrome://extensions and enable Developer mode.
4. Choose Load unpacked and select that WayBeyond20 folder.
5. Open a fresh D&D Beyond sheet. Disable any duplicate Beyond20/WayBeyond20 extension.

UPDATE WITHOUT LOSING SETTINGS
Finish pending rolls. Back up the folder Chrome currently loads. Replace its contents in place with the new WayBeyond20 folder contents. Let copying/Dropbox sync finish, then reload LightCore Bridge on chrome://extensions and refresh character/VTT tabs. Keep the same loaded path and extension installation. Do not remove/reinstall it. Existing settings, character resources and connections are retained. This is a manual unpacked update, not Chrome Web Store auto-update.

This release adds Initiative handling to stable108 and retains its spell-slot accounting. It requires a reload after installation; it does not change a running browser until that reload. Do not interrupt a live game to reload.

WHAT CHANGED SINCE 1.73.72
Reliable attack-icon handoff and pending Roll Damages controls; combined critical/rider totals with component breakdown; named D&D Beyond Game Log results without the old attack-only/standalone-cast holds; shared Unarmed Strike calculation repairs; clearer Protected Keep Roll choice; healing-only cast and owned Life Domain feature handling; native Lay On Hands pool details; initiative display/correction and manual turn repair; theme and settings refinements.

TALESPIRE
The optional Symbiote and loopback return helper are separate from this Chrome package. They are in companions/talespire in the corresponding source/tag. Follow that README. Keep local pairing configuration private; never replace it with another user's key. Link the mini explicitly. To follow native initiative, enable Follow this board's turn order in the companion. Position/target discovery alone does not enable following. When following is paused, a manually opened Combat Window now remains open. Companion 1.1.2 uses LightCore Bridge display branding; the WayBeyond20 folder/identifiers remain compatible. Native HP and initiative are not changed by the return feed.

SUMMONED CREATURES
Live descriptions supply supported cast-level statistics. For Animate Dead, open the desired Skeleton/Zombie reference in Extras once to cache the native definition. Track an existing summon registers without recasting. Each attack click rolls one attack; multiattack count is a reminder. Control hours are manually advanced game time. Renewal retains identity and HP. Aura/condition adjudication and native companion HP synchronization can require manual handling.

VERIFICATION AND LIMITS
The stable106 baseline has independent offline reviews and bounded installed checks. Release108 adds passing isolated regression tests, build checks and independent offline review. No new installed gameplay acceptance is claimed. This does not certify every class, homebrew rule or destination. Broader two-client TaleSpire turn/position and exhaustive Foundry acceptance remain separate. After a timeout, a late native digital-dice result may be ambiguous. Audience-mismatched or incomplete Game Log groups can fall back to safe separate components. Refresh old tabs after an extension reload.

The central Discord session service, player authentication and automatic shared-state sync are still in development and are not included in this release. Existing optional Discord roll output remains separate. No experimental private mastery branch is included.

SOURCE AND LICENSES
Exact source: https://github.com/LuconoLeReis/WayBeyond20/tree/v1.73.108
Build: npm ci, npm test, npm run build. Optional browser fixtures require Playwright/Chrome; WB20_PLAYWRIGHT can specify its module.
Required LICENSE, LICENSE.MIT, third-party notices and Beyond20 attribution remain included. LightCore Bridge derives from Beyond20.
