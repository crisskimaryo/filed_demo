// ─────────────────────────────────────────────────────────────
// Apply for a loan.
//
// Two layers of checking happen here, and both matter:
//
//  1. This screen checks the form (fast, friendly, offline).
//  2. The API checks it again (authoritative).
//
// Client-side validation is a convenience, NOT security — anyone
// can bypass the app and call the API directly. Try the exercise
// at the bottom of docs/mobile/01-connecting.md to prove it.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';

import '../services/api_exception.dart';
import '../services/loan_service.dart';

class NewLoanScreen extends StatefulWidget {
  const NewLoanScreen({super.key});

  @override
  State<NewLoanScreen> createState() => _NewLoanScreenState();
}

class _NewLoanScreenState extends State<NewLoanScreen> {
  // A GlobalKey lets us trigger validation on the whole form.
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _purposeController = TextEditingController();

  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    // Runs every validator below. False means something's wrong.
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      // The user types shillings; the API stores cents.
      final shillings = int.parse(_amountController.text.trim());

      await LoanService.create(
        amount: shillings * 100,
        purpose: _purposeController.text.trim(),
      );

      if (!mounted) return;

      // `true` tells the list screen to refresh.
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not reach the API. Is it running?');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Apply for a loan')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Amount (TSh)',
                    border: OutlineInputBorder(),
                    prefixText: 'TSh ',
                  ),
                  validator: (value) {
                    final text = value?.trim() ?? '';

                    if (text.isEmpty) return 'Enter an amount';

                    final parsed = int.tryParse(text);

                    if (parsed == null) return 'Numbers only';
                    if (parsed < 1) return 'Must be more than zero';

                    return null; // null means valid
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _purposeController,
                  maxLength: 200, // matches the API's maxLength
                  decoration: const InputDecoration(
                    labelText: 'Purpose (optional)',
                    border: OutlineInputBorder(),
                    hintText: 'School fees',
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Container(
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
                FilledButton(
                  onPressed: _saving ? null : _submit,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Submit application'),
                ),

                const SizedBox(height: 12),
                const Text(
                  'New loans always start as PENDING. Only an admin '
                  'can approve them — a rule the API enforces, not this app.',
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
