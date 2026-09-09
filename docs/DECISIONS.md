# Decision Log

This is a lightweight record of intentional product and technical decisions. Add a dated entry when a decision changes.

## Initial decisions — 2026-09-09

### React Native and TypeScript own the product layer

React Native owns UI, product logic, application state, and future integrations. TypeScript is configured in strict mode.

### Use Expo development builds

Use Expo tooling with development builds, not Expo Go, because the spike is expected to require custom native code.

### Build for iOS first

The feasibility question concerns iPhone background behavior. Simulator use is appropriate for the scaffold, but visit detection must be validated on physical iPhones.

### Permit a focused native Swift module

Swift may own visit-detection behavior that benefits from Apple frameworks and iOS lifecycle integration. The rest of the application remains in React Native.

### Keep the spike local and minimal

The spike has no backend, AI integration, maps service, or POI provider. It collects raw evidence around hard-coded test locations before attempting classification.

### Keep manual location configuration out of the intended UX

The eventual product should infer where and when a reminder is useful. Users should not need to configure stores, geofences, radiuses, or locations.
