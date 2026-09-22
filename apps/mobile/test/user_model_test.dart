// Tests for the User model, including the admin check the UI relies on.
import 'package:flutter_test/flutter_test.dart';
import 'package:zeni_mobile/models/user.dart';

void main() {
  Map<String, dynamic> json({String role = 'USER'}) => {
        'id': 'u1',
        'name': 'Amina Juma',
        'email': 'amina@zeni.test',
        'role': role,
      };

  test('reads every field', () {
    final user = User.fromJson(json());

    expect(user.id, 'u1');
    expect(user.name, 'Amina Juma');
    expect(user.email, 'amina@zeni.test');
    expect(user.role, 'USER');
  });

  test('isAdmin is true only for ADMIN', () {
    expect(User.fromJson(json(role: 'ADMIN')).isAdmin, isTrue);
    expect(User.fromJson(json(role: 'USER')).isAdmin, isFalse);
  });
}
