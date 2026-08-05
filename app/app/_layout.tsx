/**
 * Root layout — top-level navigator.
 *
 * Checks auth state via useAuth (placeholder returns loading=true).
 * - loading  → splash/loading screen
 * - no session → (auth) group
 * - has session → (tabs) group
 *
 * TODO(backend): When Sonny's real useAuth lands, the session check
 * will actually switch between auth and tabs.
 */

import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { ThemeProvider } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/theme';
import { TresorDarkTheme, TresorLightTheme } from '@/theme/colors';

export default function RootLayout() {
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const { loading, session } = useAuth();

  const isAuthenticated = !!session;

  return (
    <ThemeProvider value={scheme === 'dark' ? TresorDarkTheme : TresorLightTheme}>
      {loading ? (
        <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </SafeAreaView>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          {/* Auth flow — shown when unauthenticated */}
          <Stack.Screen name="(auth)" />

          {/* Main app — shown when authenticated */}
          <Stack.Screen name="(tabs)" />

          {/* Standalone routes (not in tab bar) */}
          <Stack.Screen name="add" />
        </Stack>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
