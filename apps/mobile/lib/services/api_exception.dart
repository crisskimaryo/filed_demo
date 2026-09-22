// ─────────────────────────────────────────────────────────────
// One error type for anything the API rejects.
//
// This mirrors apps/api/src/lib/errors.ts: the API throws typed
// errors with a status code, and so do we. The UI can then decide
// what to show based on `status`.
// ─────────────────────────────────────────────────────────────

class ApiException implements Exception {
  final int status;
  final String message;

  const ApiException(this.status, this.message);

  /// True when the problem is the user's login, not their input.
  bool get isAuthProblem => status == 401;

  /// True when they're logged in but not allowed (see doc 4 of the API docs).
  bool get isForbidden => status == 403;

  @override
  String toString() => message;
}
