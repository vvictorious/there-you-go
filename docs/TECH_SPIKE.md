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

### Test #1 result — 2026-09-10

The UPS notification fired when the tester reached the destination area. However, ThereYouGo was opened near the destination to look up the address before the notification was noticed. This confirms the trigger worked, but it does not cleanly establish that the notification appeared while the app remained backgrounded for the entire approach.

## Experiment 2 — backgrounded approach

### Hypothesis

The same system-managed, one-shot entry notification will fire while ThereYouGo remains backgrounded throughout the complete trip and approach.

The Test #2 destination is 4640 Admiralty Way, Marina del Rey, CA 90292. Its coordinate is `33.9811362, -118.4409594`, verified on 2026-09-10 against the OpenStreetMap address feature and the US Census geocoder, which placed the same address approximately three meters away. The radius remains exactly 150 meters so destination and app lifecycle behavior are the only intended test changes.

The request uses the unique identifier `admiralty-way-4640-arrival-test-2` with entry enabled, exit disabled, and repeats disabled. Before scheduling it, the app removes and verifies the absence of the previous `ups-mar-vista-arrival` request.

Expected notification:

> There you go 👀<br>
> You've arrived at 4640 Admiralty Way.

After iOS reports the new request as pending, the tester will background ThereYouGo, disconnect the iPhone from the Mac, use the phone normally without reopening ThereYouGo, and travel into or through the 150-meter region.

Success means the notification appears without any interaction with ThereYouGo during the approach. This repeats only the system-managed notification test; it does not add programmable geofence callbacks, TaskManager, location polling, continuous tracking, or visit detection.

### Test #2 result — 2026-09-28

Test #2 passed on a physical iPhone. The location notification was scheduled before the trip, ThereYouGo remained backgrounded throughout the approach, and the notification fired when the tester arrived at the target location.

Unlike Test #1, the app was not reopened near the destination before the notification was observed. Test #2 therefore cleanly confirms that iOS can retain and deliver the system-managed, one-shot entry notification during a complete backgrounded approach without interaction with ThereYouGo. It does not expand the spike's scope: programmable geofence callbacks, precise visit classification, continuous tracking, and production-scale scheduling remain unproven.

## Technical Spike #2 — native destination rotation

### Question

Can native iOS code notice meaningful movement while ThereYouGo is backgrounded, replace the geographic destinations represented by system-owned notifications, and have those newly installed destinations fire without waking React Native or continuously tracking GPS?

### Implementation tested

The physical-device harness used two test areas approximately 4.5 miles apart. Exact addresses and coordinates are intentionally omitted because they are not architectural inputs.

At Area A, the app:

1. Scheduled and verified a one-shot 150-meter entry notification.
2. Persisted the native experiment phase.
3. Started `CLLocationManager` significant-location-change monitoring with Always and Precise location authorization.

After meaningful movement, native Swift:

1. Received the significant-location-change callback.
2. Started a finite background task.
3. Scheduled two independent Area B `UNLocationNotificationTrigger` requests at the same center, with 150-meter and 500-meter radii.
4. Used unique notification and region identifiers for each request.
5. Read both requests back and verified identifier, center, radius, `notifyOnEntry = true`, `notifyOnExit = false`, and `repeats = false`.
6. Removed Area A only after both Area B requests verified successfully.
7. Stopped significant-location-change monitoring after rotation.

Durable native logging recorded process launches, location callbacks, rotation progress, request configuration and verification, failures, and monitoring state. A debug-only time-triggered receipt confirmed completion during the physical test.

### Successful physical test — 2026-10-01

The experiment was armed at `2026-10-01T17:03:16Z`. Area A was verified pending and significant-change monitoring started.

At `2026-10-01T17:06:14Z`, while ThereYouGo was backgrounded, iOS delivered a significant-location-change event approximately 508.7 meters from Area A with good reported accuracy. Native Swift completed the rotation without React Native or JavaScript running. Both Area B requests were present and matched their expected configuration before Area A was removed.

ThereYouGo remained backgrounded during the trip to Area B. The 500-meter Area B notification fired first; the 150-meter notification fired afterward as the tester approached the destination. The app was not reopened between native rotation and either arrival notification.

After arrival, native state reported phase `areaB`, no pending destination, monitoring not requested, Always location authorization, and full accuracy. No pending destination is consistent with both non-repeating requests having fired and been consumed.

### Earlier failed test

An earlier version used one 150-meter destination slot. Native code reused the Area A notification/region identifier when replacing it with Area B. The background significant-change wake and rotation succeeded, and Area B was read back as pending, but the Area B arrival notification did not fire. It still did not fire after the tester traveled approximately 1.1 miles away and returned, and the request remained pending.

The initial hypotheses were that 150 meters was too small for reliable region hysteresis or that iOS had not established a clear outside state. The successful diagnostic weakens both explanations: dynamically installed 150-meter and 500-meter requests subsequently fired after an entirely backgrounded approach.

The leading implementation difference is identifier handling. The successful test used new, independent notification and region identifiers instead of reusing the Area A slot. This is evidence for preferring fresh identifiers during rotation, but it does **not** establish a general iOS rule or prove that identifier reuse caused the failure.

### What was proven

- Significant-location-change monitoring can provide a low-power native wake after meaningful movement while ThereYouGo is backgrounded.
- Native Swift can use that wake to rotate system-owned `UNLocationNotificationTrigger` destinations without React Native or JavaScript running.
- Newly installed, independently identified destination triggers can subsequently deliver arrival notifications while the app remains backgrounded.
- The architecture does not require continuous GPS tracking or a connection to the development computer.
- Verification-before-removal is a workable update sequence: install and verify the new window, then remove the old destination.

This validates the core rotating-local-window architecture: native iOS can maintain a small, relevant set of arrival triggers as the user moves.

### What remains uncertain

- Whether same-identifier replacement is intrinsically unreliable or the earlier failure had another cause.
- The best production radius, hysteresis policy, and dwell/visit heuristics.
- Behavior after user force-quit, device reboot, reduced-accuracy authorization, disabled services, or extended offline periods.
- How many destinations should be active, how they should be prioritized, and how often rotation should occur.
- How product logic will supply and persist destination candidates for native background use.
- Long-term reliability, battery impact, and behavior near iOS region-monitoring limits.

### Spike cleanup

The hard-coded Area A/Area B plan, dual-radius UI, test-only bridge methods, and debug receipt were removed after the result was recorded. The generic native module for scheduling, inspecting, and canceling location notifications remains. Production rotation should reintroduce the validated native lifecycle pattern only after destination selection and persistence contracts are deliberately designed.

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
