import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState } from '@/components/States';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <ScreenContainer scroll={false} contentStyle={styles.center}>
        <EmptyState
          icon="help-circle-outline"
          title="Page not found"
          message="This screen does not exist."
          action={<Button label="Go home" onPress={() => router.replace('/')} fullWidth={false} />}
        />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({ center: { justifyContent: 'center' } });
