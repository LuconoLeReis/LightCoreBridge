# LightCore Bridge 1.73.125

Browser build **2.20.257**. Easier installation and updates; gameplay JavaScript is unchanged from1.73.124.

## Start here

**[Installation and update guide](https://lightcore-bridge.lucono.chatgpt.site)**

**[Download LightCore Bridge](https://github.com/LuconoLeReis/LightCoreBridge/releases/latest/download/LightCore-Bridge.zip)**

The guide puts First-time install and Update instructions at the top, with a direct download button. New users create one permanent LightCore folder, save the ZIP there, extract into that same folder, then load LightCore in Chrome. Future updates use the same folder and the existing extension's Reload control.

## Simpler ZIP

The Chrome download is now named **LightCore-Bridge.zip** for every release. It contains the extension files directly, without the old enclosing WayBeyond20 folder. Extract into the folder Chrome should load. manifest.json must be directly inside that folder. The ZIP can stay beside the extracted files. INSTALL.html includes a local copy of the guide.

Existing users must keep the folder Chrome already loads, even if it has an older name. Extract the new ZIP contents there, replace the files, reload the existing extension, then refresh D&D Beyond/VTT tabs. Do not remove/reinstall the extension or rename its loaded folder; those operations can separate the installation from saved settings.

The public repository is now [LightCoreBridge](https://github.com/LuconoLeReis/LightCoreBridge). Existing WayBeyond20 repository URLs redirect to it. Installed paths, protocol identifiers and storage keys keep their existing identity.

## Validation and scope

The archive is checked against the committed Chrome build. A first extraction and an update extraction must leave manifest.json at the selected folder's root and preserve unrelated files. The landing page has desktop/mobile and keyboard checks; download links and old-repository redirects are verified. Gameplay bundles remain byte-identical to1.73.124. This release adds no new native gameplay acceptance; the124 verification limits still apply.

The TaleSpire companion remains1.1.4 and is updated separately. Experimental player authentication and central session-sync are not included.
