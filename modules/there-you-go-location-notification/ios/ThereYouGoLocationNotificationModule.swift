import CoreLocation
import ExpoModulesCore
import UserNotifications

struct LocationNotificationRequestRecord: Record {
  @Field var identifier: String = ""
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
  @Field var radius: Double = 0
}

struct ScheduledLocationNotificationRecord: Record {
  @Field var identifier: String = ""
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
  @Field var radius: Double = 0
  @Field var notifyOnEntry: Bool = false
  @Field var notifyOnExit: Bool = false
  @Field var repeats: Bool = false
}

public class ThereYouGoLocationNotificationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ThereYouGoLocationNotification")

    AsyncFunction("scheduleAsync") {
      (request: LocationNotificationRequestRecord) async throws -> String in
      let coordinate = CLLocationCoordinate2D(
        latitude: request.latitude,
        longitude: request.longitude
      )

      guard CLLocationCoordinate2DIsValid(coordinate) else {
        throw GenericException("The location notification coordinate is invalid.")
      }
      guard request.radius > 0 else {
        throw GenericException("The location notification radius must be greater than zero.")
      }

      let region = CLCircularRegion(
        center: coordinate,
        radius: request.radius,
        identifier: request.identifier
      )
      region.notifyOnEntry = true
      region.notifyOnExit = false

      let content = UNMutableNotificationContent()
      content.title = request.title
      content.body = request.body
      content.sound = .default

      let trigger = UNLocationNotificationTrigger(region: region, repeats: false)
      let notificationRequest = UNNotificationRequest(
        identifier: request.identifier,
        content: content,
        trigger: trigger
      )

      try await UNUserNotificationCenter.current().add(notificationRequest)
      return request.identifier
    }

    AsyncFunction("getScheduledAsync") {
      (identifier: String) async -> ScheduledLocationNotificationRecord? in
      let requests = await UNUserNotificationCenter.current().pendingNotificationRequests()

      guard
        let request = requests.first(where: { $0.identifier == identifier }),
        let trigger = request.trigger as? UNLocationNotificationTrigger,
        let region = trigger.region as? CLCircularRegion
      else {
        return nil
      }

      var result = ScheduledLocationNotificationRecord()
      result.identifier = request.identifier
      result.title = request.content.title
      result.body = request.content.body
      result.latitude = region.center.latitude
      result.longitude = region.center.longitude
      result.radius = region.radius
      result.notifyOnEntry = region.notifyOnEntry
      result.notifyOnExit = region.notifyOnExit
      result.repeats = trigger.repeats
      return result
    }

    AsyncFunction("cancelAsync") { (identifier: String) async -> Bool in
      let notificationCenter = UNUserNotificationCenter.current()
      notificationCenter.removePendingNotificationRequests(withIdentifiers: [identifier])
      let requests = await notificationCenter.pendingNotificationRequests()
      return !requests.contains(where: { $0.identifier == identifier })
    }
  }
}
