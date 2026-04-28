// Expo config plugin — adds PerezozoWidgets extension target.
//
// Uses withDangerousMod for file operations (runs after ios/ is created),
// withXcodeProject for Xcode project manipulation, and withInfoPlist
// to fix CFBundleVersion so it reads from build settings.

const {
  withXcodeProject,
  withEntitlementsPlist,
  withInfoPlist,
  withDangerousMod,
} = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const APP_GROUP = "group.com.perezoso.app";
const WIDGET_NAME = "PerezozoWidgets";
const DEPLOYMENT_TARGET = "17.0";

const WIDGET_SWIFT_FILES = [
  "SharedModels.swift",
  "DesignTokens.swift",
  "Localization.swift",
  "NextPaymentWidget.swift",
  "MonthlySpendWidget.swift",
  "UpcomingListWidget.swift",
  "PerezozoWidgetBundle.swift",
];

const BRIDGE_FILES = ["WidgetDataModule.swift", "WidgetDataModule.m"];

function findGroupKeyByName(project, name) {
  const groups = project.hash.project.objects['PBXGroup'];
  for (const key in groups) {
    if (typeof groups[key] !== 'object') continue;
    if (groups[key].name === name || groups[key].path === name) {
      return key;
    }
  }
  return null;
}

function withWidgetExtension(config) {
  // 1. App Group entitlement on main target
  config = withEntitlementsPlist(config, (c) => {
    c.modResults["com.apple.security.application-groups"] = [APP_GROUP];
    return c;
  });

  // 2. Fix CFBundleVersion — use build-setting variables so the version
  //    is controlled from Xcode Build Settings, not hardcoded in the plist.
  //    This prevents App Store Connect rejecting builds for duplicate numbers.
  config = withInfoPlist(config, (c) => {
    c.modResults.CFBundleVersion = "$(CURRENT_PROJECT_VERSION)";
    c.modResults.CFBundleShortVersionString = "$(MARKETING_VERSION)";
    return c;
  });

  // 3. Copy files into ios/ directory (withDangerousMod runs reliably after ios/ exists)
  config = withDangerousMod(config, [
    "ios",
    (c) => {
      const projectRoot = c.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, "ios");
      const widgetDir = path.join(iosDir, WIDGET_NAME);
      const srcDir = path.join(projectRoot, "ios-widget", "PerezozoWidgets");
      const bridgeSrcDir = path.join(projectRoot, "ios-widget");
      const mainAppName = c.modRequest.projectName || "Perezoso";
      const mainAppDir = path.join(iosDir, mainAppName);

      // Create widget directory
      fs.mkdirSync(widgetDir, { recursive: true });

      // Copy widget Swift files
      for (const file of WIDGET_SWIFT_FILES) {
        const src = path.join(srcDir, file);
        const dst = path.join(widgetDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          console.log(`[WidgetPlugin] Copied ${file}`);
        } else {
          console.warn(`[WidgetPlugin] Source not found: ${src}`);
        }
      }

      // Write widget entitlements
      fs.writeFileSync(
        path.join(widgetDir, `${WIDGET_NAME}.entitlements`),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>`
      );

      // Write widget Info.plist
      fs.writeFileSync(
        path.join(widgetDir, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Perezoso Widgets</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>`
      );

      // Copy bridge files to main app directory
      for (const file of BRIDGE_FILES) {
        const src = path.join(bridgeSrcDir, file);
        const dst = path.join(mainAppDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          console.log(`[WidgetPlugin] Copied bridge ${file}`);
        } else {
          console.warn(`[WidgetPlugin] Bridge source not found: ${src}`);
        }
      }

      // Verify files exist
      const allFiles = [...WIDGET_SWIFT_FILES, "Info.plist", `${WIDGET_NAME}.entitlements`];
      for (const file of allFiles) {
        const fp = path.join(widgetDir, file);
        if (!fs.existsSync(fp)) {
          console.error(`[WidgetPlugin] MISSING after copy: ${fp}`);
        }
      }

      return c;
    },
  ]);

  // 4. Add widget target to the Xcode project
  config = withXcodeProject(config, (c) => {
    const project = c.modResults;
    const mainBundleId = c.ios?.bundleIdentifier ?? "com.perezoso.app";
    const widgetBundleId = mainBundleId + "." + WIDGET_NAME;

    // Add PBX group for the widget in Xcode sidebar
    const widgetGroup = project.addPbxGroup([], WIDGET_NAME, WIDGET_NAME);
    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroup.uuid, mainGroupId);

    // Add extension target (creates target with empty buildPhases)
    const widgetTarget = project.addTarget(
      WIDGET_NAME,
      "app_extension",
      WIDGET_NAME,
      widgetBundleId
    );

    // Create a Sources build phase for the widget target.
    // addTarget() leaves buildPhases empty, so without this step
    // addSourceFile falls back to the main target's Sources phase,
    // putting all widget files in the wrong target.
    project.addBuildPhase(
      [],
      'PBXSourcesBuildPhase',
      'Sources',
      widgetTarget.uuid
    );

    // Add Swift source files to the widget target.
    // Pass just the filename + widget group UUID so the xcode package
    // resolves group.path ("PerezozoWidgets") + filename correctly.
    for (const file of WIDGET_SWIFT_FILES) {
      project.addSourceFile(
        file,
        { target: widgetTarget.uuid },
        widgetGroup.uuid
      );
    }

    // Add bridge files to main target only.
    const mainTarget = project.getFirstTarget();
    const mainAppName = c.modRequest.projectName || "Perezoso";
    const mainAppGroupKey = findGroupKeyByName(project, mainAppName);
    for (const file of BRIDGE_FILES) {
      project.addSourceFile(
        file,
        { target: mainTarget.uuid },
        mainAppGroupKey || mainGroupId
      );
    }

    // Configure widget target build settings
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const cfg = configs[key];
      if (cfg.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER === `"${widgetBundleId}"` ||
          cfg.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER === widgetBundleId) {
        Object.assign(cfg.buildSettings, {
          SWIFT_VERSION: "5.0",
          IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
          CODE_SIGN_ENTITLEMENTS: `${WIDGET_NAME}/${WIDGET_NAME}.entitlements`,
          CODE_SIGN_STYLE: "Automatic",
          DEVELOPMENT_TEAM: "YTNBUHSVA9",
          TARGETED_DEVICE_FAMILY: '"1"',
          GENERATE_INFOPLIST_FILE: "YES",
          MARKETING_VERSION: "1.0",
          CURRENT_PROJECT_VERSION: "1",
          INFOPLIST_FILE: `${WIDGET_NAME}/Info.plist`,
          PRODUCT_NAME: '"$(TARGET_NAME)"',
          INFOPLIST_KEY_CFBundleDisplayName: '"Perezoso Widgets"',
          INFOPLIST_KEY_NSHumanReadableCopyright: '""',
          LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
          SKIP_INSTALL: "YES",
          ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
          ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "WidgetBackground",
        });
      }
    }

    // Add WidgetKit and SwiftUI frameworks
    project.addFramework("WidgetKit.framework", { target: widgetTarget.uuid, link: true });
    project.addFramework("SwiftUI.framework", { target: widgetTarget.uuid, link: true });

    return c;
  });

  return config;
}

module.exports = withWidgetExtension;
