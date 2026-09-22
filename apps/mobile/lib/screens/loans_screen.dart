// ─────────────────────────────────────────────────────────────
// The loans list.
//
// The interesting thing to try: log in as amina (2 loans), then
// as admin (all loans). The app code below is identical in both
// cases — the difference comes entirely from the API's rules.
// That is what "the backend enforces the rules" means.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';

import '../models/loan.dart';
import '../models/user.dart';
import '../services/api_exception.dart';
import '../services/auth_service.dart';
import '../services/loan_service.dart';
import '../widgets/loan_card.dart';
import 'login_screen.dart';
import 'new_loan_screen.dart';

class LoansScreen extends StatefulWidget {
  final User user;

  const LoansScreen({super.key, required this.user});

  @override
  State<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends State<LoansScreen> {
  List<Loan> _loans = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final loans = await LoanService.list();
      if (!mounted) return;
      setState(() => _loans = loans);
    } on ApiException catch (e) {
      if (!mounted) return;

      // Token expired while the app was open — send them to login.
      if (e.isAuthProblem) {
        await _logout();
        return;
      }

      setState(() => _error = e.message);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Could not reach the API. Is it running?');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await AuthService.logout();

    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  Future<void> _openNewLoan() async {
    // `await` here waits for the other screen to close. It returns
    // true if a loan was created, so we know to refresh.
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const NewLoanScreen()),
    );

    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.user.isAdmin ? 'All loans' : 'My loans'),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Log out',
          ),
        ],
      ),

      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),

      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openNewLoan,
        icon: const Icon(Icons.add),
        label: const Text('Apply'),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return _CenteredMessage(
        icon: Icons.cloud_off,
        title: 'Something went wrong',
        message: _error!,
        onRetry: _load,
      );
    }

    if (_loans.isEmpty) {
      return const _CenteredMessage(
        icon: Icons.inbox_outlined,
        title: 'No loans yet',
        message: 'Tap Apply to create your first loan.',
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            children: [
              Text(
                'Signed in as ${widget.user.name}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const Spacer(),
              // Showing the role makes the permission rules visible.
              Chip(
                label: Text(widget.user.role),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _loans.length,
            itemBuilder: (context, index) => LoanCard(loan: _loans[index]),
          ),
        ),
      ],
    );
  }
}

/// Shared empty/error state.
class _CenteredMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final VoidCallback? onRetry;

  const _CenteredMessage({
    required this.icon,
    required this.title,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    // ListView (not Column) so pull-to-refresh still works when empty.
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 56, color: Colors.grey),
        const SizedBox(height: 16),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey),
          ),
        ),
        if (onRetry != null) ...[
          const SizedBox(height: 16),
          Center(
            child: OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ),
        ],
      ],
    );
  }
}
