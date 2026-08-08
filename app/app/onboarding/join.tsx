/**
 * Onboarding Screen 3 — Join
 *
 * Invite code input with elegant design. Marks onboarding as complete
 * via AsyncStorage, then routes to phone-otp auth.
 *
 * Dark editorial aesthetic with gold accents.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkThemeColors, serifFont, bodyFont, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { IronworkMark } from '@/components/IronworkMark';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

const colors = DarkThemeColors;
const ONBOARDING_KEY = 'onboarding_complete';

export default function OnboardingJoinScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    hapticLight();
    setLoading(true);
    try {
      // Mark onboarding as complete
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      hapticSuccess();
      // Go straight to phone auth
      router.replace('/(auth)/phone-otp' as any);
    } catch (e) {
      console.error('[onboarding/join] Error saving onboarding state:', e);
      // Still proceed to auth even if storage fails
      router.replace('/(auth)/phone-otp' as any);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    hapticLight();
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/phone-otp' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.body}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            style={styles.logoWrap}
          >
            <IronworkMark size={48} variant="gold-on-dark" />
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
          >
            <Text style={styles.title}>Join Your Circle</Text>
            <Text style={styles.description}>
              Enter the invite code from your circle host to begin. Your code
              will be validated after you verify your phone number.
            </Text>
          </MotiView>

          {/* Editorial input with gold underline */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 200 }}
          >
            <View style={styles.inputWrap}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.cream,
                    borderBottomColor: code ? colors.gold : colors.border,
                  },
                ]}
                placeholder="Enter invite code"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                textAlign="center"
                accessibilityLabel="Invite code input"
                accessibilityHint="Enter your circle invite code"
              />
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 300 }}
          >
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Skip invite code and continue to phone verification"
            >
              <Text style={styles.skipText}>
                Don't have a code? Continue to sign in
              </Text>
            </TouchableOpacity>
          </MotiView>
        </View>

        <View style={styles.footer}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 80, delay: 400 }}
          >
            <PrimaryButton
              label="Continue"
              loading={loading}
              onPress={handleContinue}
              accessibilityLabel="Continue to phone verification"
              accessibilityRole="button"
            />
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingTop: spacing.xl, alignItems: 'center' },
  logoWrap: { marginBottom: spacing.xl },
  title: {
    fontFamily: serifFont,
    fontSize: 28,
    fontWeight: '400',
    color: colors.cream,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: bodyFont,
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.xxl,
  },
  inputWrap: {
    width: '100%',
    maxWidth: 320,
  },
  input: {
    fontFamily: serifFont,
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 4,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    textAlign: 'center',
  },
  skipText: {
    fontFamily: bodyFont,
    fontSize: 13,
    fontWeight: '300',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
