import { FALLBACK_ERROR_MESSAGE, getErrorCode, getErrorMessage, isBusinessError } from '../errors';

const rpcError = (message: string) => ({ code: 'P0001', message, details: null, hint: null });

describe('getErrorMessage', () => {
  it('translates database business errors into friendly text', () => {
    expect(getErrorMessage(rpcError('LESSON_FULL'))).toBe(
      'Sorry, this lesson has just become full.',
    );
    expect(getErrorMessage(rpcError('ALREADY_REGISTERED'))).toBe(
      "You're already registered for this lesson.",
    );
    expect(getErrorMessage(rpcError('REGISTRATION_CLOSED'))).toBe(
      'Registration is closed for this lesson.',
    );
    expect(getErrorMessage(rpcError('LESSON_CANCELLED'))).toBe('This lesson has been cancelled.');
    expect(getErrorMessage(rpcError('ACCOUNT_INACTIVE'))).toBe(
      'Your account is inactive. Please contact your coach.',
    );
  });

  it('recognises check constraints by name', () => {
    expect(
      getErrorMessage({
        code: '23514',
        message:
          'new row for relation "lessons" violates check constraint "lessons_registered_count_range"',
      }),
    ).toBe("You can't reduce the number of courts below the players already registered.");
  });

  it('maps duplicate registrations and permission errors', () => {
    expect(
      getErrorMessage({
        code: '23505',
        message:
          'duplicate key value violates unique constraint "lesson_registrations_lesson_player_key"',
      }),
    ).toBe("You're already registered for this lesson.");
    expect(getErrorMessage({ code: '42501', message: 'permission denied for table lessons' })).toBe(
      "You don't have permission to do that.",
    );
  });

  it('maps auth errors by code', () => {
    expect(
      getErrorMessage({ name: 'AuthApiError', code: 'invalid_credentials', message: 'x' }),
    ).toBe('Incorrect email or password.');
    expect(getErrorMessage({ name: 'AuthApiError', code: 'otp_expired', message: 'x' })).toBe(
      'This code is invalid or has expired. Request a new one.',
    );
  });

  it('explains password change and reset problems', () => {
    expect(getErrorMessage(new Error('CURRENT_PASSWORD_INVALID'))).toBe(
      'Your current password is incorrect.',
    );
    expect(getErrorMessage({ name: 'AuthApiError', code: 'weak_password', message: 'x' })).toBe(
      'Please choose a stronger password: at least 8 characters, with uppercase and lowercase letters and a number.',
    );
    expect(
      getErrorMessage({ name: 'AuthApiError', code: 'email_address_not_authorized', message: 'x' }),
    ).toBe(
      "Reset emails can't be sent to this address yet. Please ask your coach to reset your password.",
    );
  });

  it('explains network failures', () => {
    expect(getErrorMessage(new TypeError('Network request failed'))).toBe(
      "Can't reach the server. Check your connection and try again.",
    );
  });

  it('never leaks raw technical messages', () => {
    expect(getErrorMessage({ code: 'XX000', message: 'PostgrestException P0001 internal' })).toBe(
      FALLBACK_ERROR_MESSAGE,
    );
    expect(getErrorMessage(undefined)).toBe(FALLBACK_ERROR_MESSAGE);
    expect(getErrorMessage('boom')).toBe(FALLBACK_ERROR_MESSAGE);
  });
});

describe('error classification', () => {
  it('extracts stable codes and flags business errors (not worth retrying)', () => {
    expect(getErrorCode(rpcError('LESSON_FULL'))).toBe('LESSON_FULL');
    expect(isBusinessError(rpcError('NOT_AUTHORIZED'))).toBe(true);
    expect(isBusinessError(new TypeError('Network request failed'))).toBe(false);
  });
});
