// ─────────────────────────────────────────────────────────────
// App entry point.
//
// Decides which screen to show first: if a saved token still
// works, go to the loans list; otherwise show login.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';

import 'models/user.dart';
import 'screens/loans_screen.dart';
import 'screens/login_screen.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';

void main() {
  runApp(const ZeniApp());
}

class ZeniApp extends StatelessWidget {
  const ZeniApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Zeni Loans',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF00695C)),
        useMaterial3: true,
      ),
      home: const StartupScreen(),
    );
  }
}

/// Shown for a moment at launch while we check the saved token.
class StartupScreen extends StatefulWidget {
  const StartupScreen({super.key});

  @override
  State<StartupScreen> createState() => _StartupScreenState();
}

class _StartupScreenState extends State<StartupScreen> {
  User? _user;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final token = await ApiClient.readToken();

    if (token == null) {
      setState(() => _checking = false);
      return;
    }

    // We have a token, but it may have expired. Ask the API.
    try {
      final user = await AuthService.me();
      setState(() {
        _user = user;
        _checking = false;
      });
    } catch (_) {
      // Token no longer valid — forget it and show login.
      await AuthService.logout();
      setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final user = _user;

    if (user == null) {
      return const LoginScreen();
    }

    return LoansScreen(user: user);
  }
}
