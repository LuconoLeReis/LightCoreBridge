const gulp = require('gulp');
const concat = require('gulp-concat');
const clean = require('gulp-clean');
const rename = require("gulp-rename");

const ROLL_RENDERER_DEPS = [
    "src/common/utils.js",
    "libs/FileSaver.min.js",
    "src/common/settings.js",
    "src/common/constants.js",
    "src/discord/discord.js",
    "src/common/dice.js",
    "src/common/roll-table.js",
    "src/common/roll_renderer.js"
];

const DNDBEYOND_PAGE_DEPS = [
    ...ROLL_RENDERER_DEPS,
    "src/dndbeyond/base/digital-dice.js",
    "src/dndbeyond/base/dice.js",
    "src/reliability/local-result.js",
    "src/dndbeyond/base/base.js",
    "src/dndbeyond/base/hotkeys.js",
    "src/dndbeyond/base/utils.js",
    "src/dndbeyond/base/attack-workflow.js",
    "src/dndbeyond/base/attack-workflow-stat-block.js",
    // Second renderer on DDB pages to allow rednering roll to the DOM
    "src/generic-site/renderer.js",
];

const DNDBEYOND_CHARACTER_PAGE_DEPS = [
    ...ROLL_RENDERER_DEPS,
    "src/dndbeyond/base/digital-dice-new.js",
    "src/dndbeyond/base/dice.js",
    "src/reliability/local-result.js",
    "src/dndbeyond/base/base.js",
    "src/dndbeyond/base/hotkeys.js",
    "src/dndbeyond/base/utils.js",
    "src/dndbeyond/base/attack-workflow.js",
    "src/dndbeyond/base/attack-workflow-stat-block.js",
    // Second renderer on DDB pages to allow rednering roll to the DOM
    "src/generic-site/renderer.js",
];

