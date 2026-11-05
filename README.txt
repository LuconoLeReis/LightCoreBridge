LIGHTCORE BRIDGE 1.73.72
Browser build: 2.20.204

LightCore Bridge is the new name for WayBeyond20. Connect a D&D Beyond character to local tabletop play, Roll20, Foundry VTT, TaleSpire or optional Discord output. A VTT is not required.

RELEASE NOTES AND DOWNLOADS
https://github.com/LuconoLeReis/WayBeyond20/releases/tag/v1.73.72
See RELEASE-NOTES.md in the corresponding source for the full scope and known limits.

NEW CHROME INSTALLATION
1. Download LightCore-Bridge-chrome-v1_73_72.zip, not GitHub's automatic Source code archive.
2. Extract into your desired parent directory. The archive contains one WayBeyond20 folder. Windows Extract All can add a ZIP-named outer folder; select the inner WayBeyond20 folder containing manifest.json.
3. Open chrome://extensions and enable Developer mode.
4. Choose Load unpacked and select that WayBeyond20 folder.
5. Open a fresh D&D Beyond character sheet. Do not run a second Beyond20/WayBeyond20 copy alongside LightCore Bridge.

UPDATE WITHOUT LOSING SETTINGS
Finish pending rolls and close character/VTT tabs. Back up the folder Chrome currently loads. Replace its contents in place with the new WayBeyond20 folder contents. Reload LightCore Bridge on chrome://extensions, then reopen your sheets and VTT tabs. Do not remove/reinstall the extension or change its loaded path. Saved character resources, connections and legacy compatibility identifiers are retained. This is a manual unpacked update, not a Chrome Web Store automatic update.

COMPANIONS
Supported live summon descriptions supply cast-level statistics and creature-specific Actions. Animate Dead uses native Skeleton/Zombie reference definitions: open the desired reference in DDB Extras once to cache it. Track an existing summon registers a creature without casting again. Click the action icon to roll; click its name or Notes to manage HP, control hours, uses or End tracking.

Renewal retains identity and HP. Control hours are manually advanced game time. Each attack click rolls one attack; multiattack count is a reminder. Initiative, position, aura eligibility, target-condition application and native companion HP synchronization are not automated. Missing templates preserve normal casting through Continue without tracking.

LOCAL RESULTS AND RECOVERY
Automatic sends the same completed result to available VTTs and falls back locally when delivery is unavailable, subject to existing display/privacy settings. Optional delivery does not delay completion or spend resources twice. Settings opens in a normal tab. Use Beyond20 mode is available there for recovery.

Old tabs can retain stale scripts after reloading the extension. Close/reopen sheets after updates. Intermittent loading indicators remain under investigation; no universal loading fix is claimed. Digital-dice audience warnings can accompany fallback dice while play continues. Digital-dice hide settings can suppress a local card; older companions or late acknowledgments can leave an extra local copy.

SOURCE AND LICENSES
Corresponding source: v1.73.72 at https://github.com/LuconoLeReis/WayBeyond20
The source includes build inputs and tests. Build with npm ci, npm test and npm run build. Optional browser tests require Playwright and Chrome (WB20_PLAYWRIGHT may specify the module).
Required LICENSE, LICENSE.MIT and third-party notices are included. LightCore Bridge derives from Beyond20; the original project's attribution and applicable licenses remain intact. The retained WayBeyond20 folder, protocol and storage names preserve compatibility.
