# ThereYouGo

ThereYouGo is an iOS-first Expo application that reminds people about what they
need when they reach a useful place.

This repository contains two independent Node projects:

- `/` — the existing React Native/Expo mobile application
- `/server` — a small NestJS API for server-side product logic and integrations

Install and run each project from its own directory. They intentionally do not
share dependencies or workspace configuration.

## Test the mobile-to-server place lookup

The app reads its development API origin from Expo's public environment
configuration. This value is only a server address; the Google Places key stays
in `server/.env` and is never included in the mobile app.

1. Put the Mac and iPhone on the same local network and find the Mac's Wi-Fi
   address (usually `ipconfig getifaddr en0`).
2. Create the app's ignored local environment file:

   ```bash
   cp .env.example .env.local
   ```

   Replace the example address with the Mac's address, keeping the server port:

   ```dotenv
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.23:3000
   ```

3. Start the configured backend:

   ```bash
   cd server
   npm run start:dev
   ```

4. From the Mac, verify both loopback and LAN access:

   ```bash
   curl http://localhost:3000/health
   curl http://192.168.1.23:3000/health
   ```

   If LAN access fails, allow Node through the macOS firewall and confirm that
   the network does not isolate wireless clients.
5. The iOS local-network permission description and local HTTP transport
   setting are native configuration. Rebuild and install the development client
   once after this change:

   ```bash
   npx expo run:ios --device
   ```

6. Start Expo (`npm start`), open the development build on the iPhone, and add
   `Milk`. Accept foreground location and local-network access when prompted.

The development logs will show Milk detection, the coordinates obtained, the
request, candidate names, and unsupported items. A denied permission,
missing configuration, invalid response, or unavailable server is logged and
does not alter the saved item list. After editing `.env.local`, fully reload
the app so Expo inlines the new value.

This milestone only fetches and parses candidates. It does not pass them to the
native location-notification scheduler.