const SRC_FILES = {
    background: [
        "src/common/constants.js",
        "src/common/utils.js",
        "libs/FileSaver.min.js",
        "src/common/settings.js",
        "src/talespire/bridge.js",
        "src/talespire/return-client.js",
        "src/reliability/recovery-scope.js",
        "src/reliability/recovery-background.js",
        "src/extension/background.js"
    ],
    options: [
        "src/common/constants.js",
        "src/common/utils.js",
        "libs/FileSaver.min.js",
        "src/common/settings.js",
        "src/extension/settings-navigation.js",
        "src/extension/options.js"
    ],
    default_popup: [
        "src/common/sandbox-header.js",
        "src/common/constants.js",
        "src/common/utils.js",
        "libs/FileSaver.min.js",
        "src/common/settings.js",
        "src/extension/settings-navigation.js",
        "src/extension/default_popup.js",
        "src/common/sandbox-footer.js"
    ],
    popup: [
        "src/common/constants.js",
        "src/common/utils.js",
        "libs/FileSaver.min.js",
        "src/common/settings.js",
        "src/extension/settings-navigation.js",
        "src/extension/popup.js"
    ],
    roll20: [
        ...ROLL_RENDERER_DEPS,
        "src/roll20/renderer.js",
        "src/roll20/content-script.js"
    ],
    roll20_script: [
        "src/common/sandbox-header.js",
        "src/common/utils.js",
        "src/roll20/page-script.js",
        "src/common/sandbox-footer.js"
    ],
    fvtt_test: [
        "src/fvtt/check-tab.js"
    ],
    fvtt: [
        "src/common/sandbox-header.js",
        "src/common/utils.js",
        "libs/FileSaver.min.js",
        "src/common/settings.js",
        "src/fvtt/content-script.js",
        "src/common/sandbox-footer.js"
    ],
    fvtt_script: [
        "src/common/sandbox-header.js",
        ...ROLL_RENDERER_DEPS,
        "src/fvtt/page-script.js",
        "src/common/sandbox-footer.js"
    ],
    generic_site: [
        ...ROLL_RENDERER_DEPS,
        "src/generic-site/renderer.js",
        "src/generic-site/content-script.js"
    ],
    dndbeyond_spell: [
        ...DNDBEYOND_PAGE_DEPS,
        "src/dndbeyond/base/spell.js",
        "src/dndbeyond/base/monster.js",
        "src/dndbeyond/content-scripts/spell.js",
    ],
    dndbeyond_item: [
        ...DNDBEYOND_PAGE_DEPS,
        "src/dndbeyond/content-scripts/item.js",
    ],
    dndbeyond_feat: [
        ...DNDBEYOND_PAGE_DEPS,
        "src/dndbeyond/content-scripts/feat.js",
    ],
    dndbeyond_monster: [
        ...DNDBEYOND_PAGE_DEPS,
        "src/dndbeyond/base/spell.js",
        "src/dndbeyond/base/monster.js",
        "src/dndbeyond/base/extras.js",
        "src/dndbeyond/content-scripts/monster.js",
    ],
    dndbeyond_encounter: [
        ...DNDBEYOND_PAGE_DEPS,
        "src/dndbeyond/base/spell.js",
        "src/dndbeyond/base/monster.js",
        "src/dndbeyond/content-scripts/encounter.js",
    ],
    dndbeyond_vehicle: [
        ...DNDBEYOND_PAGE_DEPS,
        "src/dndbeyond/base/spell.js",
        "src/dndbeyond/base/monster.js",
        "src/dndbeyond/content-scripts/vehicle.js",
    ],
    dndbeyond_character: [
        ...DNDBEYOND_CHARACTER_PAGE_DEPS,
        "src/dndbeyond/base/spell.js",
        "src/dndbeyond/base/monster.js",
        "src/dndbeyond/base/extras.js",
        "src/dndbeyond/base/character.js",
        "src/dndbeyond/content-scripts/attack-followups.js",
        "src/dndbeyond/content-scripts/opportunity-attacks.js",
        "src/dndbeyond/content-scripts/quick-list.js",
        "src/dndbeyond/content-scripts/my-target.js",
        "src/dndbeyond/content-scripts/talespire.js",
        "src/dndbeyond/content-scripts/concentration.js",
        "src/dndbeyond/content-scripts/portent.js",
        "src/dndbeyond/content-scripts/resources.js",
        "src/dndbeyond/content-scripts/feature-rules.js",
        "src/dndbeyond/content-scripts/item-rules.js",
        "src/dndbeyond/content-scripts/summons.js",
        "src/dndbeyond/content-scripts/combat-actions.js",
        "src/dndbeyond/content-scripts/feature-activations.js",
        "src/dndbeyond/content-scripts/attack-workflow-character.js",
        "src/dndbeyond/content-scripts/attack-handoff.js",
        "src/dndbeyond/content-scripts/header.js",
        "src/reliability/sheet-load-diagnostics.js",
        "src/dndbeyond/content-scripts/character.js",
    ],
    dndbeyond_source: [
        ...DNDBEYOND_PAGE_DEPS,
        "src/dndbeyond/base/spell.js",
        "src/dndbeyond/base/monster.js",
        "src/dndbeyond/content-scripts/source.js",
    ],
    dndbeyond_mb: [
        "src/common/sandbox-header.js",
        "src/common/utils.js",
		"src/dndbeyond/base/message-broker.js",
		"src/dndbeyond/page-scripts/message-broker.js",
        "src/common/sandbox-footer.js"
	]
}
const COMPAT_RENDERER_DEPS = [
    "vendor/beyond20-2.21.0/src/common/utils.js",
    "vendor/beyond20-2.21.0/libs/FileSaver.min.js",
    "vendor/beyond20-2.21.0/src/common/settings.js",
    "vendor/beyond20-2.21.0/src/common/constants.js",
    "vendor/beyond20-2.21.0/src/discord/discord.js",
    "vendor/beyond20-2.21.0/src/common/dice.js",
    "vendor/beyond20-2.21.0/src/common/roll-table.js",
    "vendor/beyond20-2.21.0/src/common/roll_renderer.js"
];

const COMPAT_PAGE_DEPS = [
    ...COMPAT_RENDERER_DEPS,
    "vendor/beyond20-2.21.0/src/dndbeyond/base/digital-dice.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/dice.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/base.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/hotkeys.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/utils.js",
    // Second renderer on DDB pages to allow rednering roll to the DOM
    "vendor/beyond20-2.21.0/src/generic-site/renderer.js",
];

const COMPAT_CHARACTER_DEPS = [
    ...COMPAT_RENDERER_DEPS,
    "vendor/beyond20-2.21.0/src/dndbeyond/base/digital-dice-new.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/dice.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/base.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/hotkeys.js",
    "vendor/beyond20-2.21.0/src/dndbeyond/base/utils.js",
    // Second renderer on DDB pages to allow rednering roll to the DOM
    "vendor/beyond20-2.21.0/src/generic-site/renderer.js",
];

