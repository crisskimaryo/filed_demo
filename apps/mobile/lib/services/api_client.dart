// ─────────────────────────────────────────────────────────────
// The ONLY place in this app that knows the API exists.
//
// Every screen goes through here, so the base URL, the token and
// the error translation are each written exactly once. Compare
// apps/api/src/lib/prisma.ts — same idea: one door to the
// outside world, so the awkward details live in one file.
//
// We use Dio rather than the plain `http` package because of
// INTERCEPTORS (see below): they let us attach the token to every
// request automatically, instead of remembering to do it in each
// method.
// ─────────────────────────────────────────────────────────────
import 'dart:io';

import 'package:dio/dio.dart';
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

  /// The single Dio instance the whole app shares.
  ///
  /// `late final` means "build it the first time someone asks, then
  /// keep it". One instance reuses its network connections, which is
  /// faster than making a new one per request.
  static late final Dio _dio = _build();

  static Dio _build() {
    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        // Give up rather than hang forever on a dead server.
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        contentType: 'application/json',
        // Accept every status code and decide for ourselves in
        // _toException below. Otherwise Dio throws before we can
        // read the API's { error, message } body.
        validateStatus: (_) => true,
      ),
    );

    // ── Interceptor: attach the token to every request ──
    //
    // This runs before each request leaves the app. It's why no
    // method below mentions the Authorization header: the token is
    // added in ONE place, so a new request can't forget it. That's
    // the same "enforce it once" idea as authGuard on the API.
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await readToken();

          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          return handler.next(options);
        },
      ),
    );

    return dio;
  }

  // ── The token ──
  //
  // Kept on the device so you stay logged in after closing the app.

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

  // ── The requests ──

  static Future<dynamic> get(String path) async {
    return _send(() => _dio.get<dynamic>(path));
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    return _send(() => _dio.post<dynamic>(path, data: body));
  }

  static Future<dynamic> patch(String path, Map<String, dynamic> body) async {
    return _send(() => _dio.patch<dynamic>(path, data: body));
  }

  static Future<dynamic> delete(String path) async {
    return _send(() => _dio.delete<dynamic>(path));
  }

  /// Runs a request and converts any failure into an ApiException.
  ///
  /// Taking the request as a function means the try/catch is written
  /// once here rather than in all four methods above.
  static Future<dynamic> _send(Future<Response<dynamic>> Function() run) async {
    try {
      final response = await run();
      return _unwrap(response);
    } on DioException catch (e) {
      // The request never completed: no server, no network, timeout.
      throw ApiException(0, _describeNetworkProblem(e));
    }
  }

  /// Turns a response into data, or throws ApiException.
  ///
  /// This is the mirror image of the `onError` handler in
  /// apps/api/src/app.ts: there, a thrown error becomes JSON plus a
  /// status code; here, that pair becomes a Dart exception again.
  static dynamic _unwrap(Response<dynamic> response) {
    final status = response.statusCode ?? 0;

    // 2xx means it worked.
    if (status >= 200 && status < 300) {
      return response.data;
    }

    // Otherwise read the API's error shape: { error, message }
    final data = response.data;
    final message = data is Map && data['message'] is String
        ? data['message'] as String
        : 'Request failed ($status)';

    throw ApiException(status, message);
  }

  /// A readable message for the cases where there's no reply at all.
  ///
  /// Worth distinguishing: "the server is slow" needs a retry, while
  /// "nothing is listening" means the API isn't running.
  static String _describeNetworkProblem(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return 'The API took too long to answer. Is it still running?';
      case DioExceptionType.connectionError:
        return 'Could not reach the API at $baseUrl.\n\n'
            'Is it running? On an Android emulator the address must be '
            '10.0.2.2, not localhost.';
      default:
        return 'Network problem: ${e.message ?? e.type.name}';
    }
  }
}
