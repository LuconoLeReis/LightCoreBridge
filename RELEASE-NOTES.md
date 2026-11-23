# LightCore Bridge 1.73.124

Pet-only filtering also hides the native Bardic Inspiration row; its special display rule no longer overrides the selected pet filter.

Extension reload lifecycle: a retired page controller stops its TaleSpire poll and leaves the replacement controller's status and buttons alone. Invalidated badge-icon lookups return safely without clearing the current icons. Refresh DDB after an extension reload.

TaleSpire combat repair: an Initiative encounter opened before the first board response now moves into the identified board state without closing the window or refreshing spent resources. The DDB status explicitly says whether turn following is paused. Companion1.1.4 remembers the player's explicit follow or pause choice separately for each campaign and board; an unfamiliar board stays paused. Reopening the panel no longer silently clears an enabled choice. This requires updating the TaleSpire companion as well as the Chrome extension. A mini list alone does not enable following.

Browser build **2.20.256**. TaleSpire combat and reload fixes, clearer connection status and Actions pet controls. Independently reviewed; representative installed checks passed on disposable characters and a test board.

Extension text no longer uses em dashes. Labels, menus, tooltips, dialog titles and messages use colons, commas or parentheses instead (for example "Find Familiar: choose a form"), and empty table cells show "--". Text read from D&D Beyond, and names you enter, are shown as written. Saved settings and tracked effects keep their identity; an item Flames effect saved by an earlier build is still recognized.

TaleSpire status holds through transient missed checks. One missed check keeps the status and buttons steady; the sheet shows "not connected" and disables the buttons only after a confirmed loss (repeated failed checks over about 3 seconds), and recovers on the next valid reply. A recovered feed after any missed check is never treated as continuous, so it cannot reset or spend turn resources.

Actions menu: the Manage, View and Sort toolbar and the cost legend row above it are centered. The Feature rules button is replaced by one toggle per active pet (a live summon or the active familiar), labeled with the pet's name. With none pressed, the player's actions come first and pet actions follow at the bottom, in the current sort. Pressing one or more pets shows only those pets' actions; releasing them all restores the combined list. Saved, unsummoned familiars do not get a toggle; the Companions library stays available. Familiar rows that spend the caster's resources keep their labels and are grouped under the familiar. Only a familiar that is present with HP above 0, or a summon with HP above 0 and active control, counts as a pet; pocketed, gone or 0 HP companions keep their rows in the player list without a toggle. While any pet is pressed, the player's feature detail text below the rows is hidden too.

Familiar touch-delivery identity is preserved through both character attack workflows, so the confirmation and familiar Reaction cost also apply to copied spell requests.

Settings search is restored when a saved familiar library is present. Uncertain familiar payment, benefits or delivery show Proceed/Cancel advisories. Reusing an existing familiar name with a different form asks before updating the saved profile.

Find Familiar now opens a form picker using DDB's creature catalog and stat blocks, including eligible CR0 Beasts and explicit additional forms in owned descriptions. Source versions remain distinct. A named summon saves a reusable profile; an unnamed summon stays generic and does not add a saved entry. Clearing the optional name keeps that remembered field blank. Appearance is cosmetic and leaves the selected form's mechanics intact. Saved definitions are separate from the single active familiar, and can be imported without summoning or spending resources.

Each completed cast rolls fresh base HP, with a minimum base of1 before the Familiar Friend bonus. Twice the caster's character level is captured at casting; reopening the card neither rerolls nor heals it. Cards retain ability scores, saves, skills, movement, senses, traits and actions from the selected stat block. The familiar's own Initiative, Action and Reaction are separate from the caster's resources. Dismiss/return and shared senses use caster resources; touch delivery consumes the familiar's Reaction only when its cast completes. Actions-menu links reopen those controls.

Familiar Friend's free Use entry pays its native use once without a slot or Material component. Slot-funded casts pay one slot; rituals pay neither. Cancel/display/failure do not create a companion or spend a cast. Helpful Friend can be armed for the next proficient skill check, confirms the familiar is within range, and pays its native counter only on an accepted roll. Existing Advantage does not spend it. Initiative, raw ability checks, saves, tools and attacks are excluded.

The remembered name and saved-profile library are browser-wide preferences; the active familiar belongs to its character. They are not a new account-sync service. DDB must provide a readable catalog/stat block. This does not automate board movement, line of sight, carried objects or DM rulings. Saved custom forms are identified separately from ordinary spell eligibility. Unrecognized extra familiar-feature effects remain reference text, not a claim of universal feat automation.

Reload the same extension installation and refresh D&D Beyond after updating. Do not also mark a slot by hand after a LightCore slot-funded cast. Pact Magic and free spells labelled Cast instead of Use retain their previously documented limits. Experimental central session-sync is not included.

## Validation and limits

Ian and Mira independently reviewed the runtime deltas and regression controls. Full automated checks, browser builds and compiled syntax checks pass. Disposable native TaleSpire checks verified previous/current/next, resource reset on the linked player turn, no reset on opponent turns or repeated snapshots, and the following preference. The source includes regression tests for first-board timing and invalidated page controllers; these controlled race fixtures are separate from native acceptance.

Native API calls still rely on TaleSpire responding. If the native API stops responding, the return feed can stall; ordinary local rolling remains available. A failed preference load retries when the companion restarts. Simultaneous instances of the same companion can race its shared preference blob. No native HP or initiative writes are introduced.

## TaleSpire companion update

This release uses companion1.1.4. In the corresponding source ZIP, find companions/talespire/WayBeyond20. Back up the installed companion, preserve its existing local-config.js and storage directory, and copy the other companion files into the existing folder. The local helper is unchanged. TaleSpire may reload the panel as files change. Enable Follow this board’s turn order once for the desired board; a saved choice is remembered for that campaign and board. A visible mini list alone does not enable following.
