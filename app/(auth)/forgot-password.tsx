import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { requestPasswordReset, verifyResetCode } from '@/features/auth/api';
import { getErrorMessage, logError } from '@/utils/errors';

const emailSchema = z.email();
const codeSchema = z.string().regex(/^\d{6,10}$/);

/**
 * Two steps: request a code by email, then enter it. A verified code signs the
 * member in and the app moves to "Choose a new password" (reset-password.tsx).
 */
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    setNotice(null);
    if (!emailSchema.safeParse(email.trim()).success) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setStep('code');
      setNotice(`If an account exists for ${email.trim()}, a reset code is on its way.`);
    } catch (err) {
      logError('requestPasswordReset', err);
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (!codeSchema.safeParse(code.trim()).success) {
      setError('Enter the code from the email (digits only).');
      return;
    }
    setBusy(true);
    try {
      await verifyResetCode(email, code);
      // Navigation to the new-password screen happens automatically.
    } catch (err) {
      logError('verifyResetCode', err);
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <ScreenContainer keyboard edges={['bottom']}>
      {step === 'email' ? (
        <View style={styles.section}>
          <AppText variant="title">Forgot your password?</AppText>
          <AppText tone="muted">
            Enter your email and we&apos;ll send you a code to choose a new password.
          </AppText>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={sendCode}
          />
          {error ? <Banner tone="danger" message={error} /> : null}
          <Button label="Send reset code" onPress={sendCode} loading={busy} />
        </View>
      ) : (
        <View style={styles.section}>
          <AppText variant="title">Enter your code</AppText>
          {notice ? <Banner tone="info" message={notice} /> : null}
          <TextField
            label="Reset code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={verifyCode}
            style={styles.code}
          />
          {error ? <Banner tone="danger" message={error} /> : null}
          <Button label="Verify code" onPress={verifyCode} loading={busy} />
          <Button label="Send a new code" variant="ghost" onPress={sendCode} disabled={busy} />
          <Button
            label="Use a different email"
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
});
