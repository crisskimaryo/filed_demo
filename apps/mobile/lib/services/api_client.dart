// ─────────────────────────────────────────────────────────────
// The ONLY place in this app that knows the API exists.
//
// Every screen goes through here. That means the token handling,
// the base URL and the error translation are each written once.
// Compare apps/api/src/lib/prisma.ts — same idea, one door to
// the outside world.
// ─────────────────────────────────────────────────────────────
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'api_exception.dart';

class ApiClient {
  /// Where the API lives.
  ///
  /// IMPORTANT — this differs per device:
  ///   iOS simulator / web : http://localhost:3300
  ///   Android emulator    : http://10.0.2.2:3300  (10.0.2.2 is the
  ///                         emulator's alias for your computer)
  ///   real phone          : http://`your-computer-IP`:3300
  ///
  /// "localhost" on a phone means the phone itself, which is why a
  /// real device cannot see your laptop's server without the IP.
  static String get baseUrl {
    if (Platform.isAndroid) return 'http://10.0.2.2:3300';
    return 'http://localhost:3300';
  }

  static const _tokenKey = 'auth_token';

  /// The login token, kept on the device so you stay logged in
  /// after closing the app.
  static Future<String?> readToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  /// Builds the headers, adding `Authorization: Bearer <token>`
  /// when we have one — exactly what authGuard on the API expects.
  static Future<Map<String, String>> _headers() async {
    final token = await readToken();

    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> get(String path) async {
    final response = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    );

    return _handle(response);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );

    return _handle(response);
  }

  static Future<dynamic> patch(String path, Map<String, dynamic> body) async {
    final response = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );

    return _handle(response);
  }

  /// Turns an HTTP response into data, or throws ApiException.
  ///
  /// This is the mirror image of the `onError` handler in
  /// apps/api/src/app.ts: there, errors become JSON + a status
  /// code; here, that pair becomes a Dart exception again.
  static dynamic _handle(http.Response response) {
    final isJson = response.body.isNotEmpty;
    final decoded = isJson ? jsonDecode(response.body) : null;

    // 2xx means it worked.
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    // Otherwise read the API's error shape: { error, message }
    final message = decoded is Map && decoded['message'] is String
        ? decoded['message'] as String
        : 'Request failed (${response.statusCode})';

    throw ApiException(response.statusCode, message);
  }
}
