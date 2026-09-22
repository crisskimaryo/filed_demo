# Mobile 0. Start here

You've built an API. Nothing uses it yet. This half of the project is the app that does.

**Read the [backend docs](../00-start-here.md) first**, at least through doc 4 (authentication). This side assumes you know what a token is and why the backend enforces rules.

## What Flutter is

Flutter builds apps for iOS and Android from one codebase, written in **Dart**. If you know JavaScript or TypeScript, Dart will feel familiar: classes, `async`/`await`, typed variables.

The idea that matters most: **everything is a widget.** A button, a text label, some padding, the whole screen — all widgets, nested inside each other. You describe what the screen should look like, and Flutter draws it.

## Run both halves

You need **two terminals**. The app is useless without the API running.

**Terminal 1 — the API:**
```bash
cd apps/api
bun run dev
```

**Terminal 2 — the app:**
```bash
cd apps/mobile
flutter devices     # see what you can run on
flutter run
```

Then log in with `amina@zeni.test` / `password123` (already filled in for you).

> The first Android build takes several minutes — Gradle is compiling everything. Later builds are fast, and saving a file hot-reloads in under a second.

## The one thing that breaks for everybody

`localhost` means *this device*. On an Android emulator, "this device" is the emulator, not your computer — so `localhost:3300` looks for an API running *inside the emulator*, finds nothing, and you get "Could not reach the API".

[lib/services/api_client.dart](../../apps/mobile/lib/services/api_client.dart) handles it:

| Where you run | Address to use |
|---|---|
| iOS simulator | `http://localhost:3300` |
| Android emulator | `http://10.0.2.2:3300` ← the emulator's alias for your computer |
| a real phone | `http://<your-computer's-IP>:3300` |

On a real phone, find your IP with `ipconfig getifaddr en0` (macOS), and make sure the phone is on the same WiFi.

## How the app is organised

Same instinct as the API: each folder has one job.

```
apps/mobile/lib/
├─ main.dart              starts the app, decides the first screen
├─ models/                API JSON → typed Dart objects
│  ├─ loan.dart
│  └─ user.dart
├─ services/              the only code that talks to the API
│  ├─ api_client.dart     ← base URL, token, error translation
│  ├─ api_exception.dart
│  ├─ auth_service.dart
│  └─ loan_service.dart
├─ screens/               full pages
│  ├─ login_screen.dart
│  ├─ loans_screen.dart
│  └─ new_loan_screen.dart
└─ widgets/               reusable pieces
   └─ loan_card.dart
```

Compare that to the API:

| API | App | Job |
|---|---|---|
| `*.model.ts` | `models/` | the shape of the data |
| `*.service.ts` | `services/` | logic and talking to the outside |
| `*.route.ts` | `screens/` | what the user actually touches |

**`services/` is the only place that knows the API exists.** No screen builds a URL or attaches a token. That's the same reason the API has one `prisma.ts`: one door to the outside world, so the awkward details are written once.

## Do this now

1. Get both halves running and log in as **amina**. You should see 2 loans.
2. Log out (top-right icon), then log in as **admin@zeni.test**. You see **all** loans, and the title says "All loans".

   Now look at [loans_screen.dart](../../apps/mobile/lib/screens/loans_screen.dart) and search for the word "admin". The only thing the app does differently is the title and the role chip — **it never filters anything**. The different list comes entirely from the API's rules. That's what "the backend enforces the rules" means in practice.
3. Watch the API terminal while you pull-to-refresh. You'll see the SQL, with `WHERE userId = ?` for amina and no such filter for admin.
4. Now stop the API (Ctrl+C in terminal 1) and pull-to-refresh again. You get a friendly error instead of a crash — that's the `catch` in `_load()`.

Next: [mobile doc 1, how the connection works](01-connecting.md).
