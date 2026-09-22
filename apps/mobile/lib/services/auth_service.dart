// ─────────────────────────────────────────────────────────────
// Login and logout. Mirrors apps/api/src/modules/auth/.
//
// Note the shape: this file talks to ApiClient and returns model
// objects. It builds no widgets. Same separation as the API's
// service layer, which talks to Prisma and knows no HTTP.
// ─────────────────────────────────────────────────────────────
import '../models/user.dart';
import 'api_client.dart';

class AuthService {
  /// POST /api/auth/login — saves the token on success.
  static Future<User> login(String email, String password) async {
    final data = await ApiClient.post('/api/auth/login', {
      'email': email,
      'password': password,
    });

    // Store the token first, so the next request is authenticated.
    await ApiClient.saveToken(data['token'] as String);

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// POST /api/auth/register — the API logs you straight in.
  static Future<User> register(
    String name,
    String email,
    String password,
  ) async {
    final data = await ApiClient.post('/api/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });

    await ApiClient.saveToken(data['token'] as String);

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// GET /api/auth/me — used at startup to check a saved token
  /// is still valid (it might have expired).
  static Future<User> me() async {
    final data = await ApiClient.get('/api/auth/me');
    return User.fromJson(data as Map<String, dynamic>);
  }

  /// There is no logout endpoint: the API doesn't store tokens,
  /// so logging out just means forgetting ours. (The trade-off
  /// this creates is explained in the API's doc 4.)
  static Future<void> logout() => ApiClient.clearToken();
}
