# Zeni Loans — mobile app

The Flutter app for the [Zeni Loans API](../api). See the [workspace README](../../README.md) to run both.

```bash
flutter pub get
flutter run
```

The API must be running (`cd ../api && bun run dev`), or every screen shows a connection error.

## Docs

- [mobile doc 0 — start here](../../docs/mobile/00-start-here.md)
- [mobile doc 1 — how the app and API connect](../../docs/mobile/01-connecting.md)
- [mobile doc 2 — exercises](../../docs/mobile/02-exercises.md)

## Structure

```
lib/
├─ main.dart        starts the app, picks the first screen
├─ models/          API JSON → typed Dart objects
├─ services/        the ONLY code that talks to the API
├─ screens/         full pages
└─ widgets/         reusable pieces
```

## The base URL gotcha

`localhost` means *this device*, so on an emulator it isn't your computer. [lib/services/api_client.dart](lib/services/api_client.dart) picks the right address:

| Running on | Address |
|---|---|
| iOS simulator | `http://localhost:3300` |
| Android emulator | `http://10.0.2.2:3300` |
| real phone | `http://<your-computer-IP>:3300` (same WiFi) |

## Commands

| Command | Does |
|---|---|
| `flutter run` | build and run |
| `flutter test` | run tests |
| `flutter analyze` | lint and type-check |
| `flutter devices` | list devices |
