# ThereYouGo server

Small NestJS API for server-side product logic and integrations. It is an
independent Node project from the Expo application at the repository root.

## Local development

```bash
cd server
npm install
cp .env.example .env
npm run start:dev
```

The API defaults to port `3000`. Add your restricted server-side Google Places
API key to `.env` before using the Places endpoint:

```dotenv
GOOGLE_PLACES_API_KEY=your-real-key
```

The ignored `.env` file is the only project file that should contain the real
credential. Restrict the key to the Places API (New) and to the server
environment where possible.

Check the running service:

```bash
curl http://localhost:3000/health
```

## Place candidates

`POST /places/candidates` accepts:

```json
{
  "reminders": ["Milk"],
  "location": {
    "latitude": 34.0,
    "longitude": -118.4
  }
}
```

It returns an application-owned contract:

```json
{
  "candidates": [
    {
      "id": "google-place-id",
      "name": "Neighborhood Market",
      "location": {
        "latitude": 34.001,
        "longitude": -118.401
      }
    }
  ],
  "unsupportedReminders": []
}
```

The current product rule is intentionally limited to case-insensitive `milk`,
which maps to the application category `grocery-store`. Unsupported reminders
are listed in `unsupportedReminders`; when none are supported, the endpoint
returns an empty candidate list without calling Google.

The Google integration uses Nearby Search (New):

- `POST https://places.googleapis.com/v1/places:searchNearby`
- included type: `grocery_store`
- field mask: `places.id,places.displayName,places.location`
- radius: 3,218.688 meters (2 miles)
- maximum results: 5
- ranking: `DISTANCE`, which Google documents as ascending distance from the
  requested location

The two-mile radius and five-candidate cap are centralized constants in
`google-places.provider.ts`. They are conservative initial values intended for
real-world tuning and for the eventual iOS location-region budget.

## Validation

```bash
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run build
npx tsc --noEmit
```
