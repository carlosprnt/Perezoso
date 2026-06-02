import Foundation
import React
import WidgetKit

@objc(WidgetDataModule)
class WidgetDataModule: NSObject {

  @objc
  func writeSharedData(_ groupId: String, jsonString: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId) else {
      reject("E_NO_GROUP", "App Group container not found: \(groupId)", nil)
      return
    }

    let fileURL = container.appendingPathComponent("widget-data.json")
    do {
      try jsonString.write(to: fileURL, atomically: true, encoding: .utf8)
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
      resolve(true)
    } catch {
      reject("E_WRITE", "Failed to write widget data: \(error.localizedDescription)", error)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { false }
}
