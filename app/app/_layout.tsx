/**
 * Root layout — top-level navigator with AuthProvider.
 *
 * Checks auth state via useAuth.
 * - loading  → splash/loading screen
 * - no session → (auth) group
 * - has session → (tabs) group
 */

import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { ThemeProvider } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/theme';
import { TresorDarkTheme, TresorLightTheme } from '@/theme/colors';

function RootNavigator() {
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
