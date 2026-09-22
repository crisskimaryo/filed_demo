// Tests for the Loan model.
//
// Parsing JSON is exactly the kind of thing worth testing: it sits
// between two systems, and a mismatch shows up as a crash at runtime
// rather than a compile error.
//
// Run with: flutter test
import 'package:flutter_test/flutter_test.dart';
import 'package:zeni_mobile/models/loan.dart';

void main() {
  group('Loan.fromJson', () {
    // A realistic response from GET /api/loans.
    final json = {
      'id': 'cmucfj11n0000fc9khdlvxkt2',
      'amount': 500000,
      'status': 'ACTIVE',
      'purpose': 'School fees',
      'createdAt': '2026-09-22T08:45:56.363Z',
    };

    test('reads every field', () {
      final loan = Loan.fromJson(json);

      expect(loan.id, 'cmucfj11n0000fc9khdlvxkt2');
      expect(loan.amount, 500000);
      expect(loan.status, 'ACTIVE');
      expect(loan.purpose, 'School fees');
      expect(loan.createdAt.year, 2026);
    });

    test('accepts a null purpose, because the API allows it', () {
      final loan = Loan.fromJson({...json, 'purpose': null});

      expect(loan.purpose, isNull);
    });
  });

  group('formattedAmount', () {
    Loan loanWith(int amount) => Loan(
          id: 'x',
          amount: amount,
          status: 'PENDING',
          purpose: null,
          createdAt: DateTime(2026),
        );

    test('converts cents to shillings', () {
      // The API stores cents, so 500000 cents is 5,000 shillings.
      expect(loanWith(500000).formattedAmount, 'TSh 5,000');
    });

    test('groups thousands', () {
      expect(loanWith(100000000).formattedAmount, 'TSh 1,000,000');
    });

    test('handles small amounts without a separator', () {
      expect(loanWith(10000).formattedAmount, 'TSh 100');
    });
  });
}
