// Tests for the error type the UI branches on.
import 'package:flutter_test/flutter_test.dart';
import 'package:zeni_mobile/services/api_exception.dart';

void main() {
  test('401 is an auth problem, so the app should log the user out', () {
    const e = ApiException(401, 'Invalid or expired token');

    expect(e.isAuthProblem, isTrue);
    expect(e.isForbidden, isFalse);
  });

  test('403 is not an auth problem — logging in again would not help', () {
    const e = ApiException(403, 'This loan belongs to someone else');

    expect(e.isAuthProblem, isFalse);
    expect(e.isForbidden, isTrue);
  });

  test('toString gives the API message, ready to show the user', () {
    expect(
      const ApiException(409, 'Email already registered').toString(),
      'Email already registered',
    );
  });
}
