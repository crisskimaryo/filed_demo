# Mobile 1. How the two halves connect

This is the most important document in the project, because it's where the two things you're learning meet.

## One tap, all the way down

You tap **Log in**. Here's every hop:

```
  tap "Log in"
       ↓
1 login_screen.dart          _submit()
       ↓
2 auth_service.dart          AuthService.login(email, password)
       ↓
3 api_client.dart            POST http://10.0.2.2:3300/api/auth/login
       ↓  ~~~~~~ the network ~~~~~~
4 app.ts                     route matching
5 auth.route.ts              the handler
6 auth.service.ts            verifyCredentials()
7 password.ts                bcrypt compares the hashes
8 prisma → SQLite            SELECT * FROM User WHERE email = ?
       ↓
9 auth.route.ts              jwt.sign({ sub, email, role })
       ↓  ~~~~~~ back over the network ~~~~~~
10 api_client.dart           saves the token on the device
11 login_screen.dart         navigates to the loans list
```

Steps 1–3 and 10–11 are Dart. Steps 4–9 are the TypeScript you already wrote. **The network is the only boundary**, and JSON is the only thing that crosses it.

Prove it to yourself: keep the API terminal visible while you log in. That `SELECT ... FROM User` you see is step 8, triggered by your tap.

## Where the token lives

After login, the token is saved on the device:

```dart
await ApiClient.saveToken(data['token'] as String);
```

and attached to every later request:

```dart
return {
  'Content-Type': 'application/json',
  if (token != null) 'Authorization': 'Bearer $token',
};
```

That header is exactly what `authGuard` in [apps/api/src/lib/auth.middleware.ts](../../apps/api/src/lib/auth.middleware.ts) looks for. The two sides agree on one string format — that's the whole contract.

Because it's saved to the device, closing and reopening the app keeps you logged in. `main.dart` checks at startup:

```dart
final token = await ApiClient.readToken();
if (token == null) → show login
else               → ask GET /api/auth/me whether it still works
```

That second step matters. A saved token might have **expired** (7 days, set in the API). Trusting it blindly would show an empty screen with confusing errors; asking `/me` tells you in one request.

## Errors: thrown on both sides

The API throws typed errors, and one handler turns them into JSON:

```ts
// apps/api/src/lib/errors.ts
throw new UnauthorizedError("Invalid email or password");
// becomes: 401 { "error": "UnauthorizedError", "message": "Invalid email or password" }
```

The app turns that back into an exception:

```dart
// apps/mobile/lib/services/api_client.dart
throw ApiException(response.statusCode, message);
```

So the message you wrote in the backend is what the user reads on screen. One place decides the wording.

And the app branches on the **status code**, not the text:

```dart
on ApiException catch (e) {
  if (e.isAuthProblem) {     // 401 → token is bad
    await _logout();          //       so send them to login
    return;
  }
  setState(() => _error = e.message);   // anything else → just show it
}
```

This is why the API's status codes had to be right. A `401` means "log in again"; a `403` means "don't bother, it isn't yours". If the API returned `500` for everything, the app couldn't tell these apart — and this is the payoff for the care taken in [backend doc 5](../05-errors-validation.md).

## Money: cents on the wire

The API stores **cents** (`amount Int`), to avoid floating-point money bugs. The user thinks in shillings. So the app converts at both edges:

```dart
// sending: new_loan_screen.dart
amount: shillings * 100

// displaying: loan.dart
final whole = amount ~/ 100;   // ~/ is integer division in Dart
```

A mismatch here is a classic bug — and one this project actually had. The seed file wrote `500_000` meaning shillings, while the schema said cents, so the app correctly displayed "TSh 5,000" for a 500,000 loan. Nothing crashed; the number was just wrong by 100×.

**The lesson: both sides must agree on the unit, and "it runs" doesn't prove they do.** Write the unit in a comment next to the field, as `schema.prisma` does.

## Validation happens twice, on purpose

Apply for a loan of `0` and the app refuses before sending anything:

```dart
if (parsed < 1) return 'Must be more than zero';
```

The API *also* refuses:

```ts
amount: t.Integer({ minimum: 1 })
```

Not redundant — they do different jobs:

| | Client-side | Server-side |
|---|---|---|
| purpose | fast, friendly feedback | **actually enforcing the rule** |
| works offline | yes | no |
| can be bypassed | **yes, trivially** | no |

**Client-side validation is a convenience, never security.** Anyone can skip your app entirely:

```bash
TOKEN=$(curl -s -X POST localhost:3300/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"amina@zeni.test","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# no app involved — straight at the API
curl -X POST localhost:3300/api/loans \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount": 0}'
```

You get `422`. **Do run this.** It's the clearest possible demonstration of why the rule has to live in the backend. Then try `{"amount": 5000, "status": "ACTIVE"}` — the API ignores your status and creates it as `PENDING`, because `createBody` doesn't accept that field.

## What the app never sends

Look at `LoanService.create`:

```dart
static Future<Loan> create({required int amount, String? purpose}) async {
  final data = await ApiClient.post('/api/loans', {
    'amount': amount,
    if (purpose != null && purpose.isNotEmpty) 'purpose': purpose,
  });
```

No `userId`. No `status`. The API takes the owner from the verified token and forces the status. Even a modified app couldn't create a loan in someone else's name — which is the point of not trusting the client with identity.

## Do this now

1. **Watch both sides at once.** Put the API terminal and the emulator side by side. Log in, refresh, create a loan. Match each action to the SQL it causes.
2. **Break the connection.** Stop the API, then pull-to-refresh. Read the error. Start it again and refresh.
3. **Bypass the app.** Run the `curl` above and get your `422`. This is the lesson.
4. **Forge a status.** Send `{"amount": 5000, "status": "ACTIVE"}` and check in the app that it's `PENDING`.
5. **Expire a token by hand.** In `apps/api/.env`, change `JWT_SECRET`, restart the API, then pull-to-refresh in the app. Every existing token is now invalid, so the app logs you out automatically — that's the `isAuthProblem` branch. Change it back afterwards.

Next: [mobile doc 2, exercises](02-exercises.md).
