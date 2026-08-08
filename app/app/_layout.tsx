/**
 * Root layout — top-level navigator with AuthProvider.
 *
 * Checks auth state via useAuth.
 * - loading  → splash/loading screen
 * - no session → (auth) group
 * - has session → (tabs) group
 */

import { Stack, Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/theme';

function RootNavigator() {
  const colors = useThemeColors();
  const { loading, session } = useAuth();
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
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth flow — shown when unauthenticated */}
        <Stack.Screen name="(auth)" />

        {/* Main app — shown when authenticated */}
        <Stack.Screen name="(tabs)" />

        {/* Standalone routes — auto-discovered, no explicit name needed */}
        <Stack.Screen name="add/bulk-import" />
        <Stack.Screen name="add/manual" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="borrow" />
      </Stack>
      <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/welcome'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
