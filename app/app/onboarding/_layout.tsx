/**
 * Onboarding layout — 3-screen first-time user flow.
 *
 * Screen 1: Welcome
 * Screen 2: How It Works
 * Screen 3: Join (invite code)
 *
 * Shown only once — tracked via AsyncStorage 'onboarding_complete'.
 */

import { Stack } from 'expo-router';
import { useThemeColors, serifFont } from '@/theme';

export default function OnboardingLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontFamily: serifFont,
          fontSize: 18,
          fontWeight: '400',
        },
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="how-it-works" options={{ title: '' }} />
      <Stack.Screen name="join" options={{ title: '' }} />
    </Stack>
  );
}