const COMPAT_FILES = {
    background: [
        "vendor/beyond20-2.21.0/src/common/constants.js",
        "vendor/beyond20-2.21.0/src/common/utils.js",
        "vendor/beyond20-2.21.0/libs/FileSaver.min.js",
        "vendor/beyond20-2.21.0/src/common/settings.js",
        "vendor/beyond20-2.21.0/src/extension/background.js"
    ],
    options: [
        "vendor/beyond20-2.21.0/src/common/constants.js",
        "vendor/beyond20-2.21.0/src/common/utils.js",
        "vendor/beyond20-2.21.0/libs/FileSaver.min.js",
        "vendor/beyond20-2.21.0/src/common/settings.js",
        "vendor/beyond20-2.21.0/src/extension/options.js"
    ],
    default_popup: [
        "vendor/beyond20-2.21.0/src/common/sandbox-header.js",
        "vendor/beyond20-2.21.0/src/common/constants.js",
        "vendor/beyond20-2.21.0/src/common/utils.js",
        "vendor/beyond20-2.21.0/libs/FileSaver.min.js",
        "vendor/beyond20-2.21.0/src/common/settings.js",
        "vendor/beyond20-2.21.0/src/extension/default_popup.js",
        "vendor/beyond20-2.21.0/src/common/sandbox-footer.js"
    ],
    popup: [
        "vendor/beyond20-2.21.0/src/common/constants.js",
        "vendor/beyond20-2.21.0/src/common/utils.js",
        "vendor/beyond20-2.21.0/libs/FileSaver.min.js",
        "vendor/beyond20-2.21.0/src/common/settings.js",
        "vendor/beyond20-2.21.0/src/extension/popup.js"
    ],
    roll20: [
        ...COMPAT_RENDERER_DEPS,
        "vendor/beyond20-2.21.0/src/roll20/renderer.js",
        "vendor/beyond20-2.21.0/src/roll20/content-script.js"
    ],
    roll20_script: [
        "vendor/beyond20-2.21.0/src/common/sandbox-header.js",
        "vendor/beyond20-2.21.0/src/common/utils.js",
        "vendor/beyond20-2.21.0/src/roll20/page-script.js",
        "vendor/beyond20-2.21.0/src/common/sandbox-footer.js"
    ],
    fvtt_test: [
        "vendor/beyond20-2.21.0/src/fvtt/check-tab.js"
    ],
    fvtt: [
        "vendor/beyond20-2.21.0/src/common/utils.js",
        "vendor/beyond20-2.21.0/libs/FileSaver.min.js",
        "vendor/beyond20-2.21.0/src/common/settings.js",
        "vendor/beyond20-2.21.0/src/fvtt/content-script.js"
    ],
    fvtt_script: [
        "vendor/beyond20-2.21.0/src/common/sandbox-header.js",
        ...COMPAT_RENDERER_DEPS,
        "vendor/beyond20-2.21.0/src/fvtt/page-script.js",
        "vendor/beyond20-2.21.0/src/common/sandbox-footer.js"
    ],
    generic_site: [
        ...COMPAT_RENDERER_DEPS,
        "vendor/beyond20-2.21.0/src/generic-site/renderer.js",
        "vendor/beyond20-2.21.0/src/generic-site/content-script.js"
    ],
    dndbeyond_spell: [
        ...COMPAT_PAGE_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/base/spell.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/monster.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/spell.js",
    ],
    dndbeyond_item: [
        ...COMPAT_PAGE_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/item.js",
    ],
    dndbeyond_feat: [
        ...COMPAT_PAGE_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/feat.js",
    ],
    dndbeyond_monster: [
        ...COMPAT_PAGE_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/base/spell.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/monster.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/extras.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/monster.js",
    ],
    dndbeyond_encounter: [
        ...COMPAT_PAGE_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/base/spell.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/monster.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/encounter.js",
    ],
    dndbeyond_vehicle: [
        ...COMPAT_PAGE_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/base/spell.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/monster.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/vehicle.js",
    ],
    dndbeyond_character: [
        ...COMPAT_CHARACTER_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/base/spell.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/monster.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/extras.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/character.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/character.js",
    ],
    dndbeyond_source: [
        ...COMPAT_PAGE_DEPS,
        "vendor/beyond20-2.21.0/src/dndbeyond/base/spell.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/base/monster.js",
        "vendor/beyond20-2.21.0/src/dndbeyond/content-scripts/source.js",
    ],
    dndbeyond_mb: [
        "vendor/beyond20-2.21.0/src/common/sandbox-header.js",
        "vendor/beyond20-2.21.0/src/common/utils.js",
		"vendor/beyond20-2.21.0/src/dndbeyond/base/message-broker.js",
		"vendor/beyond20-2.21.0/src/dndbeyond/page-scripts/message-broker.js",
        "vendor/beyond20-2.21.0/src/common/sandbox-footer.js"
	]
}

