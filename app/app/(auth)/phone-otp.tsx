/**
 * Phone OTP screen — phone number input → 6-digit OTP input.
 * Auto-advances to OTP entry after phone submit, auto-submits on 6 digits.
 */

import { useState, useRef, useEffect } from 'react';
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
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { hapticSuccess, hapticError } from '@/lib/haptics';

type Step = 'phone' | 'otp';

export default function PhoneOtpScreen() {
  const colors = useThemeColors();
  const { signInWithPhone, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRef = useRef<TextInput>(null);

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && step === 'otp') {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  const handleSendOtp = async () => {
    if (phone.trim().length < 8) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithPhone(phone);
      hapticSuccess();
      setStep('otp');
      // Focus OTP input after a brief delay
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch {
      hapticError();
      setError('Could not send code. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const success = await verifyOtp(phone, otp);
      if (success) {
        hapticSuccess();
        router.push('/(auth)/profile-setup');
      } else {
        hapticError();
        setError('Invalid code. Try again.');
        setOtp('');
      }
    } catch {
      hapticError();
      setError('Verification failed. Try again.');
      setOtp('');
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
          {step === 'phone' ? (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Enter your phone number. We'll send a verification code.
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
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
            </>
          ) : (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={{ color: colors.textPrimary }}>{phone}</Text>
              </Text>
              <TextInput
                ref={otpRef}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    borderColor: error ? colors.error : colors.border,
                  },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                  setError(null);
                }}
                keyboardType="number-pad"
                autoCorrect={false}
                autoFocus
              />
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.resendLink}>
                <Text style={[styles.linkText, { color: colors.accent }]}>
                  ← Change number
                </Text>
              </TouchableOpacity>
            </>
          )}

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}
        </View>

        <View style={styles.footer}>
          {step === 'phone' ? (
            <PrimaryButton
              label="Send Code"
              loading={loading}
              disabled={phone.trim().length < 8}
              onPress={handleSendOtp}
            />
          ) : (
            <PrimaryButton
              label="Verify"
              loading={loading}
              disabled={otp.length !== 6}
              onPress={handleVerifyOtp}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingTop: spacing.xl },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  input: {
    ...typography.title3,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
  },
  otpInput: {
    ...typography.largeTitle,
    fontSize: 32,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
    letterSpacing: 12,
    textAlign: 'center',
  },
  resendLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  linkText: {
    ...typography.footnote,
  },
  errorText: {
    ...typography.footnote,
    marginTop: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
