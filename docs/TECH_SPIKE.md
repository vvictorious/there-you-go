# iOS Visit-Detection Technical Spike

## Hypothesis

An iPhone can provide enough background location and motion evidence to distinguish a genuine store visit from passing near a store with useful reliability, including while the app is backgrounded or the phone is locked.

This spike collects raw, timestamped observations around a small set of hard-coded test locations. It will not implement a production classifier.

## Test scenarios

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

## Events to observe

- Region entry and exit, including the monitored location and timestamp
- Location updates and their timestamp, coordinates, accuracy, speed, and course
- Motion activity changes such as automotive, walking, running, stationary, or unknown
- Visit events exposed by iOS, including arrival and departure estimates
- App lifecycle state relevant to each event
- Permission and location-service state
- Errors, delayed delivery, duplicate events, and missing events

## Success criteria

- Events are captured with enough timing and accuracy to compare drive-bys, nearby stops, walk-bys, and sustained visits.
- Evidence continues to arrive reliably enough during backgrounded and locked-device tests.
- Repeated tests show patterns that could support a simple, explainable visit heuristic.
- The approach has acceptable battery impact for continued prototyping.

## Failure criteria

- Genuine visits and drive-bys are consistently indistinguishable.
- Required events are frequently missing, excessively delayed, or unavailable in important lifecycle states.
- Reliability depends on battery-intensive continuous high-accuracy tracking.
- iOS restrictions prevent the intended experience without unacceptable user configuration or expectations.

## Results

No real-world tests have been run yet.
