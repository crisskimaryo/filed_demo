// ─────────────────────────────────────────────────────────────
// A loan, as the app understands it.
//
// The API sends JSON (a Map). Dart is typed, so we convert that
// Map into a real object once, here. After this point the rest of
// the app uses `loan.amount` and the compiler checks it — no
// guessing at string keys in twelve different widgets.
// ─────────────────────────────────────────────────────────────

class Loan {
  final String id;
  final int amount; // cents, matching the API
  final String status;
  final String? purpose;
  final DateTime createdAt;

  const Loan({
    required this.id,
    required this.amount,
    required this.status,
    required this.purpose,
    required this.createdAt,
  });

  /// Builds a Loan from one JSON object.
  factory Loan.fromJson(Map<String, dynamic> json) {
    return Loan(
      id: json['id'] as String,
      amount: json['amount'] as int,
      status: json['status'] as String,
      // `as String?` because purpose is optional in the schema.
      purpose: json['purpose'] as String?,
      // JSON has no date type, so the API sends a string and we parse it.
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// The API stores cents. Show shillings.
  String get formattedAmount {
    final whole = amount ~/ 100;
    // Group thousands: 500000 -> "5,000"
    final digits = whole.toString();
    final grouped = digits.replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+$)'),
      (m) => '${m[1]},',
    );
    return 'TSh $grouped';
  }
}
