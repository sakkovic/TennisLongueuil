import { parseRecoveryLink } from '../recoveryLink';

describe('parseRecoveryLink', () => {
  it('extracts the recovery session from a store-build deep link', () => {
    expect(
      parseRecoveryLink(
        'tennislongueuil://reset-password#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=recovery',
      ),
    ).toEqual({ kind: 'session', accessToken: 'abc', refreshToken: 'def' });
  });

  it('works with Expo Go URLs and query parameters', () => {
    expect(
      parseRecoveryLink(
        'exp://192.168.2.14:8081/--/reset-password?type=recovery&access_token=a1&refresh_token=r1',
      ),
    ).toEqual({ kind: 'session', accessToken: 'a1', refreshToken: 'r1' });
  });

  it('reports expired or invalid reset links', () => {
    expect(
      parseRecoveryLink(
        'tennislongueuil://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual({
      kind: 'error',
      message: 'This reset link is invalid or has expired. Please request a new one.',
    });
  });

  it('ignores every other link', () => {
    expect(parseRecoveryLink('tennislongueuil://lesson/123')).toBeNull();
    expect(parseRecoveryLink('exp://192.168.2.14:8081/--/')).toBeNull();
    // Tokens from another kind of flow are not treated as a password reset.
    expect(
      parseRecoveryLink(
        'tennislongueuil://reset-password#access_token=a&refresh_token=b&type=signup',
      ),
    ).toBeNull();
    expect(parseRecoveryLink('tennislongueuil://reset-password#type=recovery')).toBeNull();
  });
});
