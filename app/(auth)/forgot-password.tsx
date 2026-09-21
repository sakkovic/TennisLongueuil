import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/theme';
import { requestPasswordReset, verifyResetCode } from '@/features/auth/api';
import { getErrorMessage, logError } from '@/utils/errors';

const emailSchema = z.email();
const codeSchema = z.string().regex(/^\d{6,10}$/);

/**
 * Request a reset email. Tapping its link on this phone opens the app on
 * "Choose a new password" (see AuthProvider). If the email contains a code
 * instead (custom template), it can be typed here.
 */
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async () => {
    setError(null);
    if (!emailSchema.safeParse(email.trim()).success) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setStep('sent');
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

  if (step === 'email') {
    return (
      <ScreenContainer keyboard edges={['bottom']}>
        <AppText variant="title">Forgot your password?</AppText>
        <AppText tone="muted">
          Enter your email and we&apos;ll send you a link to choose a new password.
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
          onSubmitEditing={sendEmail}
        />
        {error ? <Banner tone="danger" message={error} /> : null}
        <Button label="Send reset email" onPress={sendEmail} loading={busy} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboard edges={['bottom']}>
      <AppText variant="title">Check your email</AppText>
      <Banner
        tone="info"
        message={`If an account exists for ${email.trim()}, a reset email is on its way.`}
      />
      <AppText tone="muted">
        Open the email on this phone and tap the reset link. The app will open so you can choose a
        new password.
      </AppText>
      <Button label="Send the email again" variant="secondary" onPress={sendEmail} loading={busy} />

      <Card>
        <View style={styles.codeSection}>
          <AppText variant="label">Your email has a code instead?</AppText>
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
          <Button label="Verify code" variant="secondary" onPress={verifyCode} disabled={busy} />
        </View>
      </Card>

      {error ? <Banner tone="danger" message={error} /> : null}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  codeSection: { gap: spacing.md },
  code: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
});
