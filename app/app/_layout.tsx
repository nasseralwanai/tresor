/**
 * Root layout — top-level navigator with AuthProvider.
 *
 * Checks auth state via useAuth.
 * - loading  → splash/loading screen
 * - no session → (auth) group
 * - has session → (tabs) group
 *
 * Wrapped in ErrorBoundary to catch runtime errors gracefully.
 * OfflineBanner shows when device is offline.
 */

import { Stack, Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/theme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function RootNavigator() {
  const colors = useThemeColors();
  const { loading, session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const isAuthenticated = !!session;

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <OfflineBanner isOffline={!isOnline} />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth flow — shown when unauthenticated */}
        <Stack.Screen name="(auth)" />

        {/* Main app — shown when authenticated */}
        <Stack.Screen name="(tabs)" />

        {/* Onboarding */}
        <Stack.Screen name="onboarding" />

        {/* Standalone routes — auto-discovered by Expo Router */}
        <Stack.Screen name="add" />
        <Stack.Screen name="item" />
        <Stack.Screen name="borrow" />
      </Stack>
      <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/welcome'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
