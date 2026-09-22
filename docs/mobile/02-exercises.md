# Mobile 2. Exercises

Ten exercises, easy to hard. Several need a backend change too — those are marked **full-stack**, and they're the valuable ones.

**How to work:**

1. Branch: `git checkout -b my-mobile-1`
2. Build it. Use hot reload (save the file, watch it update).
3. Check `flutter analyze` is clean and `flutter test` passes.

---

## Level 1 — Dart and widgets

### Exercise 1: Show the date
Each loan card shows only the amount, purpose and status. Add the date it was applied for.

<details><summary>Hints</summary>

- `loan.createdAt` is already a real `DateTime` (parsed in `loan.dart`).
- Start simple: `'${d.day}/${d.month}/${d.year}'`.
- Nicer: add the `intl` package (`flutter pub add intl`) and use `DateFormat('d MMM y').format(loan.createdAt)`.
- Nicest: a `timeAgo` getter returning "3 days ago". Write a unit test for it — it's pure logic, so it's easy to test.
</details>

### Exercise 2: A total at the top
Show the sum of all displayed loans above the list.

<details><summary>Hints</summary>

- `_loans.fold<int>(0, (sum, loan) => sum + loan.amount)`
- Remember the total is in cents — reuse the same `~/ 100` formatting. Better: move `formattedAmount`'s logic into a shared function so it isn't written twice.
</details>

### Exercise 3: Filter by status
Add filter chips (All / Pending / Active / Paid) above the list.

<details><summary>Hints</summary>

- `LoanService.list()` already takes `status` — the API supports `?status=ACTIVE`.
- Use `FilterChip` in a `Row`, keep the selection in state, and call `_load()` when it changes.
- **Think about where to filter.** You could filter `_loans` in Dart instead. Which is better? Filtering on the server sends less data and scales to thousands of rows; filtering locally is instant and works offline. There's no single right answer — but know why you chose.
</details>

---

## Level 2 — new screens

### Exercise 4: A loan detail screen
Tap a card → a full screen for that loan.

<details><summary>Hints</summary>

- Wrap `LoanCard` in `InkWell` or `GestureDetector`, then `Navigator.push`.
- You already have the `Loan` object, so you *can* just pass it. But the API has `GET /api/loans/:id` — fetching fresh data means you see changes an admin made. Consider showing the passed-in data immediately and refreshing in the background.
</details>

### Exercise 5: Register from the app — **full-stack**
Add a sign-up screen. The API endpoint already exists.

<details><summary>Hints</summary>

- `AuthService.register` is already written. You need the screen and a link from login.
- Match the API's rules in your form validators: name ≥ 2 characters, password ≥ 8.
- Then test the mismatch on purpose: allow a 3-character password client-side and watch the API reject it with `422`. Read the `details` array in the response — it names the field, so you can show the error on the right input.
- Handle `409` ("Email already registered") as a message on the email field, not a generic banner.
</details>

### Exercise 6: Profile screen — **full-stack**
Show and edit the profile at `GET/PATCH /api/profiles/me`.

<details><summary>Hints</summary>

- Write a `Profile` model and a `ProfileService` mirroring the existing ones.
- Sending `null` clears a field; leaving it out means "don't change" — that's what `t.Optional(t.Nullable(...))` means in the API's model. Make sure your code can express both.
</details>

---

## Level 3 — real app concerns

### Exercise 7: Keep the user logged in properly
The app checks the token at startup, but `LoansScreen` receives a `User` object that's never refreshed.

<details><summary>Hints</summary>

- If an admin changes your role, the app won't notice until you restart. Why? (The role came from the token at login. See the revocation trade-off in [backend doc 4](../04-authentication.md).)
- Consider a simple `AuthState` class holding the current user, passed down or held in an `InheritedWidget`. Look up `provider` or `riverpod` when this starts to hurt — that's what state management libraries are for.
</details>

### Exercise 8: Admin approval — **full-stack**
Let an admin approve or reject pending loans from the app.

<details><summary>Hints</summary>

- Do [backend exercise 8](../07-exercises.md) first, which adds `POST /api/loans/:id/approve`.
- Show the buttons only when `user.isAdmin` **and** the loan is `PENDING`.
- Now the important bit: hiding a button is not security. With the buttons hidden, log in as a normal user and `curl` the approve endpoint directly. You should get `403`. If you don't, your backend check is missing — the UI was hiding a hole.
</details>

### Exercise 9: Handle a slow or missing network
Right now a failed request shows an error. Make it more robust.

<details><summary>Hints</summary>

- Add a timeout: `http.post(...).timeout(const Duration(seconds: 10))`, and catch `TimeoutException` separately — "the server is slow" is a different message from "you're offline".
- Try it for real: stop the API mid-request, or use the emulator's settings to simulate a slow network.
- Consider caching the last successful list so the app shows something offline. Where would you store it? (`shared_preferences` for small data; `sqflite` for a real local database.)
</details>

### Exercise 10: Widget tests
The existing tests cover models only. Test the UI.

<details><summary>Hints</summary>

- `testWidgets('shows an empty state when there are no loans', (tester) async { ... })`
- `await tester.pumpWidget(...)`, then `expect(find.text('No loans yet'), findsOneWidget)`.
- The services use static methods, which makes them hard to fake. That's a real design lesson: to test a screen without a live API you need to *inject* the service rather than call it directly. Refactoring `LoanService` into an injectable class is the actual exercise here — and it's the same "seams make things testable" idea as the API's service layer.
</details>

---

## Full-circle challenge

Build a feature end to end, in this order:

1. **Schema** — add the field/model in `apps/api/prisma/schema.prisma`, migrate.
2. **API** — model, service, route. Write a test.
3. **App** — Dart model, service method, UI.
4. **Verify** — the feature works in the app, *and* the rule holds when you bypass the app with `curl`.

Good candidates: loan repayments (see [backend exercise 5](../07-exercises.md)), due dates with an overdue badge, or a notes/comments thread on a loan.

That last verification step is the habit worth building. A feature isn't done because the button works — it's done when the rule survives someone who isn't using your button.
