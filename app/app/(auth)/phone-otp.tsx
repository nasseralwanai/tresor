/**
 * Sign In / Sign Up screen — email/password authentication.
 *
 * Originally a phone OTP screen, repurposed for email/password auth since
 * phone OTP requires Twilio (not available in local dev). Supports both
 * sign-in and sign-up modes.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { hapticSuccess, hapticError } from '@/lib/haptics';

type Mode = 'signin' | 'signup';

export default function PhoneOtpScreen() {
  const colors = useThemeColors();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      hapticSuccess();
      // Auth state listener will switch to tabs automatically.
      // If signing up and email confirmation is required, inform the user.
      if (mode === 'signup') {
        setError(null);
        // Check if session was set (local dev = no email confirmation)
        // The onAuthStateChange will navigate if session is set.
      }
    } catch (e: any) {
      hapticError();
      const msg = e?.message ?? 'Authentication failed. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {mode === 'signin'
              ? 'Sign in to your Trésor account.'
              : 'Sign up to join your luxury circle.'}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: error ? colors.error : colors.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: error ? colors.error : colors.border,
              },
            ]}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}

          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Demo: sarah@test.local / password123
          </Text>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={mode === 'signin' ? 'Sign In' : 'Sign Up'}
            loading={loading}
            disabled={!email.trim() || !password.trim()}
            onPress={handleSubmit}
          />
          <Text
            style={[styles.switchMode, { color: colors.accent }]}
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingTop: spacing.xl },
  title: {
    ...typography.title1,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  input: {
    ...typography.body,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.footnote,
    marginTop: spacing.sm,
  },
  hintText: {
    ...typography.caption1,
    marginTop: spacing.md,
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  switchMode: {
    ...typography.footnote,
    textAlign: 'center',
  },
});
