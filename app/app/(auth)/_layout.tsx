/**
 * Auth layout — stack navigator for the 5-screen onboarding flow.
 * No tab bar, full-screen, themed with dark editorial aesthetic.
 */

import { Stack } from 'expo-router';
import { useThemeColors } from '@/theme';

export default function AuthLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          color: colors.textPrimary,
        },
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="invite-code" options={{ title: 'Join Circle' }} />
      <Stack.Screen name="phone-otp" options={{ title: 'Verify Phone' }} />
      <Stack.Screen name="email-signin" options={{ title: 'Sign In' }} />
      <Stack.Screen name="profile-setup" options={{ title: 'Your Profile' }} />
      <Stack.Screen name="circle-preview" options={{ headerShown: false }} />
    </Stack>
  );
}
