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
