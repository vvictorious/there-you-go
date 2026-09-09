# iOS Visit-Detection Technical Spike

## Experiment 1 — system-managed location notification

### Hypothesis

iOS can retain a one-shot local notification with a circular location trigger and present it when the user enters the region, even when ThereYouGo is backgrounded or suspended and the phone is locked.

The test reminder is configured at home for The UPS Store #4398 at 12405 Venice Blvd, Mar Vista, CA 90066. The coordinate is `34.0038427, -118.4340970`, verified against the official store address and OpenStreetMap data on 2026-09-09. The first test uses a conservative 150-meter entry radius to favor observing a real event over testing storefront-level precision.

### Implementation boundary

Expo Notifications 57 can represent location notification triggers returned by iOS, but its scheduling API does not create them. A local iOS-only Expo module therefore exposes only three operations over `UNUserNotificationCenter`:

- Schedule the single `UNLocationNotificationTrigger`.
- Inspect that specific pending request.
- Cancel that specific pending request.

The module does not expose location updates, geofencing callbacks, TaskManager integration, visit detection, or other native behavior. `expo-location` handles the foreground location permission request and `expo-notifications` handles notification permission and foreground presentation.

Because this spike uses a Personal Team and only local notifications, a source-controlled config plugin removes the APNs entitlement that Expo Notifications otherwise adds automatically. Remote push notifications are intentionally out of scope.

### Expected behavior

1. The user grants notification permission.
2. The user grants When In Use location permission with Precise Location enabled.
3. The app schedules a non-repeating `UNLocationNotificationTrigger`.
4. The app confirms that the request appears in iOS's pending scheduled notifications.
5. The user backgrounds or closes the app, locks the phone, leaves the Mac behind, and travels to the store.
6. On entering the region, iOS presents:

   > There you go 👀<br>
   > Don't forget to drop off your package.

The trigger is system-managed after scheduling. It does not require Metro, a running JavaScript process, continuous background location updates, or a network connection to the development Mac.

### What this test proves

- The app can request the permissions needed for a user-visible iOS location notification.
- iOS accepts a circular location notification for a saved coordinate.
- iOS can deliver the intended reminder during a real-world arrival with the app inactive and the phone locked.
- The narrow product outcome can work without TaskManager or continuous background tracking.

### What this test does not prove

- The app receives a programmable region-entry callback or can log the underlying event.
- Delivery timing is precise enough to distinguish entering the store from approaching the surrounding intersection.
- Drive-bys, nearby stops, walk-bys, and sustained visits can be distinguished.
- The trigger remains reliable across repeated tests, reduced-accuracy permission, disabled location services, device reboot, or user force-quit behavior.
- Background location tracking, motion activity, `CLVisit`, multiple dynamic places, or production-scale scheduling is feasible.

Real-world results will be recorded before starting the broader geofencing and evidence-collection work below.

## Broader visit-detection hypothesis

### Hypothesis

An iPhone can provide enough background location and motion evidence to distinguish a genuine store visit from passing near a store with useful reliability, including while the app is backgrounded or the phone is locked.

This spike collects raw, timestamped observations around a small set of hard-coded test locations. It will not implement a production classifier.

### Test scenarios

1. Drive past a store.
2. Stop at a traffic light near the store.
3. Park near the store.
4. Walk past the store.
5. Walk into the store.
6. Stay inside for 5–10 minutes.
7. Leave the store.
8. Repeat with the app backgrounded.
9. Repeat with the phone locked.
10. Later, repeat after the app has been terminated.

### Events to observe

- Region entry and exit, including the monitored location and timestamp
- Location updates and their timestamp, coordinates, accuracy, speed, and course
- Motion activity changes such as automotive, walking, running, stationary, or unknown
- Visit events exposed by iOS, including arrival and departure estimates
- App lifecycle state relevant to each event
- Permission and location-service state
- Errors, delayed delivery, duplicate events, and missing events

### Success criteria

- Events are captured with enough timing and accuracy to compare drive-bys, nearby stops, walk-bys, and sustained visits.
- Evidence continues to arrive reliably enough during backgrounded and locked-device tests.
- Repeated tests show patterns that could support a simple, explainable visit heuristic.
- The approach has acceptable battery impact for continued prototyping.

### Failure criteria

- Genuine visits and drive-bys are consistently indistinguishable.
- Required events are frequently missing, excessively delayed, or unavailable in important lifecycle states.
- Reliability depends on battery-intensive continuous high-accuracy tracking.
- iOS restrictions prevent the intended experience without unacceptable user configuration or expectations.

### Results

No real-world tests have been run yet.
