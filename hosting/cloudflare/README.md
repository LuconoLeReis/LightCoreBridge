# LightCore Bridge installation guide hosting

Public guide: https://lightcore-guide.nursing-research.workers.dev

This is a standalone static Cloudflare Worker named `lightcore-guide`. It uses
the five public files in `website/`. It has no application script, KV bindings,
login, or survey integration. Do not deploy over another project or copy an
existing survey configuration.

## Deploy

Use Wrangler 4 with the account owner's existing authorized Cloudflare login.
From the repository root:

```powershell
npx wrangler whoami
npx wrangler deploy --config hosting/cloudflare/wrangler.toml
```

If the login has expired, the account owner completes `wrangler login`.
Never commit the local Wrangler credential file, `.wrangler/` cache, or tokens.
If a corporate proxy certificate is trusted by Windows but not Node, use
Node 24's system certificate store for the command: `$env:NODE_USE_SYSTEM_CA='1'`.
Keep TLS verification enabled.

## Verify

Check the public root, `style.css`, `main.js`, `assets/lightcore-icon.png`, and
`assets/lightcore-share-v1.png` against local bytes. Confirm both First-time
install and Update instructions, the direct stable ZIP download, and metadata
URLs using this hostname. Check a narrow/mobile viewport as well as desktop.
The sharing image must be available without authentication. A successful image
fetch does not prove that Discord has refreshed a previously cached preview.

This guide is deployed independently of the Chrome extension. Website-only
changes do not change an installed extension version or immutable release ZIP.
The former guide remains available for links embedded in older downloads.
