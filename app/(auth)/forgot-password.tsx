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
import { useT } from '@/i18n';
import { getErrorMessage, logError } from '@/utils/errors';

const emailSchema = z.email();
const codeSchema = z.string().regex(/^\d{6,10}$/);

/**
 * Request a reset email. Tapping its link on this phone opens the app on
 * "Choose a new password" (see AuthProvider). If the email contains a code
 * instead (custom template), it can be typed here.
 */
export default function ForgotPasswordScreen() {
  const t = useT();
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async () => {
    setError(null);
    if (!emailSchema.safeParse(email.trim()).success) {
      setError(t('invalidEmail'));
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
      setError(t('enterResetCode'));
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
        <AppText variant="title">{t('forgotPassword')}</AppText>
        <AppText tone="muted">{t('forgotPasswordHint')}</AppText>
        <TextField
          label={t('email')}
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
        <Button label={t('sendResetEmail')} onPress={sendEmail} loading={busy} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboard edges={['bottom']}>
      <AppText variant="title">{t('checkYourEmail')}</AppText>
      <Banner tone="info" message={t('resetEmailSent', { email: email.trim() })} />
      <AppText tone="muted">{t('resetEmailHint')}</AppText>
      <Button label={t('sendEmailAgain')} variant="secondary" onPress={sendEmail} loading={busy} />

      <Card>
        <View style={styles.codeSection}>
          <AppText variant="label">{t('codeInstead')}</AppText>
          <TextField
            label={t('resetCode')}
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
          <Button
            label={t('verifyCode')}
            variant="secondary"
            onPress={verifyCode}
            disabled={busy}
          />
        </View>
      </Card>

      {error ? <Banner tone="danger" message={error} /> : null}
      <Button
        label={t('useDifferentEmail')}
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
