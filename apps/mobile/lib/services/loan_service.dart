// Loans. Mirrors apps/api/src/modules/loans/.
import '../models/loan.dart';
import 'api_client.dart';

class LoanService {
  /// GET /api/loans — the API returns { items, total, take, skip }
  /// and only ever includes loans you're allowed to see.
  static Future<List<Loan>> list({String? status}) async {
    final query = status != null ? '?status=$status' : '';
    final data = await ApiClient.get('/api/loans$query');

    final items = data['items'] as List<dynamic>;

    return items
        .map((json) => Loan.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// POST /api/loans
  ///
  /// We send only amount and purpose. We do NOT send a userId —
  /// the API takes the owner from the token, and would ignore it
  /// anyway. Nor a status: new loans are always PENDING.
  static Future<Loan> create({required int amount, String? purpose}) async {
    final data = await ApiClient.post('/api/loans', {
      'amount': amount,
      if (purpose != null && purpose.isNotEmpty) 'purpose': purpose,
    });

    return Loan.fromJson(data as Map<String, dynamic>);
  }
}
