/**
 * Email/Password sign-in — fallback auth method.
 *
 * Accessible from phone-otp.tsx via "Sign in with email" link.
 * Supports both sign-in and sign-up modes. On sign-up, navigates to
 * profile-setup; on sign-in, navigates to the main app.
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
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { hapticSuccess, hapticError } from '@/lib/haptics';

type Mode = 'signin' | 'signup';

export default function EmailSignInScreen() {
  const colors = useThemeColors();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { circleId } = useLocalSearchParams<{ circleId?: string }>();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        router.replace('/(tabs)');
      } else {
        await signUp(email.trim(), password);
        hapticSuccess();
        router.replace({
          pathname: '/(auth)/profile-setup',
          params: circleId ? { circleId } : {},
        });
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
              ? 'Sign in with your email and password.'
              : 'Sign up to join your luxury circle.'}
          </Text>

          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.error : colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons name="email-outline" size={18} color={colors.accent} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.error : colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons name="lock-outline" size={18} color={colors.accent} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={mode === 'signin' ? 'Sign In' : 'Sign Up'}
            loading={loading}
            disabled={!email.trim() || !password.trim()}
            onPress={handleSubmit}
          />
          <TouchableOpacity
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            style={styles.switchMode}
          >
            <Text style={[styles.switchModeText, { color: colors.accent }]}>
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    height: '100%',
  },
  errorText: {
    ...typography.footnote,
    marginTop: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchModeText: {
    ...typography.footnote,
    textAlign: 'center',
  },
});
