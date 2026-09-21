import { createPasswordFormSchema, newPasswordSchema } from '../NewPasswordForm';

describe('password rules', () => {
  it('accepts a password with 8+ characters, upper and lower case and a digit', () => {
    expect(newPasswordSchema.safeParse('Tennis2026').success).toBe(true);
    expect(newPasswordSchema.safeParse('Tennis2026!').success).toBe(true);
  });

  it.each([
    ['Ten2026', 'Use at least 8 characters.'],
    ['tennis2026', 'Add an uppercase letter.'],
    ['TENNIS2026', 'Add a lowercase letter.'],
    ['TennisClub', 'Add a number.'],
  ])('rejects %s', (password, message) => {
    const result = newPasswordSchema.safeParse(password);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });

  it('requires the current password only when asked, and a matching confirmation', () => {
    const withCurrent = createPasswordFormSchema(true);
    const withoutCurrent = createPasswordFormSchema(false);
    const values = { currentPassword: '', password: 'Tennis2026', confirm: 'Tennis2026' };

    expect(withoutCurrent.safeParse(values).success).toBe(true);
    expect(withCurrent.safeParse(values).success).toBe(false);
    expect(withCurrent.safeParse({ ...values, currentPassword: 'Old2025pw' }).success).toBe(true);
    expect(withoutCurrent.safeParse({ ...values, confirm: 'Tennis2027' }).success).toBe(false);
  });
});