for (const [name, files] of Object.entries(COMPAT_FILES)) {
    if (['roll20','roll20_script','fvtt','fvtt_script','fvtt_test','generic_site'].includes(name)) SRC_FILES['compat_'+name] = files;
    if (name.startsWith('dndbeyond_')) SRC_FILES['compat_' + name] =
        name === 'dndbeyond_mb' ? files : [...files, 'src/reliability/local-result.js', 'src/reliability/compat-delivery.js'];
}
SRC_FILES.recovery_boot = ['src/common/sandbox-header.js', 'src/reliability/recovery-scope.js', 'src/reliability/sheet-load-diagnostics.js', 'src/reliability/recovery-boot.js', 'src/common/sandbox-footer.js'];
SRC_FILES.recovery_popup = ['src/common/sandbox-header.js', 'src/reliability/recovery-scope.js', 'src/reliability/recovery-popup.js', 'src/common/sandbox-footer.js'];
const CSS_FILES = ['src/extension/beyond20.css']

const compatCSS = () => gulp.src('vendor/beyond20-2.21.0/src/extension/beyond20.css').pipe(concat('compat_beyond20.css')).pipe(gulp.dest('dist'));
const targets = {compatCSS};
for (const target in SRC_FILES) {
    // Use an object with a named key so each task function gets
    // named instead of being anonymous functions
    const task = {
        [target]: () => gulp.src(SRC_FILES[target])
            .pipe(concat(`${target}.js`))
            .pipe(gulp.dest("dist"))
    };
    targets[target] = task[target];
    gulp.task(target, targets[target]);
}
css = () => gulp.src(CSS_FILES)
    .pipe(concat(`beyond20.css`))
    .pipe(gulp.dest("dist"))

watch = () => {
    for (target in SRC_FILES)
        gulp.watch(SRC_FILES[target], targets[target]);
    gulp.watch(CSS_FILES, css);
    gulp.watch(["manifest.json", "manifest_ff.json", "dist/**"], gulp.series([
        "copy-chrome-dist", "chrome-manifest", "copy-firefox-dist", "firefox-manifest"
    ]));
    gulp.watch(["options.*", "*.html"], gulp.series([
        "copy-misc", "build-chrome", "build-firefox"
    ]));
}

build = gulp.series(css, ...Object.values(targets));

gulp.task('css', css);
gulp.task('watch', watch);
gulp.task('build', build);


gulp.task("clean", () => {
    return gulp.src(['./dist/', "./build/"], { read: false, allowEmpty: true }).pipe(clean());
});

gulp.task("copy-src", () => {
    return gulp.src("./src/**")
        .pipe(gulp.dest('./build/base/src/'))
});

gulp.task("copy-dist-nobuild", () => {
    return gulp.src("./dist/**")
        .pipe(gulp.dest('./build/base/dist/'));
});
gulp.task("copy-dist", gulp.series("build", "copy-dist-nobuild"));

gulp.task("copy-libs", () => {
    return gulp.src("./libs/**")
        .pipe(gulp.dest('./build/base/libs/'));
});

gulp.task("copy-images", () => {
    return gulp.src(["images/**", "!images/sources/**"])
        .pipe(gulp.dest('./build/base/images/'));
});

gulp.task("copy-misc", () => {
    return gulp.src([
        "LICENSE",
        "LICENSE.MIT",
        "README.txt",
        "default_popup.html",
        "popup.html",
        "options.html",
        "options.css",
        "Updates.html",
        "Updates.css"
    ])
        .pipe(gulp.dest('./build/base/'));
});

gulp.task("build-base", gulp.parallel([
    "copy-dist",
    "copy-misc",
    "copy-libs",
    "copy-images",
]));

// Creates the specific folders for Chrome and Firefox

gulp.task("copy-firefox-dist", () => {
    return gulp.src("./dist/**")
        .pipe(gulp.dest('./build/firefox/dist/'));
});

gulp.task("copy-chrome-dist", () => {
    return gulp.src("./dist/**")
        .pipe(gulp.dest('./build/chrome/dist/'));
});


gulp.task("copy-firefox-from-base", gulp.series("build-base", () => {
    return gulp.src("./build/base/**")
        .pipe(gulp.dest('./build/firefox/'));
}));

gulp.task("copy-chrome-from-base", gulp.series("build-base", () => {
    return gulp.src("./build/base/**")
        .pipe(gulp.dest('./build/chrome/'));
}));

// Copies manifests around

gulp.task("firefox-manifest", () => {
    return gulp.src("./manifest_ff.json")
        .pipe(rename({
            basename: "manifest",
        }))
        .pipe(gulp.dest("./build/firefox/"));
});

gulp.task("chrome-manifest", () => {
    return gulp.src("./manifest.json")
        .pipe(gulp.dest("./build/chrome/"));
});

// Performs full builds

gulp.task("build-firefox",gulp.series([
    "copy-firefox-from-base",
    "firefox-manifest"
]));

gulp.task("build-chrome", gulp.series([
    "copy-chrome-from-base",
    "chrome-manifest"
])); 


gulp.task('default', gulp.series(['build', 'build-chrome', 'build-firefox', 'watch']));
