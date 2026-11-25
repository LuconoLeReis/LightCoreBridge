for (const button of document.querySelectorAll('.copy-address')) {
  button.addEventListener('click', async () => {
    const address = 'chrome://extensions';
    try {
      await navigator.clipboard.writeText(address);
      button.textContent = 'Copied';
      document.getElementById('copy-status').textContent = 'Chrome Extensions address copied. Paste it into Chrome’s address bar.';
    } catch (_) {
      document.getElementById('copy-status').textContent = 'Copy chrome://extensions from the field and paste it into Chrome’s address bar.';
    }
  });
}
async function showReleaseVersion() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://api.github.com/repos/LuconoLeReis/LightCoreBridge/releases/latest', {signal: controller.signal});
    if (!response.ok) return;
    const release = await response.json();
    const version = /^v?(\d+\.\d+\.\d+)$/.exec(String(release.tag_name || ''));
    if (!version || release.draft || release.prerelease || !Array.isArray(release.assets) ||
        !release.assets.some(asset => asset.name === 'LightCore-Bridge.zip')) return;
    document.getElementById('release-version').textContent = 'Version ' + version[1];
  } catch (_) {
    // The permanent download link and all instructions work without this label.
  } finally { clearTimeout(timeout); }
}
showReleaseVersion();
