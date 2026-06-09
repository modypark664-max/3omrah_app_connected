# Rehlatty React Native App

Expo SDK 54–powered mobile companion for the Rehlatty platform. The app now includes the onboarding carousel, authentication flow, and backend connectivity that mirror the production website.

## Features

- Shared color system aligned with the production website.
- Custom bottom tab navigation that mirrors the primary sections (Home, Bundles, Compare, Contact, Profile).
- Guided onboarding experience with swipeable highlight cards and progress indicator.
- Website-matching login and signup screens (phone + password) with validation/error handling.
- Authenticated navigation flow that gates the main tabs until the user completes onboarding and signs in.
- Centralized API client that connects signup/login to the Express/Mongo backend (session cookies + JSON payloads).
- Fully responsive Contact screen with:
  - Call-to-action card (call button, hotline number, service hours).
  - Interactive map centered on Mecca with a branded marker.
  - Contact form (name, email, phone, message) with phone validation and submission feedback.
  - Quick-access info cards for phone, email, working hours, and address.
  - Floating WhatsApp button linked to the official support number.

## Getting Started

```bash
cd 3OMRAH_APP
npm install
npm run start
```

### Configure backend API access

Authentication screens call the server via `src/services/api.js`, which reads the base URL from the Expo extra config:

```jsonc
// app.json
{
  "expo": {
    // ...
    "extra": {
      "apiUrl": "https://www.rehlatty.com"
    }
  }
}
```

- Use a LAN-accessible URL (e.g., `http://192.168.1.23:3000`) when testing from a physical device.
- For staging/production builds, override `EXPO_PUBLIC_API_URL` or edit the `app.json` entry in your deployment pipeline.
- The API helper sends `credentials: 'include'`, so ensure CORS allows cookies from your Expo origin.
- You can also create a `.env` file in `3OMRAH_APP/` with `EXPO_PUBLIC_API_URL` and other `EXPO_PUBLIC_*` values for local overrides (see the provided template).

After updating `app.json`, restart Expo (`npm run start -- --clear`) so the new config reaches the Metro bundler.

Use the Expo CLI prompts to open the app on iOS, Android, or the web. This project now targets Expo SDK 54 / React Native 0.81, so make sure you're running Node.js 20.19+ and the latest Expo CLI / Expo Go builds. The default account data lives in `src/constants/contact.js` if you need to update phone/email details.

## Share a downloadable test build

We've added `eas.json` with `preview` (internal) and `production` build profiles plus a step-by-step guide in [`docs/distribution.md`](./docs/distribution.md). Highlights:

- Run `eas login && eas init` once so Expo assigns a project ID and updates `app.json` (required for hosted links).
- Use the preview profile to create a hosted APK and shareable Expo page:
  ```bash
  cd 3OMRAH_APP
  EXPO_PUBLIC_API_URL=https://staging-api.rehlatty.com \
    eas build --platform android --profile preview
  ```
- The CLI prints a link such as `https://expo.dev/accounts/<account>/projects/<project>/builds/<id>`—share it with your team so they can download/install without a store listing.
- Repeat with `--platform ios` (requires Apple credentials) or switch to the `production` profile when you're ready for store submissions.

See the doc for troubleshooting tips, credential setup, and guidance on TestFlight/Play submission.

## Next Steps

- Build out each placeholder screen with the actual website sections.
- Integrate backend APIs (authentication, bundles, compare, chat, etc.).
- Add localization helpers and shared UI primitives for quicker page conversions.
- Introduce automated tests (unit + component) once the data layer is ready.
