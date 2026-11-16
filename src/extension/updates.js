const installedBuild = globalThis.chrome?.runtime?.getManifest?.();
if (installedBuild) {
    const name = installedBuild.version_name || `${installedBuild.name} ${installedBuild.version}`;
    const build = document.getElementById("browser-build");
    document.title = `${name} updates`;
    document.getElementById("installed-version").textContent = name;
    build.textContent = `Browser build ${installedBuild.version}`;
    build.hidden = false;
}
