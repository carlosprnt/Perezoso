// Expo config plugin — adds the PerezozoWidgets widget extension target
// to the Xcode project. Also configures:
//   • App Group entitlement on main target + widget target
//   • Copies SwiftUI widget source files into the extension
//   • Links WidgetKit + SwiftUI frameworks
//   • Adds the native bridge module files to the main target

const {
  withXcodeProject,
  withEntitlementsPlist,
  withInfoPlist,
} = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const APP_GROUP = "group.com.perezoso.app";
const WIDGET_TARGET_NAME = "PerezozoWidgets";
const WIDGET_BUNDLE_ID_SUFFIX = ".PerezozoWidgets";
const DEPLOYMENT_TARGET = "17.0";

// Swift source files that go into the widget extension target
const WIDGET_SWIFT_FILES = [
  "SharedModels.swift",
  "DesignTokens.swift",
  "Localization.swift",
  "NextPaymentWidget.swift",
  "MonthlySpendWidget.swift",
  "UpcomingListWidget.swift",
  "PerezozoWidgetBundle.swift",
];

// Native bridge files that go into the main app target
const BRIDGE_FILES = [
  { name: "WidgetDataModule.swift", type: "sourcecode.swift" },
  { name: "WidgetDataModule.m", type: "sourcecode.c.objc" },
];

function withWidgetExtension(config) {
  // 1. Add App Group entitlement to main target
  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [APP_GROUP];
    return config;
  });

  // 2. Modify Xcode project to add widget extension target
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const mainBundleId = config.ios?.bundleIdentifier ?? "com.perezoso.app";
    const widgetBundleId = mainBundleId + WIDGET_BUNDLE_ID_SUFFIX;

    const srcDir = path.resolve(
      __dirname,
      "..",
      "..",
      "ios-widget",
      "PerezozoWidgets"
    );
    const bridgeSrcDir = path.resolve(__dirname, "..", "..", "ios-widget");

    // Destination in the ios build folder
    const iosDir = path.resolve(
      config.modRequest.platformProjectRoot
    );
    const widgetDir = path.join(iosDir, WIDGET_TARGET_NAME);

    // Create widget extension directory and copy files
    fs.mkdirSync(widgetDir, { recursive: true });
    for (const file of WIDGET_SWIFT_FILES) {
      const src = path.join(srcDir, file);
      const dst = path.join(widgetDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Create widget entitlements file
    const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>`;
    fs.writeFileSync(
      path.join(widgetDir, `${WIDGET_TARGET_NAME}.entitlements`),
      widgetEntitlements
    );

    // Create Info.plist for the widget extension
    const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
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
</plist>`;
    fs.writeFileSync(path.join(widgetDir, "Info.plist"), widgetInfoPlist);

    // Copy bridge files to the main app's source directory
    const mainAppDir = path.join(iosDir, config.modRequest.projectName ?? "Perezoso");
    for (const bf of BRIDGE_FILES) {
      const src = path.join(bridgeSrcDir, bf.name);
      const dst = path.join(mainAppDir, bf.name);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // ── Add widget extension target to the Xcode project ──
    const targetUuid = project.generateUuid();
    const widgetGroup = project.addPbxGroup(
      [...WIDGET_SWIFT_FILES, "Info.plist", `${WIDGET_TARGET_NAME}.entitlements`],
      WIDGET_TARGET_NAME,
      WIDGET_TARGET_NAME
    );

    // Add the widget group to the main project group
    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroup.uuid, mainGroupId);

    // Add widget extension target
    const widgetTarget = project.addTarget(
      WIDGET_TARGET_NAME,
      "app_extension",
      WIDGET_TARGET_NAME,
      widgetBundleId
    );

    // Add source files to the widget target's build phase
    for (const file of WIDGET_SWIFT_FILES) {
      project.addSourceFile(
        `${WIDGET_TARGET_NAME}/${file}`,
        { target: widgetTarget.uuid },
        widgetGroup.uuid
      );
    }

    // Add bridge files to main target
    const mainTarget = project.getFirstTarget();
    for (const bf of BRIDGE_FILES) {
      const mainAppName = config.modRequest.projectName ?? "Perezoso";
      project.addSourceFile(
        `${mainAppName}/${bf.name}`,
        { target: mainTarget.uuid },
        project.getFirstProject().firstProject.mainGroup
      );
    }

    // Set build settings for the widget target
    const widgetBuildConfigs = project.pbxXCBuildConfigurationSection();
    for (const key in widgetBuildConfigs) {
      const config_ = widgetBuildConfigs[key];
      if (
        config_.buildSettings &&
        config_.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === widgetBundleId
      ) {
        config_.buildSettings.SWIFT_VERSION = "5.0";
        config_.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
        config_.buildSettings.CODE_SIGN_ENTITLEMENTS = `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`;
        config_.buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
        config_.buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = "AccentColor";
        config_.buildSettings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = "WidgetBackground";
        config_.buildSettings.GENERATE_INFOPLIST_FILE = "YES";
        config_.buildSettings.MARKETING_VERSION = "1.0";
        config_.buildSettings.CURRENT_PROJECT_VERSION = "1";
        config_.buildSettings.INFOPLIST_FILE = `${WIDGET_TARGET_NAME}/Info.plist`;
        config_.buildSettings.PRODUCT_NAME = `$(TARGET_NAME)`;
        config_.buildSettings.INFOPLIST_KEY_CFBundleDisplayName = "Perezoso Widgets";
        config_.buildSettings.INFOPLIST_KEY_NSHumanReadableCopyright = "";
        config_.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        config_.buildSettings.SKIP_INSTALL = "YES";
      }
    }

    // Add WidgetKit and SwiftUI framework dependencies
    project.addFramework("WidgetKit.framework", {
      target: widgetTarget.uuid,
      link: true,
    });
    project.addFramework("SwiftUI.framework", {
      target: widgetTarget.uuid,
      link: true,
    });

    return config;
  });

  return config;
}

module.exports = withWidgetExtension;
