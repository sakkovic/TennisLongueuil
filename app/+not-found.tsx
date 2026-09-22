import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState } from '@/components/States';
import { useT } from '@/i18n';

export default function NotFoundScreen() {
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('notFound'), headerShown: true }} />
      <ScreenContainer scroll={false} contentStyle={styles.center}>
        <EmptyState
          icon="help-circle-outline"
          title={t('pageNotFound')}
          message={t('screenMissing')}
          action={
            <Button label={t('goHome')} onPress={() => router.replace('/')} fullWidth={false} />
          }
        />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({ center: { justifyContent: 'center' } });
