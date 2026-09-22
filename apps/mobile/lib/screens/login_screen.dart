// ─────────────────────────────────────────────────────────────
// The login screen.
//
// Watch how it handles failure: it catches ApiException and shows
// the API's own message. So the rule you wrote in the backend
// ("Invalid email or password") is what the user reads here.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';

import '../services/api_exception.dart';
import '../services/auth_service.dart';
import 'loans_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Controllers let us read what the user typed.
  final _emailController = TextEditingController(text: 'amina@zeni.test');
  final _passwordController = TextEditingController(text: 'password123');

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    // Always release controllers, or you leak memory.
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final user = await AuthService.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (!mounted) return;

      // Replace the login screen so Back doesn't return to it.
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => LoansScreen(user: user)),
      );
    } on ApiException catch (e) {
      // The API said no. Show its message.
      setState(() => _error = e.message);
    } catch (e) {
      // Usually means the server isn't running, or the wrong baseUrl.
      setState(
        () => _error =
            'Could not reach the API. Is it running?\n\n$e',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.savings_outlined, size: 64),
                const SizedBox(height: 12),
                Text(
                  'Zeni Loans',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 32),

                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: _passwordController,
                  obscureText: true, // hides the password
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: (_) => _submit(),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _loading ? null : _submit,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Log in'),
                  ),
                ),

                const SizedBox(height: 24),
                const Text(
                  'Seeded accounts (password123):\n'
                  'admin@zeni.test · amina@zeni.test · juma@zeni.test',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
