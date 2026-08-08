/**
 * Auth layout — stack navigator for the onboarding flow.
 *
 * New flow order (per Muaath's research):
 *   Welcome → Phone-OTP → [Invite Code] → Profile Setup → Circle Preview → App
 *
 * Invite code is now AFTER auth (fixes RLS bug where anon users
 * can't validate invite codes).
 */

import { Stack } from 'expo-router';
import { useThemeColors, serifFont } from '@/theme';

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
      <Stack.Screen name="phone-otp" options={{ title: 'Verify Phone' }} />
      <Stack.Screen name="invite-code" options={{ title: 'Join Circle' }} />
      <Stack.Screen name="email-signin" options={{ title: 'Sign In' }} />
      <Stack.Screen name="profile-setup" options={{ title: 'Your Profile' }} />
      <Stack.Screen name="circle-preview" options={{ headerShown: false }} />
    </Stack>
  );
}
