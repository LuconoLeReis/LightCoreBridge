# LightCore Bridge

Connect your D&D Beyond character to your table.

## Install or update

**[Open the installation and update guide](https://lightcore-bridge.lucono.chatgpt.site)**

**[Download LightCore Bridge](https://github.com/LuconoLeReis/LightCoreBridge/releases/latest/download/LightCore-Bridge.zip)**

### First-time install

1. Create a permanent **LightCore** folder, for example in Documents.
2. Save **LightCore-Bridge.zip** there.
3. Right-click the ZIP, choose **Extract All**, and change the destination to that same **LightCore** folder.
4. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select **LightCore**.
5. Refresh your D&D Beyond sheet. Keep the folder in place.

### Update

1. Save the new ZIP in **LightCore**.
2. Extract it into the **same folder Chrome already loads**, and replace existing files.
3. On `chrome://extensions`, click **Reload** on the LightCore Bridge card, then refresh your character/VTT tabs.

Keep the same extension installation and loaded folder to retain settings. **Do not remove/reinstall it.** If your existing folder has an older name, keep using it; extract the new ZIP there.

The download has no extra enclosing folder. `manifest.json` belongs directly inside the folder you select in Chrome. You can keep the ZIP beside it.

## Supported play

Local D&D Beyond rolling, Roll20, Foundry VTT, TaleSpire and optional Discord roll output. TaleSpire uses a [separate companion/helper](companions/talespire). Experimental account/session sync is not included.

## Source and attribution

[Release notes](https://github.com/LuconoLeReis/LightCoreBridge/releases/latest) · [Installation guide](https://lightcore-bridge.lucono.chatgpt.site) · [Report an issue](https://github.com/LuconoLeReis/LightCoreBridge/issues)

Build with `npm ci`, `npm test`, `npm run build`. Create the flat Chrome ZIP with `npm run package:lightcore`.

LightCore Bridge derives from Beyond20. The GPL and MIT licenses and third-party notices are retained in this repository and the download.
