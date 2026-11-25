LIGHTCORE BRIDGE 1.73.125
Browser build: 2.20.257

START HERE: INSTALL OR UPDATE
https://lightcore-bridge.lucono.chatgpt.site

DOWNLOAD
https://github.com/LuconoLeReis/LightCoreBridge/releases/latest/download/LightCore-Bridge.zip

FIRST-TIME INSTALL
1. Create a permanent folder called LightCore somewhere convenient, such as Documents or your Desktop.
2. Save LightCore-Bridge.zip in that folder.
3. Right-click the ZIP and choose Extract All. Change the destination to the existing LightCore folder. Do not accept a new LightCore-Bridge subfolder.
4. After extraction, manifest.json and the other extension files should be directly inside LightCore, beside the ZIP.
5. In Chrome, open chrome://extensions and enable Developer mode. Click Load unpacked, select LightCore and click Select Folder.
6. Open or refresh your D&D Beyond character sheet. Keep the LightCore folder; Chrome uses the extracted files.

UPDATE AN EXISTING INSTALLATION
1. Finish pending rolls. Keep the same extension installation and the folder Chrome already loads.
2. Save the new LightCore-Bridge.zip in your LightCore folder, replacing the previous ZIP if asked.
3. Right-click the new ZIP and choose Extract All. Set the destination to your existing installation folder.
4. Choose Replace the files in the destination and wait for extraction to finish.
5. Open chrome://extensions. Click the circular Reload icon on the LightCore Bridge card, then refresh your D&D Beyond and VTT tabs.

Do not remove/reinstall the extension or rename its loaded folder. Keeping that folder and Chrome installation preserves settings. If an earlier installation uses a folder named WayBeyond20 or something else, keep that path and extract the new ZIP contents there. You may keep the download ZIP in LightCore separately.

THE ZIP LAYOUT
This download has no enclosing folder. Its manifest.json is at the ZIP root. Extract into the folder Chrome will load. The ZIP itself is only a download and does not install the extension. INSTALL.html contains the same illustrated guide and can be opened locally.

WHAT CHANGED IN THIS UPDATE
One installation/update landing page, a permanent LightCore folder workflow, and a stable LightCore-Bridge.zip download name. The public GitHub repository is now LightCoreBridge. Old WayBeyond20 repository links redirect. Gameplay JavaScript is unchanged from1.73.124; its existing TaleSpire and other verification limits still apply.

CONNECTIONS
Connect D&D Beyond to local rolling, Roll20, Foundry VTT, TaleSpire or optional Discord roll output. A VTT is not required. Existing protocol/storage names and installed folders remain compatible. Disable a duplicate Beyond20/WayBeyond20 extension so both do not process the same roll.

The separate TaleSpire companion/helper is not installed by this Chrome ZIP. Setup: https://github.com/LuconoLeReis/LightCoreBridge/tree/main/companions/talespire . Preserve local pairing configuration when updating it.

SOURCE AND LICENSES
https://github.com/LuconoLeReis/LightCoreBridge/tree/v1.73.125
Release notes: https://github.com/LuconoLeReis/LightCoreBridge/releases/tag/v1.73.125
Build: npm ci, npm test, npm run build. Package: npm run package:lightcore.
LICENSE, LICENSE.MIT and Beyond20 attribution are retained. LightCore Bridge derives from Beyond20.